# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Installable PWA. Below 1024px the UI adapts to the OS (iOS look on Apple devices, Material 3 on Android, driven by `data-platform` on `<html>`). At 1024px and up it is a desktop web app. Mobile work must never change the desktop rendering, and must never change flows, routes or actions; only the UI adapts.

## Users

Primary: Indian SMB teams of roughly 3–50 people who work customers over WhatsApp every day.

- **Agencies and freelance marketers**: run Meta Lead Ads and bulk campaigns for clients, follow up leads automatically, and report results back to clients. Freelancers have their own dashboard.
- **Sales teams**: reps working leads and conversations from one shared business number; managers who need to see the pipeline and how each rep is performing.

Roles inside an org: Admin, Manager, Employee, with granular RBAC permissions. A separate platform super-admin console runs the SaaS itself (orgs, plans, billing, tickets, AI usage).

## Product Purpose

A multi-tenant WhatsApp-first CRM. A team connects its business number and then shares one inbox, captures and scores leads, runs campaigns and drip sequences, automates replies and assignment, and tracks deals, SLAs and CSAT. Success means no message is missed, no lead goes cold, and managers and clients can see real numbers.

## Positioning

All-in-one: inbox, CRM, pipeline, campaigns, automation, chatbot and AI in a single tool built for how Indian businesses run on WhatsApp (₹ pricing, Razorpay). Leads from Meta Lead Ads arrive straight through the Meta webhook and can be welcomed automatically within seconds.

Open: the final product name and go-to-market. "Wazelo" is used in the codebase and "CRM-WA" in the older pitch docs. Whether it ships as hosted SaaS only, or also as white-label/self-hosted, is undecided.

## Operating Context

- Agents spend long sessions in the inbox replying in real time (Socket.IO); managers move between the dashboard, pipeline, SLA and team views.
- Channels: WhatsApp (Meta Cloud API with templates and per-number sending limits, plus a QR-linked option), Email, Instagram, Facebook Messenger, and a website chat widget (one widget per org shared across sites).
- Lead sources: Meta Lead Ads via direct webhook (no Google Sheet sync), the website widget, CSV import, and a lead scraper.
- Every screen has a guided product tour; new or changed screens need a tour definition and `data-tour` anchors.

## Capabilities and Constraints

- Modules: inbox, contacts, lead pipeline, lead scoring, deals, campaigns, sequences, scheduler, automation rules, chatbot builder + knowledge base, AI assistant and AI credits, proposals, CSAT, SLA, team, audit logs, GDPR, API keys/webhooks, billing, Shopify, products, custom fields.
- All data is scoped by `org_id`, with soft deletes everywhere.
- Website visitors give their name, mobile and email; they only become a contact if they tick consent.
- AI roadmap: the website/knowledge-base chatbot comes first, then AI proposals.

## Brand Commitments

- Keep copy short and plain: sentence case, few words.
- Before building any new layout, show the user 2–4 layout options to choose from.

## Evidence on Hand

- Product docs: `reference/PRODUCT-PITCH.md`, `reference/TARGET-CUSTOMER-PITCH.md`, `reference/USER-MANUAL.md`, user stories in `reference/user-stories/`.
- The numbers in the pitch docs (e.g. "3x faster", conversion lifts, "97% SLA") and the suggested pricing are illustrative, not measured. There are no real customer testimonials, logos or case studies. Do not present any of these as fact.

## Product Principles

1. Nothing gets missed: every message, lead and follow-up is visible and has an owner.
2. Speed to first reply: automation and AI exist to cut response time, not to add ceremony.
3. One place: features fold into the shared inbox, contact and pipeline instead of becoming separate tools.
4. Real numbers for managers and clients: reports reflect actual data that can be exported.
5. Phone-grade usability: the PWA has to feel native, with no change to how desktop works.
