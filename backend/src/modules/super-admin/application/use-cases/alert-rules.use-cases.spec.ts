import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeleteAlertRuleUseCase, UpdateAlertRuleUseCase } from './create-alert-rule.use-case';

const rule = { id: 'r-1', name: 'High error rate', metric: 'errors', condition: 'gt', threshold: 10, enabled: true };
const actor = { id: 'sa-1', email: 'a@x.com' };

function service(opts: { rule?: typeof rule | null; deleteResult?: 'deleted' | 'has_history' } = {}) {
  return {
    getAlertRule: jest.fn().mockResolvedValue(opts.rule === undefined ? rule : opts.rule),
    updateAlertRule: jest.fn().mockResolvedValue({ ...rule, enabled: false }),
    deleteAlertRuleIfUnused: jest.fn().mockResolvedValue(opts.deleteResult ?? 'deleted'),
  };
}

describe('Alert rule management', () => {
  it('pauses a rule and audits only what changed', async () => {
    const svc = service();
    const audit = { record: jest.fn() };
    await new UpdateAlertRuleUseCase(svc as any, audit as any).execute('r-1', { enabled: false }, actor, {});
    expect(svc.updateAlertRule).toHaveBeenCalledWith('r-1', { enabled: false });
    expect(audit.record.mock.calls[0][0].metadata).toMatchObject({
      before: { enabled: true },
      after: { enabled: false },
    });
  });

  it('404s an unknown rule', async () => {
    const svc = service({ rule: null });
    await expect(
      new UpdateAlertRuleUseCase(svc as any, { record: jest.fn() } as any).execute('x', { enabled: false }, actor, {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a rule that never fired', async () => {
    const svc = service();
    const audit = { record: jest.fn() };
    await expect(new DeleteAlertRuleUseCase(svc as any, audit as any).execute('r-1', actor, {})).resolves.toEqual({
      deleted: true,
    });
    expect(audit.record).toHaveBeenCalled();
  });

  it('refuses to delete a rule with history (disable instead)', async () => {
    const svc = service({ deleteResult: 'has_history' });
    const audit = { record: jest.fn() };
    await expect(new DeleteAlertRuleUseCase(svc as any, audit as any).execute('r-1', actor, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(audit.record).not.toHaveBeenCalled();
  });
});
