import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, timingSafeEqual } from 'crypto';
import { AuditAction } from '@prisma/client';
import { WhatsAppApiService } from '@/infrastructure/external/whatsapp/whatsapp-api.service';
import { CloudApiClient, CloudApiError } from '@/infrastructure/external/whatsapp/cloud-api.client';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { WhatsAppSessionRepository } from '../../infrastructure/repositories/whatsapp-session.repository';
import { EncryptionService } from '../../domain/services/encryption.service';
import { parseCloudWebhook, verifyCloudSignature } from '../../domain/services/cloud-webhook-parser';
import { ConnectCloudNumberDto, UpdateCloudCredentialsDto } from '../dto/connect-cloud-number.dto';
import { HandleIncomingMessageUseCase } from './handle-incoming-message.use-case';
import { HandleStatusUpdateUseCase } from './handle-status-update.use-case';
import { TemplateRepository } from '@/modules/messages/infrastructure/repositories/template.repository';
import { countTemplateParams, templateBodyText, templateNeedsHeaderImage } from '@/shared/utils/cloud-template';

type CloudSessionRow = NonNullable<Awaited<ReturnType<WhatsAppSessionRepository['findCloudByIdAndOrg']>>>;

/** Official WhatsApp numbers (Meta Cloud API): connect, list, update, remove, webhooks */
@Injectable()
export class CloudNumberUseCase implements OnApplicationBootstrap {
  private readonly logger = new Logger(CloudNumberUseCase.name);

  constructor(
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly encryption: EncryptionService,
    private readonly cloudApi: CloudApiClient,
    private readonly whatsappApi: WhatsAppApiService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly handleIncoming: HandleIncomingMessageUseCase,
    private readonly handleStatus: HandleStatusUpdateUseCase,
    private readonly templateRepo: TemplateRepository,
  ) {}

  /** Make every connected official number sendable after a restart */
  async onApplicationBootstrap(): Promise<void> {
    try {
      // An official number never "reconnects"; undo any socket logic that marked it so
      const healed = await this.sessionRepo.healCloudStatuses();
      if (healed) this.logger.warn(`Set ${healed} official number(s) back to connected`);
      const sessions = await this.sessionRepo.findConnectedCloud();
      for (const s of sessions) {
        if (!s.cloudPhoneNumberId || !s.encryptedCloudToken) continue;
        try {
          this.whatsappApi.registerCloudSession(s.id, {
            phoneNumberId: s.cloudPhoneNumberId,
            accessToken: this.encryption.decrypt(s.encryptedCloudToken),
          });
        } catch (err) {
          this.logger.error(`Couldn't load official number ${s.id}: ${(err as Error).message}`);
        }
      }
      if (sessions.length) this.logger.log(`Loaded ${sessions.length} official WhatsApp number(s)`);
    } catch (err) {
      this.logger.error(`Loading official WhatsApp numbers failed: ${(err as Error).message}`);
    }
  }

  async list(orgId: string) {
    const sessions = await this.sessionRepo.findCloudByOrg(orgId);
    return sessions.map((s) => this.toResponse(s));
  }

