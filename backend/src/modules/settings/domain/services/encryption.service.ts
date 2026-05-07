import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SETTINGS_CONFIG } from '@/common/constants';

/**
 * Handles AES-256-GCM encryption/decryption for integration credentials.
 * Key is derived from the SETTINGS_ENCRYPTION_KEY env var using PBKDF2.
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = SETTINGS_CONFIG.ENCRYPTION_ALGORITHM;
  private readonly keyBuffer: Buffer;

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('SETTINGS_ENCRYPTION_KEY');
    if (!rawKey || rawKey.length < 32) {
      throw new Error(
        'SETTINGS_ENCRYPTION_KEY is not set or too short (minimum 32 characters). Set it in your .env file.',
      );
    }
    const salt = this.configService.get<string>('SETTINGS_ENCRYPTION_SALT');
    if (!salt) {
      throw new Error(
        'SETTINGS_ENCRYPTION_SALT is not set. Set it in your .env file.',
      );
    }
    // Derive a consistent 32-byte key using PBKDF2
    this.keyBuffer = crypto.pbkdf2Sync(rawKey, salt, 100_000, 32, 'sha256');
  }

  /**
   * Encrypt plaintext → base64 string containing iv:tag:ciphertext
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.keyBuffer, iv, {
      authTagLength: 16,
    } as crypto.CipherGCMOptions);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all base64)
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted,
    ].join(':');
  }

  /**
   * Decrypt iv:tag:ciphertext → plaintext string
   */
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivB64, tagB64, ciphertext] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');

    const decipher = crypto.createDecipheriv(this.algorithm, this.keyBuffer, iv, {
      authTagLength: 16,
    } as crypto.CipherGCMOptions);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt a JSON object → encrypted string
   */
  encryptJson(data: Record<string, unknown>): string {
    return this.encrypt(JSON.stringify(data));
  }

  /**
   * Decrypt encrypted string → parsed JSON object
   */
  decryptJson<T = Record<string, unknown>>(encryptedData: string): T {
    const json = this.decrypt(encryptedData);
    return JSON.parse(json) as T;
  }
}
