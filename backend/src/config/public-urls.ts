/**
 * Public URLs of the app, read at call time (after ConfigModule has loaded .env).
 *
 * Development falls back to the local defaults (API on :8080, frontend on :3000) so a
 * fresh checkout just runs. Production never falls back: main.ts stops the app at boot
 * when these are missing, instead of silently sending localhost links to customers,
 * Meta webhooks and emails.
 */
const DEV_API_PORT = '8080';
const DEV_FRONTEND_URL = 'http://localhost:3000';
const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function trimSlash(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Public API base including the prefix, e.g. "https://api.wazelo.in/api/v1" */
export function publicApiUrl(): string {
  const configured = process.env.API_PUBLIC_URL || process.env.API_BASE_URL;
  if (configured?.trim()) return trimSlash(configured);
  const prefix = (process.env.API_PREFIX || 'api/v1').replace(/^\/+|\/+$/g, '');
  return `http://localhost:${process.env.PORT || DEV_API_PORT}/${prefix}`;
}

/** The web app's origin, e.g. "https://app.wazelo.in" (CORS, email and share links) */
export function publicFrontendUrl(): string {
  const configured = process.env.FRONTEND_URL;
  return configured?.trim() ? trimSlash(configured) : DEV_FRONTEND_URL;
}

/**
 * Production config problems. `errors` would break the live app (localhost links,
 * blocked CORS, unreachable webhooks); `warnings` are allowed but worth a look.
 */
export function productionEnvProblems(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isProduction()) return { errors, warnings };

  const urls: Array<[string, string | undefined]> = [
    ['FRONTEND_URL', process.env.FRONTEND_URL],
    ['API_BASE_URL', process.env.API_BASE_URL],
  ];
  for (const [name, value] of urls) {
    if (!value?.trim()) errors.push(`${name} is not set`);
    else if (LOCAL_HOST.test(value.trim())) errors.push(`${name} points to localhost (${value})`);
    else if (!/^https:\/\//i.test(value.trim())) warnings.push(`${name} is not https (${value}) — secure cookies and Meta webhooks need https`);
  }
  if (process.env.API_PUBLIC_URL && LOCAL_HOST.test(process.env.API_PUBLIC_URL.trim())) {
    errors.push(`API_PUBLIC_URL points to localhost (${process.env.API_PUBLIC_URL})`);
  }

  if (process.env.WHATSAPP_TEST_MODE?.trim().toLowerCase() === 'true') {
    warnings.push('WHATSAPP_TEST_MODE=true — every WhatsApp send is redirected to WHATSAPP_TEST_NUMBERS (fine for staging, wrong for live)');
  }
  if (process.env.SUPER_ADMIN_REQUIRE_2FA === 'false') {
    warnings.push('SUPER_ADMIN_REQUIRE_2FA=false — super admin login has no 2FA');
  }
  return { errors, warnings };
}
