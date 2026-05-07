"use client";

import { Check, X } from "lucide-react";
import { passwordChecks } from "@/lib/validations/auth";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const passed = passwordChecks.filter((c) => c.test(password)).length;
  const total = passwordChecks.length;
  const strength = password.length === 0 ? 0 : passed / total;

  const strengthLabel =
    strength === 0
      ? ""
      : strength < 0.4
        ? "Weak"
        : strength < 0.8
          ? "Fair"
          : strength < 1
            ? "Good"
            : "Strong";

  const strengthColor =
    strength < 0.4
      ? "bg-error"
      : strength < 0.8
        ? "bg-warning"
        : "bg-success";

  return (
    <div className="space-y-3">
      {password.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-on-surface-variant">
              Password strength
            </span>
            <span
              className={cn(
                "text-[12px] font-medium",
                strength < 0.4
                  ? "text-error"
                  : strength < 0.8
                    ? "text-warning"
                    : "text-success",
              )}
            >
              {strengthLabel}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-container">
            <div
              className={cn("h-full rounded-full transition-all duration-300", strengthColor)}
              style={{ width: `${strength * 100}%` }}
            />
          </div>
        </div>
      )}

      <ul className="space-y-1">
        {passwordChecks.map((check) => {
          const passes = check.test(password);
          return (
            <li
              key={check.label}
              className={cn(
                "flex items-center gap-2 text-[12px]",
                passes ? "text-success" : "text-on-surface-variant",
              )}
            >
              {passes ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5 opacity-40" />
              )}
              {check.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
