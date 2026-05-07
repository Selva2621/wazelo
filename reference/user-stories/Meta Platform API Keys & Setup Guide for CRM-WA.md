# Meta Platform API Keys & Setup Guide for CRM-WA

## Context

Each organization in CRM-WA manages its **own** Meta credentials. There is no single shared API key — every org creates their own Meta App (or uses their own Business Account) and enters their credentials through **Settings → Channels** in CRM-WA. Credentials are stored AES-256-GCM encrypted per channel, per org.

### How It Works in CRM-WA

```
Organization A                    Organization B
├── WhatsApp Channel              ├── WhatsApp Channel
│   ├── Phone Number ID: 111      │   ├── Phone Number ID: 999
│   ├── Access Token: ***         │   ├── Access Token: ***
│   └── Business Account: AAA     │   └── Business Account: ZZZ
├── Instagram Channel             └── Facebook Messenger Channel
│   ├── IG User ID: 222              ├── Page ID: 888
│   └── Access Token: ***            └── Access Token: ***
└── Facebook Messenger Channel
    ├── Page ID: 333
    └── Access Token: ***
```

Each org's credentials are stored **encrypted** in the `Channel.encryptedConfig` database column, scoped by `org_id`. Max 20 channels per org.

---

## Prerequisites (Each Org Does This)

1. Create a **Meta Business Account** at business.facebook.com
2. Create a **Facebook Developer Account** at developers.facebook.com
3. Create a **Meta App**: My Apps → Create App → select "Business" type
4. **Start Business Verification early** (Settings → Business Verification) — takes 1-5 days, required for production

---

## 1. WhatsApp Business API (Cloud API)

### What You Need (Enter in CRM-WA → Settings → Channels → Add WhatsApp)

| Field in CRM-WA | Where to Get It |
|-----------------|-----------------|
| **Phone Number ID** | App Dashboard → WhatsApp → API Setup → Phone Number ID |
| **Access Token** | Business Settings → System Users → Generate Token |
| **Business Account ID** | App Dashboard → WhatsApp → API Setup → WhatsApp Business Account ID |

### Step-by-Step

1. App Dashboard → Add Product → **WhatsApp** → Set Up
2. Meta provides a **test phone number** + **temporary token** (24h only)
3. For production:
   - Go to business.facebook.com → Business Settings → System Users
   - Create a System User (Admin role)
   - Click "Add Assets" → assign your Meta App + WhatsApp Business Account
   - Click "Generate New Token" → select permissions:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
     - `business_management`
   - **Copy the token** — shown only once
4. Add a production phone number: WhatsApp → API Setup → Add Phone Number → verify via SMS
5. In CRM-WA: **Settings → Channels → Add Channel → WhatsApp** → paste the 3 fields above

### Webhook Setup
CRM-WA automatically provides the webhook URL per channel:
```
https://yourdomain.com/api/v1/webhooks/channels/{channelId}
```
Configure this in App Dashboard → WhatsApp → Configuration → Callback URL.

### Gotchas
- Phone already on WhatsApp consumer app? You must delete that account first
- 24-hour window: free-form messages only within 24h of customer's last message, templates required after
- New numbers start at Tier 1 (1,000 unique contacts/day)
- Webhook must respond HTTP 200 within 20 seconds

---

## 2. Facebook Lead Ads

### What You Need

Lead Ads uses the **channel's access token** (from any connected Facebook/WhatsApp channel) plus platform-level env vars set by the **SaaS admin** (not per org):

| Where | What |
|-------|------|
| **SaaS `.env`** | `META_APP_SECRET` — from App Dashboard → Settings → Basic |
| **SaaS `.env`** | `META_WEBHOOK_VERIFY_TOKEN` — any random string you define |
| **Per-Org Channel** | Access Token (from any connected channel with the right Page) |

### Step-by-Step

1. **SaaS Admin** (one-time): Configure the lead ads webhook in Meta App Dashboard:
   - Add Product → **Webhooks** → Page → subscribe to `leadgen` field
   - Callback URL: `https://yourdomain.com/api/v1/webhooks/meta/leadgen`
   - Verify Token: same value as `META_WEBHOOK_VERIFY_TOKEN` in `.env`

