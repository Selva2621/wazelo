import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { WhatsAppModule } from '@/modules/whatsapp/whatsapp.module';

// Repository
import { TeamRepository } from './infrastructure/repositories/team.repository';

// Use cases
import { CreateTeamUseCase } from './application/use-cases/create-team.use-case';
import { ListTeamsUseCase } from './application/use-cases/list-teams.use-case';
import { UpdateTeamUseCase } from './application/use-cases/update-team.use-case';
import { DeleteTeamUseCase } from './application/use-cases/delete-team.use-case';
import { AddTeamMemberUseCase } from './application/use-cases/add-team-member.use-case';
import { RemoveTeamMemberUseCase } from './application/use-cases/remove-team-member.use-case';
import { GetTeamSessionIdsUseCase } from './application/use-cases/get-team-session-ids.use-case';

// Controller
import { TeamsController } from './interfaces/controllers/teams.controller';

@Module({
  imports: [AuditModule, forwardRef(() => WhatsAppModule)],
  controllers: [TeamsController],
  providers: [
    TeamRepository,
    CreateTeamUseCase,
    ListTeamsUseCase,
    UpdateTeamUseCase,
    DeleteTeamUseCase,
    AddTeamMemberUseCase,
    RemoveTeamMemberUseCase,
    GetTeamSessionIdsUseCase,
  ],
  exports: [TeamRepository, GetTeamSessionIdsUseCase],
})
export class TeamsModule {}
