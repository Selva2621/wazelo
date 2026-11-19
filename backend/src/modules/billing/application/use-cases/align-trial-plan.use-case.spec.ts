import { OrgType, SubscriptionStatus } from '@prisma/client';
import { AlignTrialPlanUseCase } from './align-trial-plan.use-case';

const teamTrial = { id: 'plan-team', slug: 'free-trial', priceInCents: 0, maxUsers: 3 };
const soloTrial = { id: 'plan-solo', slug: 'free-trial-solo', priceInCents: 0, maxUsers: 1 };

function setup(subscription: Record<string, unknown> | null) {
  const planRepo = {
    findActiveBySlugAndCycle: jest.fn(async (slug: string) => (slug === soloTrial.slug ? soloTrial : teamTrial)),
  };
  const subscriptionRepo = {
    findByOrgWithPlan: jest.fn().mockResolvedValue(subscription),
    updatePlan: jest.fn().mockResolvedValue({ id: 'sub-1' }),
    recordEvent: jest.fn(),
  };
  const usageRepo = { resetUsageForOrg: jest.fn() };
  const useCase = new AlignTrialPlanUseCase(planRepo as any, subscriptionRepo as any, usageRepo as any);
  return { useCase, subscriptionRepo, usageRepo };
}

const trialSub = (plan: typeof teamTrial) => ({
  id: 'sub-1',
  status: SubscriptionStatus.TRIAL,
  planId: plan.id,
  plan,
  currentPeriodStart: new Date('2026-10-01'),
  currentPeriodEnd: new Date('2026-10-15'),
});

describe('AlignTrialPlanUseCase', () => {
  it('moves a team trial to the freelancer trial when the org picks Freelancer', async () => {
    const { useCase, subscriptionRepo, usageRepo } = setup(trialSub(teamTrial));

    await useCase.execute('org-1', OrgType.FREELANCER);

    expect(subscriptionRepo.updatePlan).toHaveBeenCalledWith('sub-1', 'plan-solo', 0);
    expect(usageRepo.resetUsageForOrg).toHaveBeenCalledWith(
      'org-1',
      new Date('2026-10-01'),
      new Date('2026-10-15'),
      expect.objectContaining({ ACTIVE_USERS: 1 }),
    );
  });

  it('does nothing when the trial already matches the org type', async () => {
    const { useCase, subscriptionRepo } = setup(trialSub(teamTrial));
    await useCase.execute('org-1', OrgType.TEAM);
    expect(subscriptionRepo.updatePlan).not.toHaveBeenCalled();
  });

  it('never touches a paid subscription', async () => {
    const paid = { id: 'plan-solo-paid', slug: 'solo-monthly', priceInCents: 29900, maxUsers: 1 };
    const { useCase, subscriptionRepo } = setup({ ...trialSub(teamTrial), status: SubscriptionStatus.ACTIVE, plan: paid, planId: paid.id });
    await useCase.execute('org-1', OrgType.FREELANCER);
    expect(subscriptionRepo.updatePlan).not.toHaveBeenCalled();
  });

  it('does nothing without a subscription', async () => {
    const { useCase, subscriptionRepo } = setup(null);
    await useCase.execute('org-1', OrgType.FREELANCER);
    expect(subscriptionRepo.updatePlan).not.toHaveBeenCalled();
  });
});
