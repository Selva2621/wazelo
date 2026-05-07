import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { CreateTeamDto } from '../../application/dto/create-team.dto';
import { UpdateTeamDto } from '../../application/dto/update-team.dto';
import { AddTeamMemberDto } from '../../application/dto/manage-member.dto';
import { CreateTeamUseCase } from '../../application/use-cases/create-team.use-case';
import { ListTeamsUseCase } from '../../application/use-cases/list-teams.use-case';
import { UpdateTeamUseCase } from '../../application/use-cases/update-team.use-case';
import { DeleteTeamUseCase } from '../../application/use-cases/delete-team.use-case';
import { AddTeamMemberUseCase } from '../../application/use-cases/add-team-member.use-case';
import { RemoveTeamMemberUseCase } from '../../application/use-cases/remove-team-member.use-case';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly createTeamUseCase: CreateTeamUseCase,
    private readonly listTeamsUseCase: ListTeamsUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
    private readonly deleteTeamUseCase: DeleteTeamUseCase,
    private readonly addTeamMemberUseCase: AddTeamMemberUseCase,
    private readonly removeTeamMemberUseCase: RemoveTeamMemberUseCase,
  ) {}

  @Post()
  @Roles('ADMIN')
  async createTeam(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTeamDto,
    @Req() req: Request,
  ) {
    return this.createTeamUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  async listTeams(@CurrentUser() user: JwtPayload) {
    return this.listTeamsUseCase.execute(user.orgId, user.sub, user.role);
  }

  @Patch(':id')
  @Roles('ADMIN')
  async updateTeam(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
    @Req() req: Request,
  ) {
    return this.updateTeamUseCase.execute(
      user.orgId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  async deleteTeam(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.deleteTeamUseCase.execute(
      user.orgId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Post(':id/members')
  @Roles('ADMIN')
  async addMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTeamMemberDto,
    @Req() req: Request,
  ) {
    return this.addTeamMemberUseCase.execute(
      user.orgId,
      user.sub,
      id,
      dto.userId,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }

  @Delete(':id/members/:userId')
  @Roles('ADMIN')
  async removeMember(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    return this.removeTeamMemberUseCase.execute(
      user.orgId,
      user.sub,
      id,
      userId,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }
}
