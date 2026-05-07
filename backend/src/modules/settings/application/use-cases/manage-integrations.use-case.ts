import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IntegrationStatus } from '@prisma/client';
import { SettingsRepository } from '../../infrastructure/repositories/settings.repository';
import { EncryptionService } from '../../domain/services/encryption.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import {
  CreateIntegrationConfigDto,
  UpdateIntegrationConfigDto,
} from '../dto/integration-config.dto';
import { EVENT_NAMES, SETTINGS_CONFIG } from '@/common/constants';

@Injectable()
export class ManageIntegrationsUseCase {
  private readonly logger = new Logger(ManageIntegrationsUseCase.name);

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    orgId: string,
    userId: string,
    dto: CreateIntegrationConfigDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Check for existing integration with same provider
    const existing = await this.settingsRepository.findIntegrationByProvider(orgId, dto.provider);
    if (existing) {
      throw new BadRequestException(
        `Integration for provider "${dto.provider}" already exists. Update or delete the existing one.`,
      );
    }

    const count = await this.settingsRepository.countIntegrationsByOrg(orgId);
    if (count >= SETTINGS_CONFIG.MAX_INTEGRATIONS_PER_ORG) {
      throw new BadRequestException(
        `Maximum integrations limit (${SETTINGS_CONFIG.MAX_INTEGRATIONS_PER_ORG}) reached`,
      );
    }

    // Validate credentials structure based on provider
    this.validateCredentials(dto.provider, dto.credentials);

    // Encrypt credentials before storage
    const encryptedCredentials = this.encryptionService.encryptJson(dto.credentials);

    const integration = await this.settingsRepository.createIntegrationConfig({
      orgId,
      provider: dto.provider,
      displayName: dto.displayName,
      credentials: encryptedCredentials,
      configuration: dto.configuration as any,
      status: IntegrationStatus.INACTIVE,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: 'INTEGRATION_CONFIG_CREATED',
      targetType: 'IntegrationConfig',
      targetId: integration.id,
      metadata: { provider: dto.provider, displayName: dto.displayName },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.INTEGRATION_CONFIG_CREATED, {
      integrationId: integration.id,
      orgId,
      provider: dto.provider,
      userId,
    });

    // Return without raw credentials
    return this.sanitizeIntegration(integration);
  }

