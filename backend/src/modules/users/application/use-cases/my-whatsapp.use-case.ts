import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { INVALID_SIGNUP_PHONE, normalizeSignupPhone } from '@/shared/utils/signup-phone';

/**
 * The signed-in user's own WhatsApp number and "account updates on WhatsApp" consent.
 * Google sign-ups give it at onboarding; the first time a number is saved, Wazelo HQ
 * picks them up as a lead (USER_PHONE_ADDED).
 */
@Injectable()
export class MyWhatsappUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async get(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { phone: true, whatsappOptInAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return { phone: user.phone, whatsappOptIn: !!user.whatsappOptInAt };
  }

  async set(userId: string, orgId: string, input: { phone: string; whatsappOptIn?: boolean }) {
    const phone = normalizeSignupPhone(input.phone);
    if (!phone) throw new BadRequestException(INVALID_SIGNUP_PHONE);

    const before = await this.prisma.user.findFirst({
      where: { id: userId, orgId, deletedAt: null },
      select: { phone: true, whatsappOptInAt: true },
    });
    if (!before) throw new NotFoundException('User not found');

    const optInAt = input.whatsappOptIn ? before.whatsappOptInAt ?? new Date() : null;
    await this.prisma.user.update({
      where: { id: userId },
      // A different number has to be verified again
      data: { phone, whatsappOptInAt: optInAt, ...(before.phone !== phone && { phoneVerifiedAt: null }) },
    });

    if (!before.phone) this.events.emit(EVENT_NAMES.USER_PHONE_ADDED, { userId, orgId });
    return { phone, whatsappOptIn: !!optInAt };
  }
}
