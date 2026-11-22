import { UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { hashHqHandoffCode } from '@/shared/utils/hq-handoff';
import { ExchangeHqHandoffUseCase } from './hq-handoff.use-case';

const CODE = 'a'.repeat(43);

function setup(over: { userId?: string | null; user?: Record<string, unknown> | null; internal?: boolean; suspended?: boolean } = {}) {
  const user =
    over.user === null
      ? null
      : { id: 'u1', orgId: 'hq', email: 'selva@wazelo.io', role: 'ADMIN', status: UserStatus.ACTIVE, deletedAt: null, superAdminId: 'sa1', ...over.user };
  const deps = {
    tokens: { consume: jest.fn().mockResolvedValue(over.userId === undefined ? 'u1' : over.userId) },
    users: { findById: jest.fn().mockResolvedValue(user), updateLastLogin: jest.fn() },
    orgStatus: {
      isInternal: jest.fn().mockResolvedValue(over.internal ?? true),
      isSuspended: jest.fn().mockResolvedValue(over.suspended ?? false),
    },
    sessions: { issue: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', expiresIn: 900 }) },
    audit: { log: jest.fn() },
  };
  const uc = new ExchangeHqHandoffUseCase(
    deps.tokens as any,
    deps.users as any,
    deps.orgStatus as any,
    deps.sessions as any,
    deps.audit as any,
  );
  return { uc, deps };
}

describe('ExchangeHqHandoffUseCase', () => {
  it('consumes the hashed code and starts a non-remembered session', async () => {
    const { uc, deps } = setup();
    await expect(uc.execute(CODE, '1.2.3.4', 'UA')).resolves.toEqual({ refreshToken: 'rt' });
    expect(deps.tokens.consume).toHaveBeenCalledWith(hashHqHandoffCode(CODE), 'HQ_HANDOFF');
    expect(deps.sessions.issue).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }), {
      rememberMe: false,
      ipAddress: '1.2.3.4',
      userAgent: 'UA',
    });
  });

  it('refuses an unknown, expired or used code', async () => {
    const { uc, deps } = setup({ userId: null });
    await expect(uc.execute(CODE)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(deps.sessions.issue).not.toHaveBeenCalled();
  });

  it.each([
    ['a user that is not an HQ super admin user', { user: { superAdminId: null } }],
    ['a suspended user', { user: { status: UserStatus.SUSPENDED } }],
    ['a deleted user', { user: { deletedAt: new Date() } }],
    ['a user outside HQ', { internal: false }],
    ['a suspended org', { suspended: true }],
  ])('refuses %s', async (_label, over) => {
    const { uc, deps } = setup(over as any);
    await expect(uc.execute(CODE)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(deps.sessions.issue).not.toHaveBeenCalled();
  });
});