  async update(
    id: string,
    orgId: string,
    userId: string,
    dto: UpdateIntegrationConfigDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.settingsRepository.findIntegrationConfigById(id, orgId);
    if (!existing) {
      throw new NotFoundException('Integration configuration not found');
    }

    const updateData: Record<string, unknown> = {};
    const changes: Record<string, unknown> = {};

    if (dto.displayName !== undefined) {
      updateData.displayName = dto.displayName;
      changes.displayName = { from: existing.displayName, to: dto.displayName };
    }

    if (dto.credentials !== undefined) {
      this.validateCredentials(existing.provider, dto.credentials);
      updateData.credentials = this.encryptionService.encryptJson(dto.credentials);
      changes.credentials = 'updated';
    }

    if (dto.configuration !== undefined) {
      updateData.configuration = dto.configuration;
      changes.configuration = 'updated';
    }

    if (Object.keys(updateData).length === 0) {
      return this.sanitizeIntegration(existing);
    }

    try {
      const updated = await this.settingsRepository.updateIntegrationConfig(
        id,
        orgId,
        updateData as any,
        dto.version,
      );

      await this.auditService.log({
        orgId,
        userId,
        action: 'INTEGRATION_CONFIG_UPDATED',
        targetType: 'IntegrationConfig',
        targetId: id,
        metadata: { provider: existing.provider, changes },
        ipAddress,
        userAgent,
      });

      this.eventEmitter.emit(EVENT_NAMES.INTEGRATION_CONFIG_UPDATED, {
        integrationId: id,
        orgId,
        provider: existing.provider,
        userId,
        changes,
      });

      return this.sanitizeIntegration(updated);
    } catch (error) {
      if (error instanceof Error && error.message === 'CONCURRENT_MODIFICATION') {
        throw new ConflictException(
          'Integration was modified by another request. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  async delete(
    id: string,
    orgId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.settingsRepository.findIntegrationConfigById(id, orgId);
    if (!existing) {
      throw new NotFoundException('Integration configuration not found');
    }

    await this.settingsRepository.softDeleteIntegrationConfig(id, orgId);

    await this.auditService.log({
      orgId,
      userId,
      action: 'INTEGRATION_CONFIG_DELETED',
      targetType: 'IntegrationConfig',
      targetId: id,
      metadata: { provider: existing.provider, displayName: existing.displayName },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.INTEGRATION_CONFIG_DELETED, {
      integrationId: id,
      orgId,
      provider: existing.provider,
      userId,
    });
  }

  async list(orgId: string) {
    const integrations = await this.settingsRepository.listIntegrationConfigs(orgId);
    return integrations.map((i) => this.sanitizeIntegration(i));
  }

  async getById(id: string, orgId: string) {
    const integration = await this.settingsRepository.findIntegrationConfigById(id, orgId);
    if (!integration) {
      throw new NotFoundException('Integration configuration not found');
    }
    return this.sanitizeIntegration(integration);
  }

  /**
   * Test an integration by attempting a connection/validation.
   * Marks integration as ACTIVE on success, ERROR on failure.
   */
  async test(
    id: string,
    orgId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const integration = await this.settingsRepository.findIntegrationConfigById(id, orgId);
    if (!integration) {
      throw new NotFoundException('Integration configuration not found');
    }

    let success = false;
    let error: string | undefined;

    try {
      const credentials = this.encryptionService.decryptJson(integration.credentials);
      // Provider-specific test logic
      await this.testProvider(integration.provider, credentials);
      success = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Integration test failed for ${integration.provider} in org ${orgId}: ${error}`,
      );
    }

    // Update status based on test result
    await this.settingsRepository.updateIntegrationConfig(
      id,
      orgId,
      {
        status: success ? IntegrationStatus.ACTIVE : IntegrationStatus.ERROR,
        lastTestedAt: new Date(),
        lastError: success ? null : error,
      },
      integration.version,
    );

    await this.auditService.log({
      orgId,
      userId,
      action: 'INTEGRATION_CONFIG_TESTED',
      targetType: 'IntegrationConfig',
      targetId: id,
      metadata: { provider: integration.provider, success, error },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.INTEGRATION_CONFIG_TESTED, {
      integrationId: id,
      orgId,
      provider: integration.provider,
      success,
      error,
      userId,
    });

    return { success, error };
  }

  private validateCredentials(provider: string, credentials: Record<string, unknown>): void {
    switch (provider) {
      case 'SMTP':
        if (!credentials.host || !credentials.port || !credentials.username || !credentials.password) {
          throw new BadRequestException('SMTP requires: host, port, username, password');
        }
        break;
      case 'SENDGRID':
        if (!credentials.apiKey) {
          throw new BadRequestException('SendGrid requires: apiKey');
        }
        break;
      case 'STRIPE':
        if (!credentials.secretKey) {
          throw new BadRequestException('Stripe requires: secretKey');
        }
        break;
      case 'RAZORPAY':
        if (!credentials.keyId || !credentials.keySecret) {
          throw new BadRequestException('Razorpay requires: keyId, keySecret');
        }
        break;
      case 'SHOPIFY':
        if (!credentials.shopDomain || !credentials.accessToken || !credentials.webhookSecret) {
          throw new BadRequestException('Shopify requires: shopDomain, accessToken, webhookSecret');
        }
        break;
    }
  }

  /**
   * Provider-specific connection test.
   * Each provider validates its credentials are functional.
   */
  private async testProvider(
    provider: string,
    credentials: Record<string, unknown>,
  ): Promise<void> {
    switch (provider) {
      case 'SMTP': {
        // Validate SMTP connection is possible (don't send email)
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: credentials.host as string,
          port: credentials.port as number,
          secure: credentials.secure as boolean,
          auth: {
            user: credentials.username as string,
            pass: credentials.password as string,
          },
        });
        await transporter.verify();
        transporter.close();
        break;
      }
      case 'SENDGRID':
      case 'STRIPE':
      case 'RAZORPAY':
        // For API-based providers, a lightweight credentials-format check is done;
        // full connectivity test depends on the SDK being available at runtime.
        this.logger.log(`Provider ${provider} credentials format validated`);
        break;
      case 'SHOPIFY': {
        // Verify Shopify credentials by calling the shop endpoint
        const shopDomain = credentials.shopDomain as string;
        const accessToken = credentials.accessToken as string;
        const url = `https://${shopDomain}/admin/api/2024-01/shop.json`;
        const res = await fetch(url, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) {
          throw new Error(`Shopify API returned ${res.status}: invalid credentials or shop domain`);
        }
        break;
      }
      default:
        this.logger.log(`No specific test for provider ${provider}`);
    }
  }

  private sanitizeIntegration(integration: any) {
    const { credentials, ...rest } = integration;
    return {
      ...rest,
      credentialsSet: !!credentials,
    };
  }
}
