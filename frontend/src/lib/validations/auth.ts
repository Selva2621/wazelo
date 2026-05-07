import { z } from "zod";

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be 100 characters or less"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be 100 characters or less"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(320, "Email must be 320 characters or less"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be 128 characters or less")
    .regex(
      PASSWORD_REGEX,
      "Password must include uppercase, lowercase, number, and symbol",
    ),
  organizationName: z
    .string()
    .min(1, "Organization name is required")
    .max(255, "Organization name must be 255 characters or less"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be 128 characters or less")
      .regex(
        PASSWORD_REGEX,
        "Password must include uppercase, lowercase, number, and symbol",
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ResendVerificationFormData = z.infer<
  typeof resendVerificationSchema
>;

export const passwordChecks = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  {
    label: "One special character",
    test: (v: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v),
  },
] as const;
