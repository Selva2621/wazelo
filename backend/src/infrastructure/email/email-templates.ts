/**
 * Email template design system.
 *
 * Brand tokens are hardcoded here because email clients do not support
 * CSS custom properties. These match the frontend "Midnight Ember" theme
 * (primary = amber #d97706) defined in frontend/src/app/globals.css.
 *
 * All transactional email HTML should be built using the helpers in this file
 * so every email shares the same look and feel automatically.
 */

// ─── Brand Tokens ────────────────────────────────────────────────────────────

export const brand = {
  // Primary (amber — Midnight Ember theme)
  primary:      '#d97706',
  primaryDark:  '#b45309',
  primaryLight: '#fbbf24',
  onPrimary:    '#1a1d27',

  // Surfaces
  bg:   '#f7f7f8',
  card: '#ffffff',

  // Text
  textPrimary:   '#111827',
  textSecondary: '#374151',
  textMuted:     '#6b7280',
  textFaint:     '#9ca3af',

  // Border
  border: '#e5e7eb',

  // Status (same across all themes)
  error:   { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
} as const;

// ─── Layout ───────────────────────────────────────────────────────────────────

/**
 * Wraps any email body in the full branded shell:
 * amber gradient header → white card → footer with links.
 */
export function buildLayout(opts: {
  preheader?: string;
  body: string;
  frontendUrl: string;
  showFooterLinks?: boolean;
}): string {
  const { preheader = '', body, frontendUrl, showFooterLinks = true } = opts;
  const settingsUrl = `${frontendUrl}/settings/notifications`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Wazelo CRM</title>
</head>
<body style="margin:0;padding:0;background-color:${brand.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <!-- Hidden preheader preview text -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${brand.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td>
              <div style="background:linear-gradient(135deg,${brand.primary} 0%,${brand.primaryDark} 100%);padding:28px 40px;border-radius:12px 12px 0 0;text-align:center;">
                <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1;">
                  CRM-<span style="color:${brand.primaryLight};">WA</span>
                </div>
                <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:6px;letter-spacing:0.3px;">
                  WhatsApp CRM for growing teams
                </div>
              </div>
            </td>
          </tr>

          <!-- Card body -->
          <tr>
            <td style="background:${brand.card};padding:40px;border-radius:0 0 12px 12px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              ${showFooterLinks ? `
              <p style="margin:0 0 10px;font-size:12px;color:${brand.textMuted};">
                <a href="${settingsUrl}" style="color:${brand.textMuted};text-decoration:none;font-weight:500;">Notification Settings</a>
                &nbsp;&middot;&nbsp;
                <a href="${frontendUrl}" style="color:${brand.textMuted};text-decoration:none;font-weight:500;">Go to Dashboard</a>
              </p>` : ''}
              <p style="margin:0;font-size:11px;color:${brand.textFaint};">
                &copy; ${new Date().getFullYear()} Wazelo CRM. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─── CTA Button ───────────────────────────────────────────────────────────────

export function buildButton(
  text: string,
  url: string,
  variant: 'primary' | 'danger' = 'primary',
): string {
  const bg    = variant === 'danger' ? '#dc2626' : brand.primary;
  const color = variant === 'danger' ? '#ffffff'  : brand.onPrimary;
  const link  = variant === 'danger' ? '#dc2626'  : brand.primary;
  return `
    <div style="text-align:center;margin:32px 0;">
      <a href="${url}"
         style="display:inline-block;padding:14px 32px;background:${bg};color:${color};text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:0.2px;">
        ${text}
      </a>
      <p style="margin:12px 0 0;font-size:12px;color:${brand.textFaint};">
        Or copy this link:&nbsp;<a href="${url}" style="color:${link};word-break:break-all;">${url}</a>
      </p>
    </div>`;
}

// ─── Info / Alert Box ─────────────────────────────────────────────────────────

export function buildInfoBox(
  text: string,
  variant: 'warning' | 'info' | 'error' = 'info',
): string {
  const s = brand[variant];
  const icons: Record<string, string> = { warning: '⚠️', error: '🚨', info: 'ℹ️' };
  return `
    <div style="background:${s.bg};border:1px solid ${s.border};border-radius:8px;padding:14px 16px;margin-bottom:24px;font-size:14px;color:${s.text};font-weight:600;">
      ${icons[variant]}&nbsp; ${text}
    </div>`;
}

// ─── Footer Note ──────────────────────────────────────────────────────────────

export function buildNote(text: string): string {
  return `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${brand.textFaint};border-top:1px solid ${brand.border};padding-top:20px;">${text}</p>`;
}

// ─── Role Badge ───────────────────────────────────────────────────────────────

export function buildRoleBadge(role: string): string {
  return `<span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:13px;font-weight:600;padding:2px 10px;border-radius:20px;">${role}</span>`;
}
