import { Injectable } from '@nestjs/common';
import { LeadAdRepository } from '../../infrastructure/repositories/lead-ad.repository';
import { ProcessLeadAdUseCase, type SimulatedLeadPayload } from './process-lead-ad.use-case';
import type { SimulateLeadAdDto } from '../dto/simulate-lead-ad.dto';

/**
 * Dev-only: a lead as if a Meta lead form was submitted, without Meta. Runs the real
 * processing (contact upsert, LEAD_AD_RECEIVED / CONTACT_CREATED events, automations);
 * only the Graph API fetch is replaced by the answers given here.
 */
@Injectable()
export class SimulateLeadAdUseCase {
  constructor(
    private readonly leadAdRepo: LeadAdRepository,
    private readonly processLeadAd: ProcessLeadAdUseCase,
  ) {}

  async execute(orgId: string, dto: SimulateLeadAdDto) {
    const answers: Record<string, string> = {
      full_name: dto.name.trim(),
      phone_number: dto.phone.trim(),
      ...(dto.email && { email: dto.email.trim() }),
      ...Object.fromEntries(
        Object.entries(dto.fields ?? {})
          .filter(([k, v]) => k.trim() && typeof v === 'string')
          .slice(0, 20)
          .map(([k, v]) => [k.trim(), v.slice(0, 500)]),
      ),
    };
    const raw: SimulatedLeadPayload = {
      simulated: true,
      fieldData: Object.entries(answers).map(([name, value]) => ({ name, values: [value] })),
    };

    const entry = await this.leadAdRepo.create({
      orgId,
      leadgenId: `dev-${crypto.randomUUID()}`,
      pageId: 'dev-test',
      platform: dto.platform ?? 'facebook',
      formId: dto.formId?.trim() || null,
      campaignName: dto.campaignName?.trim() || 'Test campaign',
      adName: dto.adName?.trim() || 'Test ad',
      leadData: {},
      rawWebhookData: JSON.parse(JSON.stringify(raw)),
    });

    try {
      await this.processLeadAd.execute(entry.id);
    } catch {
      // The entry keeps status FAILED and the error message — returned below
    }
    return this.leadAdRepo.findById(entry.id);
  }
}
