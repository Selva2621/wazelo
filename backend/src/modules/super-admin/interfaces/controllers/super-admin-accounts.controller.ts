import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { SuperAdminRequestUser } from '../guards/super-admin.guard';
import { CreateSuperAdminAccountDto } from '../../application/dto/super-admin-auth.dto';
import {
  CreateSuperAdminAccountUseCase,
  ListSuperAdminAccountsUseCase,
  ResetSuperAdminTwoFactorUseCase,
  SetSuperAdminDisabledUseCase,
} from '../../application/use-cases/super-admin-accounts.use-cases';
import { requestMeta } from '../request-meta';

/** The super admin team: one role, every super admin can manage the others. */
@Controller('super-admin/admins')
@SuperAdminOnly()
export class SuperAdminAccountsController {
  constructor(
    private readonly listUseCase: ListSuperAdminAccountsUseCase,
    private readonly createUseCase: CreateSuperAdminAccountUseCase,
    private readonly setDisabledUseCase: SetSuperAdminDisabledUseCase,
    private readonly resetTwoFactorUseCase: ResetSuperAdminTwoFactorUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: SuperAdminRequestUser) {
    return this.listUseCase.execute(user.sub);
  }

  /** Returns the temporary password ONCE — it is never stored in readable form. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSuperAdminAccountDto, @CurrentUser() user: SuperAdminRequestUser, @Req() req: Request) {
    return this.createUseCase.execute({ id: user.sub, email: user.email }, dto, requestMeta(req));
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  async disable(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SuperAdminRequestUser, @Req() req: Request) {
    return this.setDisabledUseCase.execute({ id: user.sub, email: user.email }, id, true, requestMeta(req));
  }

  @Post(':id/enable')
  @HttpCode(HttpStatus.OK)
  async enable(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SuperAdminRequestUser, @Req() req: Request) {
    return this.setDisabledUseCase.execute({ id: user.sub, email: user.email }, id, false, requestMeta(req));
  }

  @Post(':id/reset-2fa')
  @HttpCode(HttpStatus.OK)
  async resetTwoFactor(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SuperAdminRequestUser, @Req() req: Request) {
    return this.resetTwoFactorUseCase.execute({ id: user.sub, email: user.email }, id, requestMeta(req));
  }
}
