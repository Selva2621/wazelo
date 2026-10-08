import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import {
  OnboardOrgUseCase,
  OnboardingMode,
} from '@/modules/org/application/use-cases/onboard-org.use-case';
import { QUEUE_NAMES } from '@/common/constants';
import PgBoss from 'pg-boss';

export interface OrgOnboardingJob {
  orgId: string;
  /** Missing on jobs queued before modes existed — those were signups */
  mode?: OnboardingMode;
}

/**
 * Seeds default master data for an org. Published on signup, on orgType
 * change, and by prisma/backfill-org-onboarding.js. Throwing lets pg-boss retry.
 */
@Injectable()
export class OrgOnboardingWorker implements OnModuleInit {
  private readonly logger = new Logger(OrgOnboardingWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly onboardOrgUseCase: OnboardOrgUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<OrgOnboardingJob>(
      QUEUE_NAMES.ORG_ONBOARDING,
      async (job: PgBoss.Job<OrgOnboardingJob>) => {
        await this.onboardOrgUseCase.execute(job.data.orgId, job.data.mode ?? 'signup');
      },
    );
    this.logger.log('Org onboarding worker subscribed');
  }
}
