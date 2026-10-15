import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcrypt';
import { randomInt } from 'crypto';
import { PlatformAuditAction } from '@prisma/client';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';
import { SuperAdminSessionRepository } from '../../infrastructure/repositories/super-admin-session.repository';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

const BCRYPT_COST = 12;
// No look-alikes (0/O, 1/l/I) so it can be read out or typed from a screen
const TEMP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/** 16 random characters (~93 bits) — shown once, must be replaced at first sign-in. */
export function generateTemporaryPassword(length = 16): string {
  return Array.from({ length }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join('');
}

/** Every super admin account (no secrets), for the team page. */
@Injectable()
export class ListSuperAdminAccountsUseCase {
  constructor(private readonly repo: SuperAdminRepository) {}

  async execute(currentId: string) {
    const accounts = await this.repo.findAllAccounts();
    return {
      admins: accounts.map((a) => ({
        ...a,
        isYou: a.id === currentId,
        locked: !!a.lockedUntil && a.lockedUntil > new Date(),
      })),
    };
  }
}

/**
 * Adds a super admin with a temporary password, returned once for the inviter to hand
 * over. The new admin must replace it, then enrol in 2FA, at first sign-in.
 */
@Injectable()
export class CreateSuperAdminAccountUseCase {
  constructor(
    private readonly repo: SuperAdminRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(actor: AuditActor, input: { name: string; email: string }, meta: RequestMeta) {
    const email = input.email.trim().toLowerCase();
    if (await this.repo.findByEmail(email)) {
      throw new ConflictException('A super admin with this email already exists');
    }
    const temporaryPassword = generateTemporaryPassword();
    const created = await this.repo.create({
      name: input.name.trim(),
      email,
      passwordHash: await hash(temporaryPassword, BCRYPT_COST),
      createdById: actor.id,
    });
    await this.audit.record({
      action: PlatformAuditAction.SUPER_ADMIN_CREATED,
      actor,
      targetType: 'SuperAdmin',
      targetId: created.id,
      metadata: { name: created.name, email: created.email },
      meta,
    });
    return {
      admin: { id: created.id, name: created.name, email: created.email },
      temporaryPassword,
    };
  }
}

/** Disable or re-enable an account. Never yourself, and never the last enabled account. */
@Injectable()
export class SetSuperAdminDisabledUseCase {
  constructor(
    private readonly repo: SuperAdminRepository,
    private readonly sessionRepo: SuperAdminSessionRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(actor: AuditActor, targetId: string, disabled: boolean, meta: RequestMeta) {
    if (targetId === actor.id) {
      throw new BadRequestException("You can't disable or re-enable your own account");
    }
    const target = await this.repo.findById(targetId);
    if (!target) throw new NotFoundException('Super admin not found');
    if (disabled === !!target.disabledAt) {
      return { id: target.id, disabled };
    }
    if (disabled && (await this.repo.countEnabled()) <= 1) {
      throw new BadRequestException("Can't disable the last enabled super admin");
    }

    await this.repo.setDisabled(targetId, disabled);
    const revoked = disabled ? await this.sessionRepo.revokeAll(targetId) : 0;
    await this.audit.record({
      action: disabled ? PlatformAuditAction.SUPER_ADMIN_DISABLED : PlatformAuditAction.SUPER_ADMIN_ENABLED,
      actor,
      targetType: 'SuperAdmin',
      targetId,
      metadata: { name: target.name, email: target.email, ...(disabled && { sessionsRevoked: revoked }) },
      meta,
    });
    return { id: targetId, disabled };
  }
}

/**
 * For an admin who lost both their authenticator and recovery codes: turns their 2FA off
 * and signs them out everywhere, so they re-enrol at next sign-in (2FA is mandatory).
 * Not for yourself — that would let a stolen session strip your own 2FA.
 */
@Injectable()
export class ResetSuperAdminTwoFactorUseCase {
  constructor(
    private readonly repo: SuperAdminRepository,
    private readonly sessionRepo: SuperAdminSessionRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(actor: AuditActor, targetId: string, meta: RequestMeta) {
    if (targetId === actor.id) {
      throw new BadRequestException("You can't reset your own two-factor authentication");
    }
    const target = await this.repo.findById(targetId);
    if (!target) throw new NotFoundException('Super admin not found');
    if (!target.totpEnabled && !target.totpSecret) {
      throw new BadRequestException('This admin has no two-factor authentication to reset');
    }

    await this.repo.setTotp(targetId, null, false);
    await this.repo.incrementTokenVersion(targetId);
    const revoked = await this.sessionRepo.revokeAll(targetId);
    await this.audit.record({
      action: PlatformAuditAction.TWO_FACTOR_RESET,
      actor,
      targetType: 'SuperAdmin',
      targetId,
      metadata: { name: target.name, email: target.email, sessionsRevoked: revoked },
      meta,
    });
    return { id: targetId };
  }
}
