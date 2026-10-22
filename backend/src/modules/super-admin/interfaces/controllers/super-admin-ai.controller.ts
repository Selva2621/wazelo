import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import {
  CreateAiCreditPackUseCase,
  GetAiCreditPackUseCase,
  GetAiSettingsUseCase,
  GetAiUsageUseCase,
  ListAiModelsUseCase,
  TestAiConnectionUseCase,
  UpdateAiCreditPackUseCase,
  UpdateAiSettingsUseCase,
} from '../../application/use-cases/ai-settings.use-cases';
import {
  CreateAiCreditPackDto,
  ListAiModelsDto,
  TestAiConnectionDto,
  UpdateAiCreditPackDto,
  UpdateAiSettingsDto,
} from '../../application/dto/ai-settings.dto';
import { requestMeta } from '../request-meta';

/** The platform's AI: provider/model/key, credits per action, credit packs, and usage. */
@Controller('super-admin/ai')
@SuperAdminOnly()
export class SuperAdminAiController {
  constructor(
    private readonly getSettings: GetAiSettingsUseCase,
    private readonly updateSettings: UpdateAiSettingsUseCase,
    private readonly testConnection: TestAiConnectionUseCase,
    private readonly listModels: ListAiModelsUseCase,
    private readonly getUsage: GetAiUsageUseCase,
    private readonly createPack: CreateAiCreditPackUseCase,
    private readonly getPack: GetAiCreditPackUseCase,
    private readonly updatePack: UpdateAiCreditPackUseCase,
  ) {}

  @Get()
  get() {
    return this.getSettings.execute();
  }

  @Patch()
  update(@Body() dto: UpdateAiSettingsDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.updateSettings.execute(dto, { id: user.sub, email: user.email }, requestMeta(req));
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  test(@Body() dto: TestAiConnectionDto) {
    return this.testConnection.execute(dto);
  }

  @Post('models')
  @HttpCode(HttpStatus.OK)
  models(@Body() dto: ListAiModelsDto) {
    return this.listModels.execute(dto.provider, dto.apiKey);
  }

  @Get('usage')
  usage() {
    return this.getUsage.execute();
  }

  @Post('packs')
  create(@Body() dto: CreateAiCreditPackDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.createPack.execute(dto, { id: user.sub, email: user.email }, requestMeta(req));
  }

  @Get('packs/:id')
  pack(@Param('id', ParseUUIDPipe) id: string) {
    return this.getPack.execute(id);
  }

  @Patch('packs/:id')
  updateOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAiCreditPackDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.updatePack.execute(id, dto, { id: user.sub, email: user.email }, requestMeta(req));
  }
}
