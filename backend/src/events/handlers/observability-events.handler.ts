import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { StructuredLogger } from '@/infrastructure/logger/structured-logger.service';

@Injectable()
export class ObservabilityEventsHandler {
  private readonly logger = new Logger(ObservabilityEventsHandler.name);

  constructor(private readonly structuredLogger: StructuredLogger) {}

  /**
   * Handle alert triggered events — log for centralized logging.
   */
  @OnEvent(EVENT_NAMES.ALERT_TRIGGERED)
  async handleAlertTriggered(payload: {
    ruleId: string;
    ruleName: string;
    metric: string;
    value: number;
    threshold: number;
    message: string;
    channels: string[];
    channelConfig: unknown;
    timestamp: string;
  }) {
    this.structuredLogger.logStructured('warn', 'Alert triggered', {
      ruleId: payload.ruleId,
      ruleName: payload.ruleName,
      metric: payload.metric,
      value: payload.value,
      threshold: payload.threshold,
      channels: payload.channels,
    });

    // Dispatch to each channel
    for (const channel of payload.channels) {
      try {
        await this.dispatchAlert(channel, payload);
      } catch (error) {
        this.logger.error(
          `Failed to dispatch alert via ${channel}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  /**
   * Handle tracked error events — log for centralized logging.
   */
  @OnEvent(EVENT_NAMES.ERROR_TRACKED)
  handleErrorTracked(payload: {
    fingerprint: string;
    message: string;
    stack?: string;
    traceId: string;
    orgId?: string;
    userId?: string;
    statusCode?: number;
    count: number;
    timestamp: string;
  }) {
    this.structuredLogger.logStructured('error', 'Error tracked', {
      fingerprint: payload.fingerprint,
      traceId: payload.traceId,
      orgId: payload.orgId,
      statusCode: payload.statusCode,
      occurrences: payload.count,
    });
  }

  /**
   * Dispatch an alert to a specific channel.
   * Extensible: add Slack, PagerDuty, etc. as needed.
   */
  private async dispatchAlert(
    channel: string,
    payload: {
      message: string;
      channelConfig: unknown;
    },
  ): Promise<void> {
    const config = payload.channelConfig as Record<string, unknown>;

    switch (channel) {
      case 'webhook': {
        const url = config?.webhook as string;
        if (url) {
          // Non-blocking webhook delivery
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: payload.message,
              timestamp: new Date().toISOString(),
            }),
            signal: AbortSignal.timeout(5000),
          }).catch((err) => {
            this.logger.error(`Webhook delivery failed: ${err.message}`);
          });
        }
        break;
      }

      case 'email': {
        // Email alerts would go through the existing EmailService/queue
        // For now, log the intent. Wire up when EmailModule is available.
        this.logger.log(
          `Email alert: ${payload.message} → ${config?.email ?? 'not configured'}`,
        );
        break;
      }

      case 'slack': {
        const webhookUrl = config?.slack as string;
        if (webhookUrl) {
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: payload.message }),
            signal: AbortSignal.timeout(5000),
          }).catch((err) => {
            this.logger.error(`Slack delivery failed: ${err.message}`);
          });
        }
        break;
      }

      default:
        this.logger.warn(`Unknown alert channel: ${channel}`);
    }
  }
}
