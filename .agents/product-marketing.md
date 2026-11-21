# Product Marketing Context

**Document version:** v2
**Last updated:** 2026-11-20

> Drafted from the codebase: the live website copy (`website-app/`), the homepage FAQ and pricing, and `reference/PRODUCT-PITCH.md` / `TARGET-CUSTOMER-PITCH.md`. The pitch docs date from April 2026, when the product was called CRM-WA and connected by QR only. Where they disagree with the live site, the live site wins. Items marked **[GAP]** need input from the founder.

## Product Overview
**One-liner:** Wazelo is the lead follow-up platform: it catches every lead, replies in seconds with AI and follows up until they buy.
**What it does:** Leads from Meta ads, the website chat widget, WhatsApp, Instagram, Messenger and email land in one shared inbox. Wazelo routes each lead to the right person, sends an AI first reply from the business's own knowledge base, then runs follow-up sequences, proposals and a deals pipeline until the lead is won or lost.
**Product category:** WhatsApp CRM / lead follow-up software. Customers search for "WhatsApp CRM", "WhatsApp bulk message software", "WhatsApp shared inbox", "lead management software India", "Meta lead ads WhatsApp auto reply".
**Product type:** B2B SaaS (web app + installable mobile app / PWA, Android and iOS).
**Business model:** Monthly or yearly subscription (yearly = 2 months free). 14-day free trial, no credit card. Visitors in India see INR; everyone else sees USD. Source of truth: `website-app/src/components/pricing/plans.ts`.
- Solo $9 / ₹299 (freelancers: 1 user, 1 number, 3,000 msgs)
- Solo Pro $15 / ₹599 (freelancers: 10,000 msgs, Shopify)
- Starter $19 / ₹499 (5 users, 5 numbers, 5,000 msgs)
- Growth $39 / ₹999, most chosen (15 users, 15 numbers, 25,000 msgs)
- Pro $79 / ₹1,999 (50 users, 50 numbers, 100,000 msgs)
- Enterprise from $149 / ₹3,999 (200 users, unlimited, custom SLA, white-label)

## Target Audience
**Target companies:** Small and mid-size businesses anywhere that sell over WhatsApp: realtors, coaching institutes, shops and boutiques, D2C brands, agencies, services businesses. Also solo freelancers who need to find and close clients. Markets: India (home market), Middle East / GCC, Southeast Asia, Africa, UK / US / Europe. Copy is global English; India-only details (IndiaMART, ₹) appear only where they're specific.
**Decision-makers:** The owner/founder (most SMBs). A sales manager or head of sales in larger teams. The agency owner for agencies.
**Primary use case:** Stop losing leads: answer every enquiry fast and follow up without anyone having to remember.
**Jobs to be done:**
- Reply to a new lead within seconds, even at midnight
- Make sure every lead gets followed up until there is a yes or a no
- Let the whole team work one WhatsApp number, and see who is doing what
**Use cases:**
- Meta lead ad comes in, and a WhatsApp welcome goes out in seconds before the lead goes cold
- A website visitor chats, AI answers from the knowledge base and hands over to a human when needed
- A sales rep leaves and the conversations stay with the company
- A festival offer goes out as a bulk campaign to a segment, with delivery and read tracking
- A freelancer finds prospects (Google Maps, IndiaMART), pitches from templates, sends a proposal and gets paid

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| SMB owner (decision maker + buyer) | Not losing sales, cost, simplicity | Leads arrive on personal WhatsApp; nobody knows who replied | Every lead answered and followed up, in rupees, set up in minutes |
| Sales manager (champion) | Pipeline visibility, team accountability | Can't see deals in progress or who is responding | Deals board, assignments, team performance and SLA |
| Agent / sales rep (user) | Replying fast without juggling apps | Switching between phone, Instagram, email | One inbox, AI-suggested replies, reminders |
| Agency owner | Proving ROI to clients, scaling without hiring | Manual broadcasting, no reports | Campaigns with tracking, automation, exportable reports |
| Freelancer (Solo) | Finding and closing clients | No pipeline, forgets to follow up | Lead finder, templates, proposals, follow-up sequences for ₹299 |
| Developer (technical influencer) | API, webhooks | Connecting Wazelo to their stack | REST API, webhooks, MCP server |

