/**
 * Seed script for Lead Ads test data.
 * Creates ~20 lead ad entries across 3 platforms with linked contacts.
 * IDEMPOTENT: safe to re-run (skips existing records by leadgenId).
 *
 * Usage: cd backend && node prisma/seed-lead-ads.js
 */
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const p = new PrismaClient();

const ORG = '5dcf2ffb-d687-41d0-9d06-5fd15ca0981b';
const ADMIN = 'f76420e3-5f3c-49b2-becb-d94aea584c9f';
const EMPLOYEE = 'eca11005-2824-4e3b-9bee-4426d6a0a2d2';

// ─── Test data definitions ───

const CAMPAIGNS = [
  { id: 'camp_001', name: 'Summer Sale 2026' },
  { id: 'camp_002', name: 'New Product Launch' },
  { id: 'camp_003', name: 'WhatsApp Promo' },
  { id: 'camp_004', name: 'Instagram Stories Q1' },
];

const LEADS = [
  // ── Facebook leads (10) ──
  { platform: 'facebook', campaign: 0, ad: 'Carousel Ad - Summer Deals',   name: 'Priya Sharma',    phone: '+919876543201', email: 'priya.s@email.com',    status: 'COMPLETED', daysAgo: 1  },
  { platform: 'facebook', campaign: 0, ad: 'Video Ad - Flash Sale',        name: 'Rahul Verma',     phone: '+919876543202', email: 'rahul.v@email.com',    status: 'COMPLETED', daysAgo: 2  },
  { platform: 'facebook', campaign: 0, ad: 'Carousel Ad - Summer Deals',   name: 'Anjali Patel',    phone: '+919876543203', email: 'anjali.p@email.com',   status: 'COMPLETED', daysAgo: 3  },
  { platform: 'facebook', campaign: 1, ad: 'Static Image - New Launch',    name: 'Vikram Singh',    phone: '+919876543204', email: 'vikram.s@email.com',   status: 'COMPLETED', daysAgo: 5  },
  { platform: 'facebook', campaign: 1, ad: 'Lead Form - Product Demo',     name: 'Sneha Reddy',     phone: '+919876543205', email: 'sneha.r@email.com',    status: 'COMPLETED', daysAgo: 7  },
  { platform: 'facebook', campaign: 1, ad: 'Static Image - New Launch',    name: 'Amit Kumar',      phone: '+919876543206', email: 'amit.k@email.com',     status: 'COMPLETED', daysAgo: 8  },
  { platform: 'facebook', campaign: 0, ad: 'Video Ad - Flash Sale',        name: 'Deepika Nair',    phone: '+919876543207', email: 'deepika.n@email.com',  status: 'COMPLETED', daysAgo: 10 },
  { platform: 'facebook', campaign: 1, ad: 'Lead Form - Product Demo',     name: 'Arjun Mehta',     phone: '+919876543208', email: 'arjun.m@email.com',    status: 'FAILED',    daysAgo: 12 },
  { platform: 'facebook', campaign: 0, ad: 'Carousel Ad - Summer Deals',   name: 'Kavita Joshi',    phone: '+919876543209', email: 'kavita.j@email.com',   status: 'FAILED',    daysAgo: 15 },
  { platform: 'facebook', campaign: 0, ad: 'Video Ad - Flash Sale',        name: 'Ravi Gupta',      phone: '+919876543210', email: null,                   status: 'PENDING',   daysAgo: 0  },

  // ── Instagram leads (6) ──
  { platform: 'instagram', campaign: 3, ad: 'Story Ad - Swipe Up',         name: 'Meera Kapoor',    phone: '+919876543211', email: 'meera.k@email.com',    status: 'COMPLETED', daysAgo: 2  },
  { platform: 'instagram', campaign: 3, ad: 'Reel Ad - Product Showcase',  name: 'Suresh Iyer',     phone: '+919876543212', email: 'suresh.i@email.com',   status: 'COMPLETED', daysAgo: 4  },
  { platform: 'instagram', campaign: 3, ad: 'Story Ad - Swipe Up',         name: 'Lakshmi Bhat',    phone: '+919876543213', email: 'lakshmi.b@email.com',  status: 'COMPLETED', daysAgo: 6  },
  { platform: 'instagram', campaign: 3, ad: 'Reel Ad - Product Showcase',  name: 'Nikhil Rao',      phone: '+919876543214', email: null,                   status: 'COMPLETED', daysAgo: 9  },
  { platform: 'instagram', campaign: 3, ad: 'Story Ad - Swipe Up',         name: 'Divya Shetty',    phone: '+919876543215', email: 'divya.s@email.com',    status: 'FAILED',    daysAgo: 11 },
  { platform: 'instagram', campaign: 3, ad: 'Reel Ad - Product Showcase',  name: 'Rohan Desai',     phone: '+919876543216', email: 'rohan.d@email.com',    status: 'PENDING',   daysAgo: 0  },

  // ── WhatsApp leads (4) ──
  { platform: 'whatsapp', campaign: 2, ad: 'Click-to-WhatsApp Ad',         name: 'Pooja Menon',     phone: '+919876543217', email: 'pooja.m@email.com',    status: 'COMPLETED', daysAgo: 1  },
  { platform: 'whatsapp', campaign: 2, ad: 'Click-to-WhatsApp Ad',         name: 'Karthik Pillai',  phone: '+919876543218', email: null,                   status: 'COMPLETED', daysAgo: 3  },
  { platform: 'whatsapp', campaign: 2, ad: 'WhatsApp CTA - Enquiry',       name: 'Ananya Das',      phone: '+919876543219', email: 'ananya.d@email.com',   status: 'COMPLETED', daysAgo: 6  },
  { platform: 'whatsapp', campaign: 2, ad: 'Click-to-WhatsApp Ad',         name: 'Sanjay Tiwari',   phone: '+919876543220', email: 'sanjay.t@email.com',   status: 'COMPLETED', daysAgo: 14 },
];

