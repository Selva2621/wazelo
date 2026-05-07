import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { User, UserStatus, UserRole, Prisma } from '@prisma/client';

export interface CreateUserInput {
  orgId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt?: Date;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
}

export interface ListUsersOptions {
  take?: number;
  skip?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async createDirect(data: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        orgId: data.orgId,
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        status: data.status,
        emailVerifiedAt: data.emailVerifiedAt,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdAndOrg(id: string, orgId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async findByEmailAndOrg(
    email: string,
    orgId: string,
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), orgId, deletedAt: null },
    });
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
    return count > 0;
  }

  async emailExistsInOrg(email: string, orgId: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase(), orgId, deletedAt: null },
    });
    return count > 0;
  }

  async updateStatus(userId: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async updateRole(userId: string, role: UserRole): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async updateUser(userId: string, data: UpdateUserInput): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
      },
    });
  }

  async incrementFailedAttempts(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async resetFailedAttempts(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async lockAccount(userId: string, lockedUntil: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.LOCKED,
        lockedUntil,
      },
    });
  }

  async markEmailVerified(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  async updateLastLogin(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async softDelete(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });
  }

  async findByOrgId(orgId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByOrgIdPaginated(
    orgId: string,
    options: ListUsersOptions = {},
  ): Promise<{ users: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      orgId,
      deletedAt: null,
      ...(options.role && { role: options.role }),
      ...(options.status && { status: options.status }),
      ...(options.search && {
        OR: [
          {
            firstName: {
              contains: options.search,
              mode: 'insensitive' as const,
            },
          },
          {
            lastName: {
              contains: options.search,
              mode: 'insensitive' as const,
            },
          },
          {
            email: { contains: options.search, mode: 'insensitive' as const },
          },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: options.take ?? 50,
        skip: options.skip ?? 0,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async countAdminsInOrg(orgId: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        orgId,
        role: UserRole.ADMIN,
        deletedAt: null,
        status: { not: UserStatus.SUSPENDED },
      },
    });
  }

  async countActiveUsersInOrg(orgId: string): Promise<number> {
    return this.prisma.user.count({
      where: {
        orgId,
        deletedAt: null,
      },
    });
  }
}
