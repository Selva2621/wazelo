import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SuperAdmin } from '@prisma/client';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { IS_SUPER_ADMIN_ROUTE_KEY } from '@/common/decorators/super-admin-route.decorator';
import { SuperAdminGuard } from './super-admin.guard';
import { SuperAdminTokenService } from '../../domain/services/super-admin-token.service';

/**
 * Security boundary between tenant and super admin identities.
 * Uses real JWT signing so the secret/audience separation is exercised.
 */

const TENANT_SECRET = 'tenant-secret-for-tests';
const SUPER_ADMIN_SECRET = 'super-admin-secret-for-tests';

const jwtService = new JwtService({});
const config = {
  getOrThrow: (key: string) => {
    if (key === 'jwt.superAdminSecret') return SUPER_ADMIN_SECRET;
    throw new Error(`unexpected config ${key}`);
  },
  get: (_key: string, fallback: unknown) => fallback,
} as unknown as ConfigService;

const superAdminTokens = new SuperAdminTokenService(jwtService, config);
const FAMILY = '22222222-2222-2222-2222-222222222222';

const admin: SuperAdmin = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'owner@example.com',
  passwordHash: 'x',
  name: 'Owner',
  tokenVersion: 3,
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
};

function tenantToken() {
  return jwtService.signAsync(
    { sub: 'user-1', orgId: 'org-1', role: 'ADMIN', email: 'a@org.com' },
    { secret: TENANT_SECRET, expiresIn: '15m' },
  );
}

function makeContext(token: string | null, metadata: Record<string, unknown> = {}) {
  const request: Record<string, any> = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    path: '/api/v1/contacts',
    url: '/api/v1/contacts',
    ip: '127.0.0.1',
    socket: {},
  };
  const handler = () => undefined;
  Object.entries(metadata).forEach(([k, v]) => Reflect.defineMetadata(k, v, handler));
  const context = {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function tenantJwtGuard() {
  const tenantTokenService = {
    verifyAccessToken: (token: string) => jwtService.verifyAsync(token, { secret: TENANT_SECRET }),
  };
  return new JwtAuthGuard(new Reflector(), tenantTokenService as any);
}

function superAdminGuard(stored: SuperAdmin | null = admin, sessionActive = true) {
  const repo = { findById: jest.fn().mockResolvedValue(stored) };
  const sessions = { familyHasActiveSession: jest.fn().mockResolvedValue(sessionActive) };
  return new SuperAdminGuard(superAdminTokens, repo as any, sessions as any);
}

describe('Super admin / tenant auth boundary', () => {
  describe('tenant routes (JwtAuthGuard)', () => {
    it('accepts a tenant token', async () => {
      const { context, request } = makeContext(await tenantToken());
      await expect(tenantJwtGuard().canActivate(context)).resolves.toBe(true);
      expect(request.user.orgId).toBe('org-1');
    });

    it('rejects a super admin access token', async () => {
      const { accessToken } = await superAdminTokens.generateAccessToken(admin, FAMILY);
      const { context } = makeContext(accessToken);
      await expect(tenantJwtGuard().canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('super admin routes (SuperAdminGuard)', () => {
    it('accepts a current super admin access token', async () => {
      const { accessToken } = await superAdminTokens.generateAccessToken(admin, FAMILY);
      const { context, request } = makeContext(accessToken);
      await expect(superAdminGuard().canActivate(context)).resolves.toBe(true);
      expect(request.user).toMatchObject({ sub: admin.id, isSuperAdmin: true, orgId: '', sessionFamilyId: FAMILY });
    });

    it('rejects a token whose session was signed out on that device', async () => {
      const { accessToken } = await superAdminTokens.generateAccessToken(admin, FAMILY);
      await expect(
        superAdminGuard(admin, false).canActivate(makeContext(accessToken).context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a legacy access token without a session family', async () => {
      const legacy = await jwtService.signAsync(
        { sub: admin.id, email: admin.email, tv: admin.tokenVersion, typ: 'access', isSuperAdmin: true },
        { secret: SUPER_ADMIN_SECRET, expiresIn: '15m', audience: 'wazelo-platform' },
      );
      await expect(superAdminGuard().canActivate(makeContext(legacy).context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a tenant token', async () => {
      const { context } = makeContext(await tenantToken());
      await expect(superAdminGuard().canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a refresh or 2FA-challenge token used as an access token', async () => {
      const refresh = await superAdminTokens.generateRefreshToken(admin, FAMILY, '33333333-3333-3333-3333-333333333333');
      const challenge = await superAdminTokens.generateChallengeToken(admin);
      await expect(superAdminGuard().canActivate(makeContext(refresh).context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(superAdminGuard().canActivate(makeContext(challenge).context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a token issued before logout (tokenVersion bumped)', async () => {
      const { accessToken } = await superAdminTokens.generateAccessToken(admin, FAMILY);
      const { context } = makeContext(accessToken);
      await expect(
        superAdminGuard({ ...admin, tokenVersion: admin.tokenVersion + 1 }).canActivate(context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a token for a deleted super admin', async () => {
      const { accessToken } = await superAdminTokens.generateAccessToken(admin, FAMILY);
      await expect(superAdminGuard(null).canActivate(makeContext(accessToken).context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a missing token', async () => {
      await expect(superAdminGuard().canActivate(makeContext(null).context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('global guards defer to SuperAdminGuard on marked routes', async () => {
      const { context } = makeContext(null, { [IS_SUPER_ADMIN_ROUTE_KEY]: true });
      await expect(tenantJwtGuard().canActivate(context)).resolves.toBe(true);
      const permissions = new PermissionsGuard(new Reflector(), {} as any, { emit: jest.fn() } as any);
      await expect(permissions.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('PermissionsGuard defense in depth', () => {
    it('forbids a super admin identity on an unmarked (tenant) route', async () => {
      const { context, request } = makeContext(null);
      request.user = { sub: admin.id, orgId: '', role: '', email: admin.email, isSuperAdmin: true };
      const permissions = new PermissionsGuard(new Reflector(), {} as any, { emit: jest.fn() } as any);
      await expect(permissions.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
