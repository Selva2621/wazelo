import { BadRequestException } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { ListKillSwitchesUseCase, SetKillSwitchUseCase } from './kill-switches.use-cases';

const actor = { id: 'sa-1', email: 'ops@x.com' };
const at = new Date('2026-10-11T09:00:00Z');

function deps(current: Record<string, unknown> | null = null) {
  let stored = current;
  const repo = {
    findOne: jest.fn(async () => stored),
    disable: jest.fn(async (feature: string, reason: string, by: string) => {
      stored = { feature, disabled: true, reason, disabledById: by, disabledAt: at, updatedAt: at };
      return stored;
    }),
    enable: jest.fn(async (feature: string) => {
      stored = { feature, disabled: false, reason: null, disabledById: null, disabledAt: null, updatedAt: at };
      return stored;
    }),
  };
  const killSwitches = { invalidate: jest.fn() };
  const audit = { record: jest.fn() };
  const uc = new SetKillSwitchUseCase(repo as any, killSwitches as any, audit as any);
  return { repo, killSwitches, audit, uc };
}

describe('SetKillSwitchUseCase', () => {
  it('disables a feature, invalidates the cache and audits KILL_SWITCH_ON with the reason', async () => {
    const d = deps();
    const out = await d.uc.execute('campaigns', { disabled: true, reason: ' WhatsApp ban wave ' }, actor, {});

    expect(d.repo.disable).toHaveBeenCalledWith('campaigns', 'WhatsApp ban wave', 'sa-1');
    expect(d.killSwitches.invalidate).toHaveBeenCalled();
    expect(d.audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: PlatformAuditAction.KILL_SWITCH_ON,
      targetType: 'Feature',
      targetId: 'campaigns',
      metadata: expect.objectContaining({ feature: 'campaigns', reason: 'WhatsApp ban wave' }),
    }));
    expect(out).toMatchObject({ feature: 'campaigns', disabled: true, reason: 'WhatsApp ban wave', disabledById: 'sa-1' });
  });

  it('re-enables a feature and audits KILL_SWITCH_OFF with the previous reason', async () => {
    const d = deps({ feature: 'ai', disabled: true, reason: 'LLM outage', disabledById: 'sa-2', disabledAt: at, updatedAt: at });
    const out = await d.uc.execute('ai', { disabled: false }, actor, {});

    expect(d.repo.enable).toHaveBeenCalledWith('ai');
    expect(d.killSwitches.invalidate).toHaveBeenCalled();
    expect(d.audit.record.mock.calls[0][0]).toMatchObject({
      action: PlatformAuditAction.KILL_SWITCH_OFF,
      metadata: { feature: 'ai', previousReason: 'LLM outage', disabledSince: at.toISOString() },
    });
    expect(out).toMatchObject({ feature: 'ai', disabled: false, reason: null });
  });

  it('requires a reason to disable, and rejects unknown features', async () => {
    const d = deps();
    await expect(d.uc.execute('campaigns', { disabled: true }, actor, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(d.uc.execute('billing', { disabled: true, reason: 'nope nope' }, actor, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(d.repo.disable).not.toHaveBeenCalled();
    expect(d.audit.record).not.toHaveBeenCalled();
  });

  it('does nothing (no write, no audit) when the state is unchanged', async () => {
    const d = deps();
    await d.uc.execute('shopify', { disabled: false }, actor, {});
    expect(d.repo.enable).not.toHaveBeenCalled();
    expect(d.killSwitches.invalidate).not.toHaveBeenCalled();
    expect(d.audit.record).not.toHaveBeenCalled();
  });
});

describe('ListKillSwitchesUseCase', () => {
  it('returns all features and resolves who disabled them', async () => {
    const repo = {
      findAll: jest.fn().mockResolvedValue([
        { feature: 'automation', disabled: true, reason: 'loop bug', disabledById: 'sa-1', disabledAt: at, updatedAt: at },
      ]),
    };
    const admins = { findAllAccounts: jest.fn().mockResolvedValue([{ id: 'sa-1', name: 'Ops', email: 'ops@x.com' }]) };
    const out = await new ListKillSwitchesUseCase(repo as any, admins as any).execute();

    expect(out).toHaveLength(5);
    expect(out.find((s) => s.feature === 'automation')).toMatchObject({
      disabled: true, reason: 'loop bug', disabledBy: { id: 'sa-1', name: 'Ops', email: 'ops@x.com' },
    });
    expect(out.find((s) => s.feature === 'api')).toMatchObject({ disabled: false, disabledBy: null });
  });

  it('skips the admin lookup when nothing is disabled', async () => {
    const admins = { findAllAccounts: jest.fn() };
    await new ListKillSwitchesUseCase({ findAll: jest.fn().mockResolvedValue([]) } as any, admins as any).execute();
    expect(admins.findAllAccounts).not.toHaveBeenCalled();
  });
});
