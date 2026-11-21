import {
  isGoogleConfigured,
  PLATFORM_SETTING_KEYS,
  PlatformSettings,
} from '@/modules/platform-settings/domain/services/platform-settings';

/** PATCH /super-admin/settings body (every field optional). */
export interface PlatformSettingsPatch {
  googleSignupEnabled?: boolean;
  /** '' clears it */
  googleClientId?: string;
  /** Write-only. '' (or omitted) keeps the stored secret, null clears it */
  googleClientSecret?: string | null;
  /** '' clears it */
  googleRedirectUri?: string;
  /** New workspaces may choose Team / Company */
  teamSetupEnabled?: boolean;
  /** New workspaces may choose Solo / Freelancer */
  freelancerSetupEnabled?: boolean;
}

export type PlatformSettingsChange =
  | { kind: 'invalid'; error: string }
  | { kind: 'noop' }
  | {
      kind: 'apply';
      set: { key: string; value: string | boolean }[];
      remove: string[];
      /** Audit diff. The secret appears only as after.clientSecret = 'changed' | 'cleared' */
      before: Record<string, unknown>;
      after: Record<string, unknown>;
    };

const CLIENT_ID_RE = /^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isValidGoogleClientId(value: string): boolean {
  return CLIENT_ID_RE.test(value);
}

/** Absolute https URL, or http on localhost for development. No fragment. */
export function isValidRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash || url.username || url.password) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);
}

/**
 * Validates a settings patch against the current settings and works out the writes plus
 * the audit diff. `encrypt` turns a new client secret into its stored ciphertext.
 */
export function planPlatformSettingsChange(
  current: PlatformSettings,
  patch: PlatformSettingsPatch,
  encrypt: (plain: string) => string,
): PlatformSettingsChange {
  const K = PLATFORM_SETTING_KEYS;
  const set: { key: string; value: string | boolean }[] = [];
  const remove: string[] = [];
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const next = { ...current.google };

  if (patch.googleClientId !== undefined) {
    const value = patch.googleClientId.trim();
    if (value && !isValidGoogleClientId(value)) {
      return { kind: 'invalid', error: 'Client ID should look like 1234567890-abc123.apps.googleusercontent.com' };
    }
    const nextValue = value || null;
    if (nextValue !== current.google.clientId) {
      if (nextValue) set.push({ key: K.googleClientId, value: nextValue });
      else remove.push(K.googleClientId);
      before.clientId = current.google.clientId;
      after.clientId = nextValue;
      next.clientId = nextValue;
    }
  }

  if (patch.googleRedirectUri !== undefined) {
    const value = patch.googleRedirectUri.trim();
    if (value && !isValidRedirectUri(value)) {
      return { kind: 'invalid', error: 'Redirect URI must be an absolute https:// URL (http:// is allowed only for localhost)' };
    }
    const nextValue = value || null;
    if (nextValue !== current.google.redirectUri) {
      if (nextValue) set.push({ key: K.googleRedirectUri, value: nextValue });
      else remove.push(K.googleRedirectUri);
      before.redirectUri = current.google.redirectUri;
      after.redirectUri = nextValue;
      next.redirectUri = nextValue;
    }
  }

  if (patch.googleClientSecret === null) {
    if (current.google.clientSecretEncrypted) {
      remove.push(K.googleClientSecret);
      after.clientSecret = 'cleared';
      next.clientSecretEncrypted = null;
    }
  } else if (patch.googleClientSecret !== undefined && patch.googleClientSecret.trim()) {
    const ciphertext = encrypt(patch.googleClientSecret.trim());
    set.push({ key: K.googleClientSecret, value: ciphertext });
    after.clientSecret = 'changed';
    next.clientSecretEncrypted = ciphertext;
  }

  const configured = isGoogleConfigured(next);
  let signup = current.googleSignupEnabled;
  if (patch.googleSignupEnabled !== undefined) {
    if (patch.googleSignupEnabled && !configured) {
      return {
        kind: 'invalid',
        error: 'Google sign-in isn’t configured yet. Save the client ID, client secret and redirect URI first.',
      };
    }
    signup = patch.googleSignupEnabled;
  }
  // Sign-up can't stay on once the credentials it needs are removed
  if (signup && !configured) signup = false;

  if (signup !== current.googleSignupEnabled) {
    set.push({ key: K.googleSignupEnabled, value: signup });
    before.googleSignupEnabled = current.googleSignupEnabled;
    after.googleSignupEnabled = signup;
  }

  const setupToggles = [
    ['teamSetupEnabled', 'TEAM', K.teamSetupEnabled],
    ['freelancerSetupEnabled', 'FREELANCER', K.freelancerSetupEnabled],
  ] as const;
  for (const [field, type, key] of setupToggles) {
    const value = patch[field];
    if (value === undefined || value === current.orgTypeSetup[type]) continue;
    set.push({ key, value });
    before[field] = current.orgTypeSetup[type];
    after[field] = value;
  }

  if (!set.length && !remove.length) return { kind: 'noop' };
  return { kind: 'apply', set, remove, before, after };
}
