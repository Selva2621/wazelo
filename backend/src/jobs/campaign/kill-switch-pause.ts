import { EventEmitter2 } from '@nestjs/event-emitter';
import { CampaignStatus } from '@prisma/client';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { EVENT_NAMES } from '@/common/constants';

export const CAMPAIGN_KILL_SWITCH_REASON = 'Campaigns are temporarily disabled platform-wide';

/**
 * Pause a RUNNING campaign because the campaigns kill switch is on. PENDING
 * recipients are left untouched, so a normal resume (after the switch is off)
 * picks up exactly where sending stopped. Returns false if it wasn't RUNNING.
 */
export async function pauseCampaignForKillSwitch(
  campaignRepo: CampaignRepository,
  campaignId: string,
  orgId: string,
  eventEmitter?: EventEmitter2,
): Promise<boolean> {
  const paused = await campaignRepo.transitionStatus(campaignId, CampaignStatus.RUNNING, CampaignStatus.PAUSED);
  if (!paused) return false;

  await campaignRepo.recordEvent({
    campaignId,
    orgId,
    previousStatus: CampaignStatus.RUNNING,
    newStatus: CampaignStatus.PAUSED,
    metadata: { reason: CAMPAIGN_KILL_SWITCH_REASON, triggeredBy: 'platform-kill-switch' },
  });

  eventEmitter?.emit(EVENT_NAMES.CAMPAIGN_PAUSED, { campaignId, orgId, pausedById: null, reason: CAMPAIGN_KILL_SWITCH_REASON });
  return true;
}
