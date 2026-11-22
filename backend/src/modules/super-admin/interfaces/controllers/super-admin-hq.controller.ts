import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Where to land inside HQ ("/inbox", "/campaigns"); anything not a plain app path is ignored */
class OpenHqDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  next?: string;
}
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { requestMeta } from '../request-meta';
import {
  CreateWazeloHqUseCase,
  GetWazeloHqUseCase,
  OpenWazeloHqUseCase,
} from '../../application/use-cases/wazelo-hq.use-cases';

/** Wazelo HQ: the platform's own workspace (leads from signups, website chat). */
@Controller('super-admin/hq')
@SuperAdminOnly()
export class SuperAdminHqController {
  constructor(
    private readonly getHq: GetWazeloHqUseCase,
    private readonly createHq: CreateWazeloHqUseCase,
    private readonly openHq: OpenWazeloHqUseCase,
  ) {}

  @Get()
  async get() {
    return this.getHq.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.createHq.execute({ actor: { id: user.sub, email: user.email }, meta: requestMeta(req) });
  }

  /** One-time link (60s) that signs the caller in to HQ in the tenant app. */
  @Post('open')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async open(@CurrentUser() user: JwtPayload, @Req() req: Request, @Body() dto: OpenHqDto) {
    return this.openHq.execute({ actor: { id: user.sub, email: user.email }, meta: requestMeta(req) }, dto?.next);
  }
}
