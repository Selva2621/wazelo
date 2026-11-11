import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { ListMyLeadsUseCase, TouchLeadUseCase } from '../../application/use-cases/lead-follow-up.use-cases';

/** Leads given to the signed-in person, and marking them as called */
@Controller('lead-follow-ups')
export class LeadFollowUpsController {
  constructor(
    private readonly listMine: ListMyLeadsUseCase,
    private readonly touch: TouchLeadUseCase,
  ) {}

  @Get('mine')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  mine(@CurrentUser() user: JwtPayload) {
    return this.listMine.execute(user.orgId, user.sub);
  }

  @Post(':id/called')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  @HttpCode(HttpStatus.OK)
  called(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.touch.called(user.orgId, id, user.sub, user.role);
  }
}
