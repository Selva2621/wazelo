import { OrgType } from '@prisma/client';
import { OnboardOrgUseCase } from './onboard-org.use-case';
import {
  FREELANCER_SYSTEM_TEMPLATES,
  SHOPIFY_SYSTEM_TEMPLATES,
} from '@/shared/constants/system-templates';

const ORG_ID = 'org-1';

function setup(
  overrides: { org?: Record<string, unknown> | null; hasAny?: boolean; existingTemplates?: string[] } = {},
) {
  const hasAny = jest.fn().mockResolvedValue(overrides.hasAny ?? false);
  const orgRepository = {
    findById: jest.fn().mockResolvedValue(
      overrides.org === null
        ? null
        : {
            id: ORG_ID,
            orgType: OrgType.CRM,
            trialUsedAt: null,
            onboardedAt: null,
            timezone: 'UTC',
            ...overrides.org,
          },
    ),
  };
  const repo = {
    findFirstAdminId: jest.fn().mockResolvedValue('admin-1'),
    markOnboarded: jest.fn(),
    hasAnySubscription: jest.fn().mockResolvedValue(false),
    findDefaultTrialPlan: jest.fn().mockResolvedValue({
      id: 'plan-1',
      trialDays: 14,
      maxMessagesPerMonth: 1000,
      maxUsers: 3,
      maxWhatsappSessions: 1,
      maxCampaignsPerMonth: 10,
    }),
    createTrialSubscription: jest.fn(),
    hasAiMemory: jest.fn().mockResolvedValue(false),
    hasAnyPipeline: hasAny,
    createDefaultPipeline: jest.fn(),
    hasAnyTag: hasAny,
    createTags: jest.fn(),
    hasAnyCannedResponse: hasAny,
    createCannedResponses: jest.fn(),
    hasAnyLeadScoringRule: hasAny,
    createLeadScoringRules: jest.fn(),
    hasAnySlaPolicy: hasAny,
    createSlaPolicies: jest.fn(),
    findTemplateNames: jest.fn().mockResolvedValue(new Set(overrides.existingTemplates ?? [])),
    createSystemTemplates: jest.fn(),
  };
  const rbacService = { seedDefaultPermissionsForOrg: jest.fn() };
  const orgAiMemory = { rebuild: jest.fn() };

  const useCase = new OnboardOrgUseCase(
    orgRepository as never,
    repo as never,
    rbacService as never,
    orgAiMemory as never,
  );
  return { useCase, repo, rbacService, orgAiMemory };
}

describe('OnboardOrgUseCase', () => {
  it('signup: seeds everything including the trial, then marks the org onboarded', async () => {
    const { useCase, repo, rbacService, orgAiMemory } = setup();

    await useCase.execute(ORG_ID, 'signup');

    expect(repo.createTrialSubscription).toHaveBeenCalledTimes(1);
    expect(rbacService.seedDefaultPermissionsForOrg).toHaveBeenCalledWith(ORG_ID);
    expect(orgAiMemory.rebuild).toHaveBeenCalledWith(ORG_ID);
    expect(repo.createDefaultPipeline).toHaveBeenCalledTimes(1);
    expect(repo.createTags).toHaveBeenCalledTimes(1);
    expect(repo.createCannedResponses).toHaveBeenCalledWith(ORG_ID, 'admin-1', expect.any(Array));
    expect(repo.createLeadScoringRules).toHaveBeenCalledTimes(1);
    expect(repo.createSlaPolicies).toHaveBeenCalledWith(ORG_ID, 'admin-1', 'UTC', expect.any(Array));
    expect(repo.createSystemTemplates).toHaveBeenCalledWith(ORG_ID, SHOPIFY_SYSTEM_TEMPLATES);
    expect(repo.markOnboarded).toHaveBeenCalledWith(ORG_ID);
  });

  it('backfill: never assigns a trial to an existing org', async () => {
    const { useCase, repo } = setup();

    await useCase.execute(ORG_ID, 'backfill');

    expect(repo.hasAnySubscription).not.toHaveBeenCalled();
    expect(repo.createTrialSubscription).not.toHaveBeenCalled();
    expect(repo.createTags).toHaveBeenCalledTimes(1);
    expect(repo.markOnboarded).toHaveBeenCalledWith(ORG_ID);
  });

  it('skips an org that is already onboarded', async () => {
    const { useCase, repo, rbacService } = setup({ org: { onboardedAt: new Date() } });

    await useCase.execute(ORG_ID, 'backfill');

    expect(rbacService.seedDefaultPermissionsForOrg).not.toHaveBeenCalled();
    expect(repo.createTags).not.toHaveBeenCalled();
    expect(repo.markOnboarded).not.toHaveBeenCalled();
  });

  it('does not recreate collections the org has (or had) and keeps an existing AI memory', async () => {
    const { useCase, repo, orgAiMemory } = setup({ org: { trialUsedAt: new Date() }, hasAny: true });
    repo.hasAiMemory.mockResolvedValue(true);

    await useCase.execute(ORG_ID, 'signup');

    expect(repo.createTrialSubscription).not.toHaveBeenCalled();
    expect(orgAiMemory.rebuild).not.toHaveBeenCalled();
    expect(repo.createDefaultPipeline).not.toHaveBeenCalled();
    expect(repo.createTags).not.toHaveBeenCalled();
    expect(repo.createCannedResponses).not.toHaveBeenCalled();
    expect(repo.createLeadScoringRules).not.toHaveBeenCalled();
    expect(repo.createSlaPolicies).not.toHaveBeenCalled();
  });

  it('org-type-changed: only adds the missing templates, even for an onboarded org', async () => {
    const existing = SHOPIFY_SYSTEM_TEMPLATES.map((t) => t.name);
    const { useCase, repo, rbacService } = setup({
      org: { orgType: OrgType.FREELANCER, onboardedAt: new Date() },
      existingTemplates: existing,
    });

    await useCase.execute(ORG_ID, 'org-type-changed');

    expect(repo.createSystemTemplates).toHaveBeenCalledWith(ORG_ID, FREELANCER_SYSTEM_TEMPLATES);
    expect(rbacService.seedDefaultPermissionsForOrg).not.toHaveBeenCalled();
    expect(repo.createTags).not.toHaveBeenCalled();
    expect(repo.markOnboarded).not.toHaveBeenCalled();
  });

  it('does nothing when the org no longer exists', async () => {
    const { useCase, repo, rbacService } = setup({ org: null });

    await useCase.execute(ORG_ID, 'signup');

    expect(rbacService.seedDefaultPermissionsForOrg).not.toHaveBeenCalled();
    expect(repo.createTags).not.toHaveBeenCalled();
  });
});
