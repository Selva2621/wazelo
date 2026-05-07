// Seed: Shopify System Message Templates
// Run: node prisma/seed-shopify-templates.js
//   or: node prisma/seed-shopify-templates.js <orgId>   (specific org only)
//
// Seeds into ALL orgs by default (system templates every org should have).
// Differentiated from normal WhatsApp templates by:
//   - category: 'SHOPIFY'           (normal: MARKETING / UTILITY / AUTHENTICATION)
//   - exampleValues.isSystemTemplate: true
//   - status: 'PENDING'             (not yet submitted to / approved by Meta)
//   - whatsappTemplateId: null      (no Meta template ID yet)

'use strict';

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const TEMPLATES = [
  {
    name: 'shopify_order_confirmation',
    body: "Hi {{contact.name}}, your order {{shopify.order_name}} for \u20b9{{shopify.total_price}} has been confirmed! We'll notify you when it ships.",
    shopifyType: 'order_confirmation',
  },
  {
    name: 'shopify_order_fulfilled',
    body: 'Hi {{contact.name}}, great news! Your order {{shopify.order_name}} has been shipped \uD83D\uDE9A. Track your delivery and let us know if you need help.',
    shopifyType: 'order_fulfilled',
  },
  {
    name: 'shopify_cart_abandoned',
    body: 'Hi {{contact.name}}, you left items in your cart worth \u20b9{{shopify.cart_total}}. Complete your order here: {{shopify.recovery_url}}',
    shopifyType: 'cart_abandoned',
  },
  {
    name: 'shopify_post_purchase',
    body: 'Hi {{contact.name}}, thank you for your order {{shopify.order_name}}! We hope you love it. Reply anytime if you need support.',
    shopifyType: 'post_purchase',
  },
  {
    name: 'shopify_order_cancelled',
    body: 'Hi {{contact.name}}, your order {{shopify.order_name}} has been cancelled. Your refund of \u20b9{{shopify.total_price}} will be processed within 5-7 business days.',
    shopifyType: 'order_cancelled',
  },
];

async function seedForOrg(orgId) {
  let count = 0;
  for (const t of TEMPLATES) {
    const existing = await p.messageTemplate.findFirst({
      where: { orgId, name: t.name, language: 'en', deletedAt: null },
    });

    if (existing) {
      await p.messageTemplate.update({
        where: { id: existing.id },
        data: {
          category: 'SHOPIFY',
          status: 'PENDING',
          components: [{ type: 'BODY', text: t.body }],
          exampleValues: { isSystemTemplate: true, shopifyType: t.shopifyType },
        },
      });
    } else {
      await p.messageTemplate.create({
        data: {
          orgId,
          channelId: null,
          name: t.name,
          language: 'en',
          category: 'SHOPIFY',
          status: 'PENDING',
          whatsappTemplateId: null,
          components: [{ type: 'BODY', text: t.body }],
          exampleValues: { isSystemTemplate: true, shopifyType: t.shopifyType },
        },
      });
    }
    count++;
  }
  return count;
}

async function main() {
  // Optional: pass a specific orgId as CLI arg
  const targetOrgId = process.argv[2] || null;

  const orgs = targetOrgId
    ? [{ id: targetOrgId, name: targetOrgId }]
    : await p.organization.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });

  console.log(`Seeding Shopify system templates for ${orgs.length} org(s)...\n`);

  let total = 0;
  for (const org of orgs) {
    const count = await seedForOrg(org.id);
    console.log(`  ✓ ${org.name} (${org.id}) — ${count} templates`);
    total += count;
  }

  console.log(`\nDone! Seeded ${total} template records across ${orgs.length} org(s).`);
  console.log('\nVariable reference:');
  console.log('  Contact:  {{contact.name}}  {{contact.phone}}  {{contact.email}}');
  console.log('  Shopify:  {{shopify.order_name}}  {{shopify.total_price}}  {{shopify.currency}}');
  console.log('            {{shopify.cart_total}}  {{shopify.recovery_url}}  {{shopify.items}}');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
