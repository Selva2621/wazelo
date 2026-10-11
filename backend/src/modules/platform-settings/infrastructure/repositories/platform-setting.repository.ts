import { Injectable } from '@nestjs/common';
import { PlatformSetting, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

/** Platform-wide settings. Written only from the super-admin module. */
@Injectable()
export class PlatformSettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<PlatformSetting[]> {
    return this.prisma.platformSetting.findMany();
  }

  set(key: string, value: Prisma.InputJsonValue, updatedById: string): Promise<PlatformSetting> {
    return this.prisma.platformSetting.upsert({
      where: { key },
      create: { key, value, updatedById },
      update: { value, updatedById },
    });
  }

  /** Upserts `set` and deletes `remove` atomically. */
  async apply(
    set: { key: string; value: Prisma.InputJsonValue }[],
    remove: string[],
    updatedById: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      ...set.map(({ key, value }) =>
        this.prisma.platformSetting.upsert({
          where: { key },
          create: { key, value, updatedById },
          update: { value, updatedById },
        }),
      ),
      ...(remove.length ? [this.prisma.platformSetting.deleteMany({ where: { key: { in: remove } } })] : []),
    ]);
  }
}
