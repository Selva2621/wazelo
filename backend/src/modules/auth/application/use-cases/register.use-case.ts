import {
  Injectable,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole, UserStatus, TokenType, UsageMetricType } from '@prisma/client';
import { RegisterDto } from '../dto/register.dto';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { OrgService } from '@/modules/org/domain/services/org.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { PasswordService } from '../../domain/services/password.service';
import { TokenService } from '../../domain/services/token.service';
import { TokenRepository } from '../../infrastructure/repositories/token.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES, EVENT_NAMES, SAFE_AUTH_MESSAGE } from '@/common/constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { SeedOrgPermissionsUseCase } from '@/modules/rbac/application/use-cases';
import { RebuildOrgMemoryUseCase } from '@/modules/org/application/use-cases/rebuild-org-memory.use-case';

export interface RegisterResult {
  message: string;
}

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly orgService: OrgService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly tokenRepository: TokenRepository,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly seedOrgPermissionsUseCase: SeedOrgPermissionsUseCase,
    private readonly rebuildOrgMemoryUseCase: RebuildOrgMemoryUseCase,
  ) {}

  async execute(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<RegisterResult> {
    const email = dto.email.toLowerCase().trim();

    // Check email uniqueness — return safe message to prevent enumeration
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      // Log the attempt but return a safe message
      this.logger.warn(`Registration attempt with existing email: ${email}`);
      return { message: SAFE_AUTH_MESSAGE };
    }

    // Hash password before transaction
    const passwordHash = await this.passwordService.hash(dto.password);

    // Create org + user + verification token in a transaction
    const { user, verificationToken } = await this.prisma.$transaction(
      async (tx) => {
        // Create organization
        const org = await tx.organization.create({
          data: {
            name: dto.organizationName,
            slug: await this.generateSlugInTx(tx, dto.organizationName),
          },
        });

        // Create user as admin
        const newUser = await tx.user.create({
          data: {
            orgId: org.id,
            email,
            passwordHash,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            role: UserRole.ADMIN,
            status: UserStatus.PENDING_VERIFICATION,
          },
        });

        // Create verification token
        const token = this.tokenService.generateSecureToken();
        const expiryHours = this.configService.get<number>(
          'auth.verificationTokenExpiryHours',
          24,
        );
        const expiresAt = new Date(
          Date.now() + expiryHours * 60 * 60 * 1000,
        );

        const verToken = await tx.verificationToken.create({
          data: {
            userId: newUser.id,
            token,
            type: TokenType.EMAIL_VERIFICATION,
            expiresAt,
          },
        });

        return { user: newUser, org, verificationToken: verToken };
      },
      {
        timeout: 10000,
        isolationLevel: 'Serializable',
      },
    );

    // Auto-subscribe new org to the free-trial plan (non-blocking)
    this.autoAssignTrial(user.orgId, user.id).catch((err) => {
      this.logger.error(
        `Failed to auto-assign trial for org ${user.orgId}: ${err.message}`,
      );
    });

    // Seed default RBAC permissions for the new org (non-blocking)
    this.seedOrgPermissionsUseCase.execute(user.orgId).catch((err) => {
      this.logger.error(
        `Failed to seed permissions for org ${user.orgId}: ${err.message}`,
      );
    });

    // Initialize AI memory for the new org (non-blocking)
    this.rebuildOrgMemoryUseCase.execute(user.orgId).catch((err) => {
      this.logger.error(
        `Failed to initialize AI memory for org ${user.orgId}: ${err.message}`,
      );
    });

    // Audit log (fire-and-forget, won't break main flow)
    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'USER_REGISTERED',
      targetType: 'User',
      targetId: user.id,
      metadata: { email, role: UserRole.ADMIN },
      ipAddress,
      userAgent,
    });

    // Queue verification email
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    await this.queueService.publish(QUEUE_NAMES.SEND_EMAIL, {
      type: 'verification',
      to: email,
      firstName: dto.firstName,
      token: verificationToken.token,
      verificationUrl: `${frontendUrl}/auth/verify-email?token=${verificationToken.token}`,
    });

    // Audit: email sent
    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'EMAIL_VERIFICATION_SENT',
      targetType: 'VerificationToken',
      targetId: verificationToken.id,
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.USER_REGISTERED, {
      userId: user.id,
      orgId: user.orgId,
      email,
    });

    return { message: SAFE_AUTH_MESSAGE };
  }

  private async autoAssignTrial(orgId: string, userId: string): Promise<void> {
    const trialPlan = await this.prisma.plan.findFirst({
      where: { isDefault: true, isActive: true, deletedAt: null },
    });
    if (!trialPlan || trialPlan.trialDays <= 0) return;

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialPlan.trialDays * 24 * 60 * 60 * 1000);

    await this.prisma.subscription.create({
      data: {
        orgId,
        planId: trialPlan.id,
        status: 'TRIAL',
        billingCycle: trialPlan.billingCycle,
        priceInCents: 0,
        currency: trialPlan.currency,
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt,
      },
    });

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { trialUsedAt: now },
    });

    const limitMap: Record<string, number> = {
      [UsageMetricType.MESSAGES_SENT]: trialPlan.maxMessagesPerMonth,
      [UsageMetricType.ACTIVE_USERS]: trialPlan.maxUsers,
      [UsageMetricType.WHATSAPP_SESSIONS]: trialPlan.maxWhatsappSessions,
      [UsageMetricType.CAMPAIGN_EXECUTIONS]: trialPlan.maxCampaignsPerMonth,
      [UsageMetricType.API_CALLS]: trialPlan.maxMessagesPerMonth,
    };

    for (const [metricType, limitValue] of Object.entries(limitMap)) {
      await this.prisma.usageRecord.create({
        data: {
          orgId,
          metricType: metricType as UsageMetricType,
          currentValue: 0,
          limitValue,
          periodStart: now,
          periodEnd: trialEndsAt,
        },
      });
    }

    this.logger.log(`Auto-assigned free trial to org ${orgId}`);
  }

  private async generateSlugInTx(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    name: string,
  ): Promise<string> {
    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    if (!baseSlug) {
      baseSlug = 'org';
    }

    let slug = baseSlug;
    let attempt = 0;

    while (true) {
      const count = await tx.organization.count({
        where: { slug, deletedAt: null },
      });
      if (count === 0) break;
      attempt++;
      const suffix = `-${attempt}`;
      slug = baseSlug.slice(0, 100 - suffix.length) + suffix;
    }

    return slug;
  }
}
