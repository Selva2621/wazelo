import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { UsageLimitGuard, USAGE_LIMIT_KEY } from '@/modules/billing/interfaces/guards/usage-limit.guard';
import { UsageMetricType } from '@prisma/client';
import {
  InviteUserDto,
  CreateUserDto,
  UpdateUserDto,
  ChangeRoleDto,
  AcceptInviteDto,
  ListUsersQueryDto,
} from '../../application/dto';
import {
  InviteUserUseCase,
  AcceptInviteUseCase,
  CreateUserUseCase,
  ListUsersUseCase,
  GetUserUseCase,
  UpdateUserUseCase,
  ChangeRoleUseCase,
  DisableUserUseCase,
  EnableUserUseCase,
  DeleteUserUseCase,
  RevokeInviteUseCase,
  ListInvitationsUseCase,
} from '../../application/use-cases';

@Controller('users')
export class UsersController {
  constructor(
    private readonly inviteUserUseCase: InviteUserUseCase,
    private readonly acceptInviteUseCase: AcceptInviteUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly changeRoleUseCase: ChangeRoleUseCase,
    private readonly disableUserUseCase: DisableUserUseCase,
    private readonly enableUserUseCase: EnableUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly revokeInviteUseCase: RevokeInviteUseCase,
    private readonly listInvitationsUseCase: ListInvitationsUseCase,
  ) {}

  // ───── Invitation endpoints ─────

  @Post('invite')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.USERS_INVITE)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.ACTIVE_USERS)
  async inviteUser(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteUserDto,
    @Req() req: Request,
  ) {
    return this.inviteUserUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('accept-invite')
  @Public()
  async acceptInvite(@Body() dto: AcceptInviteDto, @Req() req: Request) {
    return this.acceptInviteUseCase.execute(
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('invitations')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.USERS_INVITE)
  async listInvitations(@CurrentUser() user: JwtPayload) {
    return this.listInvitationsUseCase.execute(user.orgId);
  }

  @Delete('invitations/:invitationId')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.USERS_INVITE)
  async revokeInvitation(
    @CurrentUser() user: JwtPayload,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Req() req: Request,
  ) {
    return this.revokeInviteUseCase.execute(
      invitationId,
      user.orgId,
      user.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ───── Self-service profile ─────

  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.updateUserUseCase.execute(
      user.sub,
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ───── User CRUD endpoints ─────

  @Post()
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.USERS_CREATE)
  @UseGuards(UsageLimitGuard)
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.ACTIVE_USERS)
  async createUser(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateUserDto,
    @Req() req: Request,
  ) {
    return this.createUserUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.USERS_READ)
  async listUsers(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.listUsersUseCase.execute(user.orgId, query);
  }

  @Get(':userId')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.USERS_READ)
  async getUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.getUserUseCase.execute(userId, user.orgId);
  }

  @Patch(':userId')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.USERS_UPDATE)
  async updateUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.updateUserUseCase.execute(
      userId,
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':userId/role')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.USERS_CHANGE_ROLE)
  async changeRole(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ChangeRoleDto,
    @Req() req: Request,
  ) {
    return this.changeRoleUseCase.execute(
      userId,
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':userId/disable')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.USERS_DISABLE)
  async disableUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    return this.disableUserUseCase.execute(
      userId,
      user.orgId,
      user.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch(':userId/enable')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.USERS_DISABLE)
  async enableUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    return this.enableUserUseCase.execute(
      userId,
      user.orgId,
      user.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':userId')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.USERS_DELETE)
  async deleteUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    return this.deleteUserUseCase.execute(
      userId,
      user.orgId,
      user.sub,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
