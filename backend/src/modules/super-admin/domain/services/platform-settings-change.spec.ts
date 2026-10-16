import { DEFAULT_PLATFORM_SETTINGS, PlatformSettings } from '@/modules/platform-settings/domain/services/platform-settings';
import {
  isValidGoogleClientId,
  isValidRedirectUri,
  planPlatformSettingsChange,
} from './platform-settings-change';

const CLIENT_ID = '1234567890-abc123def.apps.googleusercontent.com';
const REDIRECT = 'https://api.wazelo.in/api/v1/auth/google/callback';
const encrypt = (plain: string) => `enc(${plain})`;

const empty: PlatformSettings = DEFAULT_PLATFORM_SETTINGS;
const configured: PlatformSettings = {
  googleSignupEnabled: false,
  google: { clientId: CLIENT_ID, clientSecretEncrypted: 'enc(old)', redirectUri: REDIRECT },
  orgTypeSetup: { TEAM: true, FREELANCER: true },
};

describe('validators', () => {
  it('accepts Google client ids only', () => {
    expect(isValidGoogleClientId(CLIENT_ID)).toBe(true);
    expect(isValidGoogleClientId('abc.apps.googleusercontent.com')).toBe(false);
    expect(isValidGoogleClientId('123-abc.example.com')).toBe(false);
  });

  it('accepts https anywhere and http only on localhost', () => {
    expect(isValidRedirectUri(REDIRECT)).toBe(true);
    expect(isValidRedirectUri('http://localhost:8080/api/v1/auth/google/callback')).toBe(true);
    expect(isValidRedirectUri('http://127.0.0.1:8080/cb')).toBe(true);
    expect(isValidRedirectUri('http://api.wazelo.in/cb')).toBe(false);
    expect(isValidRedirectUri('/api/v1/auth/google/callback')).toBe(false);
    expect(isValidRedirectUri('https://x.com/cb#frag')).toBe(false);
    expect(isValidRedirectUri('javascript:alert(1)')).toBe(false);
  });
});

describe('planPlatformSettingsChange', () => {
  it('saves all three credentials, encrypting the secret and auditing it only as "changed"', () => {
    const out = planPlatformSettingsChange(
      empty,
      { googleClientId: ` ${CLIENT_ID} `, googleClientSecret: 's3cret', googleRedirectUri: REDIRECT },
      encrypt,
    );
    expect(out).toEqual({
      kind: 'apply',
      set: [
        { key: 'auth.google.clientId', value: CLIENT_ID },
        { key: 'auth.google.redirectUri', value: REDIRECT },
        { key: 'auth.google.clientSecret', value: 'enc(s3cret)' },
      ],
      remove: [],
      before: { clientId: null, redirectUri: null },
      after: { clientId: CLIENT_ID, redirectUri: REDIRECT, clientSecret: 'changed' },
    });
    expect(JSON.stringify(out)).not.toMatch(/"s3cret"/);
  });

  it('keeps the stored secret when the secret is an empty string', () => {
    expect(planPlatformSettingsChange(configured, { googleClientSecret: '' }, encrypt)).toEqual({ kind: 'noop' });
    expect(planPlatformSettingsChange(configured, { googleClientSecret: '   ' }, encrypt)).toEqual({ kind: 'noop' });
  });

  it('clears the secret on explicit null (audited as "cleared")', () => {
    expect(planPlatformSettingsChange(configured, { googleClientSecret: null }, encrypt)).toEqual({
      kind: 'apply',
      set: [],
      remove: ['auth.google.clientSecret'],
      before: {},
      after: { clientSecret: 'cleared' },
    });
    expect(planPlatformSettingsChange(empty, { googleClientSecret: null }, encrypt)).toEqual({ kind: 'noop' });
  });

  it('rejects a malformed client id or redirect URI', () => {
    expect(planPlatformSettingsChange(empty, { googleClientId: 'not-a-client-id' }, encrypt)).toMatchObject({ kind: 'invalid' });
    expect(planPlatformSettingsChange(empty, { googleRedirectUri: 'http://api.wazelo.in/cb' }, encrypt)).toMatchObject({
      kind: 'invalid',
    });
  });

  it('refuses to enable sign-up while not configured', () => {
    const out = planPlatformSettingsChange(empty, { googleSignupEnabled: true }, encrypt);
    expect(out).toMatchObject({ kind: 'invalid', error: expect.stringMatching(/isn’t configured/) });
    const partial = { ...configured, google: { ...configured.google, clientSecretEncrypted: null } };
    expect(planPlatformSettingsChange(partial, { googleSignupEnabled: true }, encrypt)).toMatchObject({ kind: 'invalid' });
  });

  it('allows credentials and enabling in the same request', () => {
    const out = planPlatformSettingsChange(
      empty,
      { googleClientId: CLIENT_ID, googleClientSecret: 'x', googleRedirectUri: REDIRECT, googleSignupEnabled: true },
      encrypt,
    );
    expect(out).toMatchObject({ kind: 'apply', after: { googleSignupEnabled: true } });
  });

  it('turns sign-up off when the credentials it needs are removed', () => {
    const on = { ...configured, googleSignupEnabled: true };
    const out = planPlatformSettingsChange(on, { googleClientId: '' }, encrypt);
    expect(out).toEqual({
      kind: 'apply',
      set: [{ key: 'auth.googleSignupEnabled', value: false }],
      remove: ['auth.google.clientId'],
      before: { clientId: CLIENT_ID, googleSignupEnabled: true },
      after: { clientId: null, googleSignupEnabled: false },
    });
  });

  it('is a noop when nothing changes', () => {
    expect(
      planPlatformSettingsChange(configured, { googleClientId: CLIENT_ID, googleRedirectUri: REDIRECT, googleSignupEnabled: false }, encrypt),
    ).toEqual({ kind: 'noop' });
  });
});
