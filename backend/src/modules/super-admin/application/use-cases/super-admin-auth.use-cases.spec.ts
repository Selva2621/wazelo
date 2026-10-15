import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PlatformAuditAction, SuperAdmin, SuperAdminSession as SessionRow } from '@prisma/client';
import { hashSync } from 'bcrypt';
import { SuperAdminTokenService } from '../../domain/services/super-admin-token.service';
import { TotpService } from '../../domain/services/totp.service';
import { generateRecoveryCodes, hashRecoveryCode } from '../../domain/services/recovery-codes';
import {
  CompleteSuperAdminTwoFactorEnrollmentUseCase,
  CompleteSuperAdminPasswordChangeLoginUseCase,
  CompleteSuperAdminTwoFactorLoginUseCase,
  DisableSuperAdminTwoFactorUseCase,
  EnableSuperAdminTwoFactorUseCase,
  RefreshSuperAdminSessionUseCase,
  SuperAdminAuthPolicy,
  SuperAdminLockout,
  SuperAdminLoginUseCase,
  SuperAdminSecondFactor,
  SuperAdminSessionIssuer,
} from './super-admin-auth.use-cases';

const PASSWORD = 'correct horse battery staple';
const PASSWORD_HASH = hashSync(PASSWORD, 4);
const SECRET = new TotpService().generateSecret();

const jwtService = new JwtService({});

function config(overrides: Record<string, unknown> = {}) {
  const values: Record<string, unknown> = {
    'jwt.superAdminSecret': 'sa-secret-for-tests',
    'auth.superAdminRequire2fa': true,
    'auth.superAdminMaxFailedAttempts': 3,
    'auth.superAdminLockMinutes': 15,
    ...overrides,
  };
  return {
    getOrThrow: (k: string) => values[k],
    get: (k: string, fallback: unknown) => (k in values ? values[k] : fallback),
  } as unknown as ConfigService;
}

