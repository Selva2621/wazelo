import { randomBytes } from 'crypto';
import { ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformAuditAction, Prisma, UserStatus } from '@prisma/client';
import { hash } from 'bcrypt';
import { QUEUE_NAMES } from '@/common/constants';
import { publicFrontendUrl } from '@/config/public-urls';
import { HqSetupStatusUseCase } from '@/modules/hq/application/use-cases/hq-setup-status.use-case';
import { HQ_HANDOFF_TTL_MS, hashHqHandoffCode, hqHandoffUrl, newHqHandoffCode } from '@/shared/utils/hq-handoff';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';
import { WazeloHqRepository } from '../../infrastructure/repositories/wazelo-hq.repository';
import { PlatformAuditService } from '../services/platform-audit.service';
import { AdminActionContext } from './org-management.use-cases';
import {
  HQ_ORG_NAME,
  HQ_ORG_TYPE,
  HQ_PERIOD_END,
  HQ_WIDGET,
  hqUserEmail,
  internalPlanData,
  splitName,
} from '../../domain/services/wazelo-hq';

/** HQ admin login details for a super admin: their name, and their email unless it is already a tenant login. */
async function hqAdminFor(superAdminId: string, superAdminRepo: SuperAdminRepository, hqRepo: WazeloHqRepository) {
  const superAdmin = await superAdminRepo.findById(superAdminId);
  if (!superAdmin) throw new NotFoundException('Super admin account not found');
  return {
    superAdminId: superAdmin.id,
    email: hqUserEmail(superAdmin.email, await hqRepo.emailTaken(superAdmin.email.trim().toLowerCase())),
    ...splitName(superAdmin.name),
    // Nobody signs in to HQ with a password — it is opened from the super admin portal
    passwordHash: await hash(randomBytes(32).toString('hex'), 12),
  };
}

/** Whether Wazelo HQ exists yet, which org it is, and what it still needs to WhatsApp customers. */
@Injectable()
export class GetWazeloHqUseCase {
  constructor(
    private readonly hqRepo: WazeloHqRepository,
    private readonly setupStatus: HqSetupStatusUseCase,
  ) {}

  async execute() {
    const org = await this.hqRepo.findHq();
    return { exists: !!org, org, setup: org ? await this.setupStatus.execute(org.id) : null };
  }
}

/**
 * Creates Wazelo HQ — once. The org gets a permanent subscription on the hidden internal
 * plan (every feature on, no limits, no billing) and the creating super admin an HQ
 * admin login. Default pipeline, tags and templates are seeded by the onboarding job
 * (without a trial).
 */
@Injectable()
export class CreateWazeloHqUseCase {
  private readonly logger = new Logger(CreateWazeloHqUseCase.name);

  constructor(
    private readonly hqRepo: WazeloHqRepository,
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly queue: QueueService,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(ctx: AdminActionContext) {
    if (await this.hqRepo.findHq()) throw new ConflictException('Wazelo HQ already exists');

    const now = new Date();
    let created: Awaited<ReturnType<WazeloHqRepository['createHq']>>;
    try {
      created = await this.hqRepo.createHq({
        orgName: HQ_ORG_NAME,
        orgType: HQ_ORG_TYPE,
        plan: internalPlanData(now),
        periodStart: now,
        periodEnd: HQ_PERIOD_END,
        widget: HQ_WIDGET,
        admin: await hqAdminFor(ctx.actor.id, this.superAdminRepo, this.hqRepo),
      });
    } catch (err) {
      // Two clicks at once: the single-HQ unique index lets only one through
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Wazelo HQ already exists');
      }
      throw err;
    }

    await this.queue.publishOnce(
      QUEUE_NAMES.ORG_ONBOARDING,
      { orgId: created.org.id, mode: 'backfill' },
      `org-onboarding:${created.org.id}`,
    );

    await this.audit.record({
      action: PlatformAuditAction.HQ_CREATED,
      actor: ctx.actor,
      targetType: 'Organization',
      targetId: created.org.id,
      orgId: created.org.id,
      metadata: { orgName: created.org.name, slug: created.org.slug, hqUserEmail: created.user.email },
      meta: ctx.meta,
    });

    this.logger.log(`Wazelo HQ created (${created.org.id}) by ${ctx.actor.email ?? ctx.actor.id}`);
    return { exists: true, org: created.org };
  }
}

/**
 * Opens HQ for the calling super admin: their HQ admin user (created on first open)
 * gets a one-time code, valid 60s, that the tenant app trades for a normal session.
 */
@Injectable()
export class OpenWazeloHqUseCase {
  constructor(
    private readonly hqRepo: WazeloHqRepository,
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly config: ConfigService,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(ctx: AdminActionContext, next?: string) {
    const hq = await this.hqRepo.findHq();
    if (!hq) throw new NotFoundException('Create Wazelo HQ first');

    let user = await this.hqRepo.findHqUser(ctx.actor.id);
    if (!user) {
      user = await this.hqRepo.createHqUser({ orgId: hq.id, ...(await hqAdminFor(ctx.actor.id, this.superAdminRepo, this.hqRepo)) });
    }
    if (user.orgId !== hq.id || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Your Wazelo HQ login was removed or suspended by an HQ admin');
    }

    const code = newHqHandoffCode();
    await this.hqRepo.createHandoffToken(user.id, hashHqHandoffCode(code), new Date(Date.now() + HQ_HANDOFF_TTL_MS));

    await this.audit.record({
      action: PlatformAuditAction.HQ_OPENED,
      actor: ctx.actor,
      targetType: 'User',
      targetId: user.id,
      orgId: hq.id,
      metadata: { hqUserEmail: user.email },
      meta: ctx.meta,
    });

    const frontendUrl = this.config.get<string>('app.frontendUrl') || publicFrontendUrl();
    return { url: hqHandoffUrl(frontendUrl, code, next), expiresInSeconds: HQ_HANDOFF_TTL_MS / 1000 };
  }
}
