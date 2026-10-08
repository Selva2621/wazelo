/**
 * Main seed entry point.
 * Order: plans → super-admin → org-onboarding backfill
 *
 * Per-org master data (system templates, pipeline, tags, …) is seeded by the
 * org onboarding job — the backfill only enqueues it, so the backend must be
 * running for existing orgs to be processed.
 *
 * Run: npm run prisma:seed
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { execSync } = require('child_process');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const seeds = [
  'seed-plans.js',
  'seed-super-admin.js',
  'backfill-org-onboarding.js',
];

for (const seed of seeds) {
  const seedPath = path.join(__dirname, seed);
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`▶ Running ${seed}`);
  console.log('─'.repeat(50));
  try {
    execSync(`node "${seedPath}"`, { stdio: 'inherit', env: process.env });
  } catch (err) {
    console.error(`\n✗ ${seed} failed. Aborting.`);
    process.exit(1);
  }
}

console.log('\n✅ All seeds completed successfully.');
