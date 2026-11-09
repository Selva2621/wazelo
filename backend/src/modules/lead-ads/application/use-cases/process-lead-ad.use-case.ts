import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContactSource } from '@prisma/client';
import { LeadAdRepository } from '../../infrastructure/repositories/lead-ad.repository';
import { ConfigService } from '@nestjs/config';
import { MetaGraphApiService, type MetaLeadData } from '../../domain/services/meta-graph-api.service';

/** A dev test lead (lead-ads/dev/simulate) keeps its form answers in rawWebhookData */
export interface SimulatedLeadPayload {
  simulated: true;
  fieldData: { name: string; values: string[] }[];
}

export function readSimulatedLead(raw: unknown): SimulatedLeadPayload | null {
  const r = raw as Partial<SimulatedLeadPayload> | null;
  return r?.simulated === true && Array.isArray(r.fieldData) ? (r as SimulatedLeadPayload) : null;
}
import { LeadAssignmentService } from '../../domain/services/lead-assignment.service';
import { ChannelService } from '@/modules/channels/domain/services/channel.service';
import { EVENT_NAMES } from '@/common/constants';
import { OrgLocaleService } from '@/modules/org/domain/services/org-locale.service';

@Injectable()
export class ProcessLeadAdUseCase {
  private readonly logger = new Logger(ProcessLeadAdUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadAdRepo: LeadAdRepository,
    private readonly metaGraphApi: MetaGraphApiService,
    private readonly leadAssignment: LeadAssignmentService,
    private readonly channelService: ChannelService,
    private readonly eventEmitter: EventEmitter2,
    private readonly orgLocale: OrgLocaleService,
    private readonly config: ConfigService,
  ) {}

