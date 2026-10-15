import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const DEVICE_PERMISSIONS = ['granted', 'denied', 'dismissed'] as const;
export type DevicePermission = (typeof DEVICE_PERMISSIONS)[number];

export class RegisterDeviceDto {
  @IsUUID()
  deviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceName?: string;
}

class PushKeysDto {
  @IsString()
  @MaxLength(255)
  p256dh!: string;

  @IsString()
  @MaxLength(255)
  auth!: string;
}

/** Mirrors the browser's PushSubscription.toJSON() */
class PushSubscriptionDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys!: PushKeysDto;
}

export class UpdateDeviceDto {
  /** The answer on this device: browser permission, or "dismissed" for "Not now" */
  @IsIn(DEVICE_PERMISSIONS)
  permission!: DevicePermission;

  /** Required with "granted" */
  @IsOptional()
  @ValidateNested()
  @Type(() => PushSubscriptionDto)
  subscription?: PushSubscriptionDto;
}
