import { WhatsAppProvider } from '@prisma/client';
import type { PrismaService } from '@/infrastructure/database/prisma.service';
import { readBatchPlanMetadata } from '../../domain/services/batch-plan';

/**
 * Official (Cloud API) numbers can only start a chat with a Meta-approved template.
 * If a running campaign's template is deleted or loses approval, sending the plain
 * text instead is rejected by Meta for every recipient, so the campaign pauses.
 */
export const CAMPAIGN_TEMPLATE_MISSING_REASON =
  "This campaign's WhatsApp template was deleted or is no longer approved by Meta, so official numbers can't send it. Sync templates (or get it approved again), then resume.";

export interface CampaignTemplatePlan {
  templateId: string;
  params?: string[];
  headerImageUrl?: string;
}

/** The template a campaign sends on official numbers, if it has one */
export function readCampaignTemplatePlan(metadata: unknown): CampaignTemplatePlan | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const plan = (metadata as Record<string, unknown>).cloudTemplate;
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return null;
  const { templateId, params, headerImageUrl } = plan as Record<string, unknown>;
  if (typeof templateId !== 'string' || !templateId) return null;
  return {
    templateId,
    params: Array.isArray(params) ? params.map(String) : undefined,
    headerImageUrl: typeof headerImageUrl === 'string' ? headerImageUrl : undefined,
  };
}

/** The template only if Meta can still send it (same rule as when the campaign was created) */
export function findSendableTemplate(prisma: PrismaService, orgId: string, templateId: string) {
  return prisma.messageTemplate.findFirst({
    where: { id: templateId, orgId, deletedAt: null, status: 'APPROVED', whatsappTemplateId: { not: null } },
    select: { name: true, language: true, components: true },
  });
}

export async function isCloudSession(prisma: PrismaService, sessionId: string): Promise<boolean> {
  const session = await prisma.whatsAppSession.findUnique({
    where: { id: sessionId },
    select: { provider: true },
  });
  return session?.provider === WhatsAppProvider.CLOUD_API;
}

/**
 * Why this campaign can't start/resume on its official numbers, or null when it can.
 * QR-only campaigns send the text version and never need the template.
 */
export async function campaignTemplateProblem(
  prisma: PrismaService,
  campaign: { metadata: unknown; sessionId: string | null; channel?: string | null },
  orgId: string,
): Promise<string | null> {
  if (campaign.channel === 'EMAIL') return null;
  const plan = readCampaignTemplatePlan(campaign.metadata);
  if (!plan) return null;

  const { pool } = readBatchPlanMetadata(campaign.metadata, campaign.sessionId);
  if (pool.length === 0) return null;
  const cloudCount = await prisma.whatsAppSession.count({
    where: { id: { in: pool }, orgId, provider: WhatsAppProvider.CLOUD_API, deletedAt: null },
  });
  if (cloudCount === 0) return null;

  const template = await findSendableTemplate(prisma, orgId, plan.templateId);
  return template ? null : CAMPAIGN_TEMPLATE_MISSING_REASON;
}
