import { Module } from '@nestjs/common';
import { PlatformSettingsModule } from '@/modules/platform-settings/platform-settings.module';
import { GoogleOAuthService } from './google-oauth.service';

/** Google OAuth client; credentials come from platform settings (super admin → Settings). */
@Module({
  imports: [PlatformSettingsModule],
  providers: [GoogleOAuthService],
  exports: [GoogleOAuthService],
})
export class GoogleOAuthModule {}
