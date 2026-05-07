import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EncryptionService } from '@/modules/whatsapp/domain/services/encryption.service';
import {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  initAuthCreds,
  proto,
  BufferJSON,
} from '@whiskeysockets/baileys';

@Injectable()
export class BaileysAuthStateService {
  private readonly logger = new Logger(BaileysAuthStateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async getAuthState(sessionId: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
  }> {
    const creds = await this.loadCreds(sessionId);

    const keys = {
      get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        return this.getKeys(sessionId, type, ids) as any;
      },
      set: async (data: SignalDataTypeMap) => {
        await this.setKeys(sessionId, data);
      },
    };

    return {
      state: { creds, keys: keys as any },
      saveCreds: async () => {
        await this.saveCreds(sessionId, creds);
      },
    };
  }

  private async loadCreds(sessionId: string): Promise<AuthenticationCreds> {
    const session = await this.prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
      select: { encryptedCreds: true },
    });

    if (session?.encryptedCreds) {
      try {
        const decrypted = this.encryptionService.decrypt(session.encryptedCreds);
        return JSON.parse(decrypted, BufferJSON.reviver);
      } catch (error) {
        this.logger.warn(
          `Failed to load creds for session ${sessionId}, initializing fresh`,
          error,
        );
      }
    }

    return initAuthCreds();
  }

  private async saveCreds(
    sessionId: string,
    creds: AuthenticationCreds,
  ): Promise<void> {
    const serialized = JSON.stringify(creds, BufferJSON.replacer);
    const encrypted = this.encryptionService.encrypt(serialized);

    await this.prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: { encryptedCreds: encrypted },
    });
  }

  private async getKeys(
    sessionId: string,
    type: string,
    ids: string[],
  ): Promise<Record<string, unknown>> {
    const rows = await this.prisma.whatsAppAuthKey.findMany({
      where: {
        sessionId,
        keyType: type,
        keyId: { in: ids },
      },
    });

    const result: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        const decrypted = this.encryptionService.decrypt(row.keyData);
        let parsed = JSON.parse(decrypted, BufferJSON.reviver);

        if (type === 'app-state-sync-key') {
          parsed = proto.Message.AppStateSyncKeyData.fromObject(parsed);
        }

        result[row.keyId] = parsed;
      } catch (error) {
        this.logger.warn(
          `Failed to decrypt key ${type}:${row.keyId} for session ${sessionId}`,
        );
      }
    }

    return result;
  }

  private async setKeys(
    sessionId: string,
    data: SignalDataTypeMap,
  ): Promise<void> {
    const upserts: Parameters<typeof this.prisma.whatsAppAuthKey.upsert>[0][] = [];
    const deleteConditions: { sessionId: string; keyType: string; keyId: string }[] = [];

    for (const [type, keys] of Object.entries(data)) {
      for (const [id, value] of Object.entries(keys || {})) {
        if (value === null || value === undefined) {
          deleteConditions.push({ sessionId, keyType: type, keyId: id });
        } else {
          const serialized = JSON.stringify(value, BufferJSON.replacer);
          const encrypted = this.encryptionService.encrypt(serialized);

          upserts.push({
            where: {
              unique_key_per_session: {
                sessionId,
                keyType: type,
                keyId: id,
              },
            },
            create: {
              sessionId,
              keyType: type,
              keyId: id,
              keyData: encrypted,
            },
            update: {
              keyData: encrypted,
            },
          });
        }
      }
    }

    // Execute in transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      for (const condition of deleteConditions) {
        await tx.whatsAppAuthKey.deleteMany({
          where: condition,
        });
      }
      for (const upsert of upserts) {
        await tx.whatsAppAuthKey.upsert(upsert);
      }
    });
  }

  async clearAuthState(sessionId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.whatsAppAuthKey.deleteMany({
        where: { sessionId },
      }),
      this.prisma.whatsAppSession.update({
        where: { id: sessionId },
        data: { encryptedCreds: null },
      }),
    ]);
  }
}
