import { Injectable } from '@nestjs/common';
import { AnalyticsScopeService } from '@/modules/analytics/domain/services/analytics-scope.service';
import { SlaRepository } from '../../infrastructure/repositories/sla.repository';
import { ListSlaTrackingsQueryDto } from '../dto/sla-query.dto';

@Injectable()
export class ListSlaTrackingsUseCase {
  constructor(
    private readonly slaRepo: SlaRepository,
    private readonly scopeService: AnalyticsScopeService,
  ) {}

  async execute(
    orgId: string,
    role: string,
    requesterId: string,
    query: ListSlaTrackingsQueryDto,
  ) {
    // Resolve scope: ADMIN=org-wide, MANAGER=team, EMPLOYEE=self
    const scope = await this.scopeService.resolveScope(
      orgId,
      role,
      requesterId,
      query.assignedUserId,
    );

    // If scope restricts to specific users, filter by those
    const effectiveUserId = scope.userIds?.length === 1
      ? scope.userIds[0]
      : query.assignedUserId;

    return this.slaRepo.listTrackings(orgId, {
      policyId: query.policyId,
      conversationId: query.conversationId,
      assignedUserId: effectiveUserId,
      isBreached: query.isBreached,
      isWarning: query.isWarning,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
  }
}
