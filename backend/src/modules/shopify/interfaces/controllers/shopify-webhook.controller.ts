import {
  Controller,
  Post,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { ShopifyWebhookService } from '../../domain/services/shopify-webhook.service';
import type { ShopifyOrderPayload } from '../../domain/services/shopify-webhook.service';

/**
 * Receives incoming Shopify webhooks per organization.
 *
 * Register these webhook topics in Shopify Admin:
 *   orders/create       → POST /webhooks/shopify/:orgId
 *   orders/fulfilled    → POST /webhooks/shopify/:orgId
 *   checkouts/create    → POST /webhooks/shopify/:orgId
 *
 * All requests are validated with HMAC-SHA256 (X-Shopify-Hmac-SHA256 header).
 */
@Controller('webhooks/shopify')
@Public()
export class ShopifyWebhookController {
  private readonly logger = new Logger(ShopifyWebhookController.name);

  constructor(private readonly shopifyWebhookService: ShopifyWebhookService) {}

  /**
   * POST /webhooks/shopify/:orgId
   * Receives all Shopify webhook topics for a given organization.
   * Topic is passed in the X-Shopify-Topic header.
   */
  @Post(':orgId')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string | undefined;
    const shopDomain = req.headers['x-shopify-shop-domain'] as string | undefined;
    const topic = req.headers['x-shopify-topic'] as string | undefined;
    const rawBody = req.rawBody;

    if (!hmacHeader || !rawBody || !shopDomain || !topic) {
      this.logger.warn(`Shopify webhook missing required headers for org ${orgId}`);
      return res.status(400).json({ status: 'error', message: 'Missing required Shopify headers' });
    }

    // Find org config and verify HMAC
    const orgConfig = await this.shopifyWebhookService.findOrgByShopDomain(shopDomain);

    // Note: we still look up by orgId param as secondary check
    if (!orgConfig || orgConfig.orgId !== orgId) {
      this.logger.warn(`Shopify webhook: no active config for shop ${shopDomain} / org ${orgId}`);
      // Return 200 to prevent Shopify retry loop; we just don't process it
      return res.status(200).json({ status: 'ignored' });
    }

    const valid = this.shopifyWebhookService.verifySignature(rawBody, hmacHeader, orgConfig.webhookSecret);
    if (!valid) {
      this.logger.warn(`Shopify webhook HMAC verification failed for org ${orgId}`);
      return res.status(401).json({ status: 'error', message: 'Invalid signature' });
    }

    const payload = req.body as Record<string, unknown>;

    // Dispatch based on topic
    try {
      switch (topic) {
        case 'orders/create':
          await this.shopifyWebhookService.queueOrderCreated(orgId, payload as unknown as ShopifyOrderPayload);
          break;
        case 'orders/fulfilled':
          await this.shopifyWebhookService.queueOrderFulfilled(orgId, payload as unknown as ShopifyOrderPayload);
          break;
        case 'checkouts/create':
          await this.shopifyWebhookService.queueCartAbandoned(orgId, payload);
          break;
        default:
          this.logger.debug(`Unhandled Shopify topic ${topic} for org ${orgId}`);
      }
    } catch (err) {
      this.logger.error(`Error processing Shopify webhook topic ${topic} for org ${orgId}`, err);
      // Return 200 to Shopify; don't want retries for internal errors
    }

    return res.status(200).json({ status: 'ok' });
  }
}
