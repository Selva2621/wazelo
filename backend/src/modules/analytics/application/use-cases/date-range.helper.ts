import { BadRequestException } from '@nestjs/common';
import { AnalyticsQueryDto, AnalyticsPeriod } from '../dto/analytics-query.dto';
import { ANALYTICS_CONFIG } from '@/common/constants';

export function resolveRange(query: AnalyticsQueryDto): {
  startDate: Date;
  endDate: Date;
} {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (query.period) {
    case AnalyticsPeriod.DAY: {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case AnalyticsPeriod.WEEK: {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case AnalyticsPeriod.MONTH: {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case AnalyticsPeriod.CUSTOM: {
      if (!query.startDate || !query.endDate) {
        throw new BadRequestException(
          'startDate and endDate are required for custom period',
        );
      }
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);

      if (startDate > endDate) {
        throw new BadRequestException('startDate must be before endDate');
      }

      const diffDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays > ANALYTICS_CONFIG.MAX_QUERY_RANGE_DAYS) {
        throw new BadRequestException(
          `Date range cannot exceed ${ANALYTICS_CONFIG.MAX_QUERY_RANGE_DAYS} days`,
        );
      }
      break;
    }
    default:
      throw new BadRequestException(`Invalid period: ${query.period}`);
  }

  // Apply timezone offset if provided
  if (query.timezoneOffsetHours !== undefined) {
    const offsetMs = query.timezoneOffsetHours * 60 * 60 * 1000;
    startDate = new Date(startDate.getTime() - offsetMs);
    endDate = new Date(endDate.getTime() - offsetMs);
  }

  return { startDate, endDate };
}
