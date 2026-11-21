import { AuditAction, ContactSource } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { WhatsAppPermissionUseCase } from './whatsapp-permission.use-case';

const contact = { id: 'c1', orgId: 'o1', source: ContactSource.WEB_SCRAPE, phoneNumber: '+919000000001' };

function setup(found: Record<string, unknown> | null = contact, revokedCount = 0, needingConsent: string[] = []) {
  const repo = {
    findByIdAndOrg: jest.fn(async () => found),
    revokeConsentRecords: jest.fn(async () => revokedCount),
    createConsentRecord: jest.fn(async () => ({ id: 'cr1' })),
    createConsentRecords: jest.fn(async (rows: unknown[]) => rows.length),
  };
  const grantedAt = new Date('2026-11-21T10:00:00Z');
  const permission = {
    getStatus: jest.fn(async () => 'agreed'),
    findActiveConsent: jest.fn(async () => ({ id: 'cr1', source: 'call', grantedAt, metadata: { recordedBy: 'u1', note: 'Said yes' } })),
    requiresPermission: jest.fn(() => true),
    idsNeedingConsent: jest.fn(async () => needingConsent),
  };
  const audit = { log: jest.fn(async () => undefined) };
  const useCase = new WhatsAppPermissionUseCase(repo as never, permission as never, audit as never);
  return { useCase, repo, permission, audit, grantedAt };
}

describe('WhatsAppPermissionUseCase', () => {
  it('records permission as a whatsapp consent record, replacing an older one, and audits it', async () => {
    const { useCase, repo, audit, grantedAt } = setup();
    const view = await useCase.record('c1', 'o1', 'u1', { how: 'call', note: '  Said yes ' }, '1.2.3.4', 'ua');

    expect(repo.revokeConsentRecords).toHaveBeenCalledWith('o1', 'c1', 'whatsapp');
    expect(repo.createConsentRecord).toHaveBeenCalledWith({
      orgId: 'o1',
      contactId: 'c1',
      consentType: 'whatsapp',
      source: 'call',
      ipAddress: '1.2.3.4',
      metadata: { recordedBy: 'u1', note: 'Said yes' },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'o1',
        userId: 'u1',
        action: AuditAction.CONTACT_UPDATED,
        targetType: 'Contact',
        targetId: 'c1',
        metadata: expect.objectContaining({ change: 'whatsapp_permission_recorded', how: 'call' }),
      }),
    );
    expect(view).toEqual({
      contactId: 'c1',
      required: true,
      status: 'agreed',
      agreement: { id: 'cr1', how: 'call', note: 'Said yes', recordedBy: 'u1', grantedAt },
    });
  });

  it('revokes the active record and audits only when something was revoked', async () => {
    const some = setup(contact, 1);
    await some.useCase.revoke('c1', 'o1', 'u1');
    expect(some.repo.revokeConsentRecords).toHaveBeenCalledWith('o1', 'c1', 'whatsapp');
    expect(some.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ change: 'whatsapp_permission_revoked' }) }),
    );

    const none = setup(contact, 0);
    await none.useCase.revoke('c1', 'o1', 'u1');
    expect(none.audit.log).not.toHaveBeenCalled();
  });

  describe('recordForContacts (batch)', () => {
    it('records one insert for the lead finder contacts still needing it, audits each, and counts the rest as skipped', async () => {
      const { useCase, repo, permission, audit } = setup(contact, 0, ['c1', 'c3']);
      const result = await useCase.recordForContacts(
        'o1',
        'u1',
        ['c1', 'c2', 'c3', 'c1'],
        { how: 'in_person', note: ' Met at expo ' },
        { via: 'bulk', ipAddress: '1.2.3.4', userAgent: ['ua'] },
      );

      expect(permission.idsNeedingConsent).toHaveBeenCalledWith('o1', ['c1', 'c2', 'c3']);
      expect(repo.createConsentRecords).toHaveBeenCalledTimes(1);
      expect(repo.createConsentRecords).toHaveBeenCalledWith([
        { orgId: 'o1', contactId: 'c1', consentType: 'whatsapp', source: 'in_person', ipAddress: '1.2.3.4', metadata: { recordedBy: 'u1', note: 'Met at expo' } },
        { orgId: 'o1', contactId: 'c3', consentType: 'whatsapp', source: 'in_person', ipAddress: '1.2.3.4', metadata: { recordedBy: 'u1', note: 'Met at expo' } },
      ]);
      expect(repo.createConsentRecord).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledTimes(2);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'o1',
          targetId: 'c3',
          action: AuditAction.CONTACT_UPDATED,
          userAgent: 'ua',
          metadata: expect.objectContaining({ change: 'whatsapp_permission_recorded', how: 'in_person', via: 'bulk' }),
        }),
      );
      expect(result).toEqual({ recorded: 2, skipped: 1 });
    });

    it('keeps the scrape run on the record when called from the lead finder import', async () => {
      const { useCase, repo } = setup(contact, 0, ['c1']);
      await useCase.recordForContacts('o1', 'u1', ['c1'], { how: 'call' }, { via: 'lead_finder_import', scrapeRunId: 'r1' });
      expect(repo.createConsentRecords).toHaveBeenCalledWith([
        expect.objectContaining({ metadata: { recordedBy: 'u1', note: null, scrapeRunId: 'r1' } }),
      ]);
    });

    it('writes nothing when every contact is already permitted or not a lead finder contact', async () => {
      const { useCase, repo, audit } = setup(contact, 0, []);
      await expect(
        useCase.recordForContacts('o1', 'u1', ['c1', 'c2'], { how: 'email' }, { via: 'bulk' }),
      ).resolves.toEqual({ recorded: 0, skipped: 2 });
      expect(repo.createConsentRecords).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });
  });

  it('404s for a contact outside the org', async () => {
    const { useCase, repo } = setup(null);
    await expect(useCase.getStatus('c1', 'o1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(useCase.record('c1', 'o1', 'u1', { how: 'email' })).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.createConsentRecord).not.toHaveBeenCalled();
  });
});
