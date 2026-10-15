import {
  decideGoogleSignIn,
  defaultWorkspaceName,
  GoogleCandidateAccount,
  GoogleSignInInput,
  namesFromProfile,
} from './google-sign-in.policy';

const now = new Date('2026-10-11T10:00:00Z');
const later = new Date('2026-10-11T10:30:00Z');
const earlier = new Date('2026-10-11T09:30:00Z');

function account(overrides: Partial<GoogleCandidateAccount> = {}): GoogleCandidateAccount {
  return { userId: 'u-1', status: 'ACTIVE', lockedUntil: null, orgSuspended: false, ...overrides };
}

function input(overrides: Partial<GoogleSignInInput> = {}): GoogleSignInInput {
  return {
    identityAccount: null,
    emailAccount: null,
    emailVerified: true,
    signupEnabled: true,
    now,
    ...overrides,
  };
}

describe('decideGoogleSignIn', () => {
  describe('identity already linked', () => {
    it('signs the linked user in', () => {
      expect(decideGoogleSignIn(input({ identityAccount: account() }))).toEqual({ kind: 'signin', userId: 'u-1' });
    });

    it('ignores the sign-up toggle and email_verified for a linked identity', () => {
      expect(
        decideGoogleSignIn(input({ identityAccount: account(), signupEnabled: false, emailVerified: false })),
      ).toEqual({ kind: 'signin', userId: 'u-1' });
    });

    it('prefers the linked identity over an email match', () => {
      const out = decideGoogleSignIn(
        input({ identityAccount: account({ userId: 'linked' }), emailAccount: account({ userId: 'other' }) }),
      );
      expect(out).toEqual({ kind: 'signin', userId: 'linked' });
    });

    it('refuses a suspended user', () => {
      expect(decideGoogleSignIn(input({ identityAccount: account({ status: 'SUSPENDED' }) }))).toEqual({
        kind: 'refuse',
        code: 'account_suspended',
        userId: 'u-1',
      });
    });

    it('refuses while a lock is active, allows once it has expired', () => {
      expect(
        decideGoogleSignIn(input({ identityAccount: account({ status: 'LOCKED', lockedUntil: later }) })),
      ).toMatchObject({ kind: 'refuse', code: 'account_locked' });
      expect(
        decideGoogleSignIn(input({ identityAccount: account({ status: 'LOCKED', lockedUntil: earlier }) })),
      ).toEqual({ kind: 'signin', userId: 'u-1' });
    });

    it('refuses when the org is suspended or deleted', () => {
      expect(decideGoogleSignIn(input({ identityAccount: account({ orgSuspended: true }) }))).toMatchObject({
        kind: 'refuse',
        code: 'org_suspended',
      });
    });

    it('checks the user status before the org', () => {
      expect(
        decideGoogleSignIn(input({ identityAccount: account({ status: 'SUSPENDED', orgSuspended: true }) })),
      ).toMatchObject({ code: 'account_suspended' });
    });
  });

  describe('existing account with the same email', () => {
    it('links when Google says the email is verified', () => {
      expect(decideGoogleSignIn(input({ emailAccount: account() }))).toEqual({
        kind: 'link',
        userId: 'u-1',
        activate: false,
      });
    });

    it('links even when Google sign-up is turned off (not a new user)', () => {
      expect(decideGoogleSignIn(input({ emailAccount: account(), signupEnabled: false }))).toMatchObject({
        kind: 'link',
      });
    });

    it('refuses to link an unverified Google email', () => {
      expect(decideGoogleSignIn(input({ emailAccount: account(), emailVerified: false }))).toEqual({
        kind: 'refuse',
        code: 'email_unverified',
        userId: 'u-1',
      });
    });

    it('links and activates an account that never verified its email', () => {
      expect(decideGoogleSignIn(input({ emailAccount: account({ status: 'PENDING_VERIFICATION' }) }))).toEqual({
        kind: 'link',
        userId: 'u-1',
        activate: true,
      });
    });

    it('refuses suspended, locked and org-suspended accounts', () => {
      expect(decideGoogleSignIn(input({ emailAccount: account({ status: 'SUSPENDED' }) }))).toMatchObject({
        code: 'account_suspended',
      });
      expect(
        decideGoogleSignIn(input({ emailAccount: account({ status: 'LOCKED', lockedUntil: later }) })),
      ).toMatchObject({ code: 'account_locked' });
      expect(decideGoogleSignIn(input({ emailAccount: account({ orgSuspended: true }) }))).toMatchObject({
        code: 'org_suspended',
      });
    });

    it('checks email_verified before the account state', () => {
      expect(
        decideGoogleSignIn(input({ emailAccount: account({ status: 'SUSPENDED' }), emailVerified: false })),
      ).toMatchObject({ code: 'email_unverified' });
    });
  });

  describe('new user', () => {
    it('signs up when the toggle is on and the email is verified', () => {
      expect(decideGoogleSignIn(input())).toEqual({ kind: 'signup' });
    });

    it('refuses when Google sign-up is turned off', () => {
      expect(decideGoogleSignIn(input({ signupEnabled: false }))).toEqual({
        kind: 'refuse',
        code: 'google_signup_disabled',
      });
    });

    it('refuses an unverified Google email', () => {
      expect(decideGoogleSignIn(input({ emailVerified: false }))).toEqual({ kind: 'refuse', code: 'email_unverified' });
    });

    it('reports the disabled toggle before an unverified email', () => {
      expect(decideGoogleSignIn(input({ signupEnabled: false, emailVerified: false }))).toMatchObject({
        code: 'google_signup_disabled',
      });
    });
  });
});

describe('defaultWorkspaceName', () => {
  it('uses the given name', () => {
    expect(defaultWorkspaceName({ givenName: 'Priya', email: 'p@x.com' })).toBe("Priya's workspace");
  });

  it('falls back to the first word of the full name, then the email local part', () => {
    expect(defaultWorkspaceName({ name: 'Arun Kumar', email: 'a@x.com' })).toBe("Arun's workspace");
    expect(defaultWorkspaceName({ email: 'sales.team@acme.io' })).toBe('sales.team');
  });
});

describe('namesFromProfile', () => {
  it('uses given and family names', () => {
    expect(namesFromProfile({ givenName: 'Priya', familyName: 'Raman', email: 'p@x.com' })).toEqual({
      firstName: 'Priya',
      lastName: 'Raman',
    });
  });

  it('splits the full name when the parts are missing', () => {
    expect(namesFromProfile({ name: 'Arun Kumar Das', email: 'a@x.com' })).toEqual({
      firstName: 'Arun',
      lastName: 'Kumar Das',
    });
  });

  it('falls back to the email local part with an empty last name', () => {
    expect(namesFromProfile({ email: 'ops@acme.io' })).toEqual({ firstName: 'ops', lastName: '' });
  });

  it('caps both at 100 characters', () => {
    const long = 'x'.repeat(150);
    const out = namesFromProfile({ givenName: long, familyName: long, email: 'a@x.com' });
    expect(out.firstName).toHaveLength(100);
    expect(out.lastName).toHaveLength(100);
  });
});
