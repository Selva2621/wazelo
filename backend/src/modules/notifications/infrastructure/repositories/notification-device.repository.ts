import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface PushKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const NO_PUSH = { endpoint: null, p256dh: null, auth: null };

@Injectable()
export class NotificationDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Record that this user is on this device right now. */
  async touch(input: {
    orgId: string;
    userId: string;
    deviceId: string;
    deviceName?: string | null;
    userAgent?: string | null;
  }) {
    const details = {
      deviceName: input.deviceName?.slice(0, 120) ?? null,
      userAgent: input.userAgent?.slice(0, 500) ?? null,
      lastSeenAt: new Date(),
    };
    return this.prisma.notificationDevice.upsert({
      where: { unique_user_device: { userId: input.userId, deviceId: input.deviceId } },
      create: { orgId: input.orgId, userId: input.userId, deviceId: input.deviceId, ...details },
      update: details,
    });
  }

  async find(userId: string, deviceId: string) {
    return this.prisma.notificationDevice.findUnique({
      where: { unique_user_device: { userId, deviceId } },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.notificationDevice.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  /**
   * Store the answer to our one-time prompt. Anything but "granted" also drops
   * the device's push endpoint.
   */
  async setPermission(userId: string, deviceId: string, permission: string) {
    return this.prisma.notificationDevice.update({
      where: { unique_user_device: { userId, deviceId } },
      data: {
        permission,
        promptedAt: new Date(),
        ...(permission !== 'granted' && NO_PUSH),
      },
    });
  }

  /**
   * Point push at this user's device. A browser has one endpoint, so any other
   * row holding it (another user who signed in here before) loses it first.
   */
  async attachPush(userId: string, deviceId: string, keys: PushKeys) {
    const [, device] = await this.prisma.$transaction([
      this.prisma.notificationDevice.updateMany({
        where: { endpoint: keys.endpoint, NOT: { userId, deviceId } },
        data: NO_PUSH,
      }),
      this.prisma.notificationDevice.update({
        where: { unique_user_device: { userId, deviceId } },
        data: { ...keys, permission: 'granted', promptedAt: new Date() },
      }),
    ]);
    return device;
  }

  /** Sign-out or "turn off": this device stops getting this user's pushes. */
  async detachPush(userId: string, deviceId: string) {
    return this.prisma.notificationDevice.updateMany({
      where: { userId, deviceId },
      data: NO_PUSH,
    });
  }

  /** The push service says the endpoint is dead. */
  async clearEndpoint(endpoint: string) {
    return this.prisma.notificationDevice.updateMany({ where: { endpoint }, data: NO_PUSH });
  }

  async remove(userId: string, deviceId: string) {
    return this.prisma.notificationDevice.deleteMany({ where: { userId, deviceId } });
  }

  /** This user's devices that can receive push — nobody else's. */
  async findPushTargets(userId: string) {
    const devices = await this.prisma.notificationDevice.findMany({
      where: { userId, endpoint: { not: null } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    return devices.filter(
      (d): d is { id: string; endpoint: string; p256dh: string; auth: string } =>
        Boolean(d.endpoint && d.p256dh && d.auth),
    );
  }
}
