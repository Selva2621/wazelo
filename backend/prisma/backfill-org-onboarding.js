// Backfill: enqueue the org onboarding job (mode 'backfill') for existing orgs
// that have not been onboarded yet (organizations.onboarded_at IS NULL).
// Run: node prisma/backfill-org-onboarding.js
//   or: node prisma/backfill-org-onboarding.js <orgId>   (specific org only)
//
// The running backend's OrgOnboardingWorker (src/jobs/org/org-onboarding.worker.ts)
// processes the jobs, seeding only what each org has NEVER had: RBAC permissions,
// AI memory, pipeline, tags, canned responses, lead scoring rules, SLA policies
// and system message templates (see src/shared/constants/org-defaults.ts +
// system-templates.ts). Backfill never assigns a free trial, never updates or
// deletes existing rows, and never recreates anything an admin deleted.
//
// Safe to re-run — onboarded orgs are skipped.

'use strict';

try {
  require('dotenv').config();
} catch {
  // dotenv is optional — DATABASE_URL may already be in the environment
}

const PgBoss = require('pg-boss');
const { PrismaClient } = require('@prisma/client');

// Must match QUEUE_NAMES.ORG_ONBOARDING in src/common/constants/index.ts
const ORG_ONBOARDING_QUEUE = 'org-onboarding';

const p = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const targetOrgId = process.argv[2] || null;
  const orgs = targetOrgId
    ? [{ id: targetOrgId, name: targetOrgId }]
    : await p.organization.findMany({
        where: { deletedAt: null, onboardedAt: null },
        select: { id: true, name: true },
      });

  const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
  await boss.start();

  console.log(`Enqueuing org onboarding for ${orgs.length} org(s)...\n`);

  for (const org of orgs) {
    await boss.send(
      ORG_ONBOARDING_QUEUE,
      { orgId: org.id, mode: 'backfill' },
      { singletonKey: `org-onboarding:${org.id}`, retryLimit: 3, retryDelay: 5, retryBackoff: true },
    );
    console.log(`  ✓ ${org.name} (${org.id})`);
  }

  await boss.stop({ graceful: true, timeout: 10000 });
  console.log('\nDone! Jobs are processed by the running backend.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
