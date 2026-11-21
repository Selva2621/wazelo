import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { AlignTrialPlanUseCase } from '@/modules/billing/application/use-cases/align-trial-plan.use-case';

interface OrgSettingsUpdatedPayload {
  orgId: string;
  changes?: { orgType?: { from: string; to: string } };
}

/** Org type picked or changed: move a running free trial to the freelancer/team trial. */
@Injectable()
export class TrialPlanEventsHandler {
  private readonly logger = new Logger(TrialPlanEventsHandler.name);

  constructor(private readonly alignTrialPlan: AlignTrialPlanUseCase) {}

  @OnEvent(EVENT_NAMES.ORG_SETTINGS_UPDATED)
  async onOrgSettingsUpdated(payload: OrgSettingsUpdatedPayload): Promise<void> {
    const orgType = payload.changes?.orgType?.to;
    if (!orgType) return;
    try {
      await this.alignTrialPlan.execute(payload.orgId, orgType);
    } catch (err) {
      this.logger.error(`Could not align trial plan for org ${payload.orgId}: ${(err as Error).message}`);
    }
  }
}
