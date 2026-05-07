import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { SuperAdminLoginUseCase } from '../../application/use-cases/super-admin-login.use-case';
import { SuperAdminLoginDto } from '../../application/dto/super-admin-auth.dto';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';

@Controller('super-admin/auth')
export class SuperAdminAuthController {
  constructor(
    private readonly loginUseCase: SuperAdminLoginUseCase,
    private readonly superAdminRepo: SuperAdminRepository,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: SuperAdminLoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Get('me')
  @UseGuards(SuperAdminGuard)
  async me(@CurrentUser() user: JwtPayload) {
    const superAdmin = await this.superAdminRepo.findById(user.sub);
    return { id: superAdmin?.id, name: superAdmin?.name, email: superAdmin?.email };
  }
}
