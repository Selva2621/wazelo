/**
 * Soft-deletes contacts the old lead-scraper import created with made-up
 * "+00…" phone numbers (job-board leads that had no real phone). They can't
 * be messaged, and campaigns already skip them — this just clears the clutter.
 *
 * Dry run by default — prints what it would change:
 *   node prisma/cleanup-placeholder-contacts.js
 * Apply:
 *   node prisma/cleanup-placeholder-contacts.js --apply
 *
 * Reversible: contacts are soft-deleted (deleted_at set), not removed. Their
 * scrape results are marked not-imported again so they show up in the scraper.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');

  const contacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      source: 'WEB_SCRAPE',
      phoneNumber: { startsWith: '+00' },
    },
    select: { id: true, orgId: true },
  });

  const byOrg = contacts.reduce((acc, c) => ({ ...acc, [c.orgId]: (acc[c.orgId] ?? 0) + 1 }), {});
  console.log(`Found ${contacts.length} placeholder contact(s) across ${Object.keys(byOrg).length} org(s).`);
  for (const [orgId, count] of Object.entries(byOrg)) console.log(`  org ${orgId}: ${count}`);

  if (!contacts.length) return;
  if (!apply) {
    console.log('\nDry run — nothing changed. Re-run with --apply to soft-delete them.');
    return;
  }

  const ids = contacts.map((c) => c.id);
  const [deleted, unlinked] = await prisma.$transaction([
    prisma.contact.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } }),
    prisma.scrapeResult.updateMany({ where: { contactId: { in: ids } }, data: { contactId: null, imported: false } }),
  ]);

  console.log(`✓ Soft-deleted ${deleted.count} contact(s); reset ${unlinked.count} scrape result(s) to not-imported.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
