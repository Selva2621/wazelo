import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CampaignRecipientStatus,
  CampaignStatus,
  MessageDirection,
  MessageStatus,
  SequenceRecipientStatus,
  SequenceStatus,
} from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { EVENT_NAMES } from '@/common/constants';
import { WhatsAppNumberLostEvent, WhatsAppSessionDisconnectedEvent } from '../event-bus';
import { isNumberLost } from '@/modules/whatsapp/domain/services/disconnect-classifier';

/**
 * When a WhatsApp number is logged out, banned or disconnected for good, hold everything queued on it
 * so nothing keeps hammering a dead number and nothing is lost:
 * - running campaigns → PAUSED (resume re-sends pending recipients)
 * - active sequences → PAUSED
 * - queued messages → FAILED with a clear reason; campaign recipients go back
 *   to PENDING so a resumed campaign sends them again
 */
@Injectable()
export class WhatsAppNumberLostHandler {
  private readonly logger = new Logger(WhatsAppNumberLostHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignRepo: CampaignRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Logged out / banned: the number is gone, so every queued message on it is held. */
  @OnEvent(EVENT_NAMES.WHATSAPP_NUMBER_LOST)
  async onNumberLost(event: WhatsAppNumberLostEvent): Promise<void> {
    await this.holdWork(event, { bulkOnly: false });
  }

  /**
   * Any other final disconnect (reconnect gave up, opened elsewhere, unlinked by the
   * user or an admin): pause campaigns/sequences and hold only bulk messages.
   * One-to-one inbox replies are left to the send worker, which reports them as
   * "Session not connected" individually instead of failing them all at once.
   * Logged out / banned already arrive as WHATSAPP_NUMBER_LOST.
   */
  @OnEvent(EVENT_NAMES.WHATSAPP_SESSION_DISCONNECTED)
  async onSessionDisconnected(event: WhatsAppSessionDisconnectedEvent): Promise<void> {
    if (isNumberLost(event.disconnectReason)) return;
    await this.holdWork(
      { ...event, disconnectReason: event.disconnectReason ?? 'DISCONNECTED' },
      { bulkOnly: true },
    );
  }

  /** Admin force-disconnect: same as a normal disconnect. */
  @OnEvent(EVENT_NAMES.WHATSAPP_SESSION_FORCE_DISCONNECTED)
  async onSessionForceDisconnected(event: WhatsAppSessionDisconnectedEvent): Promise<void> {
    await this.onSessionDisconnected({ ...event, disconnectReason: event.disconnectReason ?? 'FORCE_DISCONNECTED' });
  }

  private async holdWork(event: WhatsAppNumberLostEvent, options: { bulkOnly: boolean }): Promise<void> {
    try {
      const pausedCampaigns = await this.pauseCampaigns(event);
      const pausedSequences = await this.pauseSequences(event);
      const heldMessages = await this.holdQueuedMessages(event, options);

      this.logger.warn(
        `Number unavailable on session ${event.sessionId} (${event.disconnectReason}): ` +
          `paused ${pausedCampaigns} campaigns, ${pausedSequences} sequences, held ${heldMessages} messages`,
      );
    } catch (error) {
      this.logger.error(`Failed to hold work for lost session ${event.sessionId}: ${error}`);
    }
  }

  private async pauseCampaigns(event: WhatsAppNumberLostEvent): Promise<number> {
    // Campaigns whose main number this is, and campaigns that send some of their
    // remaining batches from it (multi-number campaigns)
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        orgId: event.orgId,
        status: CampaignStatus.RUNNING,
        deletedAt: null,
        OR: [
          { sessionId: event.sessionId },
          {
            recipients: {
              some: {
                sessionId: event.sessionId,
                status: { in: [CampaignRecipientStatus.PENDING, CampaignRecipientStatus.QUEUED] },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    let paused = 0;
    for (const { id } of campaigns) {
      const ok = await this.campaignRepo.transitionStatus(id, CampaignStatus.RUNNING, CampaignStatus.PAUSED);
      if (!ok) continue;
      paused++;

      await this.campaignRepo.recordEvent({
        campaignId: id,
        orgId: event.orgId,
        previousStatus: CampaignStatus.RUNNING,
        newStatus: CampaignStatus.PAUSED,
        metadata: { reason: event.reason, triggeredBy: 'whatsapp-number-lost', disconnectReason: event.disconnectReason },
      });
      this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_PAUSED, {
        campaignId: id,
        orgId: event.orgId,
        pausedById: null,
        reason: event.reason,
      });
    }
    return paused;
  }

  private async pauseSequences(event: WhatsAppNumberLostEvent): Promise<number> {
    const result = await this.prisma.campaignSequence.updateMany({
      where: {
        orgId: event.orgId,
        sessionId: event.sessionId,
        status: SequenceStatus.ACTIVE,
        deletedAt: null,
      },
      data: { status: SequenceStatus.PAUSED },
    });
    return result.count;
  }

  private async holdQueuedMessages(
    event: WhatsAppNumberLostEvent,
    options: { bulkOnly: boolean },
  ): Promise<number> {
    const messages = await this.prisma.message.findMany({
      where: {
        sessionId: event.sessionId,
        direction: MessageDirection.OUTBOUND,
        deletedAt: null,
        status: { in: [MessageStatus.QUEUED, MessageStatus.PROCESSING] },
        // Bulk lane = negative priority (campaigns, sequences)
        ...(options.bulkOnly && { priority: { lt: 0 } }),
      },
      select: { id: true },
    });

    const reason = `WhatsApp number unavailable (${event.disconnectReason})`;
    for (const { id } of messages) {
      await this.prisma.$transaction([
        // Free the idempotency key so a resumed campaign can create a fresh message
        this.prisma.message.update({
          where: { id },
          data: {
            status: MessageStatus.FAILED,
            failedReason: reason,
            processingAt: null,
            nextRetryAt: null,
            idempotencyKey: null,
          },
        }),
        this.prisma.campaignRecipient.updateMany({
          where: { messageId: id, status: CampaignRecipientStatus.QUEUED },
          data: { status: CampaignRecipientStatus.PENDING, messageId: null, claimedAt: null },
        }),
      ]);
      await this.rewindSequenceStep(id);
    }
    return messages.length;
  }

  /**
   * A sequence recipient is advanced as soon as its step message is queued, so
   * a held step would be skipped for good. Move the recipient back to that step
   * (due immediately) and drop the step record, so resuming the sequence sends it.
   */
  private async rewindSequenceStep(messageId: string): Promise<void> {
    const recipientStep = await this.prisma.sequenceRecipientStep.findFirst({
      where: { messageId },
      select: {
        id: true,
        recipientId: true,
        step: { select: { sequenceId: true, stepOrder: true } },
      },
    });
    if (!recipientStep) return;

    // currentStep is the 0-based index (by stepOrder) of the next step to send
    const stepIndex = await this.prisma.campaignSequenceStep.count({
      where: {
        sequenceId: recipientStep.step.sequenceId,
        stepOrder: { lt: recipientStep.step.stepOrder },
      },
    });

    await this.prisma.$transaction([
      this.prisma.sequenceRecipientStep.delete({ where: { id: recipientStep.id } }),
      this.prisma.sequenceRecipient.updateMany({
        where: {
          id: recipientStep.recipientId,
          status: { in: [SequenceRecipientStatus.ACTIVE, SequenceRecipientStatus.COMPLETED] },
        },
        data: {
          status: SequenceRecipientStatus.ACTIVE,
          currentStep: stepIndex,
          nextStepAt: new Date(),
          completedAt: null,
        },
      }),
    ]);
  }
}
