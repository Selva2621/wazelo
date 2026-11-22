import { Injectable } from '@nestjs/common';
import { OrgType, Prisma, SubscriptionStatus, TokenType, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { generateOrgSlugInTx } from '@/modules/auth/application/services/org-slug';
import { HQ_DEFAULT_TEMPLATES, hqTemplateRows } from '@/modules/hq/domain/services/platform-alerts';

const HQ_SELECT = { id: true, name: true, slug: true, createdAt: true } satisfies Prisma.OrganizationSelect;

export interface CreateHqInput {
  orgName: string;
  orgType: OrgType;
  plan: Omit<Prisma.PlanCreateInput, 'subscriptions'>;
  periodStart: Date;
  periodEnd: Date;
  widget: Omit<Prisma.WidgetConfigUncheckedCreateInput, 'orgId'>;
  admin: {
    superAdminId: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  };
}

@Injectable()
export class WazeloHqRepository {
  constructor(private readonly prisma: PrismaService) {}

  findHq() {
    return this.prisma.organization.findFirst({ where: { isInternal: true, deletedAt: null }, select: HQ_SELECT });
  }

  /** The super admin's HQ user, deleted or not (superAdminId is unique). */
  findHqUser(superAdminId: string) {
    return this.prisma.user.findUnique({
      where: { superAdminId },
      select: { id: true, orgId: true, email: true, status: true, deletedAt: true },
    });
  }

  createHqUser(input: { orgId: string } & CreateHqInput['admin']) {
    return this.prisma.user.create({
      data: {
        orgId: input.orgId,
        email: input.email,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        superAdminId: input.superAdminId,
      },
      select: { id: true, orgId: true, email: true, status: true, deletedAt: true },
    });
  }

  createHandoffToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.verificationToken.create({
      data: { userId, token: tokenHash, type: TokenType.HQ_HANDOFF, expiresAt },
      select: { id: true },
    });
  }

  async emailTaken(email: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { email, deletedAt: null } })) > 0;
  }

  /**
   * HQ org, its permanent ACTIVE subscription on the hidden internal plan (reused if it
   * exists) and the creating super admin's HQ user — all or nothing.
   */
  async createHq(input: CreateHqInput) {
    return this.prisma.$transaction(
      async (tx) => {
        const plan =
          (await tx.plan.findFirst({ where: { slug: input.plan.slug, deletedAt: null } })) ??
          (await tx.plan.create({ data: input.plan }));

        const org = await tx.organization.create({
          data: {
            name: input.orgName,
            slug: await generateOrgSlugInTx(tx, input.orgName),
            orgType: input.orgType,
            isInternal: true,
            // Marks the trial as used so onboarding never hands HQ one
            trialUsedAt: input.periodStart,
          },
          select: HQ_SELECT,
        });

        await tx.subscription.create({
          data: {
            orgId: org.id,
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            billingCycle: plan.billingCycle,
            priceInCents: 0,
            currency: plan.currency,
            currentPeriodStart: input.periodStart,
            currentPeriodEnd: input.periodEnd,
            metadata: { internal: true },
          },
        });

        // The website chat (website-app embeds /widgets/<hq-slug>/embed.js) is on from day one
        await tx.widgetConfig.create({ data: { orgId: org.id, ...input.widget } });

        // Alert + sign-in code templates, ready in HQ's Templates screen
        await tx.messageTemplate.createMany({ data: hqTemplateRows(org.id, HQ_DEFAULT_TEMPLATES) });

        const user = await tx.user.create({
          data: {
            orgId: org.id,
            email: input.admin.email,
            passwordHash: input.admin.passwordHash,
            firstName: input.admin.firstName,
            lastName: input.admin.lastName,
            role: UserRole.ADMIN,
            status: UserStatus.ACTIVE,
            emailVerifiedAt: input.periodStart,
            superAdminId: input.admin.superAdminId,
          },
          select: { id: true, email: true },
        });

        return { org, user, planId: plan.id };
      },
      { timeout: 15_000 },
    );
  }
}
