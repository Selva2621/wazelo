import { BadRequestException } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { PlatformSettingsService } from '@/modules/platform-settings/domain/services/platform-settings.service';
import { GetPlatformSettingsUseCase, UpdatePlatformSettingsUseCase } from './platform-settings.use-cases';

const actor = { id: 'sa-1', email: 'ops@x.com' };
const CLIENT_ID = '1234567890-abc123def.apps.googleusercontent.com';
const REDIRECT = 'https://api.wazelo.in/api/v1/auth/google/callback';
const SUGGESTED = 'https://api.wazelo.in/api/v1/auth/google/callback';
const SECRET = 'GOCSPX-super-secret-value';

/** Reversible fake: lets the test tell ciphertext from plaintext. */
const encryption = {
  encrypt: (plain: string) => `cipher:${Buffer.from(plain).toString('base64')}`,
  decrypt: (data: string) => Buffer.from(data.slice('cipher:'.length), 'base64').toString(),
};

function deps(initial: Record<string, unknown> = {}) {
  const rows = new Map<string, unknown>(Object.entries(initial));
  const repo = {
    findAll: jest.fn(async () => [...rows].map(([key, value]) => ({ key, value }))),
    apply: jest.fn(async (set: { key: string; value: unknown }[], remove: string[]) => {
      set.forEach(({ key, value }) => rows.set(key, value));
      remove.forEach((key) => rows.delete(key));
    }),
  };
  // Real cached service over the fake repo, so invalidation is exercised too
  const settings = new PlatformSettingsService(repo as any, encryption as any);
  const audit = { record: jest.fn() };
  const update = new UpdatePlatformSettingsUseCase(repo as any, settings, audit as any);
  const get = new GetPlatformSettingsUseCase(settings);
  return { rows, repo, settings, audit, update, get };
}

const configuredRows = () => ({
  'auth.google.clientId': CLIENT_ID,
  'auth.google.clientSecret': encryption.encrypt('old-secret'),
  'auth.google.redirectUri': REDIRECT,
});

describe('GetPlatformSettingsUseCase', () => {
  it('defaults to not configured with sign-up off', async () => {
    expect(await deps().get.execute(SUGGESTED)).toEqual({
      googleSignupEnabled: false,
      google: { clientId: null, clientSecretSet: false, redirectUri: null, configured: false, suggestedRedirectUri: SUGGESTED },
    });
  });

  it('never returns the secret or its ciphertext', async () => {
    const out = await deps({ ...configuredRows(), 'auth.googleSignupEnabled': true }).get.execute(SUGGESTED);
    expect(out).toEqual({
      googleSignupEnabled: true,
      google: { clientId: CLIENT_ID, clientSecretSet: true, redirectUri: REDIRECT, configured: true, suggestedRedirectUri: SUGGESTED },
    });
    expect(JSON.stringify(out)).not.toMatch(/old-secret|cipher:/);
  });

  it('ignores a malformed stored toggle', async () => {
    expect((await deps({ 'auth.googleSignupEnabled': 'yes' }).get.execute(SUGGESTED)).googleSignupEnabled).toBe(false);
  });
});

describe('UpdatePlatformSettingsUseCase', () => {
  it('stores the client secret encrypted, decryptable for the Google client, and never audits it', async () => {
    const d = deps();
    const out = await d.update.execute(
      { googleClientId: CLIENT_ID, googleClientSecret: SECRET, googleRedirectUri: REDIRECT },
      actor,
      { ipAddress: '1.1.1.1' },
      SUGGESTED,
    );

    expect(d.rows.get('auth.google.clientSecret')).toBe(encryption.encrypt(SECRET));
    expect(d.rows.get('auth.google.clientSecret')).not.toBe(SECRET);
    expect(out.google).toMatchObject({ clientSecretSet: true, configured: true });
    expect(JSON.stringify(out)).not.toContain(SECRET);
    expect(await d.settings.getGoogleCredentials()).toEqual({ clientId: CLIENT_ID, clientSecret: SECRET, redirectUri: REDIRECT });

    expect(d.audit.record).toHaveBeenCalledTimes(1);
    const entry = d.audit.record.mock.calls[0][0];
    expect(entry).toMatchObject({
      action: PlatformAuditAction.PLATFORM_SETTING_CHANGED,
      actor,
      metadata: {
        before: { clientId: null, redirectUri: null },
        after: { clientId: CLIENT_ID, redirectUri: REDIRECT, clientSecret: 'changed' },
      },
    });
    const audited = JSON.stringify(entry);
    expect(audited).not.toContain(SECRET);
    expect(audited).not.toContain('cipher:');
  });

  it('keeps the existing secret when an empty string is sent', async () => {
    const d = deps(configuredRows());
    const before = d.rows.get('auth.google.clientSecret');
    const out = await d.update.execute({ googleClientSecret: '' }, actor, {}, SUGGESTED);
    expect(d.rows.get('auth.google.clientSecret')).toBe(before);
    expect(out.google.clientSecretSet).toBe(true);
    expect(d.repo.apply).not.toHaveBeenCalled();
    expect(d.audit.record).not.toHaveBeenCalled();
  });

  it('clears the secret on null, audits "cleared" and turns sign-up off', async () => {
    const d = deps({ ...configuredRows(), 'auth.googleSignupEnabled': true });
    const out = await d.update.execute({ googleClientSecret: null }, actor, {}, SUGGESTED);
    expect(d.rows.has('auth.google.clientSecret')).toBe(false);
    expect(out).toMatchObject({ googleSignupEnabled: false, google: { clientSecretSet: false, configured: false } });
    expect(d.audit.record.mock.calls[0][0].metadata).toMatchObject({
      before: { googleSignupEnabled: true },
      after: { clientSecret: 'cleared', googleSignupEnabled: false },
    });
    expect(await d.settings.getGoogleCredentials()).toBeNull();
  });

  it('refuses to enable sign-up while Google is not configured', async () => {
    const d = deps({ 'auth.google.clientId': CLIENT_ID });
    await expect(d.update.execute({ googleSignupEnabled: true }, actor, {}, SUGGESTED)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(d.repo.apply).not.toHaveBeenCalled();
    expect(d.audit.record).not.toHaveBeenCalled();
  });

  it('rejects a bad client id or a non-https redirect URI', async () => {
    const d = deps();
    await expect(d.update.execute({ googleClientId: 'my-app' }, actor, {}, SUGGESTED)).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      d.update.execute({ googleRedirectUri: 'http://api.wazelo.in/cb' }, actor, {}, SUGGESTED),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('turns Google sign-up on once configured, audits before/after and is visible immediately', async () => {
    const d = deps(configuredRows());
    expect((await d.settings.get()).googleSignupEnabled).toBe(false); // primes the cache

    const out = await d.update.execute({ googleSignupEnabled: true }, actor, {}, SUGGESTED);

    expect(out.googleSignupEnabled).toBe(true);
    expect(d.audit.record.mock.calls[0][0].metadata).toMatchObject({
      before: { googleSignupEnabled: false },
      after: { googleSignupEnabled: true },
    });
    // Cache was invalidated: readers see the new value without waiting for the TTL
    expect((await d.settings.get()).googleSignupEnabled).toBe(true);
  });

  it('does nothing (no write, no audit) when the value is unchanged', async () => {
    const d = deps({ ...configuredRows(), 'auth.googleSignupEnabled': true });
    await d.update.execute({ googleSignupEnabled: true }, actor, {}, SUGGESTED);
    expect(d.repo.apply).not.toHaveBeenCalled();
    expect(d.audit.record).not.toHaveBeenCalled();
  });
});
