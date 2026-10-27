import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { FreelancerTypesUseCases } from '../../application/use-cases/freelancer-types.use-cases';
import { CreateFreelancerTypeDto, UpdateFreelancerTypeDto } from '../../application/dto/freelancer-types.dto';
import { requestMeta } from '../request-meta';

/** Freelancer lines of work offered in setup (built in: read-only; added here: editable). */
@Controller('super-admin/freelancer-types')
@SuperAdminOnly()
export class SuperAdminFreelancerTypesController {
  constructor(private readonly types: FreelancerTypesUseCases) {}

  @Get()
  list() {
    return this.types.list();
  }

  @Post()
  create(@Body() dto: CreateFreelancerTypeDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.types.create(dto, { id: user.sub, email: user.email }, requestMeta(req));
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFreelancerTypeDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.types.update(id, dto, { id: user.sub, email: user.email }, requestMeta(req));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.types.remove(id, { id: user.sub, email: user.email }, requestMeta(req));
  }
}
