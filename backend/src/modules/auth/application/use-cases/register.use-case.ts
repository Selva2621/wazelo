import {
  Injectable,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole, UserStatus, TokenType } from '@prisma/client';
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
import { generateOrgSlugInTx } from '../services/org-slug';

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
            slug: await generateOrgSlugInTx(tx, dto.organizationName),
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

    // Seed trial, permissions, AI memory and default master data (retried by pg-boss)
    await this.queueService.publishOnce(
      QUEUE_NAMES.ORG_ONBOARDING,
      { orgId: user.orgId, mode: 'signup' },
      `org-onboarding:${user.orgId}`,
    );

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
}
