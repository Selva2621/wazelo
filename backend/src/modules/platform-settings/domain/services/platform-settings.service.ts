import { Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from '@/common/services/encryption.service';
import { PlatformSettingRepository } from '../../infrastructure/repositories/platform-setting.repository';
import { DEFAULT_PLATFORM_SETTINGS, isGoogleConfigured, PlatformSettings, toPlatformSettings } from './platform-settings';

const CACHE_TTL_MS = 15_000;

/** Decrypted Google OAuth client credentials, for the code that calls Google. Never log. */
export interface GoogleOAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Platform settings, cached for 15s. The platform runs a single instance, and
 * `invalidate()` is called right after a super admin change.
 */
@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);
  private cache: { settings: PlatformSettings; expiresAt: number } | null = null;

  constructor(
    private readonly repo: PlatformSettingRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async get(): Promise<PlatformSettings> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.settings;
    try {
      const settings = toPlatformSettings(await this.repo.findAll());
      this.cache = { settings, expiresAt: Date.now() + CACHE_TTL_MS };
      return settings;
    } catch (err) {
      // Keep the last known state on a read error; with none, use the (restrictive) defaults
      this.logger.error(`Platform settings read failed: ${err instanceof Error ? err.message : String(err)}`);
      const settings = this.cache?.settings ?? DEFAULT_PLATFORM_SETTINGS;
      this.cache = { settings, expiresAt: Date.now() + 5_000 };
      return settings;
    }
  }

  /** Google client credentials with the secret decrypted, or null when not (fully) configured. */
  async getGoogleCredentials(): Promise<GoogleOAuthCredentials | null> {
    const { google } = await this.get();
    if (!isGoogleConfigured(google)) return null;
    try {
      return {
        clientId: google.clientId!,
        clientSecret: this.encryption.decrypt(google.clientSecretEncrypted!),
        redirectUri: google.redirectUri!,
      };
    } catch {
      // Wrong key / corrupted ciphertext: treat as not configured (never log the value)
      this.logger.error('Stored Google client secret could not be decrypted; Google sign-in is off');
      return null;
    }
  }

  /** The super admin's AI key, decrypted; null when none is stored or it can't be decrypted. Never log. */
  async getAiApiKey(): Promise<string | null> {
    const { ai } = await this.get();
    if (!ai.apiKeyEncrypted) return null;
    try {
      return this.encryption.decrypt(ai.apiKeyEncrypted);
    } catch {
      this.logger.error('Stored AI API key could not be decrypted; falling back to AI_API_KEY');
      return null;
    }
  }

  encryptSecret(plain: string): string {
    return this.encryption.encrypt(plain);
  }

  /** Next read goes to the database. */
  invalidate(): void {
    this.cache = null;
  }
}
