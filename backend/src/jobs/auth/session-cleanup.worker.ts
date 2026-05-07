import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionRepository } from '@/modules/auth/infrastructure/repositories/session.repository';

@Injectable()
export class SessionCleanupWorker {
  private readonly logger = new Logger(SessionCleanupWorker.name);

  constructor(private readonly sessionRepository: SessionRepository) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup(): Promise<void> {
    try {
      const deleted = await this.sessionRepository.deleteExpiredSessions();
      if (deleted > 0) {
        this.logger.log(`Cleaned up ${deleted} expired/revoked sessions`);
      }
    } catch (error) {
      this.logger.error(
        'Session cleanup failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
