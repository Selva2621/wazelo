import { AutomationTriggerType } from '@prisma/client';
import { TriggerMatcherService } from './trigger-matcher.service';
import { buildLeadVars } from '@/events/handlers/automation-events.handler';

describe('LEAD_AD_RECEIVED trigger', () => {
  const matcher = new TriggerMatcherService();
  const lead = { platform: 'facebook', formId: 'form-1', isNewContact: false };
  const matches = (triggerConfig: Record<string, unknown>, eventPayload = lead) =>
    matcher.matches({ triggerType: AutomationTriggerType.LEAD_AD_RECEIVED, triggerConfig, eventPayload });

  it('matches every lead when no filter is set', () => {
    expect(matches({})).toBe(true);
  });

  it('filters by platform and form', () => {
    expect(matches({ platform: 'facebook', formId: 'form-1' })).toBe(true);
    expect(matches({ platform: 'instagram' })).toBe(false);
    expect(matches({ formId: 'form-2' })).toBe(false);
  });

  it('skips repeat leads when new contacts only', () => {
    expect(matches({ newContactsOnly: true })).toBe(false);
    expect(matches({ newContactsOnly: true }, { ...lead, isNewContact: true })).toBe(true);
  });
});

describe('buildLeadVars', () => {
  it('slugs form questions and adds ad info', () => {
    expect(
      buildLeadVars({
        leadData: { "What's your city?": 'Chennai', budget: '50k', empty: '' },
        campaignName: 'Diwali',
        adName: 'Ad A',
        formId: 'form-1',
        platform: 'instagram',
      }),
    ).toEqual({
      what_s_your_city: 'Chennai',
      budget: '50k',
      campaign: 'Diwali',
      ad: 'Ad A',
      form: 'form-1',
      platform: 'instagram',
    });
  });
});
