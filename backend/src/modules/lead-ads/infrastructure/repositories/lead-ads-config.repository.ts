import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EncryptionService } from '@/modules/channels/domain/services/channel-encryption.service';

@Injectable()
export class LeadAdsConfigRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async findByOrgId(orgId: string) {
    return this.prisma.leadAdsConfig.findUnique({ where: { orgId } });
  }

  async upsert(
    orgId: string,
    data: { appSecret?: string; webhookVerifyToken?: string },
  ) {
    const existing = await this.findByOrgId(orgId);

    const encryptedAppSecret = data.appSecret
      ? this.encryptionService.encrypt(data.appSecret)
      : undefined;

    const hasSecret = encryptedAppSecret !== undefined
      ? !!encryptedAppSecret
      : !!existing?.encryptedAppSecret;

    const hasToken = data.webhookVerifyToken !== undefined
      ? !!data.webhookVerifyToken
      : !!existing?.webhookVerifyToken;

    return this.prisma.leadAdsConfig.upsert({
      where: { orgId },
      create: {
        orgId,
        encryptedAppSecret: encryptedAppSecret ?? null,
        webhookVerifyToken: data.webhookVerifyToken ?? null,
        isConfigured: hasSecret && hasToken,
      },
      update: {
        ...(encryptedAppSecret !== undefined && { encryptedAppSecret }),
        ...(data.webhookVerifyToken !== undefined && {
          webhookVerifyToken: data.webhookVerifyToken,
        }),
        isConfigured: hasSecret && hasToken,
      },
    });
  }

  async getDecryptedAppSecret(orgId: string): Promise<string | null> {
    const config = await this.findByOrgId(orgId);
    if (!config?.encryptedAppSecret) return null;
    return this.encryptionService.decrypt(config.encryptedAppSecret);
  }

  async getVerifyToken(orgId: string): Promise<string | null> {
    const config = await this.findByOrgId(orgId);
    return config?.webhookVerifyToken ?? null;
  }
}
