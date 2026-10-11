import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, TokenType, User, UserRole, UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { GoogleOAuthError, GoogleOAuthService, GoogleProfile } from '@/infrastructure/external/google/google-oauth.service';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { OrgStatusService } from '@/modules/org/domain/services/org-status.service';
import { PlatformSettingsService } from '@/modules/platform-settings/domain/services/platform-settings.service';
import { EVENT_NAMES, QUEUE_NAMES } from '@/common/constants';
import { PasswordService } from '../../domain/services/password.service';
import {
  decideGoogleSignIn,
  defaultWorkspaceName,
  GoogleCandidateAccount,
  GoogleSsoErrorCode,
  GoogleSsoIntent,
  namesFromProfile,
} from '../../domain/services/google-sign-in.policy';
import { createPkcePair, randomUrlSafe, safeEqual } from '../../domain/services/oauth-pkce';
import { UserIdentityRepository } from '../../infrastructure/repositories/user-identity.repository';
import { SessionIssuer } from '../services/session-issuer.service';
import { GoogleOAuthStateCodec } from '../services/google-oauth-state.service';
import { generateOrgSlugInTx } from '../services/org-slug';

export const GOOGLE_PROVIDER = 'google';

/** GET /auth/providers */
@Injectable()
export class GetAuthProvidersUseCase {
  constructor(
    private readonly google: GoogleOAuthService,
    private readonly settings: PlatformSettingsService,
  ) {}

  async execute(): Promise<{ google: { configured: boolean; signupEnabled: boolean } }> {
    const configured = await this.google.isConfigured();
    const { googleSignupEnabled } = await this.settings.get();
    return { google: { configured, signupEnabled: configured && googleSignupEnabled } };
  }
}

/** GET /auth/google/start: Google consent URL + the signed state cookie value. */
@Injectable()
export class StartGoogleAuthUseCase {
  constructor(
    private readonly google: GoogleOAuthService,
    private readonly stateCodec: GoogleOAuthStateCodec,
  ) {}

  async execute(input: { intent: GoogleSsoIntent; rememberMe: boolean }): Promise<{ redirectUrl: string; stateCookie: string }> {
    const state = randomUrlSafe();
    const nonce = randomUrlSafe();
    const pkce = createPkcePair();
    const stateCookie = await this.stateCodec.sign({
      state,
      nonce,
      verifier: pkce.verifier,
      intent: input.intent,
      rememberMe: input.rememberMe,
    });
    const redirectUrl = await this.google.buildAuthUrl({ state, nonce, codeChallenge: pkce.challenge });
    if (!redirectUrl) throw new NotFoundException('Google sign-in is not configured');
    return { redirectUrl, stateCookie };
  }
}

export interface GoogleCallbackInput {
  code?: string;
  state?: string;
  /** Google's error param (e.g. access_denied when the user cancels) */
  error?: string;
  stateCookie?: string;
  ipAddress?: string;
  userAgent?: string;
}

export type GoogleCallbackResult =
  | { ok: true; refreshToken: string; rememberMe: boolean; isNewUser: boolean }
  | { ok: false; code: GoogleSsoErrorCode };

/**
 * GET /auth/google/callback: verifies the round trip and Google's ID token, then signs in
 * the linked user, links an existing account, or creates a new org + admin, and issues the
 * same session the password login issues.
 */
