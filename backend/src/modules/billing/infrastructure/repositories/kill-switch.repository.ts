import { Injectable } from '@nestjs/common';
import { PlatformKillSwitch } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

/** Platform-wide feature kill switches. Written only from the super-admin module. */
@Injectable()
export class KillSwitchRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PlatformKillSwitch[]> {
    return this.prisma.platformKillSwitch.findMany();
  }

  findOne(feature: string): Promise<PlatformKillSwitch | null> {
    return this.prisma.platformKillSwitch.findUnique({ where: { feature } });
  }

  disable(feature: string, reason: string, disabledById: string): Promise<PlatformKillSwitch> {
    const data = { disabled: true, reason, disabledById, disabledAt: new Date() };
    return this.prisma.platformKillSwitch.upsert({
      where: { feature },
      create: { feature, ...data },
      update: data,
    });
  }

  enable(feature: string): Promise<PlatformKillSwitch> {
    const data = { disabled: false, reason: null, disabledById: null, disabledAt: null };
    return this.prisma.platformKillSwitch.upsert({
      where: { feature },
      create: { feature, ...data },
      update: data,
    });
  }
}
