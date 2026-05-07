import { Injectable, Logger } from '@nestjs/common';
import { AutomationTriggerType } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EvaluateTriggerUseCase } from '@/modules/automation/application/use-cases/evaluate-trigger.use-case';
import type { ShopifyOrderPayload } from '../../domain/services/shopify-webhook.service';

// Nil UUID used as authorId for system-generated notes (no real user)
const SYSTEM_AUTHOR_ID = '00000000-0000-0000-0000-000000000000';

export interface ShopifyWebhookJob {
  event: 'orders/create' | 'orders/fulfilled' | 'checkouts/create';
  orgId: string;
  order?: ShopifyOrderPayload;
  checkout?: Record<string, unknown>;
}

@Injectable()
export class ProcessShopifyWebhookUseCase {
  private readonly logger = new Logger(ProcessShopifyWebhookUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluateTrigger: EvaluateTriggerUseCase,
  ) {}

  async execute(job: ShopifyWebhookJob): Promise<void> {
    switch (job.event) {
      case 'orders/create':
        await this.handleOrderCreated(job.orgId, job.order!);
        break;
      case 'orders/fulfilled':
        await this.handleOrderFulfilled(job.orgId, job.order!);
        break;
      case 'checkouts/create':
        await this.handleAbandonedCart(job.orgId, job.checkout!);
        break;
      default:
        this.logger.warn(`Unknown Shopify event: ${job.event}`);
    }
  }

  private async handleOrderCreated(orgId: string, order: ShopifyOrderPayload): Promise<void> {
    const phone = this.normalizePhone(order.customer?.phone ?? order.phone);
    if (!phone) {
      this.logger.warn(`Shopify order ${order.id} has no phone, skipping contact upsert`);
      return;
    }

    const name = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ')
      || order.customer?.email
      || 'Shopify Customer';

    // Find existing contact or create new one
    let contact = await this.prisma.contact.findFirst({
      where: { orgId, phoneNumber: phone, deletedAt: null },
    });

    if (!contact) {
      // Assign to first admin in org
      const adminUser = await this.prisma.user.findFirst({
        where: { orgId, role: 'ADMIN', deletedAt: null },
        select: { id: true },
      });
      const ownerId = adminUser?.id ?? SYSTEM_AUTHOR_ID;

      contact = await this.prisma.contact.create({
        data: {
          orgId,
          phoneNumber: phone,
          name,
          email: order.customer?.email ?? order.email ?? undefined,
          source: 'SHOPIFY',
          leadStatus: 'CONTACTED',
          ownerId,
        },
      });
    } else if (name || order.customer?.email) {
      contact = await this.prisma.contact.update({
        where: { id: contact.id },
        data: {
          ...(name && { name }),
          ...(order.customer?.email && { email: order.customer.email }),
        },
      });
    }

    // Sync line items to Product catalog and link to contact
    await this.syncOrderProducts(orgId, contact.id, order);

    // Add a note about the order
    const itemSummary = order.line_items.map((i) => `${i.quantity}x ${i.title}`).join(', ');
    await this.prisma.contactNote.create({
      data: {
        orgId,
        contactId: contact.id,
        authorId: SYSTEM_AUTHOR_ID,
        content: `Shopify order ${order.name} — ${order.currency} ${order.total_price} | Items: ${itemSummary} | Status: ${order.financial_status}`,
      },
    });

    // Evaluate automation rules for this trigger
    await this.evaluateTrigger.execute({
      orgId,
      triggerType: AutomationTriggerType.SHOPIFY_ORDER_CREATED,
      contactId: contact.id,
      eventPayload: {
        orderId: order.id,
        orderName: order.name,
        totalPrice: order.total_price,
        currency: order.currency,
        items: order.line_items,
        financialStatus: order.financial_status,
      },
      context: { contact: { id: contact.id, orgId } },
    });

    this.logger.log(`Processed Shopify order ${order.name} → contact ${contact.id} for org ${orgId}`);
  }

