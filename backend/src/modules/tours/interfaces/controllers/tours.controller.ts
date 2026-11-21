import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { ManageTourProgressUseCase } from '../../application/use-cases/manage-tour-progress.use-case';
import { DeviceParamDto, SaveTourProgressDto, TourParamDto } from '../../application/dto/tour-progress.dto';

/** Self-service: every signed-in user manages only their own tour progress (like PATCH /users/me). */
@Controller('tours')
export class ToursController {
  constructor(private readonly manageTourProgress: ManageTourProgressUseCase) {}

  /** GET /tours/progress/:deviceId — tours finished or skipped on this device */
  @Get('progress/:deviceId')
  async list(@CurrentUser() user: JwtPayload, @Param() params: DeviceParamDto) {
    return this.manageTourProgress.list(user.orgId, user.sub, params.deviceId);
  }

  /** PUT /tours/progress/:deviceId/:tourId — mark a tour completed or skipped */
  @Put('progress/:deviceId/:tourId')
  async save(@CurrentUser() user: JwtPayload, @Param() params: TourParamDto, @Body() dto: SaveTourProgressDto) {
    return this.manageTourProgress.save(user.orgId, user.sub, params.deviceId, params.tourId, dto);
  }

  /** DELETE /tours/progress/:deviceId — replay every tour on this device */
  @Delete('progress/:deviceId')
  @HttpCode(HttpStatus.OK)
  async resetAll(@CurrentUser() user: JwtPayload, @Param() params: DeviceParamDto) {
    return this.manageTourProgress.reset(user.orgId, user.sub, params.deviceId);
  }

  /** DELETE /tours/progress/:deviceId/:tourId — replay one tour */
  @Delete('progress/:deviceId/:tourId')
  @HttpCode(HttpStatus.OK)
  async resetOne(@CurrentUser() user: JwtPayload, @Param() params: TourParamDto) {
    return this.manageTourProgress.reset(user.orgId, user.sub, params.deviceId, params.tourId);
  }
}
