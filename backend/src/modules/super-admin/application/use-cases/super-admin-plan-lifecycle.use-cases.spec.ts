import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import {
  SuperAdminArchivePlanUseCase,
  SuperAdminDeletePlanUseCase,
  SuperAdminUnarchivePlanUseCase,
  SuperAdminUpdatePlanUseCase,
} from './super-admin-plans.use-cases';

const actor = { id: 'admin-1', email: 'a@x.com' };
const plan = {
  id: 'plan-1', name: 'Pro', slug: 'pro', billingCycle: 'MONTHLY', version: 1, isActive: true, archivedAt: null as Date | null,
};

function repo(current: typeof plan | null = plan, history = 0) {
  return {
    findById: jest.fn().mockResolvedValue(current),
    archive: jest.fn().mockResolvedValue({ ...current, isActive: false, archivedAt: new Date() }),
    unarchive: jest.fn().mockResolvedValue({ ...current, archivedAt: null }),
    softDelete: jest.fn(),
    countSubscriptionHistory: jest.fn().mockResolvedValue(history),
    countLiveSubscribers: jest.fn().mockResolvedValue(new Map([[plan.id, 4]])),
  };
}

describe('SuperAdminArchivePlanUseCase', () => {
  it('archives a plan even with live subscribers and records how many keep it', async () => {
    const r = repo();
    const audit = { record: jest.fn() };
    await new SuperAdminArchivePlanUseCase(r as any, audit as any).execute(actor, plan.id, {});
    expect(r.archive).toHaveBeenCalledWith(plan.id);
    expect(r.softDelete).not.toHaveBeenCalled();
    expect(audit.record.mock.calls[0][0]).toMatchObject({
      action: PlatformAuditAction.PLAN_ARCHIVED,
      metadata: { subscribersKept: 4 },
    });
  });

  it('is a no-op on an already archived plan', async () => {
    const r = repo({ ...plan, archivedAt: new Date() });
    const audit = { record: jest.fn() };
    await new SuperAdminArchivePlanUseCase(r as any, audit as any).execute(actor, plan.id, {});
    expect(r.archive).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('404s for an unknown plan', async () => {
    const r = repo(null);
    await expect(
      new SuperAdminArchivePlanUseCase(r as any, { record: jest.fn() } as any).execute(actor, 'x', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('SuperAdminUnarchivePlanUseCase', () => {
  it('unarchives and audits', async () => {
    const r = repo({ ...plan, isActive: false, archivedAt: new Date() });
    const audit = { record: jest.fn() };
    await new SuperAdminUnarchivePlanUseCase(r as any, audit as any).execute(actor, plan.id, {});
    expect(r.unarchive).toHaveBeenCalledWith(plan.id);
    expect(audit.record.mock.calls[0][0].action).toBe(PlatformAuditAction.PLAN_UNARCHIVED);
  });
});

describe('SuperAdminDeletePlanUseCase', () => {
  it('deletes a plan that never had a subscription', async () => {
    const r = repo(plan, 0);
    const audit = { record: jest.fn() };
    await new SuperAdminDeletePlanUseCase(r as any, audit as any).execute(actor, plan.id, {});
    expect(r.softDelete).toHaveBeenCalledWith(plan.id);
    expect(audit.record.mock.calls[0][0].action).toBe(PlatformAuditAction.PLAN_DELETED);
  });

  it('refuses a plan with any subscription history', async () => {
    const r = repo(plan, 2);
    const audit = { record: jest.fn() };
    await expect(
      new SuperAdminDeletePlanUseCase(r as any, audit as any).execute(actor, plan.id, {}),
    ).rejects.toThrow('This plan has subscription history — archive it instead');
    expect(r.softDelete).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});

describe('SuperAdminUpdatePlanUseCase on an archived plan', () => {
  it('refuses to activate it before unarchiving', async () => {
    const r = repo({ ...plan, isActive: false, archivedAt: new Date() });
    const updatePlan = { execute: jest.fn() };
    const uc = new SuperAdminUpdatePlanUseCase(updatePlan as any, r as any, { record: jest.fn() } as any);
    await expect(uc.execute(actor, plan.id, { isActive: true }, undefined, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(updatePlan.execute).not.toHaveBeenCalled();
  });
});
