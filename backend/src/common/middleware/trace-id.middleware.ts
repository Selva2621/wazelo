import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export const TRACE_ID_HEADER = 'x-trace-id';

/**
 * AsyncLocalStorage for propagating trace context across async boundaries.
 * Accessible from any service without injection (singleton).
 */
export interface TraceContext {
  traceId: string;
  startTime: number;
  orgId?: string;
  userId?: string;
}

export const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Returns the current trace ID from AsyncLocalStorage, or 'no-trace' if none.
 */
export function getTraceId(): string {
  return traceStorage.getStore()?.traceId ?? 'no-trace';
}

/**
 * Returns the full trace context from AsyncLocalStorage.
 */
export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

/**
 * Runs a callback within a trace context. Used by workers/queue consumers
 * to propagate trace IDs across async boundaries (API → Queue → Worker).
 */
export function runWithTrace<T>(
  traceId: string,
  fn: () => T,
  extra?: Partial<TraceContext>,
): T {
  const context: TraceContext = {
    traceId,
    startTime: Date.now(),
    ...extra,
  };
  return traceStorage.run(context, fn);
}

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Accept trace ID from upstream (load balancer, gateway) or generate new
    const traceId =
      (req.headers[TRACE_ID_HEADER] as string) || uuidv4();

    // Set on request for controllers/interceptors
    (req as any).traceId = traceId;

    // Set response header for client-side correlation
    res.setHeader(TRACE_ID_HEADER, traceId);

    // Run the rest of the request inside a trace context
    const context: TraceContext = {
      traceId,
      startTime: Date.now(),
    };

    traceStorage.run(context, () => {
      next();
    });
  }
}
