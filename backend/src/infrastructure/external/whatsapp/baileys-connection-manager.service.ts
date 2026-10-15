import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import makeWASocket, {
  WASocket,
  WAMessageKey,
  CacheStore,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  getContentType,
  WAMessage,
  proto,
  decryptPollVote,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';
import { createHash } from 'crypto';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import pino from 'pino';
import { BaileysAuthStateService } from './baileys-auth-state.service';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { classifyDisconnect } from '@/modules/whatsapp/domain/services/disconnect-classifier';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { EVENT_NAMES, WHATSAPP_CONFIG } from '@/common/constants';

/** Looks up the text of a message this platform sent, by WhatsApp message id. */
export type SentMessageLookup = (whatsappMessageId: string) => Promise<string | undefined>;

/** Looks up a poll this platform sent: its secret (base64) and option texts. */
export type PollLookup = (
  pollMessageId: string,
) => Promise<{ secretBase64: string; options: string[] } | null>;

/** Minimal in-memory CacheStore for Baileys' message retry counters. */
class MemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, unknown>();
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
  set<T>(key: string, value: T): void {
    if (this.store.size > 10_000) this.store.clear();
    this.store.set(key, value);
  }
  del(key: string): void {
    this.store.delete(key);
  }
  flushAll(): void {
    this.store.clear();
  }
}

/** A session linking by phone-number pairing code instead of a QR scan. */
interface PairingRequest {
  phoneNumber: string;
  /** Latest code issued — a new one comes with each socket until the user enters it */
  code?: string;
  /** Set until the first code is issued for the HTTP caller */
  resolve?: (code: string) => void;
  reject?: (error: Error) => void;
}

