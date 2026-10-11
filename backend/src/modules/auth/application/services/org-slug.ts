import { Prisma } from '@prisma/client';

/** URL slug from an org name (lowercase, dashes, max 100 chars); "org" if nothing is left. */
export function slugifyOrgName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  return slug || 'org';
}

/** First free slug for `name` among live orgs ("acme", "acme-1", "acme-2", …), inside the sign-up transaction. */
export async function generateOrgSlugInTx(tx: Prisma.TransactionClient, name: string): Promise<string> {
  const baseSlug = slugifyOrgName(name);
  let slug = baseSlug;
  let attempt = 0;

  while (true) {
    const count = await tx.organization.count({
      where: { slug, deletedAt: null },
    });
    if (count === 0) break;
    attempt++;
    const suffix = `-${attempt}`;
    slug = baseSlug.slice(0, 100 - suffix.length) + suffix;
  }

  return slug;
}
