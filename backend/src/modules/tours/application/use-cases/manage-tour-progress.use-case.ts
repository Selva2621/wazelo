import { BadRequestException, Injectable } from '@nestjs/common';

/** Far above the number of tours in the app */
export const MAX_TOURS_PER_DEVICE = 200;
import { TourProgressRepository } from '../../infrastructure/repositories/tour-progress.repository';
import { SaveTourProgressDto } from '../dto/tour-progress.dto';

/**
 * Which product tours the signed-in user has finished or skipped on one device.
 * Always scoped to the caller's own user and org; a device id only separates their browsers.
 */
@Injectable()
export class ManageTourProgressUseCase {
  constructor(private readonly repo: TourProgressRepository) {}

  async list(orgId: string, userId: string, deviceId: string) {
    const rows = await this.repo.listForDevice(orgId, userId, deviceId);
    return { deviceId, tours: rows };
  }

  async save(orgId: string, userId: string, deviceId: string, tourId: string, dto: SaveTourProgressDto) {
    // The app has a few dozen tours; refuse made-up ids piling up rows
    if (!(await this.repo.exists(userId, deviceId, tourId))) {
      const count = await this.repo.countForDevice(orgId, userId, deviceId);
      if (count >= MAX_TOURS_PER_DEVICE) {
        throw new BadRequestException('Too many tours saved on this device');
      }
    }
    return this.repo.save({ orgId, userId, deviceId, tourId, version: dto.version, status: dto.status });
  }

  async reset(orgId: string, userId: string, deviceId: string, tourId?: string) {
    const removed = await this.repo.reset(orgId, userId, deviceId, tourId);
    return { removed };
  }
}