@Injectable()
export class CompleteGoogleAuthUseCase {
  private readonly logger = new Logger(CompleteGoogleAuthUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly google: GoogleOAuthService,
    private readonly stateCodec: GoogleOAuthStateCodec,
    private readonly identities: UserIdentityRepository,
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly sessionIssuer: SessionIssuer,
    private readonly orgStatus: OrgStatusService,
    private readonly settings: PlatformSettingsService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(input: GoogleCallbackInput): Promise<GoogleCallbackResult> {
    if (!(await this.google.isConfigured())) return { ok: false, code: 'not_configured' };

    // 1. The browser must bring back the state cookie set by /start, and Google the same state
    const saved = await this.stateCodec.verify(input.stateCookie);
    if (!saved || !safeEqual(saved.state, input.state)) return { ok: false, code: 'invalid_state' };

    if (input.error) {
      return { ok: false, code: input.error === 'access_denied' ? 'google_cancelled' : 'google_error' };
    }
    if (!input.code) return { ok: false, code: 'google_error' };

    // 2. Code (+ PKCE verifier) → verified ID token
    let profile: GoogleProfile;
    try {
      profile = await this.google.exchangeCode({ code: input.code, codeVerifier: saved.verifier, nonce: saved.nonce });
    } catch (err) {
      this.logger.warn(`Google sign-in failed: ${err instanceof GoogleOAuthError ? err.message : 'unexpected error'}`);
      return { ok: false, code: 'google_error' };
    }

    // 3. Who is this?
    const identity = await this.identities.findWithUser(GOOGLE_PROVIDER, profile.sub);
    const emailUser = identity ? null : await this.userRepository.findByEmail(profile.email);
    const { googleSignupEnabled } = await this.settings.get();

    const decision = decideGoogleSignIn({
      identityAccount: identity ? await this.candidate(identity.user) : null,
      emailAccount: emailUser ? await this.candidate(emailUser) : null,
      emailVerified: profile.emailVerified,
      signupEnabled: googleSignupEnabled,
      now: new Date(),
    });

    const meta = { ipAddress: input.ipAddress, userAgent: input.userAgent };

    // 4. Apply it
    let user: User;
    let isNewUser = false;
    switch (decision.kind) {
      case 'refuse': {
        const known = identity?.user ?? emailUser;
        if (known) {
          await this.auditService.log({
            orgId: known.orgId,
            userId: known.id,
            action: 'LOGIN_FAILED',
            metadata: { method: 'google', reason: decision.code },
            ...meta,
          });
        }
        return { ok: false, code: decision.code };
      }
      case 'signin':
        user = identity!.user;
        break;
      case 'link': {
        const linked = await this.link(emailUser!, profile, decision.activate, meta);
        if (!linked) return { ok: false, code: 'google_error' };
        user = linked;
        break;
      }
      case 'signup': {
        const created = await this.signup(profile, saved.intent, meta);
        if (!created.ok) return created;
        user = created.user;
        isNewUser = true;
        break;
      }
    }

    // 5. Same session as the password login
    if (!isNewUser) {
      await this.userRepository.resetFailedAttempts(user.id);
      // An expired lock is cleared above but keeps status LOCKED, which /auth/refresh rejects;
      // the Google flow restores its session through /auth/refresh right away, so unlock fully.
      if (user.status === UserStatus.LOCKED) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.ACTIVE } });
      }
    }
    await this.userRepository.updateLastLogin(user.id);

    const tokens = await this.sessionIssuer.issue(user, { rememberMe: saved.rememberMe, ...meta });

    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      targetType: 'User',
      targetId: user.id,
      metadata: { method: 'google' },
      ...meta,
    });
    this.eventEmitter.emit(EVENT_NAMES.LOGIN_SUCCESS, { userId: user.id, orgId: user.orgId });

    return { ok: true, refreshToken: tokens.refreshToken, rememberMe: saved.rememberMe, isNewUser };
  }

  private async candidate(user: User): Promise<GoogleCandidateAccount> {
    return {
      userId: user.id,
      status: user.status,
      lockedUntil: user.lockedUntil,
      orgSuspended: await this.orgStatus.isSuspended(user.orgId),
    };
  }

  /** Random bcrypt hash nobody knows: Google-only accounts set a password via "Forgot password". */
  private unusablePasswordHash(): Promise<string> {
    return this.passwordService.hash(randomBytes(32).toString('hex'));
  }

  private async link(
    user: User,
    profile: GoogleProfile,
    activate: boolean,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<User | null> {
    // An unverified account's password was never proven by the mailbox owner: drop it
    const passwordHash = activate ? await this.unusablePasswordHash() : undefined;
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        await this.identities.deleteOrphaned(GOOGLE_PROVIDER, profile.sub, tx);
        await this.identities.create(
          { userId: user.id, provider: GOOGLE_PROVIDER, providerUserId: profile.sub, email: profile.email },
          tx,
        );
        if (!activate) return user;
        // Same as verify-email, plus the password reset above
        await tx.verificationToken.updateMany({
          where: { userId: user.id, type: TokenType.EMAIL_VERIFICATION, usedAt: null },
          data: { usedAt: new Date() },
        });
        return tx.user.update({
          where: { id: user.id },
          data: {
            status: UserStatus.ACTIVE,
            emailVerifiedAt: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
            passwordHash,
          },
        });
      });

      await this.auditService.log({
        orgId: user.orgId,
        userId: user.id,
        action: 'AUTH_IDENTITY_LINKED',
        targetType: 'User',
        targetId: user.id,
        metadata: { method: 'google', provider: GOOGLE_PROVIDER, emailVerifiedNow: activate },
        ...meta,
      });
      if (activate) {
        await this.auditService.log({
          orgId: user.orgId,
          userId: user.id,
          action: 'EMAIL_VERIFIED',
          targetType: 'User',
          targetId: user.id,
          metadata: { method: 'google' },
          ...meta,
        });
        this.eventEmitter.emit(EVENT_NAMES.EMAIL_VERIFIED, { userId: user.id });
      }
      return updated;
    } catch (err) {
      // e.g. the same Google account linked by a concurrent callback
      this.logger.warn(`Linking Google identity to user ${user.id} failed: ${this.prismaCode(err)}`);
      return null;
    }
  }

  /** Same org + admin creation as RegisterUseCase, but already verified and without the email. */
  private async signup(
    profile: GoogleProfile,
    intent: GoogleSsoIntent,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ ok: true; user: User } | { ok: false; code: GoogleSsoErrorCode }> {
    const passwordHash = await this.unusablePasswordHash();
    const orgName = defaultWorkspaceName(profile);
    const { firstName, lastName } = namesFromProfile(profile);

    let user: User;
    try {
      user = await this.prisma.$transaction(
        async (tx) => {
          const org = await tx.organization.create({
            data: { name: orgName, slug: await generateOrgSlugInTx(tx, orgName) },
          });
          const newUser = await tx.user.create({
            data: {
              orgId: org.id,
              email: profile.email,
              passwordHash,
              firstName,
              lastName,
              role: UserRole.ADMIN,
              status: UserStatus.ACTIVE,
              emailVerifiedAt: new Date(),
            },
          });
          await this.identities.deleteOrphaned(GOOGLE_PROVIDER, profile.sub, tx);
          await this.identities.create(
            { userId: newUser.id, provider: GOOGLE_PROVIDER, providerUserId: profile.sub, email: profile.email },
            tx,
          );
          return newUser;
        },
        { timeout: 10000, isolationLevel: 'Serializable' },
      );
    } catch (err) {
      const code = this.prismaCode(err);
      this.logger.warn(`Google sign-up failed: ${code}`);
      // P2002 on email: the address belongs to a deleted account (emails stay reserved)
      return { ok: false, code: code === 'P2002' ? 'account_unavailable' : 'google_error' };
    }

    // Seed trial, permissions, AI memory and default master data (retried by pg-boss)
    await this.queueService.publishOnce(
      QUEUE_NAMES.ORG_ONBOARDING,
      { orgId: user.orgId, mode: 'signup' },
      `org-onboarding:${user.orgId}`,
    );

    await this.auditService.log({
      orgId: user.orgId,
      userId: user.id,
      action: 'USER_REGISTERED',
      targetType: 'User',
      targetId: user.id,
      metadata: { email: profile.email, role: UserRole.ADMIN, method: 'google', intent },
      ...meta,
    });
    this.eventEmitter.emit(EVENT_NAMES.USER_REGISTERED, {
      userId: user.id,
      orgId: user.orgId,
      email: profile.email,
    });

    return { ok: true, user };
  }

  private prismaCode(err: unknown): string {
    if (err instanceof Prisma.PrismaClientKnownRequestError) return err.code;
    return err instanceof Error ? err.name : 'unknown';
  }
}