  async connect(orgId: string, userId: string, dto: ConnectCloudNumberDto, ip?: string, ua?: string) {
    const existing = await this.sessionRepo.findCloudByPhoneNumberId(dto.phoneNumberId);
    if (existing) {
      throw new ConflictException(
        existing.orgId === orgId
          ? 'This number is already connected'
          : 'This number is connected to another Wazelo workspace',
      );
    }

    // Meta must accept the token for this number before anything is saved
    const info = await this.metaCall(() =>
      this.cloudApi.getPhoneInfo({ phoneNumberId: dto.phoneNumberId, accessToken: dto.accessToken }),
    );

    // Lets incoming messages and statuses reach our webhook. Not fatal: it can be done in Meta too.
    let subscribed = true;
    try {
      await this.cloudApi.subscribeApp(dto.wabaId, dto.accessToken);
    } catch (err) {
      subscribed = false;
      this.logger.warn(`Subscribing app to WABA ${dto.wabaId} failed: ${(err as Error).message}`);
    }

    const session = await this.sessionRepo.createCloud({
      orgId,
      userId,
      phoneNumber: this.normalisePhone(info.displayPhoneNumber),
      phoneNumberId: dto.phoneNumberId,
      wabaId: dto.wabaId,
      encryptedToken: this.encryption.encrypt(dto.accessToken),
      encryptedAppSecret: this.encryption.encrypt(dto.appSecret),
      verifyToken: randomBytes(16).toString('hex'),
      verifiedName: info.verifiedName,
      qualityRating: info.qualityRating,
      messagingTier: info.messagingTier,
    });

    this.whatsappApi.registerCloudSession(session.id, {
      phoneNumberId: dto.phoneNumberId,
      accessToken: dto.accessToken,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.WHATSAPP_SESSION_CONNECTED,
      targetType: 'WhatsAppSession',
      targetId: session.id,
      metadata: { provider: 'CLOUD_API', phoneNumberId: dto.phoneNumberId, wabaId: dto.wabaId },
      ipAddress: ip,
      userAgent: ua,
    });

    // Bring its approved templates in straight away (best effort; there's a Sync button too)
    let templates: { synced: number; approved: number } | null = null;
    try {
      templates = await this.syncTemplates(orgId, session.id);
    } catch (err) {
      this.logger.warn(`Template sync after connect failed for ${session.id}: ${(err as Error).message}`);
    }

    return { ...this.toResponse(session), webhookSubscribed: subscribed, templates };
  }

  /** Re-read name, quality and daily limit from Meta */
  async refresh(orgId: string, id: string) {
    const session = await this.getOwned(orgId, id);
    const info = await this.metaCall(() =>
      this.cloudApi.getPhoneInfo({
        phoneNumberId: session.cloudPhoneNumberId!,
        accessToken: this.encryption.decrypt(session.encryptedCloudToken!),
      }),
    );
    const updated = await this.sessionRepo.updateCloudInfo(id, {
      verifiedName: info.verifiedName,
      qualityRating: info.qualityRating,
      messagingTier: info.messagingTier,
      phoneNumber: this.normalisePhone(info.displayPhoneNumber),
    });
    return this.toResponse(updated);
  }

