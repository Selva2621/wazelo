import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export type KbMissChannel = 'WHATSAPP' | 'WIDGET';

/** "Do you have an APP??" and "do you have an app" group as one question. */
export function questionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, 300);
}

/** Questions customers asked that the bot couldn't answer. */
@Injectable()
export class KbMissRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Logs a miss; a repeat bumps the count and reopens it if it was resolved. */
  async record(orgId: string, question: string, channel: KbMissChannel, conversationId?: string | null, retried = false): Promise<void> {
    const text = question.trim().slice(0, 500);
    const key = questionKey(text);
    if (key.length < 3) return; // "?", "ok", emoji: nothing to learn from
    const now = new Date();
    try {
      await this.prisma.kbMiss.upsert({
        where: { orgId_questionKey: { orgId, questionKey: key } },
        create: { orgId, question: text, questionKey: key, channel, lastConversationId: conversationId ?? null, lastAskedAt: now },
        update: {
          question: text,
          count: { increment: 1 },
          channel,
          lastConversationId: conversationId ?? null,
          lastAskedAt: now,
          resolvedAt: null,
        },
      });
    } catch (err) {
      // Two first-time asks at once: the other insert won, so count this one on it
      if (!retried && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return this.record(orgId, question, channel, conversationId, true);
      }
      throw err;
    }
  }

  listOpen(orgId: string, take = 50) {
    return this.prisma.kbMiss.findMany({
      where: { orgId, resolvedAt: null },
      select: { id: true, question: true, count: true, channel: true, lastAskedAt: true },
      orderBy: [{ count: 'desc' }, { lastAskedAt: 'desc' }],
      take,
    });
  }

  countOpen(orgId: string) {
    return this.prisma.kbMiss.count({ where: { orgId, resolvedAt: null } });
  }

  findOpen(id: string, orgId: string) {
    return this.prisma.kbMiss.findFirst({ where: { id, orgId, resolvedAt: null } });
  }

  async resolve(id: string, orgId: string): Promise<boolean> {
    const { count } = await this.prisma.kbMiss.updateMany({ where: { id, orgId, resolvedAt: null }, data: { resolvedAt: new Date() } });
    return count > 0;
  }
}
