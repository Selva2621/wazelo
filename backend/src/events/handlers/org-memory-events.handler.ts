import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { RebuildOrgMemoryUseCase } from '@/modules/org/application/use-cases/rebuild-org-memory.use-case';

@Injectable()
export class OrgMemoryEventsHandler {
  private readonly logger = new Logger(OrgMemoryEventsHandler.name);

  constructor(private readonly rebuildOrgMemory: RebuildOrgMemoryUseCase) {}

  @OnEvent(EVENT_NAMES.PRODUCT_CREATED)
  @OnEvent(EVENT_NAMES.PRODUCT_UPDATED)
  @OnEvent(EVENT_NAMES.PRODUCT_DELETED)
  async onProductChange(payload: { orgId: string }): Promise<void> {
    this.logger.debug(`Rebuilding AI memory after product change for org ${payload.orgId}`);
    await this.rebuildOrgMemory.execute(payload.orgId);
  }

  @OnEvent(EVENT_NAMES.KB_ARTICLE_PUBLISHED)
  @OnEvent(EVENT_NAMES.KB_ARTICLE_DELETED)
  async onKbChange(payload: { orgId: string }): Promise<void> {
    this.logger.debug(`Rebuilding AI memory after KB change for org ${payload.orgId}`);
    await this.rebuildOrgMemory.execute(payload.orgId);
  }

  @OnEvent(EVENT_NAMES.SHOPIFY_ORDER_CREATED)
  async onShopifyOrder(payload: { orgId: string }): Promise<void> {
    this.logger.debug(`Rebuilding AI memory after Shopify order for org ${payload.orgId}`);
    await this.rebuildOrgMemory.execute(payload.orgId);
  }

  @OnEvent(EVENT_NAMES.ORG_SETTINGS_UPDATED)
  async onOrgSettingsUpdated(payload: { orgId: string }): Promise<void> {
    this.logger.debug(`Rebuilding AI memory after org settings update for org ${payload.orgId}`);
    await this.rebuildOrgMemory.execute(payload.orgId);
  }
}
