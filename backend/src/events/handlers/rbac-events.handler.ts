import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AuditAction } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class RbacEventsHandler {
  private readonly logger = new Logger(RbacEventsHandler.name);

  constructor(private readonly auditService: AuditService) {}

  /**
   * Log permission denied events to the audit trail.
   * Fire-and-forget — audit failures do not affect the response.
   */
  @OnEvent(EVENT_NAMES.PERMISSION_DENIED)
  async handlePermissionDenied(payload: {
    userId: string;
    orgId: string;
    role: string;
    permission: string;
    method: string;
    url: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
  }) {
    await this.auditService.log({
      orgId: payload.orgId,
      userId: payload.userId,
      action: AuditAction.PERMISSION_DENIED,
      targetType: 'api_endpoint',
      targetId: `${payload.method} ${payload.url}`,
      metadata: {
        role: payload.role,
        requiredPermission: payload.permission,
        timestamp: payload.timestamp,
      },
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    });

    this.logger.warn(
      `Permission denied: user=${payload.userId} role=${payload.role} ` +
        `permission=${payload.permission} endpoint=${payload.method} ${payload.url}`,
    );
  }

  /**
   * Log cross-tenant access attempts.
   */
  @OnEvent(EVENT_NAMES.CROSS_TENANT_ACCESS_BLOCKED)
  async handleCrossTenantBlocked(payload: {
    userId: string;
    userOrgId: string;
    attemptedOrgId: string;
    method: string;
    url: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await this.auditService.log({
      orgId: payload.userOrgId,
      userId: payload.userId,
      action: AuditAction.CROSS_TENANT_ACCESS_BLOCKED,
      targetType: 'org',
      targetId: payload.attemptedOrgId,
      metadata: {
        attemptedOrgId: payload.attemptedOrgId,
        endpoint: `${payload.method} ${payload.url}`,
      },
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    });

    this.logger.error(
      `Cross-tenant access blocked: user=${payload.userId} ` +
        `userOrg=${payload.userOrgId} attemptedOrg=${payload.attemptedOrgId}`,
    );
  }

  /**
   * Log role-permission updates for audit trail.
   */
  @OnEvent(EVENT_NAMES.ROLE_PERMISSION_UPDATED)
  async handleRolePermissionUpdated(payload: {
    orgId: string;
    role: string;
    updatedById: string;
  }) {
    this.logger.log(
      `Role permissions updated: org=${payload.orgId} role=${payload.role} ` +
        `by=${payload.updatedById}`,
    );
  }
}
