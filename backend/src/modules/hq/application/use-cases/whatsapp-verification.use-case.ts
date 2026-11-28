import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { renderCloudTemplate } from '@/shared/utils/cloud-template';
import { REDACT_AFTER_SEND } from '@/shared/utils/message-redaction';
import { ContactRepository } from '@/modules/contacts/infrastructure/repositories/contact.repository';
import { OutboundMessageService } from '@/modules/messages/application/services/outbound-message.service';
import { HqLeadsRepository } from '../../infrastructure/repositories/hq-leads.repository';
import {
  OTP_MAX_ATTEMPTS,
  OTP_TEMPLATE,
  OTP_TTL_MS,
  VERIFIED_TAG,
  canSendOtp,
  hashOtp,
  newOtpCode,
  otpMatches,
} from '../../domain/services/whatsapp-otp';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A signed-in user confirms their own WhatsApp number with a code sent from
 * Wazelo HQ's number. Optional: nothing is blocked without it. Only for the
 * caller's own saved number, so it can't be used to message anyone else.
 */
@Injectable()
export class WhatsappVerificationUseCase {
  private readonly logger = new Logger(WhatsappVerificationUseCase.name);

  constructor(
    private readonly repo: HqLeadsRepository,
    private readonly outbound: OutboundMessageService,
    private readonly contacts: ContactRepository,
  ) {}

  /** Whether the number is verified, and whether Wazelo can send codes right now */
  async status(userId: string) {
    const user = await this.repo.findUserPhone(userId);
    const sender = await this.sender();
    return {
      phone: user?.phone ?? null,
      verified: !!user?.phone && !!user.phoneVerifiedAt,
      available: !!sender && !!user && user.orgId !== sender.hqId,
    };
  }

  async send(userId: string): Promise<{ sent: true; expiresInSeconds: number }> {
    const user = await this.repo.findUserPhone(userId);
    if (!user?.phone) throw new BadRequestException('Add your WhatsApp number first');
    if (user.phoneVerifiedAt) throw new BadRequestException('Your WhatsApp number is already verified');

    const sender = await this.sender();
    if (!sender || user.orgId === sender.hqId) {
      throw new ServiceUnavailableException("WhatsApp verification isn't available right now. You can skip it.");
    }

    const block = canSendOtp(await this.repo.verificationsSentSince(userId, new Date(Date.now() - DAY_MS)));
    if (block?.reason === 'cooldown') {
      throw new HttpException(`Wait ${block.retryInSeconds}s before asking for another code`, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (block?.reason === 'daily_limit') {
      throw new HttpException('Too many codes today. Try again tomorrow.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = newOtpCode();
    const record = await this.repo.createVerification({
      userId,
      phone: user.phone,
      codeHash: hashOtp(userId, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    const rendered = renderCloudTemplate(sender.template, [code], (t) => t);
    await this.outbound.send({
      orgId: sender.hqId,
      sessionId: sender.sessionId,
      contactPhone: user.phone,
      body: rendered.body,
      type: MessageType.TEXT,
      idempotencyKey: `hq-otp:${record.id}`,
      // redactAfterSend: the code is wiped from the stored message once it is sent
      metadata: { platformAlert: 'verification_code', cloudTemplate: rendered.cloudTemplate, [REDACT_AFTER_SEND]: true },
    });
    return { sent: true, expiresInSeconds: OTP_TTL_MS / 1000 };
  }

  async confirm(userId: string, code: string): Promise<{ verified: true }> {
    const user = await this.repo.findUserPhone(userId);
    if (!user?.phone) throw new BadRequestException('Add your WhatsApp number first');
    if (user.phoneVerifiedAt) return { verified: true };

    const open = await this.repo.latestOpenVerification(userId, user.phone);
    if (!open || open.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('This code has expired. Send a new one.');
    }
    if (!otpMatches(userId, code, open.codeHash)) {
      const tries = await this.repo.addAttempt(open.id);
      const left = OTP_MAX_ATTEMPTS - tries;
      throw new BadRequestException(left > 0 ? `Wrong code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Wrong code. Send a new one.');
    }
    if (!(await this.repo.markVerified(open.id, userId, user.phone))) {
      throw new BadRequestException('This code has expired. Send a new one.');
    }

    await this.tagInHq(user.orgId, userId).catch((err) =>
      this.logger.warn(`Couldn't tag verified number in HQ: ${err instanceof Error ? err.message : err}`),
    );
    return { verified: true };
  }

  /** HQ's number and a code template it can send, or null when either is missing */
  private async sender() {
    const hqId = await this.repo.findHqId();
    if (!hqId) return null;
    const [sessionId, template] = await Promise.all([
      this.repo.findHqSessionId(hqId),
      this.repo.findSendableTemplate(hqId, OTP_TEMPLATE),
    ]);
    return sessionId && template ? { hqId, sessionId, template } : null;
  }

  /** "whatsapp-verified" on the person's HQ contact, for campaign targeting */
  private async tagInHq(customerOrgId: string, userId: string) {
    const hqId = await this.repo.findHqId();
    if (!hqId) return;
    const contact = await this.repo.findContactForOrg(hqId, customerOrgId);
    if (!contact) return;
    const tag = await this.contacts.findOrCreateTag(hqId, VERIFIED_TAG);
    await this.contacts.addTagToContact(contact.id, tag.id, hqId, contact.ownerId);
    this.logger.log(`User ${userId} verified their WhatsApp number`);
  }
}
