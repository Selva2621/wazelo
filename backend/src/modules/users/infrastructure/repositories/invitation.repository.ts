import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Invitation, InvitationStatus, UserRole } from '@prisma/client';

export interface CreateInvitationInput {
  orgId: string;
  email: string;
  role: UserRole;
  token: string;
  invitedById: string;
  expiresAt: Date;
}

@Injectable()
export class InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInvitationInput): Promise<Invitation> {
    return this.prisma.invitation.create({
      data: {
        orgId: data.orgId,
        email: data.email.toLowerCase(),
        role: data.role,
        token: data.token,
        invitedById: data.invitedById,
        expiresAt: data.expiresAt,
        status: InvitationStatus.PENDING,
      },
    });
  }

  async findByToken(token: string): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: { token },
    });
  }

  async findPendingByEmailAndOrg(
    email: string,
    orgId: string,
  ): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: {
        email: email.toLowerCase(),
        orgId,
        status: InvitationStatus.PENDING,
      },
    });
  }

  async findByOrgId(
    orgId: string,
    options?: { take?: number; skip?: number },
  ): Promise<Invitation[]> {
    return this.prisma.invitation.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: options?.take ?? 50,
      skip: options?.skip ?? 0,
    });
  }

  async findPendingByOrgId(orgId: string): Promise<Invitation[]> {
    return this.prisma.invitation.findMany({
      where: { orgId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAccepted(id: string): Promise<Invitation> {
    return this.prisma.invitation.update({
      where: { id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  }

  async markRevoked(id: string): Promise<Invitation> {
    return this.prisma.invitation.update({
      where: { id },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  async markExpired(id: string): Promise<Invitation> {
    return this.prisma.invitation.update({
      where: { id },
      data: {
        status: InvitationStatus.EXPIRED,
      },
    });
  }

  async revokeExistingPendingInvites(
    email: string,
    orgId: string,
  ): Promise<number> {
    const result = await this.prisma.invitation.updateMany({
      where: {
        email: email.toLowerCase(),
        orgId,
        status: InvitationStatus.PENDING,
      },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
    return result.count;
  }

  async findById(id: string): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: { id },
    });
  }

  async findByIdAndOrg(
    id: string,
    orgId: string,
  ): Promise<Invitation | null> {
    return this.prisma.invitation.findFirst({
      where: { id, orgId },
    });
  }
}