  async execute(leadAdEntryId: string): Promise<void> {
    // 1. Load entry
    const entry = await this.leadAdRepo.findById(leadAdEntryId);
    if (!entry) {
      this.logger.warn(`LeadAdEntry ${leadAdEntryId} not found, skipping`);
      return;
    }

    // Skip if already completed
    if (entry.status === 'COMPLETED') {
      this.logger.debug(`LeadAdEntry ${leadAdEntryId} already completed`);
      return;
    }

    // 2. Transition to PROCESSING
    await this.leadAdRepo.update(leadAdEntryId, { status: 'PROCESSING' });

    try {
      // 3–4. Full lead data: from Meta, or the stored answers of a dev test lead
      const simulated = readSimulatedLead(entry.rawWebhookData);
      let leadData: MetaLeadData;
      if (simulated) {
        if (this.config.get<string>('NODE_ENV') === 'production') {
          throw new Error('Test leads are disabled in production');
        }
        leadData = {
          id: entry.leadgenId,
          createdTime: entry.createdAt.toISOString(),
          fieldData: simulated.fieldData,
          adName: entry.adName ?? undefined,
          campaignName: entry.campaignName ?? undefined,
          formId: entry.formId ?? undefined,
        };
      } else {
        if (!entry.channelId) {
          throw new Error('No channel linked to this lead — cannot fetch lead data');
        }
        const config = await this.channelService.getDecryptedConfig(entry.channelId);
        leadData = await this.metaGraphApi.fetchLeadData(entry.leadgenId, config.accessToken as string);
      }

      // 5. Parse lead fields
      const fields = this.metaGraphApi.parseLeadFields(leadData.fieldData);

      if (!fields.phone && !fields.email) {
        throw new Error('Lead has no phone number or email — cannot create contact');
      }

      // 6. Determine contact source
      const sourceMap: Record<string, ContactSource> = {
        facebook: ContactSource.FACEBOOK_LEAD_AD,
        instagram: ContactSource.INSTAGRAM_LEAD_AD,
        whatsapp: ContactSource.WHATSAPP_LEAD_AD,
      };
      const source = sourceMap[entry.platform] || ContactSource.FACEBOOK_LEAD_AD;

      // 7. Auto-assign owner
      const ownerId = await this.leadAssignment.assignOwner(entry.orgId);

      // 8. Upsert contact
      const contactName =
        fields.fullName ||
        [fields.firstName, fields.lastName].filter(Boolean).join(' ') ||
        null;
      // Meta forms often take the number without a country code — read it as the org's
      const phoneNumber =
        (await this.orgLocale.normalizePhone(entry.orgId, fields.phone)) ||
        fields.phone ||
        fields.email ||
        entry.leadgenId;

      // A repeat lead from a known number enriches that contact; only a new one is "created"
      const existingContactId = await this.findExistingContactId(entry.orgId, phoneNumber);
      const isNewContact = !existingContactId;

      const contact = await this.prisma.contact.upsert({
        where: {
          // Use the partial unique index simulation
          id: existingContactId ?? crypto.randomUUID(),
        },
        create: {
          orgId: entry.orgId,
          phoneNumber,
          name: contactName,
          email: fields.email,
          source,
          leadStatus: 'NEW',
          ownerId,
          metadata: {
            leadAd: {
              leadgenId: entry.leadgenId,
              adId: leadData.adId || entry.adId,
              adName: leadData.adName || entry.adName,
              campaignId: leadData.campaignId || entry.campaignId,
              campaignName: leadData.campaignName || entry.campaignName,
              formId: leadData.formId || entry.formId,
              platform: entry.platform,
              fields: fields.customFields,
              capturedAt: leadData.createdTime,
            },
          },
        },
        update: {
          // If contact already exists, enrich with lead data
          metadata: {
            leadAd: {
              leadgenId: entry.leadgenId,
              adId: leadData.adId || entry.adId,
              adName: leadData.adName || entry.adName,
              campaignId: leadData.campaignId || entry.campaignId,
              campaignName: leadData.campaignName || entry.campaignName,
              formId: leadData.formId || entry.formId,
              platform: entry.platform,
              fields: fields.customFields,
              capturedAt: leadData.createdTime,
            },
          },
          ...(contactName && { name: contactName }),
          ...(fields.email && { email: fields.email }),
        },
      });

      // 9. Update entry with results
      await this.leadAdRepo.update(leadAdEntryId, {
        status: 'COMPLETED',
        contactId: contact.id,
        adName: leadData.adName || entry.adName,
        campaignId: leadData.campaignId || entry.campaignId,
        campaignName: leadData.campaignName || entry.campaignName,
        formId: leadData.formId || entry.formId,
        leadData: JSON.parse(JSON.stringify({
          fieldData: leadData.fieldData,
          parsed: fields,
        })),
        processedAt: new Date(),
      });

      // 10. Emit events
      this.eventEmitter.emit(EVENT_NAMES.LEAD_AD_RECEIVED, {
        leadAdEntryId,
        orgId: entry.orgId,
        leadgenId: entry.leadgenId,
        pageId: entry.pageId,
        platform: entry.platform,
        contactId: contact.id,
        contactPhone: phoneNumber,
        contactName,
        contactEmail: fields.email,
        adName: leadData.adName || entry.adName,
        campaignName: leadData.campaignName || entry.campaignName,
        formId: leadData.formId || entry.formId,
        leadData: fields.customFields,
        isNewContact,
      });

      // CONTACT_CREATED only for a new contact — a repeat lead must not re-run
      // "new contact" automations, scoring or sequences
      if (isNewContact) {
        this.eventEmitter.emit(EVENT_NAMES.CONTACT_CREATED, {
          contactId: contact.id,
          orgId: entry.orgId,
          phoneNumber,
          ownerId,
          source,
          createdById: ownerId,
          leadAd: { platform: entry.platform, pageId: entry.pageId, formId: leadData.formId || entry.formId },
        });
      }

      this.logger.log(
        `Lead ${entry.leadgenId} processed → Contact ${contact.id} (${entry.platform})`,
      );
    } catch (error: any) {
      // Update entry with error
      await this.leadAdRepo.update(leadAdEntryId, {
        status: 'FAILED',
        errorMessage: error.message,
        retryCount: { increment: 1 },
      });

      this.eventEmitter.emit(EVENT_NAMES.LEAD_AD_FAILED, {
        leadAdEntryId,
        orgId: entry.orgId,
        leadgenId: entry.leadgenId,
        error: error.message,
        retryCount: entry.retryCount + 1,
      });

      throw error; // Let the worker handle retry logic
    }
  }

  private async findExistingContactId(
    orgId: string,
    phoneNumber: string,
  ): Promise<string | null> {
    const existing = await this.prisma.contact.findFirst({
      where: { orgId, phoneNumber, deletedAt: null },
      select: { id: true },
    });
    return existing?.id ?? null;
  }
}
