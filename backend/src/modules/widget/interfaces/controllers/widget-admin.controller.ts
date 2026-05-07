import {
  Controller,
  Get,
  Put,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { JwtPayload } from '@/common/decorators/current-user.decorator';
import { GetWidgetConfigUseCase } from '../../application/use-cases/get-widget-config.use-case';
import { UpdateWidgetConfigUseCase } from '../../application/use-cases/update-widget-config.use-case';
import { UpdateWidgetConfigDto } from '../../application/dto/update-widget-config.dto';

@Controller('widget')
export class WidgetAdminController {
  constructor(
    private readonly getWidgetConfigUseCase: GetWidgetConfigUseCase,
    private readonly updateWidgetConfigUseCase: UpdateWidgetConfigUseCase,
  ) {}

  @Get('config')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getConfig(@CurrentUser() user: JwtPayload) {
    return this.getWidgetConfigUseCase.execute(user.orgId);
  }

  @Put('config')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async updateConfig(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateWidgetConfigDto,
    @Req() req: Request,
  ) {
    return this.updateWidgetConfigUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
