import { Module } from '@nestjs/common';
import { PlatformSettingRepository } from './infrastructure/repositories/platform-setting.repository';
import { PlatformSettingsService } from './domain/services/platform-settings.service';
import { EncryptionService } from '@/common/services/encryption.service';

/** Platform-wide settings: read by auth (Google credentials + sign-up toggle), written by super admins. */
@Module({
  providers: [PlatformSettingRepository, PlatformSettingsService, EncryptionService],
  exports: [PlatformSettingRepository, PlatformSettingsService],
})
export class PlatformSettingsModule {}
