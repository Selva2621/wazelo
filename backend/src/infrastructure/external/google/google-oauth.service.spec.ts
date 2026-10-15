import { GoogleOAuthError, GoogleOAuthService } from './google-oauth.service';

const creds = {
  clientId: '123-abc.apps.googleusercontent.com',
  clientSecret: 'secret',
  redirectUri: 'https://api.example.com/api/v1/auth/google/callback',
};

describe('GoogleOAuthService', () => {
  it('reads credentials from settings on every call (changes apply without restart)', async () => {
    let current: typeof creds | null = null;
    const svc = new GoogleOAuthService({ getGoogleCredentials: async () => current } as any);

    expect(await svc.isConfigured()).toBe(false);
    expect(await svc.buildAuthUrl({ state: 's', nonce: 'n', codeChallenge: 'c' })).toBeNull();

    current = creds;
    expect(await svc.isConfigured()).toBe(true);
    const url = new URL((await svc.buildAuthUrl({ state: 's', nonce: 'n', codeChallenge: 'c' }))!);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: creds.clientId,
      redirect_uri: creds.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: 's',
      nonce: 'n',
      code_challenge: 'c',
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    // The secret never goes to the browser
    expect(url.toString()).not.toContain('secret');
  });

  it('refuses the code exchange when not configured', async () => {
    const svc = new GoogleOAuthService({ getGoogleCredentials: async () => null } as any);
    await expect(svc.exchangeCode({ code: 'c', codeVerifier: 'v', nonce: 'n' })).rejects.toBeInstanceOf(GoogleOAuthError);
  });
});
