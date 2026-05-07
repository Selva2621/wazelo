# Lead Ads Feature — What It Does & How To Use It

## Context

The user wants to understand the Lead Ads page in CRM-WA — what it's for, how it works, and how to set it up. This is a documentation/explanation task, not a code change.

---

## What Is the Lead Ads Page?

The Lead Ads page (`/lead-ads`) is a **dashboard for capturing leads from Facebook, Instagram, and WhatsApp ads** and automatically importing them into the CRM as contacts.

When you run Facebook/Instagram/WhatsApp lead generation ads, potential customers fill out forms. Instead of manually downloading those leads from Meta, this feature **auto-syncs them in real-time** into CRM-WA via webhooks.

---

## What the Page Shows

- **4 KPI Cards**: Total Leads, Conversion Rate, Active Platforms, Campaigns
- **Platform Breakdown**: Lead count per platform (Facebook / Instagram / WhatsApp)
- **Top Campaigns**: Top 10 campaigns ranked by lead count
- **Entries Table**: All leads with source badge, contact info, campaign, status, and timestamp
- **Webhook URL** (admin only): The URL to configure in Meta's App Dashboard

---

## End-to-End Setup Flow

### Step 1: Set Environment Variables
```env
META_APP_SECRET=<from Meta App Dashboard → Settings → Basic>
META_WEBHOOK_VERIFY_TOKEN=<any random secret string you choose>
API_BASE_URL=https://yourdomain.com/api/v1
```

### Step 2: Connect a Channel
Go to **Settings → Channels** and connect a WhatsApp/Facebook/Instagram channel. This stores the Meta access token (encrypted) that the system needs to fetch lead details.

### Step 3: Configure Webhook in Meta
1. Open `/lead-ads` page in CRM-WA
2. Copy the **Webhook URL** shown at the bottom (admin only)
   - Format: `https://yourdomain.com/api/v1/webhooks/meta/leadgen`
3. Go to **Meta App Dashboard → Webhooks**
4. Subscribe to `leadgen` events
5. Paste the webhook URL and verify token
6. Meta sends a challenge request → CRM-WA responds → subscription confirmed

### Step 4: Subscribe Your Page
In Meta App Dashboard, subscribe the Facebook Page (linked to your ads) to the leadgen webhook.

### Step 5: Create & Launch Lead Ad
Create a lead generation campaign in Meta Ads Manager targeting Facebook, Instagram, or WhatsApp. Attach a lead form.

---

## What Happens When Someone Fills a Form

```
Customer fills ad form
        ↓
Meta sends webhook → POST /webhooks/meta/leadgen
        ↓
CRM verifies signature (HMAC-SHA256)
        ↓
Creates LeadAdEntry (status: PENDING)
        ↓
Queues background job (pg-boss)
        ↓
Worker fetches full lead data from Meta Graph API
        ↓
Parses fields (name, phone, email, custom fields)
        ↓
Auto-creates or enriches Contact (source: FACEBOOK_LEAD_AD, etc.)
        ↓
Auto-assigns owner (round-robin among team)
        ↓
Emits real-time WebSocket event → dashboard updates instantly
        ↓
Triggers automation rules (LEAD_AD_RECEIVED / CONTACT_CREATED)
```

---

## Key Features

- **Real-time**: Leads appear instantly via WebSocket push
- **Auto-contact creation**: Each lead becomes a CRM contact
- **Auto-assignment**: Round-robin assignment to team members
- **Retry with backoff**: Failed leads retry 3 times (10s → 20s → 40s)
- **Admin retry button**: Manually retry failed leads from the dashboard
- **Deduplication**: Same lead is never processed twice
- **Multi-platform**: Facebook, Instagram, WhatsApp ads all supported
- **Analytics**: KPIs, platform breakdown, campaign performance

---

## Permissions

| Role | Can View Leads | Can Retry Failed |
|------|---------------|-----------------|
| Admin | Yes | Yes |
| Manager | Yes | No |
| Employee | Yes | No |

---

## Implementation: Seed Script for Lead Ads Test Data

### Context
User wants to see the Lead Ads page working without a real Meta account. Create a seed script that populates realistic lead ad entries so the dashboard, KPI cards, entries table, platform breakdown, and campaign list all render with data.

### File to Create
- `backend/prisma/seed-lead-ads.js` — CommonJS (matches existing `seed-sla.js` and `seed-channels.js` patterns)

### Approach
1. Reuse existing org/user UUIDs from `seed-sla.js`:
   - `ORG = '5dcf2ffb-d687-41d0-9d06-5fd15ca0981b'`
   - `ADMIN = 'f76420e3-5f3c-49b2-becb-d94aea584c9f'`
   - `EMPLOYEE = 'eca11005-2824-4e3b-9bee-4426d6a0a2d2'`
2. Make it idempotent (skip on duplicate `[orgId, leadgenId]` constraint)
3. Create ~20 LeadAdEntry records across 3 platforms (facebook/instagram/whatsapp)
4. Create linked contacts (source: FACEBOOK_LEAD_AD, INSTAGRAM_LEAD_AD, WHATSAPP_LEAD_AD)
5. Mix of statuses: ~15 COMPLETED, ~3 FAILED, ~2 PENDING
6. Spread across 3-4 campaigns with realistic names
7. Spread `createdAt` over last 30 days for analytics chart data
8. Include realistic `leadData` JSON with parsed fields (fullName, phone, email, customFields)

### Data Distribution
- **Platforms**: 10 Facebook, 6 Instagram, 4 WhatsApp
- **Campaigns**: "Summer Sale 2026", "New Product Launch", "WhatsApp Promo", "Instagram Stories Q1"
- **Statuses**: 15 COMPLETED (with contactId + processedAt), 3 FAILED (with errorMessage), 2 PENDING
- **Dates**: Spread over last 30 days, more recent entries clustered
- **Contacts**: Each COMPLETED entry links to a created contact with lead source

### Run Command
```bash
cd backend && node prisma/seed-lead-ads.js
```

### Verification
After seeding:
1. Open `/lead-ads` page → KPI cards show ~20 total leads, conversion rate, 3 platforms, 4 campaigns
2. Platform breakdown shows Facebook > Instagram > WhatsApp
3. Entries table shows all 20 entries with mixed statuses
4. Top campaigns list shows all 4 campaigns ranked by count
5. Failed entries show retry button (admin only)
6. Contacts page shows new contacts with FACEBOOK_LEAD_AD / INSTAGRAM_LEAD_AD / WHATSAPP_LEAD_AD sources
