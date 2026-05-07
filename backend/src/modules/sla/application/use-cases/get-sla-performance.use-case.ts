import { Injectable, BadRequestException } from '@nestjs/common';
import { AnalyticsScopeService } from '@/modules/analytics/domain/services/analytics-scope.service';
import { SlaRepository } from '../../infrastructure/repositories/sla.repository';
import { SlaPerformanceQueryDto } from '../dto/sla-query.dto';

@Injectable()
export class GetSlaPerformanceUseCase {
  constructor(
    private readonly slaRepo: SlaRepository,
    private readonly scopeService: AnalyticsScopeService,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    query: SlaPerformanceQueryDto,
  ) {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default 30 days
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const scope = await this.scopeService.resolveScope(
      orgId,
      role,
      requesterId,
      query.userId,
    );

    // Overall compliance rate
    const compliance = await this.slaRepo.getSlaComplianceRate(
      orgId,
      startDate,
      endDate,
      query.policyId,
      scope.userIds,
    );

    // Breach count by policy
    const breachByPolicy = await this.slaRepo.getBreachCountByPolicy(
      orgId,
      startDate,
      endDate,
    );

    // Breach count by user
    const breachByUser = await this.slaRepo.getBreachCountByUser(
      orgId,
      startDate,
      endDate,
      scope.userIds,
    );

    // Average response time by user
    const avgResponseByUser = await this.slaRepo.getAvgResponseTimeByUser(
      orgId,
      startDate,
      endDate,
      scope.userIds,
    );

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      compliance,
      breachByPolicy,
      breachByUser,
      avgResponseByUser,
    };
  }
}
