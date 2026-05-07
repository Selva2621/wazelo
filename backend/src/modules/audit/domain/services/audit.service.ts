import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  AuditRepository,
  CreateAuditLogInput,
} from '../../infrastructure/repositories/audit.repository';
import { getTraceId } from '@/common/middleware/trace-id.middleware';
import { OBSERVABILITY_CONFIG } from '@/common/constants';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService implements OnModuleDestroy {
  private readonly logger = new Logger(AuditService.name);
  private buffer: CreateAuditLogInput[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;

  constructor(private readonly auditRepository: AuditRepository) {
    // Start periodic flush timer
    this.flushTimer = setInterval(
      () => this.flush(),
      OBSERVABILITY_CONFIG.AUDIT_FLUSH_INTERVAL_MS,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    // Drain remaining buffer on shutdown
    await this.flush();
  }

  /**
   * Log an audit event. Automatically attaches the current trace ID.
   * Uses buffered writes for performance under high load.
   * Fire-and-forget — never breaks the main flow.
   */
  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      // Attach trace ID from AsyncLocalStorage if not explicitly provided
      if (!input.traceId) {
        input.traceId = getTraceId();
      }

      // Sanitize metadata — strip sensitive fields
      if (input.metadata) {
        input.metadata = this.sanitizeMetadata(input.metadata);
      }

      this.buffer.push(input);

      // Flush if buffer is full
      if (this.buffer.length >= OBSERVABILITY_CONFIG.AUDIT_BUFFER_SIZE) {
        await this.flush();
      }
    } catch (error) {
      // Audit logging must never break the main flow
      this.logger.error(
        `Failed to buffer audit log: ${input.action}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Log an audit event immediately without buffering.
   * Use for critical security events that must not be delayed.
   */
  async logImmediate(input: CreateAuditLogInput): Promise<void> {
    try {
      if (!input.traceId) {
        input.traceId = getTraceId();
      }
      if (input.metadata) {
        input.metadata = this.sanitizeMetadata(input.metadata);
      }
      await this.auditRepository.create(input);
    } catch (error) {
      this.logger.error(
        `Failed to write immediate audit log: ${input.action}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Get audit log statistics for dashboard.
   */
  async getStats(orgId: string, startDate: Date, endDate: Date) {
    return this.auditRepository.getStats(orgId, startDate, endDate);
  }

  /**
   * Flush the audit log buffer to the database.
   * Uses batch insert for efficiency. Handles partial failures gracefully.
   */
  private async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;

    this.flushing = true;
    const batch = this.buffer.splice(0, this.buffer.length);

    try {
      const count = await this.auditRepository.createMany(batch);
      if (count !== batch.length) {
        this.logger.warn(
          `Audit flush: wrote ${count}/${batch.length} logs (duplicates skipped)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Audit flush failed for ${batch.length} logs, falling back to individual writes`,
        error instanceof Error ? error.stack : String(error),
      );

      // Fallback: try writing individually so we don't lose all logs
      for (const entry of batch) {
        try {
          await this.auditRepository.create(entry);
        } catch (innerError) {
          this.logger.error(
            `Individual audit write also failed: ${entry.action}`,
            innerError instanceof Error
              ? innerError.stack
              : String(innerError),
          );
        }
      }
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Strip PII / sensitive fields from metadata before logging.
   * AC4: No sensitive data leakage.
   */
  private sanitizeMetadata(
    metadata: Record<string, unknown>,
  ): Record<string, unknown> {
    const sensitiveKeys = [
      'password',
      'passwordHash',
      'token',
      'refreshToken',
      'accessToken',
      'secret',
      'apiKey',
      'creditCard',
      'ssn',
      'encryptedCreds',
    ];

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
