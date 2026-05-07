import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';
import { PermissionString } from '@/modules/rbac/domain/permissions.constants';
import { RbacService } from '@/modules/rbac/domain/services/rbac.service';
import { EVENT_NAMES } from '@/common/constants';

/**
 * Global permissions guard — enforces granular permission checks.
 *
 * Execution order (via APP_GUARD):
 *   1. JwtAuthGuard  → authenticates, sets request.user
 *   2. PermissionsGuard → this guard, checks permissions
 *   3. ThrottlerGuard → rate limiting
 *
 * Logic:
 *   - @Public() routes → skip
 *   - ADMIN role → always allowed (superuser bypass)
 *   - @Permissions(...) present → check user has ALL required permissions
 *   - @Roles(...) present (legacy) → check user.role is in required roles
 *   - Neither decorator → allow (auth-only endpoint)
 *   - Default deny: if permissions required but not granted → 403
 *
 * Caching:
 *   - Permissions are loaded once per request via RbacService and cached
 *     on request.userPermissions to avoid N+1 DB queries within a single request.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Super admin bypass — only allowed on super-admin routes
    if (user.isSuperAdmin) {
      const path: string = request.path || '';
      if (path.startsWith('/api/v1/super-admin/') || path === '/api/v1/super-admin') {
        return true;
      }
      throw new ForbiddenException('Super admin token cannot be used on org endpoints');
    }

    // ADMIN bypass — full access within their org
    if (user.role === 'ADMIN') {
      return true;
    }

    // Check for @Permissions() decorator (new system)
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionString[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions && requiredPermissions.length > 0) {
      return this.checkPermissions(request, user, requiredPermissions, context);
    }

    // Fallback: check @Roles() decorator (legacy compatibility)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        this.emitDeniedEvent(request, user, `role:${requiredRoles.join(',')}`);
        throw new ForbiddenException('Insufficient permissions');
      }
      return true;
    }

    // No decorator present → auth-only endpoint, allow
    return true;
  }

  /**
   * Check if the user has ALL required permissions for this endpoint.
   * Loads permissions from DB (cached per-request on request object).
   */
  private async checkPermissions(
    request: any,
    user: JwtPayload,
    requiredPermissions: PermissionString[],
    context: ExecutionContext,
  ): Promise<boolean> {
    // Per-request cache: avoid multiple DB calls for the same request
    if (!request._cachedPermissions) {
      try {
        request._cachedPermissions = await this.rbacService.getPermissionsForRole(
          user.orgId,
          user.role,
        );
      } catch (error) {
        this.logger.error(
          `Failed to load permissions for user ${user.sub} in org ${user.orgId}: ${error.message}`,
        );
        // Default deny on failure — do not allow access if we can't verify permissions
        throw new ForbiddenException('Unable to verify permissions');
      }
    }

    const userPermissions: Set<string> = request._cachedPermissions;

    const missingPermissions = requiredPermissions.filter(
      (perm) => !userPermissions.has(perm),
    );

    if (missingPermissions.length > 0) {
      this.emitDeniedEvent(request, user, missingPermissions.join(','));

      this.logger.warn(
        `Permission denied: user=${user.sub} org=${user.orgId} role=${user.role} ` +
          `missing=[${missingPermissions.join(', ')}] ` +
          `endpoint=${request.method} ${request.url}`,
      );

      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  /**
   * Emit an event for audit logging when access is denied.
   * Non-blocking — fire-and-forget to avoid slowing down the response.
   */
  private emitDeniedEvent(
    request: any,
    user: JwtPayload,
    deniedPermission: string,
  ): void {
    try {
      this.eventEmitter.emit(EVENT_NAMES.PERMISSION_DENIED, {
        userId: user.sub,
        orgId: user.orgId,
        role: user.role,
        permission: deniedPermission,
        method: request.method,
        url: request.url,
        ipAddress: request.ip,
        userAgent: request.headers?.['user-agent'],
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Event emission must never break the guard flow
    }
  }
}