@Injectable()
export class BaileysConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaileysConnectionManager.name);
  private readonly connections = new Map<string, WASocket>();
  /** Sockets whose connection actually opened — a socket in `connections` may still be pairing */
  private readonly openSockets = new Set<string>();
  private readonly initializing = new Set<string>();
  private readonly pairingRequests = new Map<string, PairingRequest>();
  /** Sockets that already asked WhatsApp for a pairing code (one code per socket) */
  private readonly pairingRequested = new WeakSet<WASocket>();
  /** Sessions that just linked (QR or code) — the phone was online for that */
  private readonly newLogins = new Set<string>();
  /** Last phone-activity report per session, to keep DB writes rare */
  private readonly phoneActivityReportedAt = new Map<string, number>();
  private readonly msgRetryCounterCache = new MemoryCacheStore();
  private cachedVersion: { version: [number, number, number]; fetchedAt: number } | null = null;
  private sentMessageLookup: SentMessageLookup | null = null;
  private pollLookup: PollLookup | null = null;

  constructor(
    private readonly authStateService: BaileysAuthStateService,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly wsGateway: AppWebSocketGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    const activeSessions = await this.sessionRepo.findAllActive();
    this.logger.log(
      `Reconnecting ${activeSessions.length} stored sessions on startup`,
    );

    for (const session of activeSessions) {
      try {
        // Stagger reconnections to avoid thundering herd
        await new Promise((r) => setTimeout(r, Math.random() * 2000));
        await this.createConnection(session.id, session.userId, session.orgId);
        this.logger.log(`Reconnected session ${session.id}`);
      } catch (error) {
        this.logger.error(`Failed to reconnect session ${session.id}`, error);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    const sockets = [...this.connections];
    // Untrack first so shutdown closes aren't handled as disconnects
    this.connections.clear();
    this.openSockets.clear();
    for (const [sessionId, sock] of sockets) {
      try {
        sock.end(undefined);
        this.logger.log(`Closed socket for session ${sessionId}`);
      } catch (error) {
        this.logger.warn(`Error closing socket ${sessionId}`, error);
      }
    }
  }

  async createConnection(
    sessionId: string,
    userId: string,
    orgId: string,
  ): Promise<void> {
    if (this.connections.has(sessionId) || this.initializing.has(sessionId)) {
      this.logger.warn(
        `Connection already exists/initializing for ${sessionId}`,
      );
      return;
    }

    this.initializing.add(sessionId);

    try {
      const { state, saveCreds } =
        await this.authStateService.getAuthState(sessionId);
      const version = await this.getWaVersion();

      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(
            state.keys,
            pino({ level: 'silent' }),
          ),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }) as any,
        browser: ['Wazelo CRM', 'Chrome', '120.0.0'],
        syncFullHistory: false,
        // Don't appear permanently online — it also stops notifications on the user's phone
        markOnlineOnConnect: false,
        // Lets Baileys re-send a message the recipient couldn't decrypt ("waiting for this message")
        msgRetryCounterCache: this.msgRetryCounterCache,
        getMessage: (key) => this.getSentMessage(key),
        connectTimeoutMs: WHATSAPP_CONFIG.DISCONNECT_DETECTION_TIMEOUT_MS,
        keepAliveIntervalMs: WHATSAPP_CONFIG.HEARTBEAT_INTERVAL_MS,
      });

      this.connections.set(sessionId, sock);
      this.wireEvents(sock, sessionId, userId, orgId, saveCreds);
    } catch (error) {
      this.logger.error(
        `Failed to create connection for session ${sessionId}`,
        error,
      );
      throw error;
    } finally {
      this.initializing.delete(sessionId);
    }
  }

  /**
   * Start a fresh link for `phoneNumber` (digits with country code, no +) using a
   * pairing code: the user types it in WhatsApp → Linked devices → Link with phone
   * number. Resolves with the first code; codes for later sockets (the previous
   * one expired unused) are pushed over WebSocket as `whatsapp:pairing-code`.
   */
  async requestPairingCode(
    sessionId: string,
    userId: string,
    orgId: string,
    phoneNumber: string,
  ): Promise<string> {
    await this.destroyConnection(sessionId);
    await this.authStateService.clearAuthState(sessionId);

    const request: PairingRequest = { phoneNumber };
    const code = new Promise<string>((resolve, reject) => {
      request.resolve = resolve;
      request.reject = reject;
    });
    this.pairingRequests.set(sessionId, request);

    const timer = setTimeout(
      () => request.reject?.(new Error('Timed out waiting for WhatsApp to issue a pairing code')),
      WHATSAPP_CONFIG.PAIRING_CODE_TIMEOUT_MS,
    );

    try {
      await this.createConnection(sessionId, userId, orgId);
      return await code;
    } catch (error) {
      this.pairingRequests.delete(sessionId);
      await this.destroyConnection(sessionId);
      throw error;
    } finally {
      clearTimeout(timer);
      request.resolve = request.reject = undefined;
    }
  }

  /** Current pairing code while a session waits to be linked by phone number. */
  getPairingCode(sessionId: string): string | null {
    return this.pairingRequests.get(sessionId)?.code ?? null;
  }

  getConnection(sessionId: string): WASocket | undefined {
    return this.connections.get(sessionId);
  }

  /** True only once the connection is open — not while the socket is still pairing or connecting. */
  isConnected(sessionId: string): boolean {
    return this.openSockets.has(sessionId);
  }

  /** Registered by the messages module so Baileys can re-send messages on retry receipts. */
  registerSentMessageLookup(lookup: SentMessageLookup): void {
    this.sentMessageLookup = lookup;
  }

  /** Registered by the deals module so votes on its polls can be decrypted. */
  registerPollLookup(lookup: PollLookup): void {
    this.pollLookup = lookup;
  }

  /**
   * Decrypt a vote on one of our polls and emit it. Baileys v7 no longer does
   * this itself. The voter/creator ids used for the key can be the phone-number
   * JID or the LID, so each pairing is tried — AES-GCM rejects the wrong ones.
   */
  private async handlePollVote(sock: WASocket, msg: WAMessage, sessionId: string): Promise<void> {
    const update = msg.message?.pollUpdateMessage;
    const pollId = update?.pollCreationMessageKey?.id;
    if (!update?.vote?.encPayload || !update.vote.encIv || !pollId || !this.pollLookup) return;

    const poll = await this.pollLookup(pollId);
    if (!poll) return;

    const pollEncKey = Buffer.from(poll.secretBase64, 'base64');
    const creatorIds = [sock.user?.id, sock.user?.lid].filter(Boolean).map((id) => jidNormalizedUser(id!));
    const key = msg.key as WAMessageKey & { remoteJidAlt?: string; participantAlt?: string };
    const voterIds = [key.participantAlt, key.remoteJidAlt, key.participant, key.remoteJid]
      .filter(Boolean)
      .map((id) => jidNormalizedUser(id!));

    for (const pollCreatorJid of new Set(creatorIds)) {
      for (const voterJid of new Set(voterIds)) {
        try {
          const vote = decryptPollVote(update.vote as { encPayload: Uint8Array; encIv: Uint8Array }, {
            pollCreatorJid,
            pollMsgId: pollId,
            pollEncKey,
            voterJid,
          });
          const selected = (vote.selectedOptions ?? []).map((hash) => Buffer.from(hash).toString('hex'));
          const selectedOptions = poll.options.filter((option) =>
            selected.includes(createHash('sha256').update(Buffer.from(option)).digest('hex')),
          );
          this.eventEmitter.emit(EVENT_NAMES.BAILEYS_POLL_VOTE, {
            sessionId,
            pollMessageId: pollId,
            selectedOptions,
            voterJid,
            votedAt: new Date(),
          });
          return;
        } catch {
          // wrong id pairing — try the next one
        }
      }
    }
    this.logger.warn(`Could not decrypt vote on poll ${pollId} (session ${sessionId})`);
  }

  private async getSentMessage(key: WAMessageKey): Promise<proto.IMessage | undefined> {
    if (!key.id || !this.sentMessageLookup) return undefined;
    try {
      const text = await this.sentMessageLookup(key.id);
      return text ? { conversation: text } : undefined;
    } catch (error) {
      this.logger.warn(`getMessage lookup failed for ${key.id}: ${(error as Error).message}`);
      return undefined;
    }
  }

  /** WhatsApp Web version, fetched at most once a day instead of on every connect. */
  private async getWaVersion(): Promise<[number, number, number]> {
    const fresh =
      this.cachedVersion &&
      Date.now() - this.cachedVersion.fetchedAt < WHATSAPP_CONFIG.VERSION_CACHE_TTL_MS;
    if (!fresh) {
      const { version } = await fetchLatestBaileysVersion();
      this.cachedVersion = { version, fetchedAt: Date.now() };
    }
    return this.cachedVersion!.version;
  }

  /**
   * Check whether a phone number is registered on WhatsApp.
   * Returns true/false, or null if no active Baileys session exists for this sessionId.
   */
  async checkWhatsApp(sessionId: string, phone: string): Promise<boolean | null> {
    const sock = this.connections.get(sessionId);
    if (!sock) return null;
    try {
      const results = await sock.onWhatsApp(phone);
      return results?.[0]?.exists ?? false;
    } catch (err) {
      this.logger.warn(`checkWhatsApp failed for ${phone}: ${(err as Error).message}`);
      return null;
    }
  }

  async destroyConnection(
    sessionId: string,
    logout: boolean = false,
  ): Promise<void> {
    const sock = this.connections.get(sessionId);
    if (!sock) return;

    // Forget the socket BEFORE closing it: end()/logout() emit the close event
    // synchronously, and the close handler ignores sockets no longer tracked —
    // otherwise a deliberate disconnect looks like a ban (401) or a network drop.
    this.connections.delete(sessionId);
    this.openSockets.delete(sessionId);
    this.pairingRequests.delete(sessionId);

    try {
      if (logout) {
        await sock.logout();
      } else {
        sock.end(undefined);
      }
    } catch (error) {
      this.logger.warn(`Error destroying connection ${sessionId}`, error);
    }

    if (logout) {
      await this.authStateService.clearAuthState(sessionId);
    }
  }

  private wireEvents(
    sock: WASocket,
    sessionId: string,
    userId: string,
    orgId: string,
    saveCreds: () => Promise<void>,
  ): void {
    // ── connection.update ──
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update;

      // Set when a QR scan / pairing code succeeds (just before the 515 restart)
      if (isNewLogin) this.newLogins.add(sessionId);

      // Pairing-code mode: the socket is ready once it offers a QR — ask for a code instead
      if (qr && this.pairingRequests.has(sessionId)) {
        await this.issuePairingCode(sock, sessionId, userId);
      } else if (qr) {
        try {
          const qrDataUri = await QRCode.toDataURL(qr, { width: 300 });

          this.wsGateway.emitToUser(userId, 'whatsapp:qr', {
            sessionId,
            qrCode: qrDataUri,
            expiresAt: new Date(
              Date.now() + WHATSAPP_CONFIG.QR_REFRESH_INTERVAL_MS,
            ),
          });

          this.logger.log(`QR code emitted for session ${sessionId}`);
        } catch (err) {
          this.logger.error(
            `Failed to generate QR image for ${sessionId}`,
            err,
          );
        }
      }

      if (connection === 'open') {
        this.openSockets.add(sessionId);
        this.pairingRequests.delete(sessionId);
        const phoneNumber = sock.user?.id?.split(':')[0] || null;

        this.eventEmitter.emit(EVENT_NAMES.BAILEYS_CONNECTION_UPDATE, {
          sessionId,
          orgId,
          userId,
          event: 'connected',
          phoneNumber: phoneNumber ? `+${phoneNumber}` : undefined,
          newLogin: this.newLogins.delete(sessionId),
        });
      }

      if (connection === 'close') {
        // Ignore a close from a socket that has already been replaced
        if (this.connections.get(sessionId) !== sock) return;

        this.connections.delete(sessionId);
        this.openSockets.delete(sessionId);

        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const decision = classifyDisconnect(statusCode);
        // `creds.me` is set once a QR scan links the device. In pairing-code mode
        // it is set as soon as a code is requested, so only `creds.registered`
        // (set when the user enters the code) means the device is linked.
        const pairingPending =
          this.pairingRequests.has(sessionId) && !sock.authState?.creds?.registered;
        const paired = Boolean(sock.authState?.creds?.me) && !pairingPending;

        this.logger.log(
          `Session ${sessionId} closed (statusCode: ${statusCode ?? 'unknown'} → ${decision.reason}/${decision.action})`,
        );

        // Still pairing (QR not scanned yet): keep refreshing the QR, as before
        const reconnectNow =
          decision.action === 'reconnect_now' ||
          (!paired && decision.action === 'reconnect_backoff');

        if (reconnectNow) {
          // The unused code's half-registered creds would make the next socket try to log in
          if (pairingPending) await this.authStateService.clearAuthState(sessionId);
          setTimeout(() => {
            this.createConnection(sessionId, userId, orgId).catch((err) => {
              this.logger.error(`Reconnect failed for session ${sessionId}: ${err.message}`);
              this.emitDisconnect(sessionId, orgId, userId, 'disconnected', statusCode, 'NETWORK', `Reconnect failed: ${err.message}`);
            });
          }, 1500);
          return;
        }

        if (decision.clearCreds) {
          await this.authStateService.clearAuthState(sessionId);
        }

        // NETWORK → the session-event use case reconnects with exponential backoff.
        // LOGGED_OUT / BANNED / REPLACED / BAD_SESSION → stop; the user has to act.
        const event =
          decision.action === 'reconnect_backoff'
            ? 'disconnected'
            : decision.reason === 'LOGGED_OUT'
              ? 'logout'
              : decision.reason === 'BANNED'
                ? 'banned'
                : 'stopped';
        this.emitDisconnect(sessionId, orgId, userId, event, statusCode, decision.reason, decision.message);
      }
    });

    // ── creds.update ──
    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (error) {
        this.logger.error(
          `Failed to save creds for session ${sessionId}`,
          error,
        );
      }
    });

    // ── messages.upsert (incoming messages) ──
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        try {
          // Our own sends come back as 'append'; a 'notify' fromMe was typed on the phone
          if (msg.key.fromMe && msg.key.remoteJid !== 'status@broadcast') {
            this.reportPhoneActivity(sessionId, orgId, userId);
          }
          if (msg.message?.pollUpdateMessage) {
            if (!msg.key.fromMe) await this.handlePollVote(sock, msg, sessionId);
            continue;
          }
          const payload = this.extractMessagePayload(msg, sessionId);
          if (payload) {
            this.eventEmitter.emit(EVENT_NAMES.BAILEYS_MESSAGE_UPSERT, payload);
          }
        } catch (error) {
          this.logger.error(
            `Error processing incoming message ${msg.key.id}`,
            error,
          );
        }
      }
    });

    // ── messages.update (delivery/read receipts) ──
    sock.ev.on('messages.update', async (updates) => {
      for (const update of updates) {
        try {
          if (update.update?.status) {
            const statusMap: Record<number, string> = {
              2: 'sent',
              3: 'delivered',
              4: 'read',
              5: 'read',
            };

            const status = statusMap[update.update.status];
            if (status && update.key.id) {
              this.eventEmitter.emit(EVENT_NAMES.BAILEYS_MESSAGE_UPDATE, {
                whatsappMessageId: update.key.id,
                status,
                timestamp: Date.now(),
              });
            }
          }
        } catch (error) {
          this.logger.error(
            `Error processing message update ${update.key.id}`,
            error,
          );
        }
      }
    });
  }

  private async issuePairingCode(sock: WASocket, sessionId: string, userId: string): Promise<void> {
    const request = this.pairingRequests.get(sessionId);
    if (!request || this.pairingRequested.has(sock) || sock.authState.creds.registered) return;
    this.pairingRequested.add(sock);

    try {
      const pairingCode = await sock.requestPairingCode(request.phoneNumber);
      request.code = pairingCode;
      request.resolve?.(pairingCode);
      this.wsGateway.emitToUser(userId, 'whatsapp:pairing-code', {
        sessionId,
        pairingCode,
        phoneNumber: `+${request.phoneNumber}`,
      });
      this.logger.log(`Pairing code issued for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to request pairing code for ${sessionId}`, error);
      request.reject?.(error as Error);
    }
  }

  private reportPhoneActivity(sessionId: string, orgId: string, userId: string): void {
    const last = this.phoneActivityReportedAt.get(sessionId) ?? 0;
    if (Date.now() - last < WHATSAPP_CONFIG.PHONE_ACTIVITY_WRITE_INTERVAL_MS) return;
    this.phoneActivityReportedAt.set(sessionId, Date.now());
    this.eventEmitter.emit(EVENT_NAMES.BAILEYS_CONNECTION_UPDATE, {
      sessionId,
      orgId,
      userId,
      event: 'phone_activity',
    });
  }

  private emitDisconnect(
    sessionId: string,
    orgId: string,
    userId: string,
    event: 'disconnected' | 'logout' | 'banned' | 'stopped',
    statusCode: number | undefined,
    disconnectReason: string,
    reason: string,
  ): void {
    this.eventEmitter.emit(EVENT_NAMES.BAILEYS_CONNECTION_UPDATE, {
      sessionId,
      orgId,
      userId,
      event,
      statusCode,
      disconnectReason,
      reason,
    });
  }

  private extractMessagePayload(
    msg: WAMessage,
    sessionId: string,
  ): Record<string, unknown> | null {
    if (msg.key.remoteJid === 'status@broadcast') return null;
    if (msg.key.fromMe) return null;

    const remoteJid = msg.key.remoteJid || '';
    // Accept regular users (@s.whatsapp.net) and LID-addressed users (@lid)
    // Reject group JIDs (@g.us), broadcast, and other non-user JIDs
    if (
      !remoteJid.endsWith('@s.whatsapp.net') &&
      !remoteJid.endsWith('@lid')
    ) {
      return null;
    }

    const contentType = getContentType(msg.message || {});
    if (!contentType) return null;

    // For @lid JIDs, try remoteJidAlt (contains the real phone JID) first
    // Fall back to the LID user part if alt is not available
    let contactPhone: string;
    if (remoteJid.endsWith('@lid')) {
      const altJid = (msg.key as any).remoteJidAlt as string | undefined;
      if (altJid && altJid.endsWith('@s.whatsapp.net')) {
        contactPhone = altJid.split('@')[0];
      } else {
        // Use LID user part as identifier (strip device suffix like ":0")
        contactPhone = remoteJid.split('@')[0].split(':')[0];
        this.logger.warn(
          `LID message without remoteJidAlt — using LID as contact identifier: ${contactPhone}`,
        );
      }
    } else {
      contactPhone = remoteJid.split('@')[0];
    }

    const contactName = msg.pushName || undefined;

    let type = 'TEXT';
    let body: string | undefined;
    let mediaMimeType: string | undefined;
    let mediaSize: number | undefined;

    switch (contentType) {
      case 'conversation':
        type = 'TEXT';
        body = msg.message?.conversation || undefined;
        break;
      case 'extendedTextMessage':
        type = 'TEXT';
        body = msg.message?.extendedTextMessage?.text || undefined;
        break;
      case 'imageMessage':
        type = 'IMAGE';
        body = msg.message?.imageMessage?.caption || undefined;
        mediaMimeType = msg.message?.imageMessage?.mimetype || undefined;
        mediaSize = msg.message?.imageMessage?.fileLength
          ? Number(msg.message.imageMessage.fileLength)
          : undefined;
        break;
      case 'videoMessage':
        type = 'VIDEO';
        body = msg.message?.videoMessage?.caption || undefined;
        mediaMimeType = msg.message?.videoMessage?.mimetype || undefined;
        mediaSize = msg.message?.videoMessage?.fileLength
          ? Number(msg.message.videoMessage.fileLength)
          : undefined;
        break;
      case 'audioMessage':
        type = 'AUDIO';
        mediaMimeType = msg.message?.audioMessage?.mimetype || undefined;
        mediaSize = msg.message?.audioMessage?.fileLength
          ? Number(msg.message.audioMessage.fileLength)
          : undefined;
        break;
      case 'documentMessage':
        type = 'DOCUMENT';
        body = msg.message?.documentMessage?.fileName || undefined;
        mediaMimeType = msg.message?.documentMessage?.mimetype || undefined;
        mediaSize = msg.message?.documentMessage?.fileLength
          ? Number(msg.message.documentMessage.fileLength)
          : undefined;
        break;
      case 'stickerMessage':
        type = 'STICKER';
        mediaMimeType = msg.message?.stickerMessage?.mimetype || undefined;
        break;
      default:
        this.logger.log(`Unsupported message type: ${contentType}`);
        return null;
    }

    const timestamp =
      typeof msg.messageTimestamp === 'number'
        ? msg.messageTimestamp
        : Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000);

    return {
      sessionId,
      whatsappMessageId: msg.key.id || `unknown-${Date.now()}`,
      contactPhone: `+${contactPhone}`,
      contactName,
      type,
      body,
      mediaUrl: undefined,
      mediaMimeType,
      mediaSize,
      timestamp,
    };
  }
}
