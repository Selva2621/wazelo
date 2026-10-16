/** Storage keys of platform-wide settings (PlatformSetting.key). */
export const PLATFORM_SETTING_KEYS = {
  googleSignupEnabled: 'auth.googleSignupEnabled',
  googleClientId: 'auth.google.clientId',
  /** AES-256-GCM ciphertext (EncryptionService), never the plain secret */
  googleClientSecret: 'auth.google.clientSecret',
  googleRedirectUri: 'auth.google.redirectUri',
  teamSetupEnabled: 'orgTypes.teamSetupEnabled',
  freelancerSetupEnabled: 'orgTypes.freelancerSetupEnabled',
} as const;

/** Org types a new workspace can pick on the "How will you use Wazelo?" screen. */
export type SetupOrgType = 'TEAM' | 'FREELANCER';
export const SETUP_ORG_TYPES: readonly SetupOrgType[] = ['TEAM', 'FREELANCER'];

/** Which org types new workspaces may choose. Existing orgs keep their type either way. */
export type OrgTypeSetup = Record<SetupOrgType, boolean>;

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
  orgTypeSetup: OrgTypeSetup;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  googleSignupEnabled: false,
  google: { clientId: null, clientSecretEncrypted: null, redirectUri: null },
  orgTypeSetup: { TEAM: true, FREELANCER: true },
};

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Builds typed settings from stored rows; a missing or malformed row falls back to the default. */
export function toPlatformSettings(rows: { key: string; value: unknown }[]): PlatformSettings {
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const K = PLATFORM_SETTING_KEYS;
  const D = DEFAULT_PLATFORM_SETTINGS;
  return {
    googleSignupEnabled: boolOr(byKey.get(K.googleSignupEnabled), D.googleSignupEnabled),
    google: {
      clientId: nonEmptyString(byKey.get(K.googleClientId)),
      clientSecretEncrypted: nonEmptyString(byKey.get(K.googleClientSecret)),
      redirectUri: nonEmptyString(byKey.get(K.googleRedirectUri)),
    },
    orgTypeSetup: {
      TEAM: boolOr(byKey.get(K.teamSetupEnabled), D.orgTypeSetup.TEAM),
      FREELANCER: boolOr(byKey.get(K.freelancerSetupEnabled), D.orgTypeSetup.FREELANCER),
    },
  };
}

/** Google sign-in is usable only with all three credentials. */
export function isGoogleConfigured(google: GoogleSettings): boolean {
  return !!(google.clientId && google.clientSecretEncrypted && google.redirectUri);
}
