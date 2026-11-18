/**
 * Meta-approved templates for official (Cloud API) numbers.
 * A template's body has numbered slots ({{1}}, {{2}}…); each slot is filled from a
 * "param" the user wrote, which can itself hold contact variables ({{name}}…).
 */

/** What a queued message carries so the sender can send it as a template */
export interface CloudTemplateRef {
  name: string;
  language: string;
  /** Final values for {{1}}, {{2}}…, in order */
  params: string[];
  /** Image header link, for templates whose header is an image */
  headerImageUrl?: string;
}

interface TemplateLike {
  name: string;
  language: string;
  components: unknown;
}

function componentsOf(tpl: TemplateLike): Array<Record<string, any>> {
  return Array.isArray(tpl.components) ? (tpl.components as Array<Record<string, any>>) : [];
}

/** The BODY text, with its {{1}}… slots */
export function templateBodyText(tpl: TemplateLike): string {
  const body = componentsOf(tpl).find((c) => String(c?.type).toUpperCase() === 'BODY');
  return typeof body?.text === 'string' ? body.text : '';
}

/** How many numbered slots the body has (the highest {{n}}) */
export function countTemplateParams(tpl: TemplateLike): number {
  let max = 0;
  for (const m of templateBodyText(tpl).matchAll(/\{\{\s*(\d+)\s*\}\}/g)) max = Math.max(max, Number(m[1]));
  return max;
}

/** True when the header is an image (Meta needs a link for it at send time) */
export function templateNeedsHeaderImage(tpl: TemplateLike): boolean {
  const header = componentsOf(tpl).find((c) => String(c?.type).toUpperCase() === 'HEADER');
  return String(header?.format ?? '').toUpperCase() === 'IMAGE';
}

/**
 * Fill a template for one recipient. `fill` resolves contact/event variables inside
 * each param. Empty values become "-" because Meta rejects empty parameters.
 */
export function renderCloudTemplate(
  tpl: TemplateLike,
  rawParams: string[] | undefined,
  fill: (text: string) => string,
  headerImageUrl?: string,
): { body: string; cloudTemplate: CloudTemplateRef } {
  const count = countTemplateParams(tpl);
  const params = Array.from({ length: count }, (_, i) => {
    const value = fill(rawParams?.[i] ?? '').trim();
    return value || '-';
  });
  const body = templateBodyText(tpl).replace(/\{\{\s*(\d+)\s*\}\}/g, (whole, n: string) => params[Number(n) - 1] ?? whole);
  return {
    body: body || `[Template: ${tpl.name}]`,
    cloudTemplate: {
      name: tpl.name,
      language: tpl.language,
      params,
      ...(headerImageUrl && { headerImageUrl }),
    },
  };
}

/** Read a CloudTemplateRef back out of message metadata (null when it isn't one) */
export function cloudTemplateFromMetadata(metadata: unknown): CloudTemplateRef | null {
  const ref = (metadata as Record<string, any> | null)?.cloudTemplate;
  if (!ref || typeof ref.name !== 'string' || typeof ref.language !== 'string') return null;
  return {
    name: ref.name,
    language: ref.language,
    params: Array.isArray(ref.params) ? ref.params.map(String) : [],
    ...(typeof ref.headerImageUrl === 'string' && { headerImageUrl: ref.headerImageUrl }),
  };
}
