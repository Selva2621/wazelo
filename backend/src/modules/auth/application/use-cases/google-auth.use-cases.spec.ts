import { JwtService } from '@nestjs/jwt';
import { NotFoundException } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { QUEUE_NAMES } from '@/common/constants';
import { GoogleOAuthError, GoogleProfile } from '@/infrastructure/external/google/google-oauth.service';
import { GoogleOAuthStateCodec } from '../services/google-oauth-state.service';
import {
  CompleteGoogleAuthUseCase,
  GetAuthProvidersUseCase,
  StartGoogleAuthUseCase,
} from './google-auth.use-cases';

const config = { getOrThrow: () => 'test-refresh-secret' } as any;
const codec = new GoogleOAuthStateCodec(new JwtService({}), config);

const profile: GoogleProfile = {
  sub: 'google-sub-1',
  email: 'priya@acme.io',
  emailVerified: true,
  givenName: 'Priya',
  familyName: 'Raman',
};

function user(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u-1',
    orgId: 'org-1',
    email: 'priya@acme.io',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    lockedUntil: null,
    deletedAt: null,
    ...overrides,
  } as any;
}

function setup(opts: {
  identityUser?: any;
  emailUser?: any;
  signupEnabled?: boolean;
  suspendedOrgs?: string[];
  profile?: Partial<GoogleProfile>;
  configured?: boolean;
  exchangeError?: Error;
} = {}) {
  const tx = {
    organization: {
      create: jest.fn(async ({ data }: any) => ({ id: 'org-new', ...data })),
      count: jest.fn(async () => 0),
    },
    user: {
      create: jest.fn(async ({ data }: any) => ({ id: 'u-new', deletedAt: null, lockedUntil: null, ...data })),
      update: jest.fn(async ({ where, data }: any) => ({ ...(opts.emailUser ?? {}), id: where.id, ...data })),
    },
    verificationToken: { updateMany: jest.fn(async () => ({ count: 1 })) },
  };
  const prisma = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    user: { update: jest.fn(async ({ where, data }: any) => ({ ...(opts.identityUser ?? {}), id: where.id, ...data })) },
  };
  const google = {
    isConfigured: jest.fn(async () => opts.configured ?? true),
    buildAuthUrl: jest.fn(async (p: any) =>
      (opts.configured ?? true) ? `https://accounts.google.com/o/oauth2/v2/auth?state=${p.state}` : null,
    ),
    exchangeCode: jest.fn(async () => {
      if (opts.exchangeError) throw opts.exchangeError;
      return { ...profile, ...opts.profile };
    }),
  };
  const identities = {
    findWithUser: jest.fn(async () => (opts.identityUser ? { id: 'ident-1', user: opts.identityUser } : null)),
    create: jest.fn(async (data: any) => ({ id: 'ident-new', ...data })),
    deleteOrphaned: jest.fn(async () => undefined),
  };
  const users = {
    findByEmail: jest.fn(async () => opts.emailUser ?? null),
    resetFailedAttempts: jest.fn(async () => undefined),
    updateLastLogin: jest.fn(async () => undefined),
  };
  const passwords = { hash: jest.fn(async () => 'unusable-hash') };
  const sessions = { issue: jest.fn(async (_user: any, _opts: any) => ({ accessToken: 'at', refreshToken: 'rt', expiresIn: 900 })) };
  const orgStatus = { isSuspended: jest.fn(async (orgId: string) => (opts.suspendedOrgs ?? []).includes(orgId)) };
  const settings = { get: jest.fn(async () => ({ googleSignupEnabled: opts.signupEnabled ?? false })) };
  const audit = { log: jest.fn(async (_entry: any) => undefined) };
  const queue = { publishOnce: jest.fn(async (_q: string, _d: any, _k: string) => "job-1") };
  const events = { emit: jest.fn() };

  const complete = new CompleteGoogleAuthUseCase(
    prisma as any,
    google as any,
    codec,
    identities as any,
    users as any,
    passwords as any,
    sessions as any,
    orgStatus as any,
    settings as any,
    audit as any,
    queue as any,
    events as any,
  );
  const start = new StartGoogleAuthUseCase(google as any, codec);
  return { tx, prisma, google, identities, users, passwords, sessions, orgStatus, settings, audit, queue, events, complete, start };
}

