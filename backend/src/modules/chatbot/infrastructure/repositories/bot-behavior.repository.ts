import { Injectable } from '@nestjs/common';
import { BotSettings } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export type BotSettingsInput = Partial<
  Pick<BotSettings, 'handoffMessage' | 'hoursEnabled' | 'openMinute' | 'closeMinute' | 'openDays' | 'afterHoursMessage' | 'pauseHours'>
>;

/** The org's bot handover/hours settings, and the bot's state in each chat. */
@Injectable()
export class BotBehaviorRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The org's settings; created with the defaults on first use. */
  settings(orgId: string): Promise<BotSettings> {
    return this.prisma.botSettings.upsert({ where: { orgId }, create: { orgId }, update: {} });
  }

  saveSettings(orgId: string, data: BotSettingsInput): Promise<BotSettings> {
    return this.prisma.botSettings.upsert({ where: { orgId }, create: { orgId, ...data }, update: data });
  }

  async timezone(orgId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { timezone: true } });
    return org?.timezone || 'UTC';
  }

  conversationState(conversationId: string, orgId: string) {
    return this.prisma.conversation.findFirst({
      where: { id: conversationId, orgId },
      select: { botPausedUntil: true, botMissStreak: true },
    });
  }

  /** Keeps the bot quiet in the chat until `until`, and clears its miss streak. */
  async pause(conversationId: string, orgId: string, until: Date): Promise<void> {
    await this.prisma.conversation.updateMany({
      where: { id: conversationId, orgId },
      data: { botPausedUntil: until, botMissStreak: 0 },
    });
  }

  /** Pause the chat with this contact on this number (phone numbers are stored with or without "+"). */
  async pauseByPhone(orgId: string, sessionId: string, phone: string, until: Date): Promise<number> {
    const digits = phone.replace(/^\+/, '');
    const { count } = await this.prisma.conversation.updateMany({
      where: { orgId, sessionId, contactPhone: { in: [digits, `+${digits}`] } },
      data: { botPausedUntil: until, botMissStreak: 0 },
    });
    return count;
  }

  /** Bots may answer in the chat again. */
  async resume(conversationId: string, orgId: string): Promise<void> {
    await this.prisma.conversation.updateMany({
      where: { id: conversationId, orgId },
      data: { botPausedUntil: null, botMissStreak: 0 },
    });
  }

  /** One more unanswered question in a row; returns the new streak. */
  async addMiss(conversationId: string): Promise<number> {
    const row = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { botMissStreak: { increment: 1 } },
      select: { botMissStreak: true },
    });
    return row.botMissStreak;
  }

  async clearMisses(conversationId: string): Promise<void> {
    await this.prisma.conversation.updateMany({
      where: { id: conversationId, botMissStreak: { gt: 0 } },
      data: { botMissStreak: 0 },
    });
  }
}
