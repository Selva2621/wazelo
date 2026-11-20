# Wazelo Blog: Content Strategy

**Date:** 2026-11-21 · **For:** wazelo.in/blog · **Built from:** `.agents/product-marketing.md`, `reference/site-architecture.md`, competitor blog scan, web research (sources at the end).

**Goal:** organic search traffic from small businesses and freelancers who sell on WhatsApp, turning into free-trial signups. Blog posts link into the feature, use-case, compare and pricing pages.

**Limits of this plan:** no keyword-volume tool or customer-call data was available, so search potential is scored from judgment and competitor activity. Re-score once Google Search Console has 2–3 months of data.

---

## 1. What the market already has (and where the gap is)

| Who | What they publish | Gap for Wazelo |
|---|---|---|
| Wati | Many near-duplicate "best tool for automated WhatsApp lead follow-up" pages (`/geo/` and `/en/` variants), drip-campaign and follow-up-message guides | Product-led, repetitive. No copy-ready templates with Meta category and timing; no real walkthroughs |
| Privyr, SleekFlow, LeadsBridge, Picky Assist | Facebook lead ads → WhatsApp, "speed to lead" | Lean on one 2007 study for response-time stats; most push a Google Sheet / Zapier sync, which Wazelo deliberately does not use |
| BSP blogs (MyOperator, AiSensy, Telecrm…) | WhatsApp API pricing in India | Rates disagree between articles; few cite Meta's own rate card; none cover pricing outside India |

**Wazelo's information gain:** real screens and flows from the product, templates people can paste, numbers taken from Meta's own pages with a date, and coverage for both India and other markets.

---

## 2. Content pillars

