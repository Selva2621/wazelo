import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { AiCreditsService } from '@/modules/billing/domain/services/ai-credits.service';

/**
 * Summaries built before this could include team-only articles (they were not
 * filtered out then), so those are rebuilt once instead of reused.
 */
const SUMMARY_RULES_SINCE = new Date('2026-10-28T22:00:00.000Z');

@Injectable()
export class OrgAiMemoryService {
  private readonly logger = new Logger(OrgAiMemoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly aiCredits: AiCreditsService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Rebuilds the AI memory for an org by reading all current data
   * (org profile, products, KB articles, Shopify config) and upserting the record.
   * Preserves documentText / documentName — those are managed separately.
   */
  async rebuild(orgId: string): Promise<void> {
    try {
      const [org, products, kbArticles, shopifyConfig, existing] = await Promise.all([
        this.prisma.organization.findUnique({ where: { id: orgId } }),
        this.prisma.product.findMany({
          where: { orgId, deletedAt: null, status: 'ACTIVE' },
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.kbArticle.findMany({
          // Team-only articles stay out: this summary also reaches customer-facing bots
          where: { orgId, isPublished: true, isInternal: false, deletedAt: null },
          take: 30,
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.integrationConfig.findFirst({
          where: { orgId, provider: 'SHOPIFY', status: 'ACTIVE' },
        }),
        this.prisma.orgAiMemory.findUnique({
          where: { orgId },
          select: { documentText: true, documentName: true, kbSummary: true, builtAt: true },
        }),
      ]);

      if (!org) {
        this.logger.warn(`OrgAiMemory rebuild: org ${orgId} not found`);
        return;
      }

      const productsJson =
        products.length > 0
          ? JSON.stringify(
              products.map((p) => ({
                name: p.name,
                description: p.description,
                price: p.price,
                currency: p.currency,
                sku: p.sku,
              })),
            )
          : null;

      // The summary is an AI call (and credits): only redo it when an article changed.
      // Product edits, settings saves and Shopify orders also rebuild the memory.
      const summaryStillValid =
        !!existing?.kbSummary &&
        !!existing.builtAt &&
        existing.builtAt > SUMMARY_RULES_SINCE &&
        (await this.prisma.kbArticle.count({ where: { orgId, updatedAt: { gt: existing.builtAt } } })) === 0;

      // AI-generate a KB summary only if KB articles exist
      let kbSummary: string | null = kbArticles.length > 0 && summaryStillValid ? existing!.kbSummary : null;
      if (kbArticles.length > 0 && !summaryStillValid && (await this.aiCredits.canAfford(orgId, 'org_memory'))) {
        try {
          const kbText = kbArticles
            .map((a) => `## ${a.title}\n${String(a.body ?? '').slice(0, 500)}`)
            .join('\n\n');
          const result = await this.aiProvider.complete({
            systemPrompt:
              'Summarize the following knowledge base articles into 3-5 sentences describing what this business offers and its key support topics. Be concise and factual.',
            userPrompt: kbText,
            maxTokens: 300,
          });
          kbSummary = result.text || null;
          if (kbSummary) await this.aiCredits.charge(orgId, 'org_memory');
        } catch (err: unknown) {
          this.logger.warn(
            `OrgAiMemory: KB summary generation failed for org ${orgId}: ${(err as Error).message}`,
          );
        }
      }

      const shopifyStore = shopifyConfig
        ? ((shopifyConfig.configuration as Record<string, unknown>)
            ?.shopDomain as string) ?? null
        : null;

      await this.prisma.orgAiMemory.upsert({
        where: { orgId },
        create: {
          orgId,
          businessName: org.name,
          industry: org.industry ?? null,
          description: org.description ?? null,
          website: org.website ?? null,
          productsJson,
          kbSummary,
          shopifyStore,
          // Preserve existing document data (none on first create)
          documentText: null,
          documentName: null,
          builtAt: new Date(),
        },
        update: {
          businessName: org.name,
          industry: org.industry ?? null,
          description: org.description ?? null,
          website: org.website ?? null,
          productsJson,
          kbSummary,
          shopifyStore,
          // Preserve existing document — do NOT overwrite on rebuild
          documentText: existing?.documentText ?? undefined,
          documentName: existing?.documentName ?? undefined,
          builtAt: new Date(),
        },
      });

      this.events.emit(EVENT_NAMES.AI_MEMORY_UPDATED, { orgId });
      this.logger.log(`OrgAiMemory rebuilt for org ${orgId}`);
    } catch (err: unknown) {
      this.logger.error(
        `OrgAiMemory rebuild failed for org ${orgId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Stores extracted document text + filename in the memory record.
   * Does not trigger a full rebuild — just saves the doc and updates builtAt.
   */
  async storeDocument(orgId: string, documentText: string, documentName: string): Promise<void> {
    await this.prisma.orgAiMemory.upsert({
      where: { orgId },
      create: {
        orgId,
        documentText,
        documentName,
        builtAt: new Date(),
      },
      // builtAt stays: it marks when the summary was built, which this doesn't touch
      update: {
        documentText,
        documentName,
      },
    });
    this.events.emit(EVENT_NAMES.AI_MEMORY_UPDATED, { orgId });
    this.logger.log(`OrgAiMemory document stored for org ${orgId}: ${documentName}`);
  }

  /** "Rules & tone" / instructions from Settings or Chatbot → Knowledge. */
  async updateCustomContext(orgId: string, customContext: string | null | undefined): Promise<void> {
    await this.prisma.orgAiMemory.upsert({
      where: { orgId },
      create: { orgId, customContext },
      update: { customContext },
    });
    this.events.emit(EVENT_NAMES.AI_MEMORY_UPDATED, { orgId });
  }

  /**
   * Clears the uploaded document from memory.
   */
  async clearDocument(orgId: string): Promise<void> {
    await this.prisma.orgAiMemory.updateMany({
      where: { orgId },
      data: { documentText: null, documentName: null },
    });
    this.events.emit(EVENT_NAMES.AI_MEMORY_UPDATED, { orgId });
    this.logger.log(`OrgAiMemory document cleared for org ${orgId}`);
  }

  /**
   * Returns a formatted context string for injection into AI system prompts.
   * Returns empty string if no memory exists yet.
   */
  async getContext(orgId: string): Promise<string> {
    const mem = await this.prisma.orgAiMemory.findUnique({ where: { orgId } });
    if (!mem) return '';

    const parts: string[] = ['## Business Context'];

    if (mem.businessName) parts.push(`Business: ${mem.businessName}`);
    if (mem.industry) parts.push(`Industry: ${mem.industry}`);
    if (mem.description) parts.push(`About: ${mem.description}`);
    if (mem.website) parts.push(`Website: ${mem.website}`);
    if (mem.shopifyStore) parts.push(`Shopify Store: ${mem.shopifyStore}`);

    if (mem.productsJson) {
      try {
        const products = JSON.parse(mem.productsJson) as Array<{
          name: string;
          price?: string | number | null;
          currency?: string | null;
          description?: string | null;
        }>;
        if (products.length > 0) {
          parts.push(`\n## Products (${products.length})`);
          products.slice(0, 20).forEach((p) => {
            const price =
              p.price != null ? ` (${p.currency ?? ''} ${p.price})`.trim() : '';
            const desc = p.description
              ? `: ${String(p.description).slice(0, 100)}`
              : '';
            parts.push(`- ${p.name}${price}${desc}`);
          });
        }
      } catch {
        // ignore malformed JSON
      }
    }

    if (mem.kbSummary) {
      parts.push(`\n## Knowledge Base Summary`);
      parts.push(mem.kbSummary);
    }

    if (mem.documentText) {
      parts.push(`\n## Uploaded Document${mem.documentName ? ` (${mem.documentName})` : ''}`);
      // Truncate to avoid exceeding AI context limits
      parts.push(mem.documentText.slice(0, 8000));
    }

    if (mem.customContext) {
      parts.push(`\n## Additional Context`);
      parts.push(mem.customContext);
    }

    return parts.join('\n');
  }
}
