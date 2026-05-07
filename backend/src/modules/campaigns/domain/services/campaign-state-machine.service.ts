import { Injectable, BadRequestException } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';

/**
 * Valid campaign status transitions:
 *
 *   DRAFT      → SCHEDULED, RUNNING, CANCELLED
 *   SCHEDULED  → RUNNING, CANCELLED
 *   RUNNING    → PAUSED, COMPLETED, FAILED, CANCELLED
 *   PAUSED     → RUNNING (resume), CANCELLED
 *   COMPLETED  → (terminal)
 *   FAILED     → (terminal)
 *   CANCELLED  → (terminal)
 */
const VALID_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.DRAFT]: [
    CampaignStatus.SCHEDULED,
    CampaignStatus.RUNNING,
    CampaignStatus.CANCELLED,
  ],
  [CampaignStatus.SCHEDULED]: [
    CampaignStatus.RUNNING,
    CampaignStatus.CANCELLED,
  ],
  [CampaignStatus.RUNNING]: [
    CampaignStatus.PAUSED,
    CampaignStatus.COMPLETED,
    CampaignStatus.FAILED,
    CampaignStatus.CANCELLED,
  ],
  [CampaignStatus.PAUSED]: [
    CampaignStatus.RUNNING,
    CampaignStatus.CANCELLED,
  ],
  [CampaignStatus.COMPLETED]: [],
  [CampaignStatus.FAILED]: [],
  [CampaignStatus.CANCELLED]: [],
};

@Injectable()
export class CampaignStateMachineService {
  canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  assertTransition(from: CampaignStatus, to: CampaignStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(
        `Invalid campaign status transition: ${from} → ${to}`,
      );
    }
  }
}