## Problems & Pain Points
**Core problem:** Leads come in from many places and go cold because nobody replies fast enough or follows up enough times.
**Why alternatives fall short:**
- WhatsApp Business app: one device, no team, no tracking, no follow-up
- Broadcast tools (Interakt, Wati, AiSensy): built for sending messages, not for chasing each lead to won/lost
- Generic CRMs (Zoho, HubSpot, Salesforce): built around email and calls; WhatsApp is an add-on; expensive and complex for an Indian SMB
- Spreadsheets + personal phones: data leaves with the employee
**What it costs them:** Lost sales from late or missing replies; hours of one-by-one messaging; no data to see what works.
**Emotional tension:** "Did anyone reply to that lead?" Owners worry about missed money and feel they can't trust what the team is doing on WhatsApp.

## Competitive Landscape
**Direct:** Interakt, Wati, AiSensy, DoubleTick (WhatsApp API platforms). They fall short because they focus on broadcast and messaging, not following each lead through to a sale.
**Secondary:** Zoho CRM, HubSpot, LeadSquared, Freshsales. They fall short because WhatsApp is bolted on, and they are priced and built for bigger teams.
**Indirect:** WhatsApp Business app + Excel + memory; hiring more people to follow up.

## Differentiation
**Key differentiators:**
- Built around follow-up, not just sending: every lead is caught, answered, chased on a schedule and tracked to won or lost
- AI first reply that answers from the business's own knowledge base, then hands over to a human (and logs unanswered questions)
- Meta lead ads straight from Meta (no Google Sheet in between), with a WhatsApp welcome within seconds
- Brands and lead routing: the right product team gets the lead, with reminders
- Everything in one place: inbox, campaigns, sequences, proposals, deals, analytics, mobile app
- Official WhatsApp Cloud API numbers, plus QR-linked numbers
- Indian pricing: from ₹299/month, in rupees
- A plan for freelancers (Solo) as well as teams
**How we do it differently:** The unit of work is the lead, not the message. Wazelo keeps track of the next follow-up so people don't have to.
**Why that's better:** Most sales happen after several follow-ups, and Wazelo makes sure they actually get sent.
**Why customers choose us:** **[GAP]** Need real win reasons from customers or trials.

## Objections
| Objection | Response |
|-----------|----------|
| "We already use WhatsApp Business" | Fine for one person. Once 3+ people handle leads you need a shared inbox, assignment and follow-up, or leads slip. |
| "It's too expensive" | Starts at ₹299/month. One saved lead a month usually covers it. 14-day free trial, no card. |
| "How is this different from Wati / Interakt / AiSensy?" | They help you send messages. Wazelo follows up each lead until it's won or lost, with AI doing the first reply. |
| "Will the AI say something wrong?" | It answers only from your knowledge base. If it can't find an answer, it hands the chat to your team. |
| "Is it the official API? Will my number get banned?" | Connect official WhatsApp Cloud API numbers with approved templates and per-number send limits. |
| "Setting it up will take time" | **[GAP]** Confirm the real time-to-first-lead to quote. |

**Anti-persona:** Large enterprises that need deep custom CRM workflows or on-prem; businesses with no WhatsApp/lead volume; anyone wanting to spam cold lists (against WhatsApp policy).

## Switching Dynamics
**Push:** Missed leads, a rep left with the customer chats, owner can't see what the team is doing, hours of one-by-one messaging.
**Pull:** Instant AI reply, automatic follow-ups, one inbox for every channel, price in rupees.
**Habit:** "Our team just uses WhatsApp on their phones"; Excel lists; the owner answering personally.
**Anxiety:** Number getting banned, AI embarrassing them, learning a new tool, moving existing contacts.

