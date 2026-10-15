import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { WebPushService } from '@/infrastructure/external/push/web-push.service';
import { NotificationDeviceRepository } from '../../infrastructure/repositories/notification-device.repository';
import { RegisterDeviceDto, UpdateDeviceDto } from '../dto/notification-device.dto';

type DeviceRow = {
  deviceId: string;
  deviceName: string | null;
  permission: string;
  promptedAt: Date | null;
  endpoint: string | null;
  lastSeenAt: Date;
};

/**
 * The browsers/devices a user signed in on, for push. Permission is asked once
 * per device, and pushes only go to the user's own devices with an endpoint.
 */
@Injectable()
export class ManageNotificationDevicesUseCase {
  constructor(
    private readonly webPush: WebPushService,
    private readonly deviceRepo: NotificationDeviceRepository,
  ) {}

  getConfig() {
    return { enabled: this.webPush.isEnabled(), publicKey: this.webPush.getPublicKey() };
  }

  /** Called on each app load: remembers the device and says whether to prompt. */
  async register(orgId: string, userId: string, dto: RegisterDeviceDto, userAgent?: string) {
    const device = await this.deviceRepo.touch({
      orgId,
      userId,
      deviceId: dto.deviceId,
      deviceName: dto.deviceName,
      userAgent,
    });
    return toView(device);
  }

  async update(userId: string, deviceId: string, dto: UpdateDeviceDto) {
    await this.requireDevice(userId, deviceId);

    if (dto.permission === 'granted') {
      if (!this.webPush.isEnabled()) {
        throw new ServiceUnavailableException('Browser notifications are not configured');
      }
      if (!dto.subscription) {
        throw new BadRequestException('subscription is required when permission is granted');
      }
      const device = await this.deviceRepo.attachPush(userId, deviceId, {
        endpoint: dto.subscription.endpoint,
        p256dh: dto.subscription.keys.p256dh,
        auth: dto.subscription.keys.auth,
      });
      return toView(device);
    }

    return toView(await this.deviceRepo.setPermission(userId, deviceId, dto.permission));
  }

  /** Sign-out / turn off on this device. */
  async detachPush(userId: string, deviceId: string) {
    await this.deviceRepo.detachPush(userId, deviceId);
    return { pushEnabled: false };
  }

  async list(userId: string) {
    const devices = await this.deviceRepo.listForUser(userId);
    return devices.map(toView);
  }

  async remove(userId: string, deviceId: string) {
    await this.deviceRepo.remove(userId, deviceId);
    return { removed: true };
  }

  private async requireDevice(userId: string, deviceId: string) {
    const device = await this.deviceRepo.find(userId, deviceId);
    if (!device) throw new NotFoundException('Device not registered');
    return device;
  }
}

function toView(device: DeviceRow) {
  return {
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    permission: device.permission,
    /** True once we asked on this device — the prompt is not shown again */
    prompted: device.promptedAt !== null,
    pushEnabled: device.endpoint !== null,
    lastSeenAt: device.lastSeenAt,
  };
}
