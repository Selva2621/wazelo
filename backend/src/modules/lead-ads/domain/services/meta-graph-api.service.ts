import { Injectable, Logger } from '@nestjs/common';
import { LEAD_ADS_CONFIG } from '@/common/constants';

export interface MetaLeadData {
  id: string;
  createdTime: string;
  fieldData: { name: string; values: string[] }[];
  adId?: string;
  adName?: string;
  campaignId?: string;
  campaignName?: string;
  formId?: string;
}

export interface ParsedLeadFields {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  customFields: Record<string, string>;
}

@Injectable()
export class MetaGraphApiService {
  private readonly logger = new Logger(MetaGraphApiService.name);

  async fetchLeadData(
    leadgenId: string,
    accessToken: string,
  ): Promise<MetaLeadData> {
    const url = `${LEAD_ADS_CONFIG.GRAPH_API_BASE_URL}/${LEAD_ADS_CONFIG.GRAPH_API_VERSION}/${leadgenId}?access_token=${accessToken}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(LEAD_ADS_CONFIG.LEAD_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Meta Graph API error: ${errorData?.error?.message || `HTTP ${response.status}`}`,
      );
    }

    const data = await response.json();

    return {
      id: data.id,
      createdTime: data.created_time,
      fieldData: data.field_data || [],
      adId: data.ad_id,
      adName: data.ad_name,
      campaignId: data.campaign_id,
      campaignName: data.campaign_name,
      formId: data.form_id,
    };
  }

  parseLeadFields(fieldData: { name: string; values: string[] }[]): ParsedLeadFields {
    const fields: Record<string, string> = {};
    for (const field of fieldData) {
      fields[field.name] = field.values?.[0] ?? '';
    }

    return {
      fullName: fields.full_name || fields.name || null,
      firstName: fields.first_name || null,
      lastName: fields.last_name || null,
      phone: fields.phone_number || fields.phone || null,
      email: fields.email || null,
      customFields: fields,
    };
  }

  async subscribePageToLeadgen(
    pageId: string,
    accessToken: string,
  ): Promise<boolean> {
    const url = `${LEAD_ADS_CONFIG.GRAPH_API_BASE_URL}/${LEAD_ADS_CONFIG.GRAPH_API_VERSION}/${pageId}/subscribed_apps`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscribed_fields: ['leadgen'] }),
      signal: AbortSignal.timeout(LEAD_ADS_CONFIG.LEAD_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to subscribe page to leadgen: ${errorData?.error?.message || `HTTP ${response.status}`}`,
      );
    }

    this.logger.log(`Page ${pageId} subscribed to leadgen events`);
    return true;
  }
}
