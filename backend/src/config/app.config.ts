import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  superAdminSecret: process.env.JWT_SUPER_ADMIN_SECRET,
  accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
}));

export const emailConfig = registerAs('email', () => ({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'noreply@wazelo.in',
}));

export const authConfig = registerAs('auth', () => ({
  maxFailedLoginAttempts: parseInt(
    process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5',
    10,
  ),
  accountLockDurationMinutes: parseInt(
    process.env.ACCOUNT_LOCK_DURATION_MINUTES || '30',
    10,
  ),
  verificationTokenExpiryHours: parseInt(
    process.env.VERIFICATION_TOKEN_EXPIRY_HOURS || '24',
    10,
  ),
  verificationResendCooldownSeconds: parseInt(
    process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS || '60',
    10,
  ),
  verificationMaxResendsPerHour: parseInt(
    process.env.VERIFICATION_MAX_RESENDS_PER_HOUR || '5',
    10,
  ),
  passwordResetTokenExpiryMinutes: parseInt(
    process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || '15',
    10,
  ),
}));

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
  limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
}));

export const whatsappConfig = registerAs('whatsapp', () => ({
  encryptionKey: process.env.WHATSAPP_ENCRYPTION_KEY || '',
}));
