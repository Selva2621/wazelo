import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  AdminDeleteOrgUseCase,
  AdminRestoreOrgUseCase,
  AdminUpdateOrgUseCase,
} from './org-lifecycle.use-cases';

const ctx = { actor: { id: 'sa-1', email: 'a@x.com' }, meta: {} };
const org = { id: 'org-1', name: 'Acme Corp', slug: 'acme', timezone: 'UTC', status: 'ACTIVE', deletedAt: null as Date | null };

function deps(o: Partial<typeof org> | null = {}, slugTaken = false) {
  const repo = {
    findOrgAnyState: jest.fn().mockResolvedValue(o === null ? null : { ...org, ...o }),
    slugTaken: jest.fn().mockResolvedValue(slugTaken),
    updateOrgIdentity: jest.fn(async (_id: string, d: any) => ({ ...org, ...d })),
    softDeleteOrg: jest.fn().mockResolvedValue({ sessionsRevoked: 4, cancelledSubscriptionId: 'sub-1' }),
    restoreOrg: jest.fn(),
  };
  const orgStatus = { invalidate: jest.fn() };
  const events = { emit: jest.fn() };
  const audit = { record: jest.fn() };
  return { repo, orgStatus, events, audit };
}

describe('Org lifecycle', () => {
  it('edits name and time zone, auditing only changes', async () => {
    const d = deps();
    await new AdminUpdateOrgUseCase(d.repo as any, d.audit as any).execute(
      'org-1', { name: 'Acme Ltd', timezone: 'Asia/Kolkata' }, ctx,
    );
    expect(d.repo.updateOrgIdentity).toHaveBeenCalledWith('org-1', { name: 'Acme Ltd', timezone: 'Asia/Kolkata' });
    expect(d.audit.record.mock.calls[0][0].metadata.after).toEqual({ name: 'Acme Ltd', timezone: 'Asia/Kolkata' });
  });

  it('rejects an unknown time zone and a taken slug', async () => {
    await expect(
      new AdminUpdateOrgUseCase(deps().repo as any, { record: jest.fn() } as any).execute('org-1', { timezone: 'Mars/Base' }, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
    const d = deps({}, true);
    await expect(
      new AdminUpdateOrgUseCase(d.repo as any, d.audit as any).execute('org-1', { slug: 'taken' }, ctx),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('delete requires the exact org name, then locks the org out and cancels billing', async () => {
    const d = deps();
    const uc = new AdminDeleteOrgUseCase(d.repo as any, d.orgStatus as any, d.events as any, d.audit as any);
    await expect(uc.execute('org-1', 'Acme', 'closing account', ctx)).rejects.toBeInstanceOf(BadRequestException);
    expect(d.repo.softDeleteOrg).not.toHaveBeenCalled();

    const out = await uc.execute('org-1', ' acme corp ', 'closing account', ctx);
    expect(d.repo.softDeleteOrg).toHaveBeenCalledWith('org-1', 'closing account', 'sa-1');
    expect(d.orgStatus.invalidate).toHaveBeenCalledWith('org-1');
    expect(d.events.emit).toHaveBeenCalled();
    expect(out).toMatchObject({ deleted: true, sessionsRevoked: 4, cancelledSubscriptionId: 'sub-1' });
  });

  it('a deleted org cannot be deleted or edited again', async () => {
    const d = deps({ deletedAt: new Date() });
    await expect(
      new AdminDeleteOrgUseCase(d.repo as any, d.orgStatus as any, d.events as any, d.audit as any).execute('org-1', 'Acme Corp', 'x x x', ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('restores within 30 days only', async () => {
    const recent = deps({ deletedAt: new Date(Date.now() - 5 * 864e5) });
    await new AdminRestoreOrgUseCase(recent.repo as any, recent.orgStatus as any, recent.audit as any).execute('org-1', ctx);
    expect(recent.repo.restoreOrg).toHaveBeenCalledWith('org-1');
    expect(recent.orgStatus.invalidate).toHaveBeenCalled();

    const old = deps({ deletedAt: new Date(Date.now() - 31 * 864e5) });
    await expect(
      new AdminRestoreOrgUseCase(old.repo as any, old.orgStatus as any, old.audit as any).execute('org-1', ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
