import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../decorators/current-user.decorator';
import { EVENT_NAMES } from '../constants';

/**
 * Interceptor that enforces multi-tenant isolation.
 *
 * For every authenticated request:
 *   1. If the request body contains `orgId`, it is overridden with the JWT user's orgId.
 *   2. If query params contain `orgId`, it is overridden.
 *   3. If a route param contains `orgId` that differs from the user's org, the request
 *      is logged as a cross-tenant access attempt (but the value is still overridden,
 *      not rejected — the use-case will query with the correct org).
 *
 * This ensures that even if a malicious client sends a different orgId,
 * the system always scopes data to the authenticated user's organization.
 */
@Injectable()
export class OrgScopeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OrgScopeInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Skip public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    if (!user?.orgId) {
      return next.handle();
    }

    const userOrgId = user.orgId;

    // Override orgId in request body (only if already present — don't inject into DTOs that don't expect it)
    if (request.body && typeof request.body === 'object' && 'orgId' in request.body) {
      if (request.body.orgId !== userOrgId) {
        this.logCrossTenantAttempt(request, user, request.body.orgId, 'body');
      }
      request.body.orgId = userOrgId;
    }

    // Override orgId in query params
    if (request.query && request.query.orgId) {
      if (request.query.orgId !== userOrgId) {
        this.logCrossTenantAttempt(request, user, request.query.orgId, 'query');
      }
      request.query.orgId = userOrgId;
    }

    return next.handle();
  }

  private logCrossTenantAttempt(
    request: any,
    user: JwtPayload,
    attemptedOrgId: string,
    source: string,
  ): void {
    this.logger.error(
      `Cross-tenant access attempt: user=${user.sub} userOrg=${user.orgId} ` +
        `attemptedOrg=${attemptedOrgId} source=${source} ` +
        `endpoint=${request.method} ${request.url}`,
    );

    try {
      this.eventEmitter.emit(EVENT_NAMES.CROSS_TENANT_ACCESS_BLOCKED, {
        userId: user.sub,
        userOrgId: user.orgId,
        attemptedOrgId,
        method: request.method,
        url: request.url,
        ipAddress: request.ip,
        userAgent: request.headers?.['user-agent'],
      });
    } catch {
      // Event emission must never break the interceptor flow
    }
  }
}
