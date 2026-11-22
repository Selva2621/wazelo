import { OrgType } from '@prisma/client';
import { safeHqPath, hqHandoffUrl } from '@/shared/utils/hq-handoff';
import { HQ_DEFAULT_TEMPLATES, PLATFORM_ALERTS, alertIdempotencyKey, diffSegmentTags, hqTemplateRows, segmentTags, sendableTemplateStatus } from './platform-alerts';
import { OTP_TEMPLATE } from './whatsapp-otp';

describe('segmentTags', () => {
  it('stage, plan and workspace type', () => {
    expect(segmentTags({ plan: 'Growth Monthly', stage: 'PAID', orgType: OrgType.TEAM })).toEqual([
      'stage:paid',
      'plan:growth-monthly',
      'type:team',
    ]);
    expect(segmentTags({ plan: null, stage: 'SIGNED_UP', orgType: OrgType.CRM })).toEqual(['stage:signed-up']);
  });

  it('diff touches only plan:/stage:/type: tags', () => {
    expect(diffSegmentTags(['stage:trial', 'vip', 'plan:free-trial'], ['stage:paid', 'plan:free-trial'])).toEqual({
      add: ['stage:paid'],
      remove: ['stage:trial'],
    });
  });
});

describe('alert idempotency', () => {
  it('one key per alert, workspace and scope', () => {
    expect(alertIdempotencyKey('trial_ending', 'org1', 'sub1:3d')).toBe('hq-alert:trial_ending:org1:sub1:3d');
  });
});

describe('safeHqPath', () => {
  it.each([
    ['/inbox', '/inbox'],
    ['/campaigns?tab=sent', '/campaigns?tab=sent'],
    ['//evil.com', null],
    ['https://evil.com', null],
    ['/\\evil.com', null],
    ['javascript:alert(1)', null],
    ['inbox', null],
    [undefined, null],
  ])('%s → %s', (input, out) => {
    expect(safeHqPath(input as any)).toBe(out);
  });

  it('adds only a safe landing page to the handoff link', () => {
    expect(hqHandoffUrl('http://app/', 'abc', '/inbox')).toBe('http://app/auth/hq#code=abc&next=%2Finbox');
    expect(hqHandoffUrl('http://app', 'abc', '//evil.com')).toBe('http://app/auth/hq#code=abc');
  });
});

describe('HQ default templates', () => {
  it('covers every alert and the code template, worded for their slots', () => {
    const names = HQ_DEFAULT_TEMPLATES.map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining([...Object.values(PLATFORM_ALERTS).map((a) => a.template), OTP_TEMPLATE]));
    expect(new Set(names).size).toBe(names.length);
    for (const t of HQ_DEFAULT_TEMPLATES) {
      expect(t.body).toContain('{{1}}');
      expect(t.body).not.toMatch(/\{\{[4-9]\}\}/);
    }
    expect(HQ_DEFAULT_TEMPLATES.find((t) => t.name === OTP_TEMPLATE)?.category).toBe('AUTHENTICATION');
  });

  it('are stored as system templates waiting for approval', () => {
    const [row] = hqTemplateRows('hq', HQ_DEFAULT_TEMPLATES.slice(0, 1));
    expect(row).toMatchObject({ orgId: 'hq', language: 'en', status: 'PENDING', exampleValues: { isSystemTemplate: true } });
    expect(row.components).toEqual([{ type: 'BODY', text: HQ_DEFAULT_TEMPLATES[0].body }]);
  });

  it('an official number needs Meta approval; a QR number sends anything not rejected', () => {
    expect(sendableTemplateStatus('CLOUD_API')).toEqual({ status: 'APPROVED' });
    expect(sendableTemplateStatus('QR')).toEqual({ status: { not: 'REJECTED' } });
  });
});