## Customer Language
**How they describe the problem:**
- **[GAP]** Need verbatim quotes from customers / trial users / sales calls. Working phrases from the founder story: "leads came in on personal WhatsApp numbers", "follow-ups slipped", "nobody could see who had replied to whom".
**How they describe us:**
- **[GAP]**
**Words to use:** lead, follow up, reply, customer waiting, catch, chase, won/lost, team, shared inbox, in rupees, free trial
**Words to avoid:** "platform" as the main noun in headlines (prefer "lead follow-up"), "revolutionise", "seamless", "leverage", "all-in-one solution", "synergy", vague "boost productivity"; unproven numbers ("3x faster", "2x conversions") from the old pitch docs
**Glossary:**
| Term | Meaning |
|------|---------|
| Shared inbox | One WhatsApp number (and other channels) worked by the whole team |
| Sequence | Scheduled follow-up messages that stop when the lead replies |
| Campaign | Bulk template message to a segment |
| AI assistant | Answers from the knowledge base; hands over to humans |
| Lead finder | Finds prospects on Google Maps / IndiaMART |
| Brand | A product line inside one org; leads route to its team |
| Solo | Freelancer plan / account type |

## Brand Voice
| Attribute | Means | Doesn't mean | Example line |
|-----------|-------|--------------|--------------|
| Urgent but calm | Make the cost of waiting felt | Panic, fear-mongering | "11:42. A customer is waiting." |
| Plain | Short sentences, everyday words | Dumbed down, slangy | "Simple pricing. In rupees." |
| Honest | Claims we can back; say what AI won't do | Hype, inflated stats | "When it can't find an answer, it hands the chat to your team." |
| Grounded in Indian small business | Realtors, coaching, boutiques; ₹ prices | Silicon Valley jargon | "For people who sell on WhatsApp." |
| Follow-through | The sale is in the fifth message | Pushy sales talk | "The sale is usually in the fifth message, not the first. Wazelo remembers to send it." |

**Tone by context:**
- Support: patient, step by step, no blame
- Launch: concrete: what changed, who it's for, one line on why
- Errors: say what happened and what to do next
- Sales: lead with the lost-lead pain, then the follow-up promise, then price
- Social: short, specific scenes (a lead at midnight, a rep on leave)
**Terms we own:** "lead follow-up platform", "every lead, followed up", "a customer is waiting"
**Never use (and why):** Em-dash-heavy AI phrasing, "it's not X, it's Y" constructions, and unverified percentage claims, because they read as generic and untrustworthy.

## Proof Points
**Metrics:** **[GAP]** No verified customer metrics yet (old "3x faster / 40–60% workload" claims are unverified; don't use).
**Customers:** **[GAP]**
**Testimonials:** **[GAP]**
**Value themes:**
| Theme | Proof |
|-------|-------|
| Speed to lead | Meta lead → WhatsApp welcome within seconds (product behaviour) |
| Follow-through | Sequences stop when the lead replies; deals tracked to won/lost |
| Trustworthy AI | Answers only from the knowledge base, human handover |
| Affordable | ₹299–₹1,999/mo public pricing, 14-day trial |
| Official | WhatsApp Cloud API with approved templates |

## Goals
**Business goal:** Grow paid subscriptions among Indian SMBs and freelancers.
**Conversion action:** Start the 14-day free trial (register). Secondary: "Talk to sales" for Enterprise.
**Current metrics:** **[GAP]**

## Learnings
*Decisions and tested lessons. Newest first. Keep it to about 20 active entries.*
| Date | Learning | Evidence | Applies to | Status |
|------|----------|----------|------------|--------|
| 2026-11-20 | Write for a global audience; India is one market, not the only one. Keep "Made in India" as origin only | Founder decision | all copy | active |
| 2026-11-20 | Website prices must match backend seed-plans; backend is the truth | Founder decision after mismatch audit | pricing copy | active |
| 2026-11-10 | Meta leads come only via the direct Meta webhook; don't market Google Sheet sync | Founder decision | copy, features pages | active |
| 2026-10-27 | Keep copy minimal; show options before building | Founder preference | all drafting skills | active |

## Changelog
*Newest first. One line per revision: what changed and why.*
- v2 (2026-11-20) — Went international: global ICP and markets, USD pricing outside India, Solo Pro added; prices aligned to backend.
- v1 (2026-11-20) — Initial context, drafted from website copy, FAQ, pricing and pitch docs.
