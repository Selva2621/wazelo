# Website product facts (source of truth for website-app copy)

Audited from `backend/` and `frontend/` on 2026-10-08. Marketing copy may only claim what is listed as **Real** here.

## Decisions (owner-approved, 2026-10-08)
- Connection story is **QR scan first**. Remove every "official WhatsApp Business API", "Meta BSP", "end-to-end encryption", "fully compliant" claim.
- **No social proof numbers** until real: remove "500+ businesses", 4.8 rating / 127 reviews, "94%" stats, the PropEdge "Rajesh M." review, and JSON-LD `aggregateRating` / `review`.
- No competitor-comparison claims (Interakt, Wati, AiSensy).

## Connect WhatsApp (Real)
- Connects by QR code: WhatsApp on phone, **Settings, Linked Devices, Link a Device**, scan.
- App UI: card "WhatsApp Connection"; button "Connect WhatsApp"; QR with a countdown ring, "Expires in Ns"; steps under "HOW TO CONNECT":
  1. Open WhatsApp on your phone
  2. Go to Settings, Linked Devices
  3. Tap "Link a Device" and scan the QR code
- Connected state: "WhatsApp Connected", number, "Connected" badge, "Go to Inbox".
- Session auto-reconnects (no rescan needed after short drops).
- One WhatsApp number (session) per user; plan caps sessions per org.

## Onboarding (Real)
- Signup asks "How will you use Wazelo?": Team / Company or Solo / Freelancer.
- 14-day free trial, no card. Trial limits: 3 users, 3 numbers, 1,000 messages, 5 campaigns, 50 AI credits.
- Dashboard "Complete your setup" checklist, 4 steps: Connect WhatsApp, Add your products, Create a message template, Import your contacts.

## Freelancer features (Real)
- Lead Scraper sources: Google Maps, Upwork Jobs, Freelancer.in, Truelancer, LinkedIn Jobs. Up to 200 results per run, import to contacts, campaign audience "From Scraper Run".
- Lead Pipeline (kanban): New, Contacted, Interested, Converted, Closed. Drag to update.
- Message templates (Solo plan: 20). Interactive button and list messages in the composer.
- Drip Sequences: steps with delays, stop automatically when the contact replies.
- Freelancer dashboard KPIs: Total Leads, Open Conversations, Proposals Sent, Closed This Month; "Follow-ups Due Today".
- **Not real:** sending proposals as documents, invoices, UPI/payment links to clients. Do not claim.

## Team features (Real)
- Shared inbox: tabs All / Unread / Mine; assign, labels, close/reopen/archive; quick replies with "/".
- Contact panel: Lead Status, Assigned To, Tags, Notes (notes are on contacts, not internal notes on chats).
- AI in inbox: AI Summary, AI Insights (sentiment, intent such as "Purchase Intent", suggested action), AI reply suggestions. Uses AI credits.
- Assignment: automation rules assign chats; Meta lead-ad leads are assigned round-robin. Do not claim round-robin for all chats.
- Roles: Admin, Manager, Employee with editable permissions; teams; audit logs; GDPR tools (consent, export, erase).
- CSAT: "Send Survey" from a chat, 1-5 rating plus comment, CSAT dashboard by agent.
- SLA policies with breach alerts and escalation.
- Admins can view and disconnect any team member's WhatsApp session.

## Growth and automation (Real)
- Campaigns: text, image, video, document, audio, or template; audience by lead status, tags, source, products, owner, team, scraper run; schedule with timezone; pause/resume/cancel; per-recipient Sent / Delivered / Read / Failed. Sent in batches with rate limits.
- Scheduled messages.
- Automation rules. Triggers: Message Received, Contact Created, Status Changed, Time-Based, No Reply, Lead ad received, Shopify Order Created/Fulfilled, Shopify Cart Abandoned, Widget Message. Actions: send message, assign, add tag, update status. Rules can be drafted with AI. Execution logs.
- Chatbot: "Create AI Chatbot" or "Create Custom Flow"; triggers keyword / first message / button reply; nodes: message, AI reply, question, condition, tag, assign agent, API call, intent, carousel. (No delay step yet.)
- Website chat widget (embed script).
- Meta (Facebook/Instagram) lead ads flow into contacts.
- Knowledge base: articles plus document upload, used by AI.

## Data and developer (Real)
- Contacts: CSV import/export, merge, tags, custom fields, notes, owner, list or kanban view.
- Deals: multiple pipelines and stages (page currently hidden in app nav; avoid featuring).
- Lead scoring rules (page hidden in nav; avoid featuring).
- Products catalogue linked to contacts.
- Analytics: Total Messages, Avg Response Time, Conversion Rate, Delivered; message volume, funnel, peak hours, team performance, campaign summary; export.
- Developer API with API keys (send, bulk send up to 100, templates, contacts, session status); outgoing webhooks (11 event types) with delivery log.

## Integrations
- Real: WhatsApp (QR), Google Maps / Upwork / Freelancer.in / Truelancer / LinkedIn Jobs (lead sources), Meta lead ads, Shopify (order and abandoned-cart webhooks into automations).
- Partial, do not feature: Instagram and Messenger channels, email (send only), Meta Cloud API number.
- **Not real, remove:** Zoho, Google Sheets, Zapier, WooCommerce. Razorpay is only Wazelo's own billing.

## Plans (from `backend/prisma/seed-plans.js`, INR, yearly = 10x monthly)
| Plan | Month | Users | Numbers | Messages/mo | Campaigns/mo | AI credits | Templates | API | Shopify |
|---|---|---|---|---|---|---|---|---|---|
| Solo | 299 | 1 | 1 | 3,000 | 5 | none | 20 | no | no |
| Starter | 499 | 5 | 5 | 5,000 | 10 | 50 | 10 | 1,000 calls | 1 store |
| Growth | 999 | 15 | 15 | 25,000 | 50 | 200 | 50 | 10,000 calls | 3 stores |
| Pro | 1,999 | 50 | 50 | 1,00,000 | 200 | 500 | 200 | yes | 5 stores |
| Enterprise | 3,999 | 200 | 200 | Unlimited | Unlimited | custom | Unlimited | yes | Unlimited |
- Automation needs Growth or higher (app shows "Upgrade to Growth or higher").
- Do not promise "24/7 phone support", "dedicated account manager", "custom SLA", "white-label" unless the owner confirms.
