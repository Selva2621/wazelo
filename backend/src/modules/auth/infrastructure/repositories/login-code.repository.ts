import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { sendableTemplateStatus } from '@/modules/hq/domain/services/platform-alerts';

/** Sign-in codes sent on WhatsApp — only their hashes */
@Injectable()
export class LoginCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async sentSince(userId: string, since: Date): Promise<Date[]> {
    const rows = await this.prisma.loginCode.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    });
    return rows.map((r) => r.createdAt);
  }

  create(data: { userId: string; codeHash: string; expiresAt: Date }) {
    return this.prisma.loginCode.create({ data, select: { id: true } });
  }

  /** The newest code that can still be used */
  latestOpen(userId: string) {
    return this.prisma.loginCode.findFirst({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true, attempts: true },
    });
  }

  async addAttempt(id: string): Promise<number> {
    const row = await this.prisma.loginCode.update({
      where: { id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    return row.attempts;
  }

  /**
   * Wazelo HQ can send codes: a live HQ org with a connected WhatsApp number and a
   * code template it can send (QR: saved text; official number: Meta-approved).
   * (Read here, not through the HQ module, so auth doesn't depend on it; the code
   * itself is sent by the HQ event handler.)
   */
  async hqCanSendCodes(templateName: string): Promise<boolean> {
    const hq = await this.prisma.organization.findFirst({
      where: { isInternal: true, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!hq) return false;
    const session = await this.prisma.whatsAppSession.findFirst({
      where: { orgId: hq.id, deletedAt: null, status: 'CONNECTED' },
      orderBy: { lastActiveAt: 'desc' },
      select: { provider: true },
    });
    if (!session) return false;
    const template = await this.prisma.messageTemplate.findFirst({
      where: { orgId: hq.id, name: templateName, deletedAt: null, ...sendableTemplateStatus(session.provider) },
      select: { id: true },
    });
    return !!template;
  }

  /** Uses the code up — false if another request already did */
  async markUsed(id: string): Promise<boolean> {
    const { count } = await this.prisma.loginCode.updateMany({ where: { id, usedAt: null }, data: { usedAt: new Date() } });
    return count === 1;
  }
}
