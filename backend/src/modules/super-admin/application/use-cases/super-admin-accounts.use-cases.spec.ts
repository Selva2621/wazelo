import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  CreateSuperAdminAccountUseCase,
  ResetSuperAdminTwoFactorUseCase,
  SetSuperAdminDisabledUseCase,
  generateTemporaryPassword,
} from './super-admin-accounts.use-cases';

const me = { id: 'sa-me', email: 'me@x.com' };
const other = { id: 'sa-other', name: 'Other', email: 'o@x.com', disabledAt: null, totpEnabled: true, totpSecret: 'enc' };

function deps(opts: { enabledCount?: number; target?: any; existingEmail?: boolean } = {}) {
  const repo = {
    findById: jest.fn().mockResolvedValue(opts.target === undefined ? other : opts.target),
    findByEmail: jest.fn().mockResolvedValue(opts.existingEmail ? { id: 'x' } : null),
    countEnabled: jest.fn().mockResolvedValue(opts.enabledCount ?? 2),
    setDisabled: jest.fn(),
    setTotp: jest.fn(),
    incrementTokenVersion: jest.fn(),
    create: jest.fn(async (d: any) => ({ id: 'new', ...d })),
  };
  const sessions = { revokeAll: jest.fn().mockResolvedValue(3) };
  const audit = { record: jest.fn() };
  return { repo, sessions, audit };
}

describe('Super admin accounts', () => {
  it('temporary passwords are 16 chars without look-alike characters', () => {
    const pw = generateTemporaryPassword();
    expect(pw).toHaveLength(16);
    expect(pw).not.toMatch(/[0O1lI]/);
  });

  it('creates an account that must change its password, returning the temp password once', async () => {
    const d = deps();
    const out = await new CreateSuperAdminAccountUseCase(d.repo as any, d.audit as any).execute(
      me, { name: ' New ', email: 'New@X.com' }, {},
    );
    expect(out.temporaryPassword).toHaveLength(16);
    expect(d.repo.create.mock.calls[0][0]).toMatchObject({ name: 'New', email: 'new@x.com', createdById: me.id });
    expect(d.repo.create.mock.calls[0][0].passwordHash).not.toBe(out.temporaryPassword);
  });

  it('rejects a duplicate email', async () => {
    const d = deps({ existingEmail: true });
    await expect(
      new CreateSuperAdminAccountUseCase(d.repo as any, d.audit as any).execute(me, { name: 'X', email: 'o@x.com' }, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('disabling revokes every session of that admin', async () => {
    const d = deps();
    await new SetSuperAdminDisabledUseCase(d.repo as any, d.sessions as any, d.audit as any).execute(me, other.id, true, {});
    expect(d.repo.setDisabled).toHaveBeenCalledWith(other.id, true);
    expect(d.sessions.revokeAll).toHaveBeenCalledWith(other.id);
  });

  it('never disables yourself or the last enabled admin', async () => {
    const d = deps({ enabledCount: 1 });
    const uc = new SetSuperAdminDisabledUseCase(d.repo as any, d.sessions as any, d.audit as any);
    await expect(uc.execute(me, me.id, true, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(uc.execute(me, other.id, true, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(d.repo.setDisabled).not.toHaveBeenCalled();
  });

  it('resets 2FA for another admin and signs them out; never for yourself', async () => {
    const d = deps();
    const uc = new ResetSuperAdminTwoFactorUseCase(d.repo as any, d.sessions as any, d.audit as any);
    await expect(uc.execute(me, me.id, {})).rejects.toBeInstanceOf(BadRequestException);
    await uc.execute(me, other.id, {});
    expect(d.repo.setTotp).toHaveBeenCalledWith(other.id, null, false);
    expect(d.repo.incrementTokenVersion).toHaveBeenCalledWith(other.id);
    expect(d.sessions.revokeAll).toHaveBeenCalledWith(other.id);
  });
});
