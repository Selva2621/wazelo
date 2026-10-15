/**
 * Decides what a verified "Continue with Google" callback does. Pure: the caller loads the
 * accounts and settings, applies the outcome, and maps refusals to user-facing messages.
 */

/** Short codes sent to the login page as ?ssoError=… */
export type GoogleSsoErrorCode =
  | 'google_signup_disabled'
  | 'email_unverified'
  | 'account_suspended'
  | 'account_locked'
  | 'org_suspended'
  | 'account_unavailable'
  | 'not_configured'
  | 'invalid_state'
  | 'google_cancelled'
  | 'google_error';

export type GoogleSsoIntent = 'signin' | 'signup';

export type UserAccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'LOCKED';

/** The parts of an existing (not deleted) account the decision depends on. */
export interface GoogleCandidateAccount {
  userId: string;
  status: UserAccountStatus;
  lockedUntil: Date | null;
  /** Org suspended or deleted (OrgStatusService.isSuspended) */
  orgSuspended: boolean;
}

export interface GoogleSignInInput {
  /** Account already linked to this Google `sub` */
  identityAccount: GoogleCandidateAccount | null;
  /** Account whose email equals Google's email (only consulted when no identity is linked) */
  emailAccount: GoogleCandidateAccount | null;
  /** Google's `email_verified` claim */
  emailVerified: boolean;
  /** Platform toggle: new users may sign up with Google */
  signupEnabled: boolean;
  now: Date;
}

export type GoogleSignInDecision =
  /** Linked identity: sign that user in */
  | { kind: 'signin'; userId: string }
  /**
   * Existing account with the same (Google-verified) email: link the identity, then sign in.
   * `activate` = the account never verified its email; Google just proved ownership, so it
   * becomes ACTIVE and its unverified password is replaced (it may have been set by
   * someone else who registered this address first).
   */
  | { kind: 'link'; userId: string; activate: boolean }
  /** No account: create org + admin user + identity */
  | { kind: 'signup' }
  | { kind: 'refuse'; code: GoogleSsoErrorCode; userId?: string };

/** Same status rules as the password login. Null = may sign in. */
function accountBlock(account: GoogleCandidateAccount, now: Date, allowPending: boolean): GoogleSsoErrorCode | null {
  if (account.status === 'SUSPENDED') return 'account_suspended';
  if (account.status === 'LOCKED' && account.lockedUntil && account.lockedUntil > now) return 'account_locked';
  if (account.status === 'PENDING_VERIFICATION' && !allowPending) return 'email_unverified';
  if (account.orgSuspended) return 'org_suspended';
  return null;
}

export function decideGoogleSignIn(input: GoogleSignInInput): GoogleSignInDecision {
  const { identityAccount, emailAccount, emailVerified, signupEnabled, now } = input;

  // 1. Identity already linked: the toggle doesn't matter, only the account's own state.
  //    A linked account can only be PENDING if verification was undone elsewhere; it is
  //    verified by Google (the link was made with a verified email), so it may sign in.
  if (identityAccount) {
    const block = accountBlock(identityAccount, now, true);
    return block
      ? { kind: 'refuse', code: block, userId: identityAccount.userId }
      : { kind: 'signin', userId: identityAccount.userId };
  }

  // 2. Existing account with this email: link only when Google vouches for the address.
  if (emailAccount) {
    if (!emailVerified) return { kind: 'refuse', code: 'email_unverified', userId: emailAccount.userId };
    const block = accountBlock(emailAccount, now, true);
    if (block) return { kind: 'refuse', code: block, userId: emailAccount.userId };
    return { kind: 'link', userId: emailAccount.userId, activate: emailAccount.status === 'PENDING_VERIFICATION' };
  }

  // 3. Brand-new user.
  if (!signupEnabled) return { kind: 'refuse', code: 'google_signup_disabled' };
  if (!emailVerified) return { kind: 'refuse', code: 'email_unverified' };
  return { kind: 'signup' };
}

/** Org name for a Google sign-up: "<given name>'s workspace", else the email's local part. */
export function defaultWorkspaceName(profile: { givenName?: string; name?: string; email: string }): string {
  const first = (profile.givenName || profile.name?.split(/\s+/)[0] || '').trim();
  const base = first ? `${first}'s workspace` : profile.email.split('@')[0] || 'My workspace';
  return base.slice(0, 255);
}

/** first/last name columns are required (varchar 100); Google may omit either. */
export function namesFromProfile(profile: { givenName?: string; familyName?: string; name?: string; email: string }): {
  firstName: string;
  lastName: string;
} {
  const parts = (profile.name ?? '').trim().split(/\s+/).filter(Boolean);
  const firstName = profile.givenName || parts[0] || profile.email.split('@')[0] || 'User';
  const lastName = profile.familyName || (profile.givenName ? '' : parts.slice(1).join(' '));
  return { firstName: firstName.slice(0, 100), lastName: lastName.slice(0, 100) };
}
