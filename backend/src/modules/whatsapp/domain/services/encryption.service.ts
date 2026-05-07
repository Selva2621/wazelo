import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WHATSAPP_CONFIG } from '@/common/constants';

const ALGORITHM = WHATSAPP_CONFIG.SESSION_ENCRYPTION_ALGORITHM;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const keyHex = this.configService.get<string>('WHATSAPP_ENCRYPTION_KEY');
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'WHATSAPP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
      );
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all base64)
    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivB64, authTagB64, ciphertextB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  secureWipe(data: string): void {
    // Overwrite string buffer — best-effort in JS/TS
    const buf = Buffer.from(data, 'utf8');
    crypto.randomFillSync(buf);
  }
}
