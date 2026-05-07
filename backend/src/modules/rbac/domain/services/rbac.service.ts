import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RbacRepository } from '../../infrastructure/repositories/rbac.repository';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '../permissions.constants';

/**
 * Core RBAC service.
 *
 * Responsibilities:
 *   - Seed permission definitions on startup
 *   - Resolve permissions for a role+org (used by PermissionsGuard)
 *   - In-memory cache with TTL to avoid per-request DB hits
 *
 * Cache strategy:
 *   - Key: `${orgId}:${role}` → Set<string> of permission strings
 *   - TTL: 60 seconds (balances freshness vs performance)
 *   - Invalidated on role-permission updates
 *   - 1000+ concurrent users → ~100 distinct cache keys (orgs × roles)
 */
@Injectable()
export class RbacService implements OnModuleInit {
  private readonly logger = new Logger(RbacService.name);

  /** In-memory cache: orgId:role → { permissions: Set<string>, expiresAt: number } */
  private cache = new Map<string, { permissions: Set<string>; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60_000; // 60 seconds

  constructor(private readonly rbacRepository: RbacRepository) {}

  /**
   * On module init: seed all permission definitions into the DB.
   * This ensures new permissions added in code are always present in DB.
   */
  async onModuleInit() {
    try {
      await this.seedPermissions();
      this.logger.log(
        `Seeded ${ALL_PERMISSIONS.length} permission definitions`,
      );
    } catch (error) {
      this.logger.error(`Failed to seed permissions: ${error.message}`);
      // Non-fatal: app can still run with existing permissions
    }
  }

  /**
   * Seed all permission definitions (resource:action) into the permissions table.
   * Idempotent — uses upsert.
   */
  async seedPermissions(): Promise<void> {
    for (const perm of ALL_PERMISSIONS) {
      await this.rbacRepository.upsertPermission({
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      });
    }
  }

  /**
   * Seed default role-permission mappings for a newly created org.
   * Called from the registration flow / org creation use-case.
   */
  async seedDefaultPermissionsForOrg(orgId: string): Promise<void> {
    const hasExisting = await this.rbacRepository.hasPermissionsForOrg(orgId);
    if (hasExisting) {
      this.logger.debug(
        `Org ${orgId} already has permissions seeded, skipping`,
      );
      return;
    }

    await this.rbacRepository.seedDefaultPermissionsForOrg(
      orgId,
      DEFAULT_ROLE_PERMISSIONS,
    );

    this.logger.log(`Seeded default permissions for org ${orgId}`);
  }

  /**
   * Get all permissions for a specific role in an org.
   * Returns a Set<string> for O(1) lookup in the guard.
   *
   * Uses in-memory cache with TTL to avoid per-request DB hits.
   */
  async getPermissionsForRole(
    orgId: string,
    role: string,
  ): Promise<Set<string>> {
    const cacheKey = `${orgId}:${role}`;
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    // Cache miss or expired — load from DB
    const permissionStrings = await this.rbacRepository.getPermissionsForRole(
      orgId,
      role as any,
    );

    const permSet = new Set(permissionStrings);

    this.cache.set(cacheKey, {
      permissions: permSet,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return permSet;
  }

  /**
   * Invalidate cache for a specific org+role (after permission update).
   */
  invalidateCache(orgId: string, role?: string): void {
    if (role) {
      this.cache.delete(`${orgId}:${role}`);
    } else {
      // Invalidate all roles for this org
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${orgId}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Invalidate entire cache (used during testing or emergency).
   */
  invalidateAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get all permission definitions (for admin UI).
   */
  async getAllPermissions() {
    return this.rbacRepository.findAllPermissions();
  }

  /**
   * Get role-permission mappings for an org (for admin UI).
   */
  async getRolePermissionsForOrg(orgId: string) {
    return this.rbacRepository.getRolePermissionsForOrg(orgId);
  }
}