/** Runs /start, then the callback with Google's code and the same state. */
async function roundTrip(d: ReturnType<typeof setup>, intent: 'signin' | 'signup' = 'signin', rememberMe = false) {
  const { redirectUrl, stateCookie } = await d.start.execute({ intent, rememberMe });
  const state = new URL(redirectUrl).searchParams.get('state')!;
  return d.complete.execute({ code: 'auth-code', state, stateCookie, ipAddress: '1.2.3.4', userAgent: 'jest' });
}

const auditActions = (d: ReturnType<typeof setup>) => d.audit.log.mock.calls.map((c: any[]) => c[0].action);

describe('StartGoogleAuthUseCase', () => {
  it('builds the Google URL with state, nonce and an S256 challenge kept in the signed cookie', async () => {
    const d = setup();
    const { stateCookie } = await d.start.execute({ intent: 'signup', rememberMe: true });
    const args = d.google.buildAuthUrl.mock.calls[0][0];
    const saved = await codec.verify(stateCookie);
    expect(saved).toMatchObject({ state: args.state, nonce: args.nonce, intent: 'signup', rememberMe: true });
    expect(args.codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(args.codeChallenge).not.toBe(saved!.verifier);
  });

  it('404s when Google is not configured', async () => {
    const d = setup({ configured: false });
    await expect(d.start.execute({ intent: 'signin', rememberMe: false })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CompleteGoogleAuthUseCase', () => {
  it('signs up a new user: org + verified ADMIN + identity, onboarding job, no verification email', async () => {
    const d = setup({ signupEnabled: true });
    const out = await roundTrip(d, 'signup', true);

    expect(out).toEqual({ ok: true, refreshToken: 'rt', rememberMe: true, isNewUser: true });
    expect(d.tx.organization.create).toHaveBeenCalledWith({ data: { name: "Priya's workspace", slug: 'priyas-workspace' } });
    expect(d.tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: 'org-new',
        email: 'priya@acme.io',
        passwordHash: 'unusable-hash',
        firstName: 'Priya',
        lastName: 'Raman',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: expect.any(Date),
      }),
    });
    expect(d.identities.create).toHaveBeenCalledWith(
      { userId: 'u-new', provider: 'google', providerUserId: 'google-sub-1', email: 'priya@acme.io' },
      d.tx,
    );
    expect(d.queue.publishOnce).toHaveBeenCalledWith(
      QUEUE_NAMES.ORG_ONBOARDING,
      { orgId: 'org-new', mode: 'signup' },
      'org-onboarding:org-new',
    );
    expect(d.sessions.issue).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u-new', orgId: 'org-new' }),
      { rememberMe: true, ipAddress: '1.2.3.4', userAgent: 'jest' },
    );
    expect(auditActions(d)).toEqual(['USER_REGISTERED', 'LOGIN_SUCCESS']);
    expect(d.audit.log.mock.calls[0][0].metadata).toMatchObject({ method: 'google' });
    expect(auditActions(d)).not.toContain('EMAIL_VERIFICATION_SENT');
  });

  it('passes the PKCE verifier and nonce from the cookie to the code exchange', async () => {
    const d = setup({ identityUser: user() });
    const { redirectUrl, stateCookie } = await d.start.execute({ intent: 'signin', rememberMe: false });
    const saved = await codec.verify(stateCookie);
    await d.complete.execute({ code: 'auth-code', state: new URL(redirectUrl).searchParams.get('state')!, stateCookie });
    expect(d.google.exchangeCode).toHaveBeenCalledWith({ code: 'auth-code', codeVerifier: saved!.verifier, nonce: saved!.nonce });
  });

  it('signs in a user whose Google identity is linked', async () => {
    const d = setup({ identityUser: user() });
    const out = await roundTrip(d);

    expect(out).toEqual({ ok: true, refreshToken: 'rt', rememberMe: false, isNewUser: false });
    expect(d.users.findByEmail).not.toHaveBeenCalled();
    expect(d.prisma.$transaction).not.toHaveBeenCalled();
    expect(d.users.resetFailedAttempts).toHaveBeenCalledWith('u-1');
    expect(d.users.updateLastLogin).toHaveBeenCalledWith('u-1');
    expect(d.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_SUCCESS', userId: 'u-1', metadata: { method: 'google' } }),
    );
  });

  it('links Google to an existing password account when the email is verified', async () => {
    const d = setup({ emailUser: user() });
    const out = await roundTrip(d);

    expect(out).toMatchObject({ ok: true, isNewUser: false });
    expect(d.identities.create).toHaveBeenCalledWith(
      { userId: 'u-1', provider: 'google', providerUserId: 'google-sub-1', email: 'priya@acme.io' },
      d.tx,
    );
    // An already-verified account keeps its password
    expect(d.tx.user.update).not.toHaveBeenCalled();
    expect(d.tx.organization.create).not.toHaveBeenCalled();
    expect(auditActions(d)).toEqual(['AUTH_IDENTITY_LINKED', 'LOGIN_SUCCESS']);
    expect(d.sessions.issue).toHaveBeenCalled();
  });

  it('linking an unverified account verifies it and replaces its unproven password', async () => {
    const d = setup({ emailUser: user({ status: UserStatus.PENDING_VERIFICATION }) });
    const out = await roundTrip(d);

    expect(out).toMatchObject({ ok: true });
    expect(d.tx.verificationToken.updateMany).toHaveBeenCalled();
    expect(d.tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u-1' },
      data: expect.objectContaining({
        status: UserStatus.ACTIVE,
        emailVerifiedAt: expect.any(Date),
        failedLoginAttempts: 0,
        lockedUntil: null,
        passwordHash: 'unusable-hash',
      }),
    });
    expect(auditActions(d)).toEqual(['AUTH_IDENTITY_LINKED', 'EMAIL_VERIFIED', 'LOGIN_SUCCESS']);
  });

  it('refuses to link when Google has not verified the email', async () => {
    const d = setup({ emailUser: user(), profile: { emailVerified: false } });
    const out = await roundTrip(d);

    expect(out).toEqual({ ok: false, code: 'email_unverified' });
    expect(d.identities.create).not.toHaveBeenCalled();
    expect(d.sessions.issue).not.toHaveBeenCalled();
    expect(d.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN_FAILED', metadata: { method: 'google', reason: 'email_unverified' } }),
    );
  });

  it('with sign-up turned off: refuses a new user but still signs in a linked identity', async () => {
    const fresh = setup({ signupEnabled: false });
    expect(await roundTrip(fresh, 'signup')).toEqual({ ok: false, code: 'google_signup_disabled' });
    expect(fresh.prisma.$transaction).not.toHaveBeenCalled();
    expect(fresh.queue.publishOnce).not.toHaveBeenCalled();
    expect(fresh.sessions.issue).not.toHaveBeenCalled();

    const linked = setup({ signupEnabled: false, identityUser: user() });
    expect(await roundTrip(linked)).toMatchObject({ ok: true, isNewUser: false });
  });

  it('refuses when the org is suspended', async () => {
    const d = setup({ identityUser: user(), suspendedOrgs: ['org-1'] });
    expect(await roundTrip(d)).toEqual({ ok: false, code: 'org_suspended' });
    expect(d.sessions.issue).not.toHaveBeenCalled();
  });

  it('refuses a suspended user', async () => {
    const d = setup({ identityUser: user({ status: UserStatus.SUSPENDED }) });
    expect(await roundTrip(d)).toEqual({ ok: false, code: 'account_suspended' });
    expect(d.sessions.issue).not.toHaveBeenCalled();
  });

  it('fully unlocks an account whose lock has expired', async () => {
    const d = setup({ identityUser: user({ status: UserStatus.LOCKED, lockedUntil: new Date(Date.now() - 60_000) }) });
    expect(await roundTrip(d)).toMatchObject({ ok: true });
    expect(d.prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u-1' }, data: { status: UserStatus.ACTIVE } });
  });

  it('refuses a state that does not match the cookie (and never calls Google)', async () => {
    const d = setup({ identityUser: user() });
    const { stateCookie } = await d.start.execute({ intent: 'signin', rememberMe: false });
    const out = await d.complete.execute({ code: 'auth-code', state: 'attacker-state', stateCookie });
    expect(out).toEqual({ ok: false, code: 'invalid_state' });
    expect(d.google.exchangeCode).not.toHaveBeenCalled();
  });

  it('refuses a missing or tampered state cookie', async () => {
    const d = setup({ identityUser: user() });
    const { redirectUrl, stateCookie } = await d.start.execute({ intent: 'signin', rememberMe: false });
    const state = new URL(redirectUrl).searchParams.get('state')!;
    expect(await d.complete.execute({ code: 'c', state })).toEqual({ ok: false, code: 'invalid_state' });
    expect(await d.complete.execute({ code: 'c', state, stateCookie: stateCookie.slice(0, -2) + 'xx' })).toEqual({
      ok: false,
      code: 'invalid_state',
    });
    const forged = await new GoogleOAuthStateCodec(new JwtService({}), { getOrThrow: () => 'other' } as any).sign({
      state, verifier: 'v', nonce: 'n', intent: 'signin', rememberMe: false,
    });
    expect(await d.complete.execute({ code: 'c', state, stateCookie: forged })).toEqual({ ok: false, code: 'invalid_state' });
    expect(d.google.exchangeCode).not.toHaveBeenCalled();
  });

  it('maps a cancelled consent and Google failures to short codes', async () => {
    const d = setup();
    const { redirectUrl, stateCookie } = await d.start.execute({ intent: 'signin', rememberMe: false });
    const state = new URL(redirectUrl).searchParams.get('state')!;
    expect(await d.complete.execute({ error: 'access_denied', state, stateCookie })).toEqual({ ok: false, code: 'google_cancelled' });

    const failing = setup({ exchangeError: new GoogleOAuthError('nonce mismatch') });
    expect(await roundTrip(failing)).toEqual({ ok: false, code: 'google_error' });
  });

  it('reports not_configured when Google credentials are missing', async () => {
    const d = setup({ configured: false });
    expect(await d.complete.execute({ code: 'c', state: 's', stateCookie: 'x' })).toEqual({ ok: false, code: 'not_configured' });
  });

  it('maps an email reserved by a deleted account to account_unavailable', async () => {
    const d = setup({ signupEnabled: true });
    d.tx.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'x' }),
    );
    expect(await roundTrip(d, 'signup')).toEqual({ ok: false, code: 'account_unavailable' });
    expect(d.queue.publishOnce).not.toHaveBeenCalled();
  });
});

describe('GetAuthProvidersUseCase', () => {
  it('reports configured + sign-up toggle', async () => {
    const uc = new GetAuthProvidersUseCase(
      { isConfigured: async () => true } as any,
      { get: async () => ({ googleSignupEnabled: true }) } as any,
    );
    expect(await uc.execute()).toEqual({ google: { configured: true, signupEnabled: true } });
  });

  it('never advertises sign-up while Google is not configured', async () => {
    const uc = new GetAuthProvidersUseCase(
      { isConfigured: async () => false } as any,
      { get: async () => ({ googleSignupEnabled: true }) } as any,
    );
    expect(await uc.execute()).toEqual({ google: { configured: false, signupEnabled: false } });
  });
});