| Pillar | Why it fits | Feeds these pages |
|---|---|---|
| **1. Speed to lead** (catch and reply) | Core promise: reply in seconds. Meta lead ads straight from Meta, no Google Sheet | /features/lead-ads, /features/website-chat, /features/ai-assistant |
| **2. WhatsApp follow-up** (sequences, templates, cadence, 24-hour rule) | The product is built around follow-up; competitors sell sending | /features/sequences, /features/automation |
| **3. WhatsApp Business API, explained** (pricing, templates, quality rating, bans) | Answers the top objections: cost, number bans, official API | /pricing, /compare/*, /security |
| **4. Selling on WhatsApp by trade** (real estate, agencies, freelancers) | Long-tail persona searches; supports the use-case pages | /use-cases/* |

Pillar 5 (later, shareable): anonymised Wazelo data, e.g. "median reply time to a Meta lead", once there is enough live traffic to be honest about.

---

## 3. Priority topics (scored)

Scores 1–10. Weights: customer impact 40%, content-market fit 30%, search potential 20%, resources 10%.

| # | Working title | Pillar | Type | Stage | Impact | Fit | Search | Res. | **Total** |
|---|---|---|---|---|---|---|---|---|---|
| 1 | How to reply to Facebook and Instagram lead ads on WhatsApp in seconds (without Google Sheets) | 1 | Searchable how-to | Consideration | 9 | 10 | 7 | 9 | **8.9** |
| 2 | WhatsApp follow-up message templates: copy-ready examples by industry | 2 | Template library | Implementation | 8 | 9 | 8 | 8 | **8.3** |
| 3 | How many times should you follow up a lead? A WhatsApp follow-up schedule | 2 | Searchable how-to | Awareness | 8 | 9 | 6 | 9 | **8.0** |
| 4 | The WhatsApp 24-hour rule: when you can message a lead and when you need a template | 2 | Explainer | Awareness | 7 | 8 | 7 | 9 | **7.5** |
| 5 | WhatsApp Business API pricing in 2026: what each message costs, in India and abroad | 3 | Explainer + worked examples | Decision | 8 | 6 | 9 | 6 | **7.4** |
| 6 | Why WhatsApp numbers get limited or banned, and how to avoid it | 3 | Explainer | Consideration | 8 | 7 | 7 | 7 | **7.4** |
| 7 | Real estate WhatsApp follow-up: a site-visit playbook | 4 | Use-case spoke | Consideration | 7 | 9 | 5 | 8 | **7.3** |
| 8 | How freelancers find clients on Google Maps and pitch them on WhatsApp | 4 | Use-case spoke | Awareness | 7 | 9 | 5 | 8 | **7.3** |
| 9 | Speed-to-lead statistics (sourced and dated) | 1 | Stats roundup | Awareness | 6 | 8 | 6 | 5 | **6.5** |
| 10 | How agencies report WhatsApp lead results to clients | 4 | Use-case spoke | Consideration | 6 | 7 | 4 | 8 | **6.1** |
| 11 | WhatsApp Business glossary (template, utility, session window, quality rating…) | 3 | Glossary | Awareness | 5 | 6 | 5 | 9 | **5.7** |

**Information-gain line for each top post** (what it adds that the current results don't):

1. A real setup with Wazelo screens showing the lead arriving from Meta and the welcome going out. It also explains why a sheet-sync adds delay and failure points.
2. Each template comes with its Meta category (marketing or utility, which changes the cost), when to send it, and the rule that the sequence stops on reply.
3. A concrete day-by-day schedule per situation (new lead, quote sent, no-show), instead of "follow up a few times".
4. A plain decision chart for the 24-hour window, with examples of what a lead sees.
5. Rates taken from Meta's rate card with the check date, plus worked monthly costs for a small team in India and one abroad.

**Calendar mix (first 3 months):** about 70% searchable (#1–8), 20% link-earning (#9, #11) and 10% experiments (a free message-cost calculator, see `free-tools`). The mix leans to searchable because the blog is new.

---

## 4. Topic cluster map

```
Pillar 1: Speed to lead ──────────────► /features/lead-ads
 ├─ #1 Lead ads → WhatsApp in seconds  (hub)
 ├─ #9 Speed-to-lead statistics
 └─ (later) Website chat that turns visitors into leads

Pillar 2: WhatsApp follow-up ─────────► /features/sequences
 ├─ #3 How many follow-ups (hub)
 ├─ #2 Follow-up templates
 └─ #4 The 24-hour rule

Pillar 3: WhatsApp API explained ─────► /pricing, /compare
 ├─ #5 API pricing 2026 (hub)
 ├─ #6 Number limits and bans
 └─ #11 Glossary

Pillar 4: Selling on WhatsApp by trade ► /use-cases/*
 ├─ #7 Real estate playbook       → /use-cases/real-estate
 ├─ #8 Freelancers + Google Maps  → /use-cases/freelancers
 └─ #10 Agency reporting          → /use-cases/agencies
```

Rules: every post links to its pillar hub, to one feature page and to the trial. Hubs link to every spoke.

---

## 5. Production standard per post

- Write 10 title options and pick the one that matches the search query most plainly.
- Write the information-gain line before drafting. If it can't be written, drop the post.
- Use real Wazelo screens or recordings, never mock numbers presented as real.
- Date every price or rate, and link the original source (Meta's pages for WhatsApp rates).
- Edit in five passes: structure, clarity, evidence, line edit, title and SEO. Then run `copy-editing`.
- Distribute each post as one LinkedIn post, one WhatsApp broadcast to the list (marketing category) and one short clip where there is a screen recording.

---

## 6. Blog setup (site)

- URLs: `/blog` and `/blog/{slug}`, with no dates in the slugs.
- Posts are stored in the repo and rendered statically. Each post has a title, description, date, updated date, author, pillar and related links.
- Each post gets Article and BreadcrumbList JSON-LD, sits in the sitemap with its real `lastModified`, and has an RSS feed.
- Add Blog under Resources in the footer once 3 or more posts are live.

---

## Sources

- Wati blog: [automated WhatsApp lead follow-up](https://www.wati.io/en/blog/automated-whatsapp-lead-followup-platform-wati/), [WhatsApp drip campaign](https://www.wati.io/blog/whatsapp-drip-campaign), [WhatsApp follow-up messages](https://www.wati.io/blog/whatsapp-follow-up-messages)
- Speed to lead and lead ads: [Privyr: increase Facebook lead ads sales](https://www.privyr.com/blog/increase-facebook-lead-ads-sales/), [LeadsBridge: Facebook leads to WhatsApp](https://leadsbridge.com/blog/facebook-leads-to-whatsapp/), [SleekFlow: Facebook lead ads](https://sleekflow.io/en-sg/blog/facebook-lead-ads), [respond.io: prevent WhatsApp ad leads from being missed](https://respond.io/faqs/prevent-whatsapp-ad-leads-from-being-missed.md)
- WhatsApp pricing: [Meta: Pricing on the WhatsApp Business Platform](https://developers.facebook.com/docs/whatsapp/pricing), [MyOperator: API pricing India 2026](https://myoperator.com/blog/whatsapp-business-api-pricing-india-2026), [AiSensy: per-message pricing update](https://m.aisensy.com/blog/whatsapp-conversation-based-pricing-model-february-2022)
