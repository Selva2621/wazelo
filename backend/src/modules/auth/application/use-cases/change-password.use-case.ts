import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PasswordService } from '../../domain/services/password.service';
import { hashRefreshToken } from '../../infrastructure/repositories/session.repository';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * @param currentRefreshToken the caller's own refresh token; its session is kept and
   *   every other active session is revoked (a password change usually means "kick out
   *   whoever else has access"). Omitted → all sessions are revoked.
   */
  async execute(
    userId: string,
    oldPassword: string,
    newPassword: string,
    currentRefreshToken?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isValid = await this.passwordService.verify(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const newHash = await this.passwordService.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      this.prisma.session.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(currentRefreshToken
            ? { NOT: { refreshToken: hashRefreshToken(currentRefreshToken) } }
            : {}),
        },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
