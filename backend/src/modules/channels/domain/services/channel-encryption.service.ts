import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';
import { CHANNEL_CONFIG } from '@/common/constants';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>(
      'CHANNEL_ENCRYPTION_KEY',
      this.configService.get<string>('WHATSAPP_ENCRYPTION_KEY', ''),
    );

    if (!keyHex || keyHex.length < 64) {
      this.logger.warn(
        'CHANNEL_ENCRYPTION_KEY not set or too short — falling back to WHATSAPP_ENCRYPTION_KEY. ' +
          'Set a 32-byte hex key for production.',
      );
    }

    this.key = Buffer.from(keyHex.padEnd(64, '0'), 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      CHANNEL_CONFIG.ENCRYPTION_ALGORITHM,
      this.key,
      iv,
    );

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;
  }

  decrypt(encrypted: string): string {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivB64, authTagB64, ciphertext] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    const decipher = createDecipheriv(
      CHANNEL_CONFIG.ENCRYPTION_ALGORITHM,
      this.key,
      iv,
    );
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }
}
