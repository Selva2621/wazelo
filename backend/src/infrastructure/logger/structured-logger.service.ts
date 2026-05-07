import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';

export interface StructuredLogContext {
  traceId?: string;
  orgId?: string;
  userId?: string;
  service?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: unknown;
}

@Injectable()
export class StructuredLogger implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      defaultMeta: {
        service: 'wazelo-backend',
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'unknown',
      },
      transports: [
        new winston.transports.Console({
          format: isProduction
            ? winston.format.combine(
                winston.format.timestamp(),
                winston.format.json(),
              )
            : winston.format.combine(
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                  const traceStr = meta.traceId ? ` [${meta.traceId}]` : '';
                  const contextStr = meta.context ? ` [${meta.context}]` : '';
                  // Remove fields already displayed
                  const { context, traceId, service, pid, hostname, ...rest } = meta;
                  const extra = Object.keys(rest).length > 0
                    ? ` ${JSON.stringify(rest)}`
                    : '';
                  return `${timestamp}${traceStr}${contextStr} ${level}: ${message}${extra}`;
                }),
              ),
        }),
      ],
    });

    // File transport in production for centralized log shipping
    if (isProduction) {
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 20,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }
  }

  log(message: string, context?: string | StructuredLogContext): void {
    this.writeLog('info', message, context);
  }

  error(message: string, trace?: string, context?: string | StructuredLogContext): void {
    const meta = this.normalizeContext(context);
    if (trace) {
      meta.stack = trace;
    }
    this.logger.error(message, meta);
  }

  warn(message: string, context?: string | StructuredLogContext): void {
    this.writeLog('warn', message, context);
  }

  debug(message: string, context?: string | StructuredLogContext): void {
    this.writeLog('debug', message, context);
  }

  verbose(message: string, context?: string | StructuredLogContext): void {
    this.writeLog('verbose', message, context);
  }

  /**
   * Structured log with explicit context object.
   * Use this for machine-parseable logs with rich metadata.
   */
  logStructured(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    context: StructuredLogContext,
  ): void {
    this.logger.log(level, message, context);
  }

  private writeLog(
    level: string,
    message: string,
    context?: string | StructuredLogContext,
  ): void {
    this.logger.log(level, message, this.normalizeContext(context));
  }

  private normalizeContext(
    context?: string | StructuredLogContext,
  ): Record<string, unknown> {
    if (!context) return {};
    if (typeof context === 'string') return { context };
    return context;
  }
}
