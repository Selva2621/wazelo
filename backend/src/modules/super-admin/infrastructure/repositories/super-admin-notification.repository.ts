import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface CreateSuperAdminNotificationInput {
  superAdminId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
}

/** Super admin inbox. Every read/write is scoped to the owning super admin. */
@Injectable()
export class SuperAdminNotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(rows: CreateSuperAdminNotificationInput[]): Promise<void> {
    if (!rows.length) return;
    await this.prisma.superAdminNotification.createMany({ data: rows });
  }

  findLatest(superAdminId: string, unreadOnly: boolean, take: number) {
    return this.prisma.superAdminNotification.findMany({
      where: { superAdminId, ...(unreadOnly && { readAt: null }) },
      orderBy: { createdAt: 'desc' },
      take,
      select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
    });
  }

  countUnread(superAdminId: string): Promise<number> {
    return this.prisma.superAdminNotification.count({ where: { superAdminId, readAt: null } });
  }

  exists(id: string, superAdminId: string): Promise<boolean> {
    return this.prisma.superAdminNotification.count({ where: { id, superAdminId } }).then((n) => n > 0);
  }

  async markRead(id: string, superAdminId: string): Promise<void> {
    await this.prisma.superAdminNotification.updateMany({
      where: { id, superAdminId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(superAdminId: string): Promise<number> {
    const { count } = await this.prisma.superAdminNotification.updateMany({
      where: { superAdminId, readAt: null },
      data: { readAt: new Date() },
    });
    return count;
  }
}
