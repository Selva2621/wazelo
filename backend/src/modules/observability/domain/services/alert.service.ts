import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertsRepository } from '../../infrastructure/repositories/alerts.repository';
import { MetricsRepository } from '../../infrastructure/repositories/metrics.repository';
import { EVENT_NAMES } from '@/common/constants';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly alertsRepository: AlertsRepository,
    private readonly metricsRepository: MetricsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Evaluate all active alert rules every 60 seconds.
   * Checks metric values against thresholds and dispatches alerts.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateAlerts(): Promise<void> {
    try {
      const rules = await this.alertsRepository.findActiveRules();

      for (const rule of rules) {
        await this.evaluateRule(rule);
      }
    } catch (error) {
      this.logger.error(
        'Alert evaluation cycle failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async evaluateRule(rule: {
    id: string;
    name: string;
    metric: string;
    condition: string;
    threshold: number;
    windowSeconds: number;
    cooldownSeconds: number;
    lastTriggeredAt: Date | null;
    channels: unknown;
    channelConfig: unknown;
  }): Promise<void> {
    // Check cooldown — don't re-alert within cooldown window
    if (rule.lastTriggeredAt) {
      const cooldownEnd = new Date(
        rule.lastTriggeredAt.getTime() + rule.cooldownSeconds * 1000,
      );
      if (new Date() < cooldownEnd) return;
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - rule.windowSeconds * 1000);

    try {
      const agg = await this.metricsRepository.getAggregated(
        rule.metric,
        startDate,
        endDate,
      );

      const metricValue = agg.avg;
      const triggered = this.checkCondition(
        metricValue,
        rule.condition,
        rule.threshold,
      );

      if (triggered) {
        await this.triggerAlert(rule, metricValue);
      }
    } catch (error) {
      this.logger.error(
        `Failed to evaluate alert rule ${rule.id}: ${rule.name}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private checkCondition(
    value: number,
    condition: string,
    threshold: number,
  ): boolean {
    switch (condition) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        this.logger.warn(`Unknown alert condition: ${condition}`);
        return false;
    }
  }

  private async triggerAlert(
    rule: {
      id: string;
      name: string;
      metric: string;
      threshold: number;
      channels: unknown;
      channelConfig: unknown;
    },
    value: number,
  ): Promise<void> {
    const channels = rule.channels as string[];
    const message = `Alert: ${rule.name} — metric "${rule.metric}" is ${value} (threshold: ${rule.threshold})`;

    this.logger.warn(message);

    // Record alert event
    await this.alertsRepository.createAlertEvent({
      alertRuleId: rule.id,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      message,
      channels,
      metadata: { channelConfig: rule.channelConfig },
    });

    // Update last triggered
    await this.alertsRepository.updateRuleLastTriggered(rule.id);

    // Emit event for dispatch handlers (email, webhook, Slack)
    this.eventEmitter.emit(EVENT_NAMES.ALERT_TRIGGERED, {
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      message,
      channels,
      channelConfig: rule.channelConfig,
      timestamp: new Date().toISOString(),
    });
  }

  async getAlertRules() {
    return this.alertsRepository.getAllRules();
  }

  async getRecentAlerts(limit: number = 50, offset: number = 0) {
    return this.alertsRepository.getRecentAlerts(limit, offset);
  }

  async createAlertRule(input: {
    name: string;
    metric: string;
    condition: string;
    threshold: number;
    windowSeconds: number;
    channels: string[];
    channelConfig: Record<string, unknown>;
    cooldownSeconds?: number;
  }) {
    return this.alertsRepository.createRule(input);
  }
}
