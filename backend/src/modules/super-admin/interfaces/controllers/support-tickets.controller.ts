import {
  Controller, Get, Post, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import {
  CreateTicketUseCase,
  GetTicketUseCase,
  ListTicketsUseCase,
  ReplyToTicketUseCase,
} from '../../application/use-cases/ticket.use-cases';
import {
  CreateTicketDto,
  ReplyToTicketDto,
  ListTicketsQueryDto,
} from '../../application/dto/ticket.dto';

/**
 * Tenant-facing help tickets — always scoped to the caller's own org.
 * Super admins use SuperAdminTicketsController (/super-admin/tickets).
 */
@Controller('support/tickets')
export class SupportTicketsController {
  constructor(
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly getTicketUseCase: GetTicketUseCase,
    private readonly listTicketsUseCase: ListTicketsUseCase,
    private readonly replyToTicketUseCase: ReplyToTicketUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async createTicket(@Body() dto: CreateTicketDto, @CurrentUser() user: JwtPayload) {
    return this.createTicketUseCase.execute(user.orgId, user.sub, dto);
  }

  @Get()
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async listTickets(@Query() query: ListTicketsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listTicketsUseCase.execute(query, user.orgId, false);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getTicket(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.getTicketUseCase.execute(id, user.orgId, false);
  }

  @Post(':id/replies')
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async replyToTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyToTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.replyToTicketUseCase.execute(id, dto, user.sub, undefined, user.orgId);
  }
}
