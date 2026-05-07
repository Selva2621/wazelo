import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import makeWASocket, {
  WASocket,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  getContentType,
  WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import pino from 'pino';
import { BaileysAuthStateService } from './baileys-auth-state.service';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { EVENT_NAMES, WHATSAPP_CONFIG } from '@/common/constants';

@Injectable()
export class BaileysConnectionManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaileysConnectionManager.name);
  private readonly connections = new Map<string, WASocket>();
  private readonly initializing = new Set<string>();

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
    for (const [sessionId, sock] of this.connections) {
      try {
        sock.end(undefined);
        this.logger.log(`Closed socket for session ${sessionId}`);
      } catch (error) {
        this.logger.warn(`Error closing socket ${sessionId}`, error);
      }
    }
    this.connections.clear();
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
      const { version } = await fetchLatestBaileysVersion();

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

  getConnection(sessionId: string): WASocket | undefined {
    return this.connections.get(sessionId);
  }

  isConnected(sessionId: string): boolean {
    return this.connections.has(sessionId);
  }

  async destroyConnection(
    sessionId: string,
    logout: boolean = false,
  ): Promise<void> {
    const sock = this.connections.get(sessionId);
    if (!sock) return;

    try {
      if (logout) {
        await sock.logout();
      } else {
        sock.end(undefined);
      }
    } catch (error) {
      this.logger.warn(`Error destroying connection ${sessionId}`, error);
    }

    this.connections.delete(sessionId);

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
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
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
        const phoneNumber = sock.user?.id?.split(':')[0] || null;

        this.eventEmitter.emit(EVENT_NAMES.BAILEYS_CONNECTION_UPDATE, {
          sessionId,
          orgId,
          userId,
          event: 'connected',
          phoneNumber: phoneNumber ? `+${phoneNumber}` : undefined,
        });
      }

      if (connection === 'close') {
        this.connections.delete(sessionId);

        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        if (loggedOut) {
          // Explicit logout from WhatsApp mobile — clear creds, no reconnect
          await this.authStateService.clearAuthState(sessionId);
          this.eventEmitter.emit(EVENT_NAMES.BAILEYS_CONNECTION_UPDATE, {
            sessionId,
            orgId,
            userId,
            event: 'logout',
            reason: 'Logged out from WhatsApp mobile app',
          });
        } else {
          // ALL other codes: network loss, phone offline, restartRequired, timedOut, etc.
          // Always attempt reconnect — health worker will handle exhaustion
          this.logger.log(
            `Auto-reconnecting session ${sessionId} (statusCode: ${statusCode ?? 'unknown'})`,
          );
          setTimeout(() => {
            this.createConnection(sessionId, userId, orgId).catch((err) => {
              this.logger.error(
                `Auto-reconnect failed for session ${sessionId}: ${err.message}`,
              );
              this.eventEmitter.emit(EVENT_NAMES.BAILEYS_CONNECTION_UPDATE, {
                sessionId,
                orgId,
                userId,
                event: 'disconnected',
                reason: `Auto-reconnect failed: ${err.message}`,
              });
            });
          }, 1500);
        }
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
