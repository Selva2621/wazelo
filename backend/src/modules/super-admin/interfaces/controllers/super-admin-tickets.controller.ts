import {
  Controller, Get, Post, Patch, Body, Param, Query, Req,
  ParseUUIDPipe, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';
import { Request } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import {
  CreateTicketUseCase,
  GetTicketUseCase,
  ListTicketsUseCase,
  ReplyToTicketUseCase,
  UpdateTicketStatusUseCase,
  AssignTicketUseCase,
  SuperAdminAuditContext,
} from '../../application/use-cases/ticket.use-cases';
import {
  CreateTicketDto,
  SuperAdminReplyDto,
  UpdateTicketStatusDto,
  ListTicketsQueryDto,
  AssignTicketDto,
} from '../../application/dto/ticket.dto';
import { requestMeta } from '../request-meta';

function auditContext(user: JwtPayload, req: Request): SuperAdminAuditContext {
  return { actor: { id: user.sub, email: user.email }, meta: requestMeta(req) };
}

/**
 * Super admin view of help tickets across all orgs.
 * Tenant users use SupportTicketsController (/support/tickets) instead.
 */
@Controller('super-admin/tickets')
@SuperAdminOnly()
export class SuperAdminTicketsController {
  constructor(
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly getTicketUseCase: GetTicketUseCase,
    private readonly listTicketsUseCase: ListTicketsUseCase,
    private readonly replyToTicketUseCase: ReplyToTicketUseCase,
    private readonly updateTicketStatusUseCase: UpdateTicketStatusUseCase,
    private readonly assignTicketUseCase: AssignTicketUseCase,
    private readonly superAdminRepo: SuperAdminRepository,
  ) {}

  /** Super admins a ticket can be assigned to. Declared before ':id' so it isn't parsed as an id. */
  @Get('assignees')
  async listAssignees() {
    return this.superAdminRepo.findAll();
  }

  /** Create a ticket on behalf of an org user */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTicket(@Body() dto: CreateTicketDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    if (!dto.orgId || !dto.userId) {
      throw new BadRequestException('orgId and userId are required for super admin ticket creation');
    }
    return this.createTicketUseCase.execute(dto.orgId, dto.userId, dto, auditContext(user, req));
  }

  @Get()
  async listTickets(@Query() query: ListTicketsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listTicketsUseCase.execute(query, undefined, true, user.sub);
  }

  @Get(':id')
  async getTicket(@Param('id', ParseUUIDPipe) id: string) {
    return this.getTicketUseCase.execute(id, undefined, true);
  }

  @Post(':id/replies')
  @HttpCode(HttpStatus.CREATED)
  async replyToTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuperAdminReplyDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.replyToTicketUseCase.execute(id, dto, undefined, user.sub, undefined, auditContext(user, req));
  }

  @Patch(':id/assignee')
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return { assignedTo: await this.assignTicketUseCase.execute(id, dto.assigneeId ?? null, auditContext(user, req)) };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.updateTicketStatusUseCase.execute(id, dto, undefined, true, auditContext(user, req));
  }
}
