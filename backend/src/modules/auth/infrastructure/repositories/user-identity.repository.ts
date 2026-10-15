import { Injectable } from '@nestjs/common';
import { Prisma, User, UserIdentity } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

/** External sign-in identities ("google" + Google `sub`) linked to tenant users. */
@Injectable()
export class UserIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The identity and its user, ignoring identities whose user was (soft-)deleted. */
  async findWithUser(provider: string, providerUserId: string): Promise<(UserIdentity & { user: User }) | null> {
    const identity = await this.prisma.userIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: true },
    });
    if (!identity || identity.user.deletedAt) return null;
    return identity;
  }

  async create(
    data: { userId: string; provider: string; providerUserId: string; email: string },
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<UserIdentity> {
    return tx.userIdentity.create({ data });
  }

  /** Drops a leftover link whose user was deleted, so the Google account can be used again. */
  async deleteOrphaned(provider: string, providerUserId: string, tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    await tx.userIdentity.deleteMany({
      where: { provider, providerUserId, user: { deletedAt: { not: null } } },
    });
  }
}
