import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(orgId: string, name: string, managerId: string) {
    return this.prisma.team.create({
      data: { orgId, name, managerId },
      include: {
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true },
            },
          },
        },
      },
    });
  }

  async findById(id: string, orgId: string) {
    return this.prisma.team.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true },
            },
          },
        },
      },
    });
  }

  async findByOrgId(orgId: string) {
    return this.prisma.team.findMany({
      where: { orgId, deletedAt: null },
      include: {
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByManagerId(managerId: string, orgId: string) {
    return this.prisma.team.findMany({
      where: { managerId, orgId, deletedAt: null },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true },
            },
          },
        },
      },
    });
  }

  async update(id: string, orgId: string, data: { name?: string; managerId?: string }) {
    return this.prisma.team.update({
      where: { id },
      data,
      include: {
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true },
            },
          },
        },
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.team.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addMember(teamId: string, userId: string) {
    return this.prisma.teamMember.create({
      data: { teamId, userId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });
  }

  async removeMember(teamId: string, userId: string) {
    return this.prisma.teamMember.deleteMany({
      where: { teamId, userId },
    });
  }

  async findMember(teamId: string, userId: string) {
    return this.prisma.teamMember.findFirst({
      where: { teamId, userId },
    });
  }

  async getMemberUserIds(managerId: string, orgId: string): Promise<string[]> {
    const teams = await this.findByManagerId(managerId, orgId);
    const memberIds = teams.flatMap((t) => t.members.map((m) => m.userId));
    return [...new Set([managerId, ...memberIds])];
  }
}
