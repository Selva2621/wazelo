import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

const VIEW = { tourId: true, version: true, status: true, updatedAt: true } as const;

@Injectable()
export class TourProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForDevice(orgId: string, userId: string, deviceId: string) {
    return this.prisma.tourProgress.findMany({
      where: { orgId, userId, deviceId },
      select: VIEW,
    });
  }

  async exists(userId: string, deviceId: string, tourId: string) {
    const row = await this.prisma.tourProgress.findUnique({
      where: { unique_user_device_tour: { userId, deviceId, tourId } },
      select: { id: true },
    });
    return row !== null;
  }

  async countForDevice(orgId: string, userId: string, deviceId: string) {
    return this.prisma.tourProgress.count({ where: { orgId, userId, deviceId } });
  }

  async save(input: {
    orgId: string;
    userId: string;
    deviceId: string;
    tourId: string;
    version: number;
    status: string;
  }) {
    const { orgId, userId, deviceId, tourId, version, status } = input;
    return this.prisma.tourProgress.upsert({
      where: { unique_user_device_tour: { userId, deviceId, tourId } },
      create: { orgId, userId, deviceId, tourId, version, status },
      update: { version, status },
      select: VIEW,
    });
  }

  /** "Replay tours": forget one tour, or every tour on this device. */
  async reset(orgId: string, userId: string, deviceId: string, tourId?: string) {
    const { count } = await this.prisma.tourProgress.deleteMany({
      where: { orgId, userId, deviceId, ...(tourId && { tourId }) },
    });
    return count;
  }
}