2. **Each Org**: Connect a channel (WhatsApp/Facebook/Instagram) in CRM-WA → Settings → Channels
   - The channel's `pageId` (stored as `externalId`) links the org to their Facebook Page
   - When Meta sends a lead webhook, CRM-WA looks up the `page_id` → finds the org's channel → uses the org's token to fetch lead data

3. **Each Org**: Subscribe their Page to leadgen events:
   ```
   POST /{page-id}/subscribed_apps?subscribed_fields=leadgen&access_token={page-token}
   ```
   - The access token must have: `pages_manage_ads`, `leads_retrieval`, `pages_show_list`

4. **Test**: Use Meta's Lead Ads Testing Tool at developers.facebook.com/tools/lead-ads-testing

### Gotchas
- `leads_retrieval` permission requires **App Review**
- Each Page must be explicitly subscribed via API — app-level config alone is not enough
- The org must have at least one channel connected with a matching `page_id`

---

## 3. Instagram Messaging API

### What You Need (Enter in CRM-WA → Settings → Channels → Add Instagram)

| Field in CRM-WA | Where to Get It |
|-----------------|-----------------|
| **Facebook Page ID** | Facebook Page → About → Page ID |
| **Access Token** | System User token with Instagram permissions |
| **Instagram User ID** | Graph API: `GET /{page-id}?fields=instagram_business_account` |

### Step-by-Step

1. **Link Instagram to Facebook Page**: Instagram app → Settings → Linked Accounts → Facebook
2. Instagram account must be **Business** or **Creator** type (not Personal)
3. App Dashboard → Add Product → **Instagram**
4. System User → assign the Facebook Page → generate token with:
   - `instagram_manage_messages`
   - `instagram_basic`
   - `pages_manage_metadata`
5. Get Instagram User ID via Graph API Explorer:
   ```
   GET /{page-id}?fields=instagram_business_account&access_token={token}
   ```
   Response: `{ "instagram_business_account": { "id": "17841400123456" } }`
6. In CRM-WA: **Settings → Channels → Add Channel → Instagram** → paste the 3 fields

### Gotchas
- Instagram **must** be linked to a Facebook Page
- 24-hour messaging window (7 days with `human_agent` tag)
- No message templates — can't re-engage after window closes
- `instagram_manage_messages` requires **App Review**
- Personal accounts don't work

---

## 4. Facebook Messenger

### What You Need (Enter in CRM-WA → Settings → Channels → Add Facebook Messenger)

| Field in CRM-WA | Where to Get It |
|-----------------|-----------------|
| **Page ID** | Facebook Page → About → Page ID |
| **Page Access Token** | Messenger Settings → Generate Token, or System User |

### Step-by-Step

1. App Dashboard → Add Product → **Messenger** → Set Up
2. Messenger Settings → Add Pages → select your page → grant permissions
3. Generate a Page Access Token (or use System User for production)
   - Required permissions: `pages_messaging`, `pages_manage_metadata`, `pages_show_list`
4. In CRM-WA: **Settings → Channels → Add Channel → Facebook Messenger** → paste Page ID + Token

### Gotchas
- 24-hour window for free-form messages
- Message Tags for exceptions: `POST_PURCHASE_UPDATE`, `ACCOUNT_UPDATE`, `HUMAN_AGENT`
- PSID is page-scoped — same user has different IDs on different Pages
- `pages_messaging` requires **App Review**

---

## 5. App Review Process

Required for production. Without it, only app role holders (admin/dev/tester) can use the features.

### Permissions That Require Review

| Permission | Platform | Why |
|-----------|----------|-----|
| `leads_retrieval` | Lead Ads | Read lead form data |
| `pages_messaging` | Messenger | Send/receive messages |
| `instagram_manage_messages` | Instagram | DM messaging |
| `pages_manage_ads` | Lead Ads | Manage ad-linked Pages |

### How to Pass
1. App Dashboard → App Review → Permissions → Request Advanced Access
2. For each permission provide:
   - Description of use case
   - Testing instructions for the reviewer
   - **Screencast video** demonstrating the feature
3. Submit → review takes 1-5 business days
4. **Business Verification** is a prerequisite — start it early

---

## 6. Architecture: What Goes Where

