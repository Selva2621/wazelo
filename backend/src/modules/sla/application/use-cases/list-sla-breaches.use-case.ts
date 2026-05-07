import { Injectable } from '@nestjs/common';
import { AnalyticsScopeService } from '@/modules/analytics/domain/services/analytics-scope.service';
import { SlaRepository } from '../../infrastructure/repositories/sla.repository';
import { ListSlaBreachesQueryDto } from '../dto/sla-query.dto';

@Injectable()
export class ListSlaBreachesUseCase {
  constructor(
    private readonly slaRepo: SlaRepository,
    private readonly scopeService: AnalyticsScopeService,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    query: ListSlaBreachesQueryDto,
  ) {
    const scope = await this.scopeService.resolveScope(
      orgId,
      role,
      requesterId,
      query.assignedUserId,
    );

    const effectiveUserId = scope.userIds?.length === 1
      ? scope.userIds[0]
      : query.assignedUserId;

    return this.slaRepo.listBreaches(orgId, {
      policyId: query.policyId,
      conversationId: query.conversationId,
      assignedUserId: effectiveUserId,
      status: query.status,
      metricType: query.metricType,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
  }
}
