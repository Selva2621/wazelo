import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { getTraceId } from '@/common/middleware/trace-id.middleware';
import { StructuredLogger } from '@/infrastructure/logger/structured-logger.service';
import { ErrorTrackingService } from '@/modules/observability/domain/services/error-tracking.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Optional()
    @Inject(StructuredLogger)
    private readonly logger?: StructuredLogger,
    @Optional()
    @Inject(ErrorTrackingService)
    private readonly errorTracking?: ErrorTrackingService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId = getTraceId();
    const user = (request as any).user;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errors: object | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object') {
        const body = responseBody as Record<string, unknown>;
        message = (body.message as string | object) || message;
        errors = body.errors as object | undefined;
      }
    }

    // Structured error logging
    const errorMessage =
      exception instanceof Error
        ? exception.message
        : String(message);

    const logContext = {
      traceId,
      statusCode: status,
      method: request.method,
      url: request.url,
      orgId: user?.orgId,
      userId: user?.sub,
      ip: request.ip,
    };

    if (status >= 500) {
      // Server errors: full stack trace + error tracking
      this.logger?.error(
        `Unhandled exception: ${errorMessage}`,
        exception instanceof Error ? exception.stack : undefined,
        logContext,
      );

      // Track in error grouping service
      this.errorTracking?.trackError(
        exception instanceof Error ? exception : errorMessage,
        {
          context: 'GlobalExceptionFilter',
          orgId: user?.orgId,
          userId: user?.sub,
          method: request.method,
          url: request.url,
          statusCode: status,
        },
      );
    } else if (status >= 400) {
      // Client errors: warn level, no error tracking
      this.logger?.warn(`Client error ${status}: ${errorMessage}`, logContext);
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors && { errors }),
      traceId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
