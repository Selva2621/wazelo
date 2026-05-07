import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class RbacRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // Permission CRUD
  // ─────────────────────────────────────────────

  async findAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  async findPermissionByResourceAction(resource: string, action: string) {
    return this.prisma.permission.findUnique({
      where: { unique_permission: { resource, action } },
    });
  }

  async upsertPermission(data: {
    resource: string;
    action: string;
    description?: string;
  }) {
    return this.prisma.permission.upsert({
      where: {
        unique_permission: { resource: data.resource, action: data.action },
      },
      update: { description: data.description },
      create: data,
    });
  }

  // ─────────────────────────────────────────────
  // Role-Permission mapping
  // ─────────────────────────────────────────────

  /**
   * Get all permission strings (resource:action) for a role within an org.
   */
  async getPermissionsForRole(orgId: string, role: UserRole): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { orgId, role },
      include: { permission: true },
    });

    return rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );
  }

  /**
   * Get all role-permission mappings for an org, grouped by role.
   */
  async getRolePermissionsForOrg(orgId: string) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { orgId },
      include: { permission: true },
      orderBy: [{ role: 'asc' }, { permission: { resource: 'asc' } }],
    });

    const grouped: Record<string, Array<{ id: string; resource: string; action: string; description: string | null }>> = {};

    for (const rp of rolePermissions) {
      const key = rp.role;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        id: rp.permission.id,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description,
      });
    }

    return grouped;
  }

  /**
   * Assign a permission to a role for a specific org.
   * Uses upsert for idempotency.
   */
  async assignPermissionToRole(
    orgId: string,
    role: UserRole,
    permissionId: string,
    grantedById?: string,
  ) {
    return this.prisma.rolePermission.upsert({
      where: {
        unique_role_permission_per_org: { orgId, role, permissionId },
      },
      update: {}, // No-op if exists — idempotent
      create: {
        orgId,
        role,
        permissionId,
        grantedById,
      },
    });
  }

  /**
   * Revoke a permission from a role for a specific org.
   */
  async revokePermissionFromRole(
    orgId: string,
    role: UserRole,
    permissionId: string,
  ) {
    return this.prisma.rolePermission.deleteMany({
      where: { orgId, role, permissionId },
    });
  }

  /**
   * Bulk replace all permissions for a role in an org.
   * Uses a transaction: delete all existing, then insert new set.
   */
  async replacePermissionsForRole(
    orgId: string,
    role: UserRole,
    permissionIds: string[],
    grantedById?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Delete all existing permissions for this role+org
      await tx.rolePermission.deleteMany({
        where: { orgId, role },
      });

      // Insert new set
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            orgId,
            role,
            permissionId,
            grantedById,
          })),
          skipDuplicates: true,
        });
      }

      // Return the new state
      return tx.rolePermission.findMany({
        where: { orgId, role },
        include: { permission: true },
      });
    });
  }

  /**
   * Seed default permissions for a new org.
   * Called during org creation to bootstrap role-permission mappings.
   */
  async seedDefaultPermissionsForOrg(
    orgId: string,
    permissionMap: Record<string, string[]>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      for (const [role, permissionStrings] of Object.entries(permissionMap)) {
        for (const permStr of permissionStrings) {
          const [resource, action] = permStr.split(':');
          const permission = await tx.permission.findUnique({
            where: { unique_permission: { resource, action } },
          });

          if (permission) {
            await tx.rolePermission.upsert({
              where: {
                unique_role_permission_per_org: {
                  orgId,
                  role: role as UserRole,
                  permissionId: permission.id,
                },
              },
              update: {},
              create: {
                orgId,
                role: role as UserRole,
                permissionId: permission.id,
              },
            });
          }
        }
      }
    });
  }

  /**
   * Check if any role-permissions exist for an org (to determine if seeding is needed).
   */
  async hasPermissionsForOrg(orgId: string): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: { orgId },
    });
    return count > 0;
  }
}
