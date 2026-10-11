/** Storage keys of platform-wide settings (PlatformSetting.key). */
export const PLATFORM_SETTING_KEYS = {
  googleSignupEnabled: 'auth.googleSignupEnabled',
  googleClientId: 'auth.google.clientId',
  /** AES-256-GCM ciphertext (EncryptionService), never the plain secret */
  googleClientSecret: 'auth.google.clientSecret',
  googleRedirectUri: 'auth.google.redirectUri',
} as const;

export interface GoogleSettings {
  clientId: string | null;
  /** Ciphertext as stored; decrypt only where Google is called */
  clientSecretEncrypted: string | null;
  redirectUri: string | null;
}

export interface PlatformSettings {
  /** New users may create an account with "Continue with Google". Off until a super admin turns it on. */
  googleSignupEnabled: boolean;
  google: GoogleSettings;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  googleSignupEnabled: false,
  google: { clientId: null, clientSecretEncrypted: null, redirectUri: null },
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Builds typed settings from stored rows; a missing or malformed row falls back to the default. */
export function toPlatformSettings(rows: { key: string; value: unknown }[]): PlatformSettings {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const signup = byKey.get(PLATFORM_SETTING_KEYS.googleSignupEnabled);
  return {
    googleSignupEnabled: typeof signup === 'boolean' ? signup : DEFAULT_PLATFORM_SETTINGS.googleSignupEnabled,
    google: {
      clientId: nonEmptyString(byKey.get(PLATFORM_SETTING_KEYS.googleClientId)),
      clientSecretEncrypted: nonEmptyString(byKey.get(PLATFORM_SETTING_KEYS.googleClientSecret)),
      redirectUri: nonEmptyString(byKey.get(PLATFORM_SETTING_KEYS.googleRedirectUri)),
    },
  };
}

/** Google sign-in is usable only with all three credentials. */
export function isGoogleConfigured(google: GoogleSettings): boolean {
  return !!(google.clientId && google.clientSecretEncrypted && google.redirectUri);
}
