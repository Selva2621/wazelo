import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction } from '@prisma/client';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../domain/services/audit.service';

export const AUDITED_KEY = 'audited';

export interface AuditedOptions {
  action: AuditAction;
  targetType: string;
  /** Route param holding the target id (else the response's `id`) */
  idParam?: string;
}

interface RequestUser {
  sub?: string;
  orgId?: string;
}

/**
 * Writes one audit row after an @Audited endpoint succeeds: who, which org, what
 * target, and the NAMES of the fields sent (never their values: prompts, documents
 * and customer text stay out of the audit log). Failed requests aren't logged.
 */
@Injectable()
export class AuditedInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditedOptions | undefined>(AUDITED_KEY, context.getHandler());
    if (!options) return next.handle();

    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser; file?: { originalname?: string } }>();
    return next.handle().pipe(
      tap((result) => {
        const fromResult = (result as { id?: unknown; data?: { id?: unknown } } | null) ?? null;
        const resultId = fromResult?.id ?? fromResult?.data?.id;
        const param = options.idParam ? req.params?.[options.idParam] : undefined;
        const targetId = (typeof param === 'string' && param) || (typeof resultId === 'string' ? resultId : undefined);
        const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
        void this.audit.log({
          orgId: req.user?.orgId,
          userId: req.user?.sub,
          action: options.action,
          targetType: options.targetType,
          targetId,
          metadata: {
            changedFields: Object.keys(body),
            ...(req.file?.originalname && { fileName: req.file.originalname.slice(0, 200) }),
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }),
    );
  }
}