  async updateCredentials(orgId: string, userId: string, id: string, dto: UpdateCloudCredentialsDto) {
    if (!dto.accessToken && !dto.appSecret) throw new BadRequestException('Nothing to update');
    const session = await this.getOwned(orgId, id);

    if (dto.accessToken) {
      await this.metaCall(() =>
        this.cloudApi.getPhoneInfo({ phoneNumberId: session.cloudPhoneNumberId!, accessToken: dto.accessToken! }),
      );
    }
    const updated = await this.sessionRepo.updateCloudCredentials(id, {
      ...(dto.accessToken && { encryptedToken: this.encryption.encrypt(dto.accessToken) }),
      ...(dto.appSecret && { encryptedAppSecret: this.encryption.encrypt(dto.appSecret) }),
    });
    if (dto.accessToken) {
      this.whatsappApi.registerCloudSession(id, {
        phoneNumberId: session.cloudPhoneNumberId!,
        accessToken: dto.accessToken,
      });
    }

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.WHATSAPP_SESSION_CONNECTED,
      targetType: 'WhatsAppSession',
      targetId: id,
      metadata: { provider: 'CLOUD_API', credentialsUpdated: Object.keys(dto) },
    });
    return this.toResponse(updated);
  }

  async remove(orgId: string, userId: string, id: string, ip?: string, ua?: string) {
    const session = await this.getOwned(orgId, id);
    this.whatsappApi.unregisterCloudSession(id);
    await this.sessionRepo.removeCloud(id);
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.WHATSAPP_SESSION_DISCONNECTED,
      targetType: 'WhatsAppSession',
      targetId: id,
      metadata: { provider: 'CLOUD_API', phoneNumberId: session.cloudPhoneNumberId },
      ipAddress: ip,
      userAgent: ua,
    });
    return { success: true };
  }

  // ───── Templates (Meta-approved) ─────

  /** Pull every template from the number's business account into Wazelo */
  async syncTemplates(orgId: string, id: string) {
    const session = await this.getOwned(orgId, id);
    const templates = await this.metaCall(() =>
      this.cloudApi.listTemplates(session.cloudWabaId!, this.encryption.decrypt(session.encryptedCloudToken!)),
    );
    let approved = 0;
    for (const t of templates) {
      if (!t?.id || !t?.name || !t?.language) continue;
      await this.templateRepo.upsertCloud({
        orgId,
        cloudSessionId: id,
        name: t.name,
        language: t.language,
        category: t.category,
        status: String(t.status ?? 'PENDING').toUpperCase(),
        whatsappTemplateId: t.id,
        components: t.components ?? [],
      });
      if (String(t.status).toUpperCase() === 'APPROVED') approved++;
    }
    return { synced: templates.length, approved };
  }

  /** Approved templates to pick from (one number, or every official number) */
  async listApprovedTemplates(orgId: string, sessionId?: string) {
    const rows = await this.templateRepo.listCloudApproved(orgId, sessionId);
    return rows.map((t) => ({
      id: t.id,
      cloudSessionId: t.cloudSessionId,
      name: t.name,
      language: t.language,
      category: t.category,
      body: templateBodyText(t),
      paramCount: countTemplateParams(t),
      needsHeaderImage: templateNeedsHeaderImage(t),
    }));
  }

  // ───── Webhook (public, called by Meta) ─────

  /** GET handshake: the challenge is echoed only for this number's verify token */
  async verifyWebhook(sessionId: string, mode: string, token: string, challenge: string): Promise<string | null> {
    const session = await this.sessionRepo.findById(sessionId);
    // Meta's challenge is a plain number; echo nothing else
    if (!/^[A-Za-z0-9_-]{1,200}$/.test(challenge ?? '')) return null;
    if (mode !== 'subscribe' || !session?.cloudVerifyToken || !token) return null;
    const a = Buffer.from(token);
    const b = Buffer.from(session.cloudVerifyToken);
    return a.length === b.length && timingSafeEqual(a, b) ? challenge : null;
  }

  /** POST events. Returns false when the signature is wrong (nothing is processed). */
  async receiveWebhook(sessionId: string, rawBody: Buffer | undefined, signature: string | undefined, body: unknown) {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session?.encryptedCloudAppSecret || !rawBody) return false;
    if (!verifyCloudSignature(rawBody, signature, this.encryption.decrypt(session.encryptedCloudAppSecret))) {
      this.logger.warn(`Bad webhook signature for official number ${sessionId}`);
      return false;
    }

    for (const batch of parseCloudWebhook(body)) {
      // Only events for this session's own number
      if (batch.phoneNumberId !== session.cloudPhoneNumberId) continue;
      for (const msg of batch.incoming) {
        await this.handleIncoming.execute({ ...msg, sessionId });
      }
      for (const status of batch.statuses) {
        await this.handleStatus.execute(status);
      }
    }
    return true;
  }

  webhookUrl(sessionId: string): string {
    const base = this.configService.get<string>('API_BASE_URL', '').replace(/\/$/, '');
    return `${base}/webhooks/whatsapp-cloud/${sessionId}`;
  }

  // ───── Helpers ─────

  private async getOwned(orgId: string, id: string): Promise<CloudSessionRow> {
    const session = await this.sessionRepo.findCloudByIdAndOrg(id, orgId);
    if (!session) throw new NotFoundException('Official number not found');
    return session;
  }

  /** Meta errors become a readable 400 instead of a 500 */
  private async metaCall<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof CloudApiError) throw new BadRequestException(`Meta: ${err.message}`);
      throw err;
    }
  }

  private normalisePhone(display: string): string {
    const digits = display.replace(/[^0-9]/g, '');
    return digits ? `+${digits}` : display;
  }

  private toResponse(s: CloudSessionRow) {
    return {
      id: s.id,
      provider: 'CLOUD_API' as const,
      phoneNumber: s.phoneNumber,
      status: s.status,
      phoneNumberId: s.cloudPhoneNumberId,
      wabaId: s.cloudWabaId,
      verifiedName: s.cloudVerifiedName,
      qualityRating: s.cloudQualityRating,
      messagingTier: s.cloudMessagingTier,
      webhookUrl: this.webhookUrl(s.id),
      // Not a secret: Meta needs it pasted in the webhook setup
      verifyToken: s.cloudVerifyToken,
      hasAppSecret: !!s.encryptedCloudAppSecret,
      connectedAt: s.linkedAt ?? s.createdAt,
      lastCheckedAt: s.lastHeartbeatAt,
    };
  }
}
