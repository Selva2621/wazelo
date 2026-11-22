import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { hashOtp } from '@/modules/hq/domain/services/whatsapp-otp';
import { WhatsappLoginUseCase } from './whatsapp-login.use-case';

const SENT = 'If this account has a verified WhatsApp number, we sent a sign-in code to it.';

function setup(over: { user?: any; ready?: boolean; sent?: Date[]; open?: any; markUsed?: boolean; suspended?: boolean } = {}) {
  const user =
    over.user === null
      ? null
      : {
          id: 'u1',
          orgId: 'o1',
          email: 'priya@acme.io',
          firstName: 'Priya',
          lastName: 'S',
          role: 'ADMIN',
          status: UserStatus.ACTIVE,
          phone: '+919000000001',
          phoneVerifiedAt: new Date(),
          superAdminId: null,
          lockedUntil: null,
          ...over.user,
        };
  const deps = {
    users: { findByEmail: jest.fn().mockResolvedValue(user), resetFailedAttempts: jest.fn(), updateLastLogin: jest.fn() },
    orgs: { findById: jest.fn().mockResolvedValue({ orgType: 'TEAM' }) },
    codes: {
      sentSince: jest.fn().mockResolvedValue(over.sent ?? []),
      create: jest.fn().mockResolvedValue({ id: 'lc1' }),
      latestOpen: jest.fn().mockResolvedValue(over.open === undefined ? { id: 'lc1', codeHash: hashOtp('u1', '123456'), attempts: 0 } : over.open),
      addAttempt: jest.fn(),
      markUsed: jest.fn().mockResolvedValue(over.markUsed ?? true),
      hqCanSendCodes: jest.fn().mockResolvedValue(over.ready ?? true),
    },
    orgStatus: { isSuspended: jest.fn().mockResolvedValue(over.suspended ?? false) },
    sessions: { issue: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt', expiresIn: 900 }) },
    audit: { log: jest.fn() },
    events: { emit: jest.fn() },
  };
  const uc = new WhatsappLoginUseCase(
    deps.users as any, deps.orgs as any, deps.codes as any, deps.orgStatus as any,
    deps.sessions as any, deps.audit as any, deps.events as any,
  );
  /** Codes handed to HQ to send */
  const sentCodes = () => deps.events.emit.mock.calls.filter((c) => c[0] === 'auth.login_code_requested').map((c) => c[1]);
  return { uc, sentCodes, ...deps };
}

describe('WhatsappLoginUseCase.send', () => {
  it("sends a code to the account's verified WhatsApp number, storing only its hash", async () => {
    const t = setup();
    await expect(t.uc.send(' Priya@Acme.io ')).resolves.toEqual({ message: SENT });
    expect(t.users.findByEmail).toHaveBeenCalledWith('priya@acme.io');
    const [{ phone, code, idempotencyKey }] = t.sentCodes();
    expect(phone).toBe('+919000000001');
    expect(idempotencyKey).toBe('hq-login:lc1');
    expect(t.codes.create.mock.calls[0][0].codeHash).toBe(hashOtp('u1', code));
  });

  it.each([
    ['no such account', { user: null }],
    ['number not verified', { user: { phoneVerifiedAt: null } }],
    ['no number', { user: { phone: null } }],
    ['email not verified yet', { user: { status: UserStatus.PENDING_VERIFICATION } }],
    ['an HQ user opened from super admin', { user: { superAdminId: 'sa1' } }],
    ['the org is suspended', { suspended: true }],
    ['inside the resend cooldown', { sent: [new Date(Date.now() - 5_000)] }],
  ])('same reply and nothing sent when %s', async (_label, over) => {
    const t = setup(over as any);
    await expect(t.uc.send('priya@acme.io')).resolves.toEqual({ message: SENT });
    expect(t.sentCodes()).toHaveLength(0);
  });

  it('503 for everyone while HQ cannot send (says nothing about the account)', async () => {
    const t = setup({ ready: false });
    await expect(t.uc.send('priya@acme.io')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(t.users.findByEmail).not.toHaveBeenCalled();
  });
});

describe('WhatsappLoginUseCase.verify', () => {
  it('right code: the code is used up and a session starts', async () => {
    const t = setup();
    const res = await t.uc.verify('priya@acme.io', '123456', true, '1.2.3.4', 'UA');
    expect(res).toEqual(expect.objectContaining({ accessToken: 'at', refreshToken: 'rt', user: expect.objectContaining({ id: 'u1', orgType: 'TEAM' }) }));
    expect(t.codes.markUsed).toHaveBeenCalledWith('lc1');
    expect(t.sessions.issue).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1' }), { rememberMe: true, ipAddress: '1.2.3.4', userAgent: 'UA' });
  });

  it('wrong code counts a try', async () => {
    const t = setup();
    await expect(t.uc.verify('priya@acme.io', '000000', false)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(t.codes.addAttempt).toHaveBeenCalledWith('lc1');
    expect(t.sessions.issue).not.toHaveBeenCalled();
  });

  it.each([
    ['no account', { user: null }],
    ['no live code', { open: null }],
    ['5 wrong tries already', { open: { id: 'lc1', codeHash: hashOtp('u1', '123456'), attempts: 5 } }],
    ['the code was used by a parallel request', { markUsed: false }],
    ['the org is suspended', { suspended: true }],
  ])('refused when %s', async (_label, over) => {
    const t = setup(over as any);
    await expect(t.uc.verify('priya@acme.io', '123456', false)).rejects.toBeTruthy();
    expect(t.sessions.issue).not.toHaveBeenCalled();
  });
});
