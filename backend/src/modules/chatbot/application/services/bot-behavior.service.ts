import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { BotSettings } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { BotBehaviorRepository, BotSettingsInput } from '../../infrastructure/repositories/bot-behavior.repository';
import { isOpen } from '../../domain/services/bot-hours';

/** REPLY_BLOCKED: the AI's reply failed the safety check (likely a prompt injection), so a person answers instead */
export type HandoffReason = 'ASKED_FOR_PERSON' | 'UNANSWERED' | 'REPLY_BLOCKED';

/** Questions in a row the bot couldn't answer before it hands the chat over. */
export const MISSES_BEFORE_HANDOFF = 2;

/**
 * When the AI bot steps back for a person: it stays quiet in a chat for
 * `pauseHours` after anyone on the team replies there, and hands over (with the
 * handoff or after-hours message) when asked for a person or stuck.
 */
@Injectable()
export class BotBehaviorService {
  private readonly logger = new Logger(BotBehaviorService.name);

  constructor(
    private readonly repo: BotBehaviorRepository,
    private readonly events: EventEmitter2,
  ) {}

  /** GET /chatbot/behavior: settings plus the org timezone they're read in. */
  async getSettings(orgId: string) {
    const [settings, timezone] = await Promise.all([this.repo.settings(orgId), this.repo.timezone(orgId)]);
    return { ...this.view(settings), timezone, openNow: isOpen(settings, timezone) };
  }

  async saveSettings(orgId: string, input: BotSettingsInput) {
    if (input.openDays) input.openDays = [...new Set(input.openDays)].sort();
    if (input.openMinute !== undefined && input.openMinute === input.closeMinute) {
      throw new BadRequestException('Opening and closing time must be different');
    }
    await this.repo.saveSettings(orgId, input);
    return this.getSettings(orgId);
  }

  private view(s: BotSettings) {
    return {
      handoffMessage: s.handoffMessage,
      hoursEnabled: s.hoursEnabled,
      openMinute: s.openMinute,
      closeMinute: s.closeMinute,
      openDays: s.openDays,
      afterHoursMessage: s.afterHoursMessage,
      pauseHours: s.pauseHours,
    };
  }

  async isPaused(conversationId: string, orgId: string, now = new Date()): Promise<boolean> {
    const state = await this.repo.conversationState(conversationId, orgId);
    return !!state?.botPausedUntil && state.botPausedUntil > now;
  }

  /** Pauses the bot in the chat and returns the message to send the customer. */
  async handOff(orgId: string, conversationId: string, reason: HandoffReason): Promise<string> {
    const [settings, timezone] = await Promise.all([this.repo.settings(orgId), this.repo.timezone(orgId)]);
    const now = new Date();
    await this.repo.pause(conversationId, orgId, new Date(now.getTime() + settings.pauseHours * 3_600_000));
    const open = isOpen(settings, timezone, now);
    this.events.emit(EVENT_NAMES.CHATBOT_SESSION_HANDED_OFF, { orgId, conversationId, reason, teamOpen: open });
    this.logger.log(`Bot handed conversation ${conversationId} to the team (${reason}, ${open ? 'open' : 'after hours'})`);
    return open ? settings.handoffMessage : settings.afterHoursMessage;
  }

  /** Counts an unanswered question; true when it's time to hand over. */
  async missed(conversationId: string): Promise<boolean> {
    return (await this.repo.addMiss(conversationId)) >= MISSES_BEFORE_HANDOFF;
  }

  answered(conversationId: string): Promise<void> {
    return this.repo.clearMisses(conversationId);
  }

  /** Someone on the team replied in the chat: the bot leaves it to them. */
  @OnEvent(EVENT_NAMES.CONVERSATION_AGENT_REPLIED, { async: true })
  async onAgentReplied(payload: { orgId: string; conversationId: string }): Promise<void> {
    try {
      const settings = await this.repo.settings(payload.orgId);
      await this.repo.pause(payload.conversationId, payload.orgId, new Date(Date.now() + settings.pauseHours * 3_600_000));
    } catch (err) {
      this.logger.warn(`Couldn't pause the bot in conversation ${payload.conversationId}: ${(err as Error).message}`);
    }
  }
}
