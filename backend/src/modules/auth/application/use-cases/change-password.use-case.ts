import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PasswordService } from '../../domain/services/password.service';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async execute(userId: string, oldPassword: string, newPassword: string): Promise<void> {
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

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  }
}
