import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Observable, tap } from 'rxjs';
import { DeveloperApiRepository } from '../../infrastructure/repositories/developer-api.repository';

/**
 * Records every API-key request (method, path, status, duration) for the
 * Settings → API Logs view. Writes are fire-and-forget so logging never
 * slows down or fails the request.
 */
@Injectable()
export class ApiRequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiRequestLogInterceptor.name);

  constructor(
    private readonly repo: DeveloperApiRepository,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const startedAt = Date.now();

    // The status a handler returns with, before the response is written
    const successStatus =
      this.reflector.get<number>(HTTP_CODE_METADATA, context.getHandler()) ??
      (req.method === 'POST' ? HttpStatus.CREATED : HttpStatus.OK);

    const record = (statusCode: number, errorMessage?: string) => {
      const auth = req.apiKeyAuth as { orgId: string; keyId: string } | undefined;
      if (!auth) return;
      this.repo
        .logApiRequest({
          orgId: auth.orgId,
          apiKeyId: auth.keyId,
          method: req.method,
          path: String(req.originalUrl ?? req.url).split('?')[0],
          statusCode,
          durationMs: Date.now() - startedAt,
          ipAddress: req.ip,
          errorMessage,
        })
        .catch((err) => this.logger.warn(`Failed to write API request log: ${err?.message ?? err}`));
    };

    return next.handle().pipe(
      tap({
        next: () => record(successStatus),
        error: (err: unknown) => {
          // Only client-facing errors carry their message; internal errors stay generic
          if (err instanceof HttpException) {
            record(err.getStatus(), err.message);
          } else {
            record(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error');
          }
        },
      }),
    );
  }
}
