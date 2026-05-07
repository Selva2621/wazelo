import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { sanitizeContextInput } from '@/common/utils/prompt-sanitizer.util';

/**
 * Lightweight service that reads the org's AI memory and returns a
 * formatted context string for injection into AI system prompts.
 * Kept in the AI module to avoid circular dependencies with OrgModule.
 */
@Injectable()
export class OrgContextService {
  constructor(private readonly prisma: PrismaService) {}

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
      parts.push(sanitizeContextInput(mem.kbSummary));
    }

    if (mem.customContext) {
      parts.push(`\n## Additional Context`);
      parts.push(sanitizeContextInput(mem.customContext));
    }

    return parts.join('\n');
  }
}
