import { BadRequestException } from '@nestjs/common';
import { SuperAdminUpdatePlanUseCase } from './super-admin-plans.use-cases';

const actor = { id: 'admin-1', email: 'a@x.com' };
const plan = { id: 'plan-v1', name: 'Pro', slug: 'pro', version: 1, isActive: true, maxUsers: 5, priceInCents: 1000 };

function setup(subscribers: number, current = plan) {
  const planRepo = {
    findById: jest.fn().mockResolvedValue(current),
    countLiveSubscribers: jest.fn().mockResolvedValue(new Map(subscribers ? [[current.id, subscribers]] : [])),
    createNextVersion: jest.fn().mockResolvedValue({ ...current, id: 'plan-v2', version: 2 }),
  };
  const updatePlan = { execute: jest.fn().mockResolvedValue({ plan: { ...current } }) };
  const audit = { record: jest.fn() };
  const useCase = new SuperAdminUpdatePlanUseCase(updatePlan as any, planRepo as any, audit as any);
  return { useCase, planRepo, updatePlan, audit };
}

describe('SuperAdminUpdatePlanUseCase', () => {
  it('requires a choice when limits change on a plan with subscribers', async () => {
    const s = setup(12);
    await expect(s.useCase.execute(actor, plan.id, { maxUsers: 10 }, undefined, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(s.updatePlan.execute).not.toHaveBeenCalled();
  });

  it('needs no choice for edits that never reach existing subscribers (price, name, active toggle)', async () => {
    const s = setup(12);
    await s.useCase.execute(actor, plan.id, { priceInCents: 2000, name: 'Pro+', isActive: false }, undefined, {});
    expect(s.updatePlan.execute).toHaveBeenCalled();
  });

  it('needs no choice when nobody is on the plan', async () => {
    const s = setup(0);
    await s.useCase.execute(actor, plan.id, { maxUsers: 10 }, undefined, {});
    expect(s.updatePlan.execute).toHaveBeenCalled();
  });

  it('apply_to_all edits in place and reports who was affected', async () => {
    const s = setup(12);
    const out = await s.useCase.execute(actor, plan.id, { maxUsers: 10 }, 'apply_to_all', {});
    expect(s.updatePlan.execute).toHaveBeenCalledWith(plan.id, actor.id, { maxUsers: 10 });
    expect(s.planRepo.createNextVersion).not.toHaveBeenCalled();
    expect(out.subscribersAffected).toBe(12);
  });

  it('new_version publishes the next version and leaves the current one untouched', async () => {
    const s = setup(12);
    const out = await s.useCase.execute(actor, plan.id, { maxUsers: 10 }, 'new_version', {});
    expect(s.planRepo.createNextVersion).toHaveBeenCalledWith(plan, { maxUsers: 10 });
    expect(s.updatePlan.execute).not.toHaveBeenCalled();
    expect(out.plan.id).toBe('plan-v2');
    expect(s.audit.record.mock.calls[0][0].metadata).toMatchObject({
      previousPlanId: plan.id, newVersion: 2, subscribersKeptOnPrevious: 12,
    });
  });

  it('refuses a new version of an already retired version', async () => {
    const s = setup(3, { ...plan, isActive: false });
    await expect(s.useCase.execute(actor, plan.id, { maxUsers: 10 }, 'new_version', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