  private async handleOrderFulfilled(orgId: string, order: ShopifyOrderPayload): Promise<void> {
    const phone = this.normalizePhone(order.customer?.phone ?? order.phone);
    if (!phone) return;

    const contact = await this.prisma.contact.findFirst({
      where: { orgId, phoneNumber: phone, deletedAt: null },
    });
    if (!contact) return;

    await this.prisma.contactNote.create({
      data: {
        orgId,
        contactId: contact.id,
        authorId: SYSTEM_AUTHOR_ID,
        content: `Shopify order ${order.name} fulfilled`,
      },
    });

    await this.evaluateTrigger.execute({
      orgId,
      triggerType: AutomationTriggerType.SHOPIFY_ORDER_FULFILLED,
      contactId: contact.id,
      eventPayload: { orderId: order.id, orderName: order.name },
      context: { contact: { id: contact.id, orgId } },
    });

    this.logger.log(`Processed Shopify fulfillment ${order.name} for org ${orgId}`);
  }

  private async handleAbandonedCart(orgId: string, checkout: Record<string, unknown>): Promise<void> {
    const phone = this.normalizePhone((checkout.phone as string) ?? null);
    if (!phone) return;

    const contact = await this.prisma.contact.findFirst({
      where: { orgId, phoneNumber: phone, deletedAt: null },
    });
    if (!contact) return;

    // Log the abandoned cart as a note with metadata
    const lineItems = checkout.line_items as Array<{ title: string; quantity: number }> | undefined;
    const itemSummary = lineItems?.map((i) => `${i.quantity}x ${i.title}`).join(', ') ?? 'Unknown items';
    const cartTotal = checkout.total_price ?? '0';
    const recoveryUrl = checkout.abandoned_checkout_url as string | undefined;

    await this.prisma.contactNote.create({
      data: {
        orgId,
        contactId: contact.id,
        authorId: SYSTEM_AUTHOR_ID,
        content: `Shopify abandoned cart — Total: ${cartTotal} | Items: ${itemSummary}${recoveryUrl ? ` | Recovery: ${recoveryUrl}` : ''}`,
      },
    });

    await this.evaluateTrigger.execute({
      orgId,
      triggerType: AutomationTriggerType.SHOPIFY_CART_ABANDONED,
      contactId: contact.id,
      eventPayload: {
        checkoutId: checkout.id,
        abandonedAt: checkout.created_at,
        cartTotal,
        lineItems: checkout.line_items,
        recoveryUrl,
      },
      context: { contact: { id: contact.id, orgId } },
    });

    this.logger.log(`Processed abandoned cart for org ${orgId}`);
  }

  private async syncOrderProducts(
    orgId: string,
    contactId: string,
    order: ShopifyOrderPayload,
  ): Promise<void> {
    for (const item of order.line_items) {
      if (!item.title) continue;

      try {
        // Find existing active product or create new one
        let product = await this.prisma.product.findFirst({
          where: { orgId, name: item.title, deletedAt: null },
        });

        if (!product) {
          product = await this.prisma.product.create({
            data: {
              orgId,
              name: item.title,
              sku: item.sku ?? undefined,
              price: item.price ? parseFloat(item.price) : undefined,
              currency: order.currency ?? 'INR',
              status: 'ACTIVE',
            },
          });
        } else if (item.price) {
          product = await this.prisma.product.update({
            where: { id: product.id },
            data: { price: parseFloat(item.price) },
          });
        }

        // Link product to contact (ignore if already linked)
        await this.prisma.contactProduct.upsert({
          where: { contactId_productId: { contactId, productId: product.id } },
          create: { orgId, contactId, productId: product.id },
          update: {},
        });
      } catch (error) {
        this.logger.warn(
          `Failed to sync product "${item.title}" for contact ${contactId}: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    }
  }

  private normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    return phone.replace(/\s+/g, '').replace(/[^+\d]/g, '') || null;
  }
}
