import { Injectable } from '@nestjs/common';
import { EncryptionService } from '@/common/services';

/**
 * Wraps the shared EncryptionService with safe helpers for message field
 * encryption. Handles backward compatibility for existing plain-text rows:
 * - encryptIfPresent: encrypts non-null values
 * - decryptIfEncrypted: detects and decrypts ciphertext, passes plain text through unchanged
 */
@Injectable()
export class MessageEncryptionService {
  constructor(private readonly encryption: EncryptionService) {}

  encryptIfPresent(value: string | null | undefined): string | null {
    if (value == null || value === '') return value ?? null;
    return this.encryption.encrypt(value);
  }

  decryptIfEncrypted(value: string | null | undefined): string | null {
    if (value == null) return null;
    if (!this.isEncrypted(value)) return value;
    try {
      return this.encryption.decrypt(value);
    } catch {
      // Corrupt or mis-identified ciphertext — return as-is rather than throw
      return value;
    }
  }

  /**
   * Detects whether a string is an AES-256-GCM ciphertext in the format
   * base64(12-byte-IV):base64(16-byte-authTag):base64(ciphertext).
   *
   * Real WhatsApp message bodies can contain colons but won't produce
   * exactly 3 segments where the first decodes to 12 bytes and the second to 16 bytes.
   */
  isEncrypted(value: string): boolean {
    const parts = value.split(':');
    if (parts.length !== 3) return false;
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    return iv.length === 12 && tag.length === 16;
  }
}
