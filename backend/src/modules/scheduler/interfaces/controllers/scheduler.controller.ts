import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import {
  CreateScheduledMessageDto,
  UpdateScheduledMessageDto,
  ListScheduledMessagesDto,
} from '../../application/dto';
import {
  CreateScheduledMessageUseCase,
  UpdateScheduledMessageUseCase,
  CancelScheduledMessageUseCase,
  GetScheduledMessageUseCase,
  ListScheduledMessagesUseCase,
} from '../../application/use-cases';

@Controller('scheduled-messages')
export class SchedulerController {
  constructor(
    private readonly createUseCase: CreateScheduledMessageUseCase,
    private readonly updateUseCase: UpdateScheduledMessageUseCase,
    private readonly cancelUseCase: CancelScheduledMessageUseCase,
    private readonly getUseCase: GetScheduledMessageUseCase,
    private readonly listUseCase: ListScheduledMessagesUseCase,
  ) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.SCHEDULER_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateScheduledMessageDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.createUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.SCHEDULER_READ)
  async list(
    @Query() dto: ListScheduledMessagesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listUseCase.execute(user.orgId, dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.SCHEDULER_READ)
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getUseCase.execute(id, user.orgId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.SCHEDULER_UPDATE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduledMessageDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.updateUseCase.execute(
      id,
      user.orgId,
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.SCHEDULER_CANCEL)
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.cancelUseCase.execute(
      id,
      user.orgId,
      user.sub,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  private extractIp(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private extractUserAgent(req: Request): string {
    return (req.headers['user-agent'] as string) || 'unknown';
  }
}
