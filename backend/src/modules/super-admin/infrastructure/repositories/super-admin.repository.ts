import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { SuperAdmin } from '@prisma/client';

@Injectable()
export class SuperAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<SuperAdmin | null> {
    return this.prisma.superAdmin.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<SuperAdmin | null> {
    return this.prisma.superAdmin.findUnique({ where: { id } });
  }

  /** Public profile fields only — used for ticket assignment. */
  findAll() {
    return this.prisma.superAdmin.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    });
  }

  async recordLogin(id: string): Promise<void> {
    await this.prisma.superAdmin.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  /** Revokes every token issued before this call. */
  async incrementTokenVersion(id: string): Promise<SuperAdmin> {
    return this.prisma.superAdmin.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async setTotp(id: string, totpSecret: string | null, totpEnabled: boolean): Promise<SuperAdmin> {
    return this.prisma.superAdmin.update({ where: { id }, data: { totpSecret, totpEnabled } });
  }
}