const PLATFORM_PAGE_IDS = {
  facebook: 'fb-page-1234567890',
  instagram: 'ig-page-9876543210',
  whatsapp: 'wa-page-5555555555',
};

const PLATFORM_SOURCES = {
  facebook: 'FACEBOOK_LEAD_AD',
  instagram: 'INSTAGRAM_LEAD_AD',
  whatsapp: 'WHATSAPP_LEAD_AD',
};

const FAIL_ERRORS = [
  'Meta Graph API returned 400: Invalid leadgen_id',
  'Lead data missing required phone number field',
  'Access token expired for page fb-page-1234567890',
];

function daysAgoDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));
  return d;
}

async function main() {
  console.log('Seeding Lead Ads test data...\n');

  let created = 0;
  let skipped = 0;
  let contactsCreated = 0;
  let failIdx = 0;

  for (let i = 0; i < LEADS.length; i++) {
    const lead = LEADS[i];
    const campaign = CAMPAIGNS[lead.campaign];
    const leadgenId = `seed-leadgen-${String(i + 1).padStart(3, '0')}`;
    const createdAt = daysAgoDate(lead.daysAgo);

    // Check if already exists (idempotent)
    const existing = await p.leadAdEntry.findFirst({
      where: { orgId: ORG, leadgenId },
    });
    if (existing) {
      skipped++;
      continue;
    }

    // Build lead data JSON (simulates parsed Meta Graph API response)
    const leadData = {
      parsed: {
        fullName: lead.name,
        firstName: lead.name.split(' ')[0],
        lastName: lead.name.split(' ').slice(1).join(' '),
        phone: lead.phone,
        email: lead.email,
        customFields: {
          interest: ['Product Demo', 'Pricing Info', 'Free Trial', 'Newsletter'][i % 4],
          budget: ['Under 10K', '10K-50K', '50K-100K', 'Above 100K'][i % 4],
        },
      },
      raw: {
        field_data: [
          { name: 'full_name', values: [lead.name] },
          { name: 'phone_number', values: [lead.phone] },
          ...(lead.email ? [{ name: 'email', values: [lead.email] }] : []),
        ],
      },
    };

    // For COMPLETED leads, create a linked contact first
    let contactId = null;
    if (lead.status === 'COMPLETED') {
      try {
        const contact = await p.contact.create({
          data: {
            orgId: ORG,
            name: lead.name,
            phoneNumber: lead.phone,
            email: lead.email,
            source: PLATFORM_SOURCES[lead.platform],
            leadStatus: 'NEW',
            ownerId: i % 2 === 0 ? ADMIN : EMPLOYEE,
            metadata: {
              leadAd: {
                leadgenId,
                adName: lead.ad,
                campaignName: campaign.name,
                platform: lead.platform,
                receivedAt: createdAt.toISOString(),
              },
            },
          },
        });
        contactId = contact.id;
        contactsCreated++;
      } catch (err) {
        // Contact might already exist (re-run) — try to find it
        const found = await p.contact.findFirst({
          where: { orgId: ORG, phoneNumber: lead.phone, deletedAt: null },
        });
        if (found) contactId = found.id;
      }
    }

    // Create the lead ad entry
    const entryData = {
      orgId: ORG,
      leadgenId,
      pageId: PLATFORM_PAGE_IDS[lead.platform],
      formId: `form-${campaign.id}`,
      adId: `ad-${String(i + 1).padStart(3, '0')}`,
      adName: lead.ad,
      campaignId: campaign.id,
      campaignName: campaign.name,
      platform: lead.platform,
      leadData,
      status: lead.status,
      contactId,
      createdAt,
      updatedAt: createdAt,
    };

    if (lead.status === 'COMPLETED') {
      entryData.processedAt = new Date(createdAt.getTime() + 5000 + Math.random() * 10000);
    }

    if (lead.status === 'FAILED') {
      entryData.errorMessage = FAIL_ERRORS[failIdx % FAIL_ERRORS.length];
      entryData.retryCount = 3;
      failIdx++;
    }

    await p.leadAdEntry.create({ data: entryData });
    created++;

    const statusIcon = lead.status === 'COMPLETED' ? '+' : lead.status === 'FAILED' ? 'x' : '~';
    console.log(`  [${statusIcon}] ${lead.name.padEnd(18)} ${lead.platform.padEnd(10)} ${lead.status.padEnd(10)} ${campaign.name}`);
  }

  console.log(`\nLead Ads seed complete!`);
  console.log(`  - ${created} entries created, ${skipped} skipped (already exist)`);
  console.log(`  - ${contactsCreated} contacts created`);
  console.log(`  - Platforms: 10 Facebook, 6 Instagram, 4 WhatsApp`);
  console.log(`  - Statuses: 15 COMPLETED, 3 FAILED, 2 PENDING`);
  console.log(`  - Campaigns: ${CAMPAIGNS.map((c) => c.name).join(', ')}`);
  console.log(`\nOpen /lead-ads page to see the dashboard.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