function makeAdmin(overrides: Partial<SuperAdmin> = {}): SuperAdmin {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'owner@example.com',
    passwordHash: PASSWORD_HASH,
    name: 'Owner',
    tokenVersion: 0,
    totpSecret: null,
    totpEnabled: false,
    totpLastUsedStep: null,
    recoveryCodes: [],
    failedLoginAttempts: 0,
    lockedUntil: null,
    mustChangePassword: false,
    disabledAt: null,
    createdById: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** In-memory stand-ins for the two repositories, sharing one admin row. */
function makeWorld(adminOverrides: Partial<SuperAdmin> = {}, cfg = config()) {
  let admin = makeAdmin(adminOverrides);
  const sessions: SessionRow[] = [];

  const superAdminRepo = {
    findByEmail: jest.fn(async (email: string) => (email.toLowerCase() === admin.email ? admin : null)),
    findById: jest.fn(async (id: string) => (id === admin.id ? admin : null)),
    recordLogin: jest.fn(async () => {
      admin = { ...admin, lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null };
    }),
    incrementFailedAttempts: jest.fn(async () => {
      admin = { ...admin, failedLoginAttempts: admin.failedLoginAttempts + 1 };
      return admin;
    }),
    lock: jest.fn(async (_id: string, lockedUntil: Date) => {
      admin = { ...admin, lockedUntil, failedLoginAttempts: 0 };
    }),
    setTotp: jest.fn(async (_id: string, totpSecret: string | null, totpEnabled: boolean, codes: string[] = []) => {
      admin = { ...admin, totpSecret, totpEnabled, totpLastUsedStep: null, recoveryCodes: codes };
      return admin;
    }),
    claimTotpStep: jest.fn(async (_id: string, step: number) => {
      if (admin.totpLastUsedStep !== null && admin.totpLastUsedStep >= step) return false;
      admin = { ...admin, totpLastUsedStep: step };
      return true;
    }),
    setRecoveryCodes: jest.fn(),
    consumeRecoveryCode: jest.fn(async (_id: string, h: string) => {
      if (!admin.recoveryCodes.includes(h)) return false;
      admin = { ...admin, recoveryCodes: admin.recoveryCodes.filter((c) => c !== h) };
      return true;
    }),
    incrementTokenVersion: jest.fn(),
    setPassword: jest.fn(async (_id: string, passwordHash: string) => {
      admin = { ...admin, passwordHash, mustChangePassword: false };
      return admin;
    }),
  };

  const tokenHash = (t: string) => require('crypto').createHash('sha256').update(t).digest('hex');
  const sessionRepo = {
    create: jest.fn(async (d: any) => {
      const row = { ...d, refreshToken: tokenHash(d.refreshToken), revokedAt: null, rotatedAt: null, createdAt: new Date() };
      sessions.push(row);
      return row;
    }),
    findByRefreshTokenAnyState: jest.fn(async (t: string) => sessions.find((s) => s.refreshToken === tokenHash(t)) ?? null),
    claimForRotation: jest.fn(async (id: string) => {
      const s = sessions.find((r) => r.id === id);
      if (!s || s.revokedAt) return false;
      s.revokedAt = new Date();
      s.rotatedAt = new Date();
      return true;
    }),
    familyHasActiveSession: jest.fn(async (f: string) => sessions.some((s) => s.familyId === f && !s.revokedAt)),
    revokeFamily: jest.fn(async (f: string) => {
      let n = 0;
      sessions.filter((s) => s.familyId === f && !s.revokedAt).forEach((s) => { s.revokedAt = new Date(); n++; });
      return n;
    }),
    findActive: jest.fn(async () => sessions.filter((s) => !s.revokedAt)),
  };

  const audit = { record: jest.fn() };
  const encryption = { encrypt: (s: string) => `enc:${s}`, decrypt: (s: string) => s.replace(/^enc:/, '') };
  const totp = new TotpService();
  const tokens = new SuperAdminTokenService(jwtService, cfg);
  const policy = new SuperAdminAuthPolicy(cfg);
  const issuer = new SuperAdminSessionIssuer(superAdminRepo as any, sessionRepo as any, tokens, audit as any, policy);
  const lockout = new SuperAdminLockout(superAdminRepo as any, audit as any, policy);
  const secondFactor = new SuperAdminSecondFactor(superAdminRepo as any, totp, encryption as any, audit as any);
  const enable = new EnableSuperAdminTwoFactorUseCase(
    superAdminRepo as any, sessionRepo as any, secondFactor, audit as any, policy,
  );

  return {
    get admin() { return admin; },
    sessions,
    audit,
    tokens,
    totp,
    login: new SuperAdminLoginUseCase(superAdminRepo as any, tokens, issuer, lockout, audit as any, policy),
    twoFactorLogin: new CompleteSuperAdminTwoFactorLoginUseCase(superAdminRepo as any, tokens, secondFactor, lockout, issuer),
    enroll: new CompleteSuperAdminTwoFactorEnrollmentUseCase(superAdminRepo as any, tokens, lockout, secondFactor, enable, issuer),
    refresh: new RefreshSuperAdminSessionUseCase(superAdminRepo as any, sessionRepo as any, tokens, issuer, audit as any, policy),
    disable: new DisableSuperAdminTwoFactorUseCase(superAdminRepo as any, secondFactor, audit as any, policy),
    passwordLogin: new CompleteSuperAdminPasswordChangeLoginUseCase(superAdminRepo as any, tokens, issuer, audit as any, policy),
  };
}

const auditActions = (w: { audit: { record: jest.Mock } }) =>
  w.audit.record.mock.calls.map(([e]) => e.action as PlatformAuditAction);

// Real bcrypt compares make these slow under a full parallel jest run; 5s default is too tight
jest.setTimeout(30_000);

describe('Super admin auth', () => {
  describe('lockout', () => {
    it('locks the account after the configured number of failures', async () => {
      const w = makeWorld({ totpEnabled: true, totpSecret: `enc:${SECRET}` });
      for (let i = 0; i < 3; i++) {
        await expect(w.login.execute({ email: w.admin.email, password: 'wrong' })).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
      }
      expect(w.admin.lockedUntil).not.toBeNull();
      expect(auditActions(w)).toContain(PlatformAuditAction.SUPER_ADMIN_LOCKED);
      // Even the right password is refused while locked
      await expect(w.login.execute({ email: w.admin.email, password: PASSWORD })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('counts wrong 2FA codes toward the same lockout', async () => {
      const w = makeWorld({ totpEnabled: true, totpSecret: `enc:${SECRET}` });
      const res = await w.login.execute({ email: w.admin.email, password: PASSWORD });
      if (!res.requiresTwoFactor) throw new Error('expected 2FA challenge');
      for (let i = 0; i < 3; i++) {
        await expect(w.twoFactorLogin.execute(res.challengeToken, '000000')).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
      }
      await expect(
        w.twoFactorLogin.execute(res.challengeToken, w.totp.generate(SECRET)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('a successful login clears the failure counter', async () => {
      const w = makeWorld({ totpEnabled: true, totpSecret: `enc:${SECRET}` });
      await expect(w.login.execute({ email: w.admin.email, password: 'wrong' })).rejects.toThrow();
      const res = await w.login.execute({ email: w.admin.email, password: PASSWORD });
      if (!res.requiresTwoFactor) throw new Error('expected 2FA challenge');
      await w.twoFactorLogin.execute(res.challengeToken, w.totp.generate(SECRET));
      expect(w.admin.failedLoginAttempts).toBe(0);
    });
  });

  describe('mandatory 2FA', () => {
    it('sends an account without 2FA to enrolment instead of signing in', async () => {
      const w = makeWorld();
      const res = await w.login.execute({ email: w.admin.email, password: PASSWORD });
      expect(res).toMatchObject({ requiresTwoFactorSetup: true });
      expect(w.sessions).toHaveLength(0);
    });

    it('enrolment enables 2FA, signs in and returns 10 recovery codes', async () => {
      const w = makeWorld({ totpSecret: `enc:${SECRET}` });
      const res = await w.login.execute({ email: w.admin.email, password: PASSWORD });
      if (!res.requiresTwoFactorSetup) throw new Error('expected setup challenge');
      const out = await w.enroll.execute(res.challengeToken, w.totp.generate(SECRET));
      expect(w.admin.totpEnabled).toBe(true);
      expect(out.recoveryCodes).toHaveLength(10);
      expect(out.accessToken).toBeTruthy();
      expect(w.admin.recoveryCodes).toEqual(out.recoveryCodes.map(hashRecoveryCode));
    });

    it('signs in without 2FA when the policy is off', async () => {
      const w = makeWorld({}, config({ 'auth.superAdminRequire2fa': false }));
      const res = await w.login.execute({ email: w.admin.email, password: PASSWORD });
      expect(res).toMatchObject({ requiresTwoFactor: false, requiresTwoFactorSetup: false });
    });

    it('refuses to disable 2FA when it is mandatory', async () => {
      const w = makeWorld({ totpEnabled: true, totpSecret: `enc:${SECRET}` });
      await expect(w.disable.execute(w.admin.id, w.totp.generate(SECRET))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('second factor', () => {
    it('rejects a TOTP code that was already used', async () => {
      const w = makeWorld({ totpEnabled: true, totpSecret: `enc:${SECRET}` });
      const code = w.totp.generate(SECRET);
      const first = await w.login.execute({ email: w.admin.email, password: PASSWORD });
      if (!first.requiresTwoFactor) throw new Error('expected 2FA challenge');
      await w.twoFactorLogin.execute(first.challengeToken, code);

      const second = await w.login.execute({ email: w.admin.email, password: PASSWORD });
      if (!second.requiresTwoFactor) throw new Error('expected 2FA challenge');
      await expect(w.twoFactorLogin.execute(second.challengeToken, code)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('accepts a recovery code once', async () => {
      const codes = generateRecoveryCodes();
      const w = makeWorld({
        totpEnabled: true,
        totpSecret: `enc:${SECRET}`,
        recoveryCodes: codes.map(hashRecoveryCode),
      });
      const login = async () => {
        const r = await w.login.execute({ email: w.admin.email, password: PASSWORD });
        if (!r.requiresTwoFactor) throw new Error('expected 2FA challenge');
        return r.challengeToken;
      };
      // Case and dash don't matter
      await w.twoFactorLogin.execute(await login(), codes[0].toLowerCase().replace('-', ''));
      expect(w.admin.recoveryCodes).toHaveLength(9);
      expect(auditActions(w)).toContain(PlatformAuditAction.TWO_FACTOR_RECOVERY_CODE_USED);
      await expect(w.twoFactorLogin.execute(await login(), codes[0])).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refresh sessions', () => {
    async function signedIn() {
      const w = makeWorld({}, config({ 'auth.superAdminRequire2fa': false }));
      const res = await w.login.execute({ email: w.admin.email, password: PASSWORD });
      if (res.requiresTwoFactor || res.requiresTwoFactorSetup || res.requiresPasswordChange) throw new Error('expected a session');
      return { w, refreshToken: res.refreshToken as string };
    }

    it('rotates the refresh token within the same session family', async () => {
      const { w, refreshToken } = await signedIn();
      const next = await w.refresh.execute(refreshToken);
      expect(next.refreshToken).toBeTruthy();
      expect(next.refreshToken).not.toBe(refreshToken);
      expect(new Set(w.sessions.map((s) => s.familyId)).size).toBe(1);
    });

    it('a concurrent refresh within the grace window gets an access token only', async () => {
      const { w, refreshToken } = await signedIn();
      await w.refresh.execute(refreshToken);
      const loser = await w.refresh.execute(refreshToken);
      expect(loser.accessToken).toBeTruthy();
      expect(loser.refreshToken).toBeUndefined();
    });

    it('replaying a rotated token after the grace window revokes the whole family', async () => {
      const { w, refreshToken } = await signedIn();
      const next = await w.refresh.execute(refreshToken);
      w.sessions[0].rotatedAt = new Date(Date.now() - 60_000);

      await expect(w.refresh.execute(refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(auditActions(w)).toContain(PlatformAuditAction.SUPER_ADMIN_REFRESH_REUSED);
      // The legitimate holder of the newer token is signed out too
      await expect(w.refresh.execute(next.refreshToken as string)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('account state', () => {
    it('refuses a disabled account even with the right password', async () => {
      const w = makeWorld({ disabledAt: new Date() });
      await expect(w.login.execute({ email: w.admin.email, password: PASSWORD })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('a temporary password must be replaced, then the flow continues to 2FA enrolment', async () => {
      const w = makeWorld({ mustChangePassword: true });
      const first = await w.login.execute({ email: w.admin.email, password: PASSWORD });
      if (!first.requiresPasswordChange) throw new Error('expected a password change step');
      expect(w.sessions).toHaveLength(0);

      await expect(w.passwordLogin.execute(first.challengeToken, PASSWORD)).rejects.toBeInstanceOf(BadRequestException);

      const next = await w.passwordLogin.execute(first.challengeToken, 'a brand new long password');
      expect(next).toMatchObject({ requiresTwoFactorSetup: true });
      expect(w.admin.mustChangePassword).toBe(false);
      expect(auditActions(w)).toContain(PlatformAuditAction.SUPER_ADMIN_PASSWORD_CHANGED);
    });

    it('a password-change token is useless once the password was changed', async () => {
      const w = makeWorld({ mustChangePassword: true });
      const first = await w.login.execute({ email: w.admin.email, password: PASSWORD });
      if (!first.requiresPasswordChange) throw new Error('expected a password change step');
      await w.passwordLogin.execute(first.challengeToken, 'a brand new long password');
      await expect(w.passwordLogin.execute(first.challengeToken, 'yet another long password')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
