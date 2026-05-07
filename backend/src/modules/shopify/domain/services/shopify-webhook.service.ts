import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EncryptionService } from '@/modules/settings/domain/services/encryption.service';
import { QUEUE_NAMES } from '@/common/constants';

export interface ShopifyOrderPayload {
  id: number;
  email: string | null;
  phone: string | null;
  name: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: { title: string; quantity: number; price: string; sku?: string | null }[];
  customer?: {
    id: number;
    email: string | null;
    phone: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  created_at: string;
}

@Injectable()
export class ShopifyWebhookService {
  private readonly logger = new Logger(ShopifyWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /** Verify Shopify HMAC-SHA256 signature */
  verifySignature(rawBody: Buffer, hmacHeader: string, secret: string): boolean {
    const computed = createHmac('sha256', secret).update(rawBody).digest('base64');
    return computed === hmacHeader;
  }

  /** Look up a Shopify integration config by shop domain */
  async findOrgByShopDomain(shopDomain: string): Promise<{ orgId: string; webhookSecret: string } | null> {
    const configs = await this.prisma.integrationConfig.findMany({
      where: {
        provider: 'SHOPIFY' as any,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { orgId: true, credentials: true },
    });

    for (const config of configs) {
      try {
        const creds = this.encryptionService.decryptJson<{ shopDomain: string; webhookSecret: string }>(
          config.credentials,
        );
        if (creds.shopDomain === shopDomain) {
          return { orgId: config.orgId, webhookSecret: creds.webhookSecret };
        }
      } catch {
        // Skip configs with corrupt credentials
      }
    }

    return null;
  }

  /** Queue the order for async processing */
  async queueOrderCreated(orgId: string, order: ShopifyOrderPayload): Promise<void> {
    await this.queueService.publish(
      QUEUE_NAMES.PROCESS_SHOPIFY_WEBHOOK,
      { event: 'orders/create', orgId, order },
      { singletonKey: `shopify-order-${orgId}-${order.id}` },
    );
    this.logger.log(`Queued Shopify order ${order.id} for org ${orgId}`);
  }

  /** Queue order fulfillment update */
  async queueOrderFulfilled(orgId: string, order: ShopifyOrderPayload): Promise<void> {
    await this.queueService.publish(
      QUEUE_NAMES.PROCESS_SHOPIFY_WEBHOOK,
      { event: 'orders/fulfilled', orgId, order },
      { singletonKey: `shopify-fulfilled-${orgId}-${order.id}` },
    );
    this.logger.log(`Queued Shopify fulfillment ${order.id} for org ${orgId}`);
  }

  /** Queue cart abandonment */
  async queueCartAbandoned(orgId: string, checkout: Record<string, unknown>): Promise<void> {
    await this.queueService.publish(
      QUEUE_NAMES.PROCESS_SHOPIFY_WEBHOOK,
      { event: 'checkouts/create', orgId, checkout },
      { singletonKey: `shopify-cart-${orgId}-${checkout.id}` },
    );
    this.logger.log(`Queued Shopify abandoned cart for org ${orgId}`);
  }
}
