import {
  Injectable,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserStatus, TokenType } from '@prisma/client';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserRepository } from '../../infrastructure/repositories/user.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { PasswordService } from '@/modules/auth/domain/services/password.service';
import { TokenService } from '@/modules/auth/domain/services/token.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { User } from '@prisma/client';

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    createdById: string,
    dto: CreateUserDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<User> {
    const email = dto.email.toLowerCase().trim();

    // Check if email exists globally
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists',
      );
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(dto.password);

    // Create user + verification token in transaction
    const { user, verificationToken } = await this.prisma.$transaction(
      async (tx) => {
        // Double-check inside transaction
        const existsCheck = await tx.user.count({
          where: { email, deletedAt: null },
        });
        if (existsCheck > 0) {
          throw new ConflictException(
            'A user with this email already exists',
          );
        }

        const newUser = await tx.user.create({
          data: {
            orgId,
            email,
            passwordHash,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            role: dto.role,
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

        return { user: newUser, verificationToken: verToken };
      },
      {
        timeout: 10000,
        isolationLevel: 'Serializable',
      },
    );

    // Queue verification email
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    await this.queueService.publish(QUEUE_NAMES.SEND_EMAIL, {
      type: 'verification',
      to: email,
      firstName: dto.firstName,
      token: verificationToken.token,
      verificationUrl: `${frontendUrl}/auth/verify-email?token=${verificationToken.token}`,
    });

    // Audit log
    await this.auditService.log({
      orgId,
      userId: createdById,
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: user.id,
      metadata: { email, role: dto.role, createdById },
      ipAddress,
      userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.USER_CREATED, {
      orgId,
      userId: user.id,
      email,
      role: dto.role,
      createdById,
    });

    this.logger.log(
      `User ${createdById} created user ${user.id} (${email}) in org ${orgId}`,
    );

    return user;
  }
}
