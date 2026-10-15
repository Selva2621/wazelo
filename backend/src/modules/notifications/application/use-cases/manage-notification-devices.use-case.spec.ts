import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ManageNotificationDevicesUseCase } from './manage-notification-devices.use-case';
import { WebPushService } from '@/infrastructure/external/push/web-push.service';
import { NotificationDeviceRepository } from '../../infrastructure/repositories/notification-device.repository';

const row = (over: Record<string, unknown> = {}) => ({
  deviceId: 'd1',
  deviceName: 'Chrome on Windows',
  permission: 'default',
  promptedAt: null,
  endpoint: null,
  lastSeenAt: new Date(),
  ...over,
});

const subscription = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' } };

function setup(pushEnabled = true) {
  const repo = {
    touch: jest.fn().mockResolvedValue(row()),
    find: jest.fn().mockResolvedValue(row()),
    attachPush: jest.fn().mockResolvedValue(row({ permission: 'granted', promptedAt: new Date(), endpoint: subscription.endpoint })),
    setPermission: jest.fn().mockResolvedValue(row({ permission: 'dismissed', promptedAt: new Date() })),
    detachPush: jest.fn(),
  };
  const webPush = { isEnabled: () => pushEnabled, getPublicKey: () => 'key' } as unknown as WebPushService;
  const useCase = new ManageNotificationDevicesUseCase(webPush, repo as unknown as NotificationDeviceRepository);
  return { repo, useCase };
}

describe('ManageNotificationDevicesUseCase', () => {
  it('a new device has not been asked yet', async () => {
    const { useCase } = setup();
    await expect(useCase.register('o1', 'u1', { deviceId: 'd1' })).resolves.toMatchObject({
      prompted: false,
      pushEnabled: false,
    });
  });

  it('granting attaches push to this user\'s device', async () => {
    const { repo, useCase } = setup();
    const view = await useCase.update('u1', 'd1', { permission: 'granted', subscription });
    expect(repo.attachPush).toHaveBeenCalledWith('u1', 'd1', {
      endpoint: subscription.endpoint,
      p256dh: 'p',
      auth: 'a',
    });
    expect(view).toMatchObject({ prompted: true, pushEnabled: true });
  });

  it('"Not now" is remembered so the device is not asked again', async () => {
    const { repo, useCase } = setup();
    const view = await useCase.update('u1', 'd1', { permission: 'dismissed' });
    expect(repo.setPermission).toHaveBeenCalledWith('u1', 'd1', 'dismissed');
    expect(view).toMatchObject({ prompted: true, pushEnabled: false });
  });

  it('granted needs the browser subscription', async () => {
    const { useCase } = setup();
    await expect(useCase.update('u1', 'd1', { permission: 'granted' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to attach push when VAPID is not configured', async () => {
    const { useCase } = setup(false);
    await expect(
      useCase.update('u1', 'd1', { permission: 'granted', subscription }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('only touches devices registered to this user', async () => {
    const { repo, useCase } = setup();
    repo.find.mockResolvedValue(null);
    await expect(useCase.update('u2', 'd1', { permission: 'dismissed' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
