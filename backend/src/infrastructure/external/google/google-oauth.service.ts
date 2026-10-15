import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import {
  GoogleOAuthCredentials,
  PlatformSettingsService,
} from '@/modules/platform-settings/domain/services/platform-settings.service';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

/** What we keep from a verified Google ID token. */
export interface GoogleProfile {
  /** Google's stable account id */
  sub: string;
  email: string;
  emailVerified: boolean;
  givenName?: string;
  familyName?: string;
  name?: string;
}

/** Any failure talking to Google or validating its answer. The message never contains tokens or credentials. */
export class GoogleOAuthError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'GoogleOAuthError';
  }
}

/**
 * Google OAuth 2.0 / OpenID Connect (authorization code + PKCE). Only talks to Google:
 * no account decisions here. Client credentials are entered by a super admin and read
 * from platform settings on every call, so changes apply without a restart.
 */
@Injectable()
export class GoogleOAuthService {
  /** Reused while the credentials are unchanged (it caches Google's signing keys). */
  private client: { creds: GoogleOAuthCredentials; client: OAuth2Client } | null = null;

  constructor(private readonly settings: PlatformSettingsService) {}

  /** Client id, secret and redirect URI are all set (and the secret decrypts). */
  async isConfigured(): Promise<boolean> {
    return (await this.settings.getGoogleCredentials()) !== null;
  }

  /** Google consent URL (openid email profile, PKCE S256, account chooser), or null when not configured. */
  async buildAuthUrl(params: { state: string; nonce: string; codeChallenge: string }): Promise<string | null> {
    const creds = await this.settings.getGoogleCredentials();
    if (!creds) return null;
    const query = new URLSearchParams({
      client_id: creds.clientId,
      redirect_uri: creds.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: params.state,
      nonce: params.nonce,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
      access_type: 'online',
      include_granted_scopes: 'true',
    });
    return `${AUTH_ENDPOINT}?${query.toString()}`;
  }

  /**
   * Exchanges the code (with the PKCE verifier) and verifies the returned ID token:
   * signature (Google's keys), audience = our client id, issuer, expiry, and our nonce.
   */
  async exchangeCode(params: { code: string; codeVerifier: string; nonce: string }): Promise<GoogleProfile> {
    const creds = await this.settings.getGoogleCredentials();
    if (!creds) throw new GoogleOAuthError('Google sign-in is not configured');
    const client = this.getClient(creds);

    let idToken: string | null | undefined;
    try {
      const { tokens } = await client.getToken({
        code: params.code,
        codeVerifier: params.codeVerifier,
        redirect_uri: creds.redirectUri,
      });
      idToken = tokens.id_token;
    } catch (err) {
      // gaxios errors carry the request (code, client secret) — keep only Google's error code
      const data = (err as { response?: { data?: { error?: unknown } } })?.response?.data;
      throw new GoogleOAuthError(`token exchange failed (${typeof data?.error === 'string' ? data.error : 'request error'})`);
    }
    if (!idToken) throw new GoogleOAuthError('no id_token in token response');

    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: creds.clientId });
      payload = ticket.getPayload();
    } catch (err) {
      throw new GoogleOAuthError(`id_token verification failed (${err instanceof Error ? err.message.split('\n')[0].slice(0, 120) : 'unknown'})`);
    }
    if (!payload) throw new GoogleOAuthError('id_token has no payload');

    // verifyIdToken already checks these; kept explicit so a library change can't loosen them
    if (!GOOGLE_ISSUERS.includes(payload.iss)) throw new GoogleOAuthError('unexpected issuer');
    if (payload.aud !== creds.clientId) throw new GoogleOAuthError('audience mismatch');
    if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new GoogleOAuthError('id_token expired');
    if (!payload.nonce || payload.nonce !== params.nonce) throw new GoogleOAuthError('nonce mismatch');
    if (!payload.sub) throw new GoogleOAuthError('id_token has no subject');
    if (!payload.email) throw new GoogleOAuthError('id_token has no email');

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase().trim(),
      emailVerified: payload.email_verified === true,
      givenName: payload.given_name?.trim() || undefined,
      familyName: payload.family_name?.trim() || undefined,
      name: payload.name?.trim() || undefined,
    };
  }

  private getClient(creds: GoogleOAuthCredentials): OAuth2Client {
    const cached = this.client;
    if (
      cached &&
      cached.creds.clientId === creds.clientId &&
      cached.creds.clientSecret === creds.clientSecret &&
      cached.creds.redirectUri === creds.redirectUri
    ) {
      return cached.client;
    }
    const client = new OAuth2Client({
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      redirectUri: creds.redirectUri,
    });
    this.client = { creds, client };
    return client;
  }
}
