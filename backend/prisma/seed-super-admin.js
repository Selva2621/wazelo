const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@wazelo.in';
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password) {
    console.error('ERROR: SUPER_ADMIN_PASSWORD environment variable is required.');
    console.error('Set it before running this script: export SUPER_ADMIN_PASSWORD=<strong-password>');
    process.exit(1);
  }
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  const passwordHash = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  console.log(`✓ Super admin seeded: ${superAdmin.email} [${superAdmin.id}]`);
  console.log(`  Login at: /super-admin/login`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