### SaaS-Level Environment Variables (set once by platform admin)
```env
# Shared across all orgs — needed for webhook signature verification
META_APP_SECRET=your_app_secret
META_WEBHOOK_VERIFY_TOKEN=your_verify_token
API_BASE_URL=https://yourdomain.com/api/v1
CHANNEL_ENCRYPTION_KEY=your_32_byte_hex_key

# Payment providers (optional)
STRIPE_SECRET_KEY=sk_...
RAZORPAY_KEY_ID=rzp_...
```

### Per-Org Credentials (entered by each org admin in Settings → Channels)
| Channel Type | Fields Entered by Org |
|-------------|----------------------|
| **WhatsApp** | Phone Number ID, Access Token, Business Account ID |
| **Instagram** | Facebook Page ID, Access Token, Instagram User ID |
| **Facebook Messenger** | Page ID, Page Access Token |
| **Email** | SMTP Host/Port/User/Pass, From Address |

These are **encrypted with AES-256-GCM** and stored in the database per channel per org. Never in `.env`, never in plaintext.

---

---

## Code Changes: Per-Org Lead Ads Configuration

### Problem
`META_APP_SECRET` and `META_WEBHOOK_VERIFY_TOKEN` are global env vars — one value for the entire SaaS. But each org has their own Meta App with their own secrets.

### Solution
Store per-org Meta credentials in the database (encrypted). Add per-org webhook URLs.

### Files to Create (3)
- `backend/src/modules/lead-ads/infrastructure/repositories/lead-ads-config.repository.ts` — CRUD for per-org config, uses existing `EncryptionService`
- `backend/src/modules/lead-ads/application/dto/save-lead-ads-config.dto.ts` — Validation DTO

### Files to Modify (8)

**Backend:**
- `backend/prisma/schema.prisma` — Add `LeadAdsConfig` model (orgId unique, encryptedAppSecret, webhookVerifyToken)
- `backend/src/modules/lead-ads/interfaces/controllers/lead-ads-webhook.controller.ts` — Add per-org routes: `GET/POST /webhooks/meta/leadgen/:orgId`
- `backend/src/modules/lead-ads/interfaces/controllers/lead-ads.controller.ts` — Add `PUT /lead-ads/config`, update `GET /lead-ads/config` response
- `backend/src/modules/lead-ads/lead-ads.module.ts` — Register `LeadAdsConfigRepository`

**Frontend:**
- `frontend/src/lib/types/lead-ads.ts` — Add `hasAppSecret`, `hasVerifyToken`, `isFullyConfigured` to `LeadAdConfigStatus`; add `SaveLeadAdsConfigPayload`
- `frontend/src/lib/api/lead-ads.ts` — Add `saveConfig()` API call
- `frontend/src/hooks/use-lead-ads.ts` — Add `useSaveLeadAdsConfig()` mutation
- `frontend/src/components/lead-ads/lead-ads-webhook-card.tsx` — Add config form (Meta App Secret + Verify Token inputs, save button, status badges)

### Reuse (no modification needed)
- `backend/src/modules/channels/domain/services/channel-encryption.service.ts` — AES-256-GCM encryption, already exported from ChannelsModule

### Backward Compatibility
- Existing global `POST /webhooks/meta/leadgen` route stays — uses env vars as fallback
- New per-org route: `POST /webhooks/meta/leadgen/:orgId` — uses org's encrypted secrets from DB
- Orgs can migrate at their own pace

### Verification
1. Admin goes to Lead Ads page → expands Webhook Configuration card
2. Enters Meta App Secret + Verify Token → clicks Save
3. Copies per-org webhook URL (contains orgId)
4. Pastes in Meta App Dashboard → Meta sends challenge → CRM-WA verifies with org's token
5. Lead submitted → webhook arrives → signature verified with org's app secret → lead created

## Key URLs

| Resource | URL |
|----------|-----|
| Meta Business Suite | business.facebook.com |
| Developer Portal | developers.facebook.com |
| Graph API Explorer | developers.facebook.com/tools/explorer |
| WhatsApp Manager | business.facebook.com/wa/manage |
| Lead Ads Testing | developers.facebook.com/tools/lead-ads-testing |
| App Review | developers.facebook.com/apps/{app-id}/review |
