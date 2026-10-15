import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { SuperAdmin } from '@prisma/client';

@Injectable()
export class SuperAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Case-insensitive: emails are stored as typed by the seed script. */
  async findByEmail(email: string): Promise<SuperAdmin | null> {
    return this.prisma.superAdmin.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
  }

  async findById(id: string): Promise<SuperAdmin | null> {
    return this.prisma.superAdmin.findUnique({ where: { id } });
  }

  /** Public profile fields only — used for ticket assignment (enabled accounts only). */
  findAll() {
    return this.prisma.superAdmin.findMany({
      where: { disabledAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    });
  }

  /** Account list for the admin team page — never the hash, secret or recovery codes. */
  findAllAccounts() {
    return this.prisma.superAdmin.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, email: true, totpEnabled: true, mustChangePassword: true,
        disabledAt: true, lastLoginAt: true, createdAt: true, createdById: true, lockedUntil: true,
      },
    });
  }

  countEnabled(): Promise<number> {
    return this.prisma.superAdmin.count({ where: { disabledAt: null } });
  }

  create(data: { name: string; email: string; passwordHash: string; createdById: string }): Promise<SuperAdmin> {
    return this.prisma.superAdmin.create({ data: { ...data, mustChangePassword: true } });
  }

  /** Sets a new password and clears the must-change flag and any lockout. */
  setPassword(id: string, passwordHash: string): Promise<SuperAdmin> {
    return this.prisma.superAdmin.update({
      where: { id },
      data: { passwordHash, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  /** Disabling also bumps tokenVersion, so every token the account holds dies at once. */
  setDisabled(id: string, disabled: boolean): Promise<SuperAdmin> {
    return this.prisma.superAdmin.update({
      where: { id },
      data: disabled
        ? { disabledAt: new Date(), tokenVersion: { increment: 1 } }
        : { disabledAt: null, failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  /** Successful sign-in: stamps lastLoginAt and clears the lockout counter. */
  async recordLogin(id: string): Promise<void> {
    await this.prisma.superAdmin.update({
      where: { id },
      data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  /** Atomic increment, so concurrent failures are all counted. */
  async incrementFailedAttempts(id: string): Promise<SuperAdmin> {
    return this.prisma.superAdmin.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async lock(id: string, lockedUntil: Date): Promise<void> {
    await this.prisma.superAdmin.update({
      where: { id },
      data: { lockedUntil, failedLoginAttempts: 0 },
    });
  }

  /** Revokes every token issued before this call. */
  async incrementTokenVersion(id: string): Promise<SuperAdmin> {
    return this.prisma.superAdmin.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  /** Any change of secret resets the replay marker and the recovery codes. */
  async setTotp(
    id: string,
    totpSecret: string | null,
    totpEnabled: boolean,
    recoveryCodeHashes: string[] = [],
  ): Promise<SuperAdmin> {
    return this.prisma.superAdmin.update({
      where: { id },
      data: { totpSecret, totpEnabled, totpLastUsedStep: null, recoveryCodes: recoveryCodeHashes },
    });
  }

  /**
   * Atomically records `step` as used. False if this or a later step was already used,
   * which is how a replayed code is refused even across concurrent requests.
   */
  async claimTotpStep(id: string, step: number): Promise<boolean> {
    const result = await this.prisma.superAdmin.updateMany({
      where: {
        id,
        OR: [{ totpLastUsedStep: null }, { totpLastUsedStep: { lt: step } }],
      },
      data: { totpLastUsedStep: step },
    });
    return result.count === 1;
  }

  async setRecoveryCodes(id: string, hashes: string[]): Promise<SuperAdmin> {
    return this.prisma.superAdmin.update({ where: { id }, data: { recoveryCodes: hashes } });
  }

  /** Removes one recovery code if present. False if it was never valid or already used. */
  async consumeRecoveryCode(id: string, hash: string): Promise<boolean> {
    const count = await this.prisma.$executeRaw`
      UPDATE "super_admins"
      SET "recovery_codes" = array_remove("recovery_codes", ${hash}), "updated_at" = NOW()
      WHERE "id" = ${id}::uuid AND ${hash} = ANY("recovery_codes")
    `;
    return count === 1;
  }
}
