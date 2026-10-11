import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'crypto';
import { GoogleSsoIntent } from '../../domain/services/google-sign-in.policy';

/** Lifetime of a Google sign-in attempt (state cookie). */
export const GOOGLE_STATE_TTL_SECONDS = 10 * 60;

/** Kept in the short-lived HttpOnly state cookie between /start and /callback. */
export interface GoogleOAuthState {
  /** CSRF state, echoed back by Google */
  state: string;
  /** PKCE code_verifier */
  verifier: string;
  /** OIDC nonce, must come back inside the ID token */
  nonce: string;
  intent: GoogleSsoIntent;
  rememberMe: boolean;
}

/**
 * Signs/verifies the state cookie as a short-lived HS256 JWT. The key is derived from the
 * refresh-token secret for this purpose only, so a state cookie can never pass as any
 * other token (and vice versa).
 */
@Injectable()
export class GoogleOAuthStateCodec {
  private readonly secret: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    const base = config.getOrThrow<string>('jwt.refreshSecret');
    this.secret = createHmac('sha256', base).update('wazelo:google-oauth-state:v1').digest('hex');
  }

  sign(state: GoogleOAuthState): Promise<string> {
    return this.jwt.signAsync(
      { s: state.state, v: state.verifier, n: state.nonce, i: state.intent, r: state.rememberMe ? 1 : 0, typ: 'g_oauth' },
      { secret: this.secret, expiresIn: GOOGLE_STATE_TTL_SECONDS, algorithm: 'HS256' },
    );
  }

  /** Null when missing, tampered with, expired or malformed. */
  async verify(token: string | undefined): Promise<GoogleOAuthState | null> {
    if (!token) return null;
    try {
      const p = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
      });
      if (p.typ !== 'g_oauth') return null;
      if (typeof p.s !== 'string' || typeof p.v !== 'string' || typeof p.n !== 'string') return null;
      return {
        state: p.s,
        verifier: p.v,
        nonce: p.n,
        intent: p.i === 'signup' ? 'signup' : 'signin',
        rememberMe: p.r === 1,
      };
    } catch {
      return null;
    }
  }
}
