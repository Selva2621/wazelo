import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { StructuredLogger } from '@/infrastructure/logger/structured-logger.service';
import { MetricsService } from '@/modules/observability/domain/services/metrics.service';
import { getTraceId, getTraceContext } from '@/common/middleware/trace-id.middleware';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: StructuredLogger,
    private readonly metricsService: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const traceId = getTraceId();
    const traceCtx = getTraceContext();
    const startTime = traceCtx?.startTime ?? Date.now();

    const user = (request as any).user;
    const method = request.method;
    const url = request.url;
    const orgId = user?.orgId;

    // Log request start
    this.logger.logStructured('info', 'Request started', {
      traceId,
      method,
      url,
      orgId,
      userId: user?.sub,
      service: context.getClass().name,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode;

          // Log request completion
          this.logger.logStructured('info', 'Request completed', {
            traceId,
            method,
            url,
            statusCode,
            duration,
            orgId,
            userId: user?.sub,
          });

          // Record metrics
          this.metricsService.recordApiRequest(
            method,
            url,
            statusCode,
            duration,
            orgId,
          );

          // Enrich trace context on the request for downstream audit usage
          (request as any).requestDuration = duration;
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.logStructured('error', 'Request failed', {
            traceId,
            method,
            url,
            duration,
            orgId,
            userId: user?.sub,
            error: error instanceof Error ? error.message : String(error),
          });

          this.metricsService.recordApiRequest(
            method,
            url,
            error?.status ?? 500,
            duration,
            orgId,
          );
        },
      }),
    );
  }
}
