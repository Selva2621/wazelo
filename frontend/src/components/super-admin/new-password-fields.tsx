"use client";

import { PasswordInput } from "@/components/ui/password-input";

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

/** True when the new password meets the length rule and the confirmation matches. */
export function isNewPasswordValid(newPassword: string, confirm: string): boolean {
  return (
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    newPassword.length <= MAX_PASSWORD_LENGTH &&
    newPassword === confirm
  );
}

const labelClass = "block text-body-lg font-medium text-on-surface-variant mb-1";

/** "New password" + "Confirm new password" with client-side length and match checks. */
export function NewPasswordFields({
  idPrefix,
  newPassword,
  confirm,
  onNewPasswordChange,
  onConfirmChange,
  autoFocus,
}: {
  idPrefix: string;
  newPassword: string;
  confirm: string;
  onNewPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  // Only flag a mismatch once the confirmation stops being a prefix of the new password
  const mismatch = confirm.length > 0 && !newPassword.startsWith(confirm);
  const hintId = `${idPrefix}-new-hint`;

  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-new`} className={labelClass}>
          New password
        </label>
        <PasswordInput
          id={`${idPrefix}-new`}
          autoComplete="new-password"
          autoFocus={autoFocus}
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          aria-describedby={hintId}
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          required
        />
        <p id={hintId} className="text-body text-on-surface-variant mt-1">
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-confirm`} className={labelClass}>
          Confirm new password
        </label>
        <PasswordInput
          id={`${idPrefix}-confirm`}
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_LENGTH}
          error={mismatch ? "Passwords don't match." : undefined}
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          required
        />
      </div>
    </>
  );
}
