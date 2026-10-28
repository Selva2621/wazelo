import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { BotSettings } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { BotBehaviorRepository, BotSettingsInput } from '../../infrastructure/repositories/bot-behavior.repository';
import { isOpen } from '../../domain/services/bot-hours';

/** REPLY_BLOCKED: the AI's reply failed the safety check (likely a prompt injection), so a person answers instead */
export type HandoffReason = 'ASKED_FOR_PERSON' | 'UNANSWERED' | 'REPLY_BLOCKED' | 'REPLY_LIMIT';

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

  /**
   * Pauses the bot in the chat and returns the message to send the customer.
   * `pauseHours` overrides the org's setting (longer pause for repeat safety stops).
   */
  async handOff(
    orgId: string,
    conversationId: string,
    reason: HandoffReason,
    options: { pauseHours?: number } = {},
  ): Promise<string> {
    const [settings, timezone] = await Promise.all([this.repo.settings(orgId), this.repo.timezone(orgId)]);
    const now = new Date();
    const hours = Math.max(options.pauseHours ?? 0, settings.pauseHours);
    await this.repo.pause(conversationId, orgId, new Date(now.getTime() + hours * 3_600_000));
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

  /** For the inbox: are auto-replies paused in this chat, and until when (null = bots may answer). */
  async chatState(conversationId: string, orgId: string, now = new Date()): Promise<{ pausedUntil: Date | null }> {
    const state = await this.repo.conversationState(conversationId, orgId);
    if (!state) throw new NotFoundException('Conversation not found');
    const until = state.botPausedUntil;
    return { pausedUntil: until && until > now ? until : null };
  }

  /** Inbox "Resume": a person hands the chat back to the bots before the pause ends. */
  async resumeChat(conversationId: string, orgId: string) {
    await this.chatState(conversationId, orgId);
    await this.repo.resume(conversationId, orgId);
    return { pausedUntil: null };
  }

  /** Inbox "Pause": a person takes the chat without replying yet. */
  async pauseChat(conversationId: string, orgId: string) {
    await this.chatState(conversationId, orgId);
    await this.pauseFor(conversationId, orgId);
    return this.chatState(conversationId, orgId);
  }

  /** A person is handling the chat: chatbot and automation replies stay quiet for `pauseHours`. */
  async pauseFor(conversationId: string, orgId: string): Promise<void> {
    const settings = await this.repo.settings(orgId);
    await this.repo.pause(conversationId, orgId, new Date(Date.now() + settings.pauseHours * 3_600_000));
  }

  /** Someone on the team replied in the chat: the bot leaves it to them. */
  @OnEvent(EVENT_NAMES.CONVERSATION_AGENT_REPLIED, { async: true })
  async onAgentReplied(payload: { orgId: string; conversationId: string }): Promise<void> {
    try {
      await this.pauseFor(payload.conversationId, payload.orgId);
    } catch (err) {
      this.logger.warn(`Couldn't pause the bot in conversation ${payload.conversationId}: ${(err as Error).message}`);
    }
  }

  /**
   * Assigned to a person: they own the chat, so bots step back. Unassigned:
   * nobody owns it any more, so bots may answer again.
   */
  @OnEvent(EVENT_NAMES.CONVERSATION_ASSIGNED, { async: true })
  async onAssigned(payload: { orgId: string; conversationId: string; assignedToId: string | null }): Promise<void> {
    try {
      if (payload.assignedToId) await this.pauseFor(payload.conversationId, payload.orgId);
      else await this.repo.resume(payload.conversationId, payload.orgId);
    } catch (err) {
      this.logger.warn(`Couldn't update the bot in conversation ${payload.conversationId}: ${(err as Error).message}`);
    }
  }

  /** A reply typed on the WhatsApp phone counts as a person taking the chat. */
  @OnEvent(EVENT_NAMES.WHATSAPP_PHONE_REPLY, { async: true })
  async onPhoneReply(payload: { orgId: string; sessionId: string; contactPhone: string }): Promise<void> {
    try {
      const settings = await this.repo.settings(payload.orgId);
      await this.repo.pauseByPhone(
        payload.orgId,
        payload.sessionId,
        payload.contactPhone,
        new Date(Date.now() + settings.pauseHours * 3_600_000),
      );
    } catch (err) {
      this.logger.warn(`Couldn't pause the bot after a phone reply: ${(err as Error).message}`);
    }
  }
}
