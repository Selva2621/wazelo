import { HQ_PERIOD_END, HQ_WIDGET, hqUserEmail, internalPlanData, splitName } from './wazelo-hq';

describe('wazelo-hq', () => {
  it('internal plan: every feature on, every limit unlimited (0), never on sale', () => {
    const plan = internalPlanData(new Date('2026-11-22T00:00:00Z'));
    expect([plan.campaignsEnabled, plan.automationEnabled, plan.apiEnabled, plan.aiEnabled, plan.shopifyEnabled]).toEqual([
      true, true, true, true, true,
    ]);
    expect([
      plan.maxUsers,
      plan.maxWhatsappSessions,
      plan.maxMessagesPerMonth,
      plan.maxCampaignsPerMonth,
      plan.maxApiCallsPerMonth,
      plan.aiCreditsPerMonth,
      plan.maxMessageTemplates,
    ]).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(plan.isActive).toBe(false);
    expect(plan.isDefault).toBe(false);
    expect(plan.archivedAt).toEqual(new Date('2026-11-22T00:00:00Z'));
    expect(plan.priceInCents).toBe(0);
  });

  it('HQ website chat starts on, asking visitors who they are first', () => {
    expect(HQ_WIDGET.enabled).toBe(true);
    expect(HQ_WIDGET.preChatFormEnabled).toBe(true);
  });

  it('HQ period end is far past any renewal window', () => {
    expect(HQ_PERIOD_END.getUTCFullYear()).toBe(2099);
  });

  it("HQ user email: the super admin's own, or +hq when that login is taken", () => {
    expect(hqUserEmail(' Selva@Wazelo.io ', false)).toBe('selva@wazelo.io');
    expect(hqUserEmail('selva@wazelo.io', true)).toBe('selva+hq@wazelo.io');
  });

  it('splits a display name into first and last name', () => {
    expect(splitName('Selva Kumar B')).toEqual({ firstName: 'Selva', lastName: 'Kumar B' });
    expect(splitName('Selva')).toEqual({ firstName: 'Selva', lastName: '' });
    expect(splitName('   ')).toEqual({ firstName: 'Wazelo', lastName: 'Admin' });
  });
});
