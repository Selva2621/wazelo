import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Req, ParseUUIDPipe, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import {
  CreateTicketUseCase,
  GetTicketUseCase,
  ListTicketsUseCase,
  ReplyToTicketUseCase,
  UpdateTicketStatusUseCase,
} from '../../application/use-cases/ticket.use-cases';
import {
  CreateTicketDto,
  ReplyToTicketDto,
  UpdateTicketStatusDto,
  ListTicketsQueryDto,
} from '../../application/dto/ticket.dto';

@Controller('super-admin/tickets')
export class SuperAdminTicketsController {
  constructor(
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly getTicketUseCase: GetTicketUseCase,
    private readonly listTicketsUseCase: ListTicketsUseCase,
    private readonly replyToTicketUseCase: ReplyToTicketUseCase,
    private readonly updateTicketStatusUseCase: UpdateTicketStatusUseCase,
  ) {}

  /** Any authenticated org user or super admin can create a ticket */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async createTicket(@Body() dto: CreateTicketDto, @CurrentUser() user: JwtPayload) {
    if (user.isSuperAdmin) {
      if (!dto.orgId || !dto.userId) {
        throw new BadRequestException('orgId and userId are required for super admin ticket creation');
      }
      return this.createTicketUseCase.execute(dto.orgId, dto.userId, dto);
    }
    return this.createTicketUseCase.execute(user.orgId, user.sub, dto);
  }

  /** List — super admin sees all; org users see their org's tickets */
  @Get()
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async listTickets(@Query() query: ListTicketsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listTicketsUseCase.execute(query, user.orgId, user.isSuperAdmin);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getTicket(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.getTicketUseCase.execute(id, user.orgId, user.isSuperAdmin);
  }

  /** Both org users and super admin can reply */
  @Post(':id/replies')
  @HttpCode(HttpStatus.CREATED)
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async replyToTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyToTicketDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const userId = user.isSuperAdmin ? undefined : user.sub;
    const superAdminId = user.isSuperAdmin ? user.sub : undefined;
    return this.replyToTicketUseCase.execute(id, dto, userId, superAdminId, user.orgId);
  }

  /** Only super admin can change ticket status */
  @Patch(':id/status')
  @UseGuards(SuperAdminGuard)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.updateTicketStatusUseCase.execute(id, dto, user.orgId, user.isSuperAdmin);
  }
}
