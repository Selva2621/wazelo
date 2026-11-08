import type { TourDef } from "../types";
import { detail, exact, listOrEmpty, primaryAction } from "../match";

type ChatLine = { from: "customer" | "you" | "bot"; text: string };

/** Sequences list tour; TEAM also shows for legacy CRM / DEVELOPER orgs */
function sequencesTour(o: {
  id: string;
  version: number;
  orgType: NonNullable<TourDef["orgType"]>;
  flow: string[];
  exampleTitle: string;
  exampleBody: string;
  chat: ChatLine[];
}): TourDef {
  return {
    id: o.id,
    version: o.version,
    title: "Sequences",
    summary: "Automatic follow-up messages over days or weeks.",
    section: "Marketing",
    startHref: "/sequences",
    navHref: "/sequences",
    orgType: o.orgType,
    match: exact("/sequences"),
    steps: [
      {
        target: primaryAction(),
        title: "New sequence",
        body: "A sequence sends a series of messages on a timer, stopping when the person replies. Each step can be WhatsApp or email. Start blank, from a template, or let AI write it.",
        example: { kind: "flow", nodes: o.flow },
      },
      {
        title: o.exampleTitle,
        body: o.exampleBody,
        example: { kind: "chat", messages: o.chat },
      },
      {
        target: "sequence-tabs",
        title: "Status",
        body: "Draft, active, paused and completed sequences.",
      },
      {
        target: listOrEmpty,
        title: "Your sequences",
        body: "Start, pause, resume or stop from each row, or open one for its funnel.",
      },
    ],
  };
}

/** Campaigns, drip sequences and message templates */
export const marketingTours: TourDef[] = [
  {
    id: "campaigns",
    version: 2,
    title: "Campaigns",
    summary: "Send one WhatsApp message or email to many contacts, now or on a schedule.",
    section: "Marketing",
    startHref: "/campaigns",
    navHref: "/campaigns",
    match: exact("/campaigns"),
    steps: [
      {
        target: primaryAction(),
        title: "New campaign",
        body: "A campaign sends one message to a group of contacts. Pick a template, choose who gets it, then send now or schedule it.",
        example: {
          kind: "steps",
          items: [
            "Name it: “Diwali offer 2026”",
            "Pick a template and fill the {{variables}}",
            "Audience: tag = vip, status = Interested",
            "Schedule: 24 Oct, 10:00 am IST",
          ],
        },
      },
      {
        title: "WhatsApp or email",
        body: "Choose the channel at the top of the message. Email campaigns send from your business email (Settings → Email) to contacts who have an email and haven't unsubscribed.",
        example: { kind: "chips", items: ["WhatsApp", "Email"] },
      },
      {
        title: "Personalised for each person",
        body: "Variables are replaced with each contact's own details, so 500 people each get a message that feels written for them.",
        example: {
          kind: "template",
          name: "diwali_offer",
          body: "Hi {{name}}, Diwali greetings from {{business}}! 🎉 Enjoy 20% off till 31 Oct. Reply YES for the catalogue.",
          preview: "Hi Priya, Diwali greetings from Kavya Boutique! 🎉 Enjoy 20% off till 31 Oct. Reply YES for the catalogue.",
        },
      },
      {
        target: "filter-bar",
        title: "Find campaigns",
        body: "Filter by status (draft, scheduled, running, completed), message type or audience, and sort by date.",
        example: { kind: "chips", items: ["Draft", "Scheduled", "Running", "Paused", "Completed", "Failed"] },
      },
      {
        target: listOrEmpty,
        title: "Track results",
        body: "Each row shows progress and delivery. Open a campaign for sent, delivered, read and failed counts per person.",
        example: { kind: "tip", text: "Send to a small test group first (e.g. a “team” tag) before the full list." },
      },
    ],
  },

  {
    id: "campaign-detail",
    version: 5,
    title: "Campaign report",
    summary: "Run, pause and measure one campaign.",
    section: "Marketing",
    startHref: "/campaigns",
    startHint: "Open any campaign",
    navHref: "/campaigns",
    match: detail("/campaigns"),
    steps: [
      {
        target: "campaign-actions",
        title: "Control it",
        body: "Start a draft, pause or resume a running campaign, cancel it, or run it again for a new batch.",
      },
      {
        target: "campaign-analytics",
        title: "How it did",
        body: "Progress, then delivered, read, replied and failed. Read rate is the best sign the message landed.",
        example: {
          kind: "fields",
          rows: [
            ["Delivered", "488 (97.6%)"],
            ["Read", "341 (68%)"],
            ["Failed", "12"],
          ],
        },
      },
      {
        target: "campaign-media-missing",
        ifMissing: "skip",
        title: "Media missing",
        body: "If the campaign's file is cleared from the server, sending pauses. Upload it again here, then resume.",
      },
      {
        target: "campaign-retry-failed",
        ifMissing: "skip",
        title: "Retry failed",
        body: "Messages that failed because WhatsApp was disconnected can be sent again. Wrong numbers and blocks aren't retried.",
      },
      {
        target: "campaign-sections",
        title: "Batches, recipients, details",
        body: "Batches of 100 are shared across your WhatsApp numbers; each number finishes one before the next. Recipients shows who got it and why some didn't.",
      },
    ],
  },

  // Same steps for both; the example follows the presets each type gets (getSequencePresets)
  sequencesTour({
    id: "sequences",
    version: 3,
    orgType: "TEAM",
    flow: ["Day 0: Thanks for your enquiry", "Day 1: Reminder", "Day 3: Last follow-up", "Stops on reply"],
    exampleTitle: "Example: follow up an enquiry",
    exampleBody: "Add new enquiries and the sequence keeps in touch for you, so nobody is forgotten.",
    chat: [
      { from: "you", text: "Day 0 · Hi Rahul, thank you for reaching out! Do you have any questions?" },
      { from: "you", text: "Day 1 · A friendly reminder that we're here if you need more details." },
      { from: "customer", text: "Yes, can I book for Saturday?" },
    ],
  }),
  sequencesTour({
    id: "sequences-freelancer",
    version: 1,
    orgType: "FREELANCER",
    flow: ["Day 0: Proposal sent", "Day 2: Follow-up", "Day 5: Last check-in", "Stops on reply"],
    exampleTitle: "Example: chase a proposal",
    exampleBody: "When a client gets your quote, the sequence follows up for you, so no proposal is forgotten.",
    chat: [
      { from: "you", text: "Day 0 · Hi Rahul, I've sent over the proposal we discussed." },
      { from: "you", text: "Day 2 · Just checking if you had a chance to look at it. Happy to jump on a quick call." },
      { from: "customer", text: "Looks good, can we start next week?" },
    ],
  }),

  {
    id: "sequence-detail",
    version: 1,
    title: "Sequence report",
    summary: "Messages, settings and the drop-off funnel of one sequence.",
    section: "Marketing",
    startHref: "/sequences",
    startHint: "Open any sequence",
    navHref: "/sequences",
    match: detail("/sequences"),
    steps: [
      {
        target: "sequence-actions",
        title: "Start, pause, edit",
        body: "Pause it to edit safely; people already enrolled continue from where they were when you resume.",
      },
      {
        target: "sequence-stats",
        title: "Numbers",
        body: "Enrolled, active, replied and completed.",
      },
      {
        target: "section[aria-labelledby=\"messages-title\"]",
        title: "The messages",
        body: "Each step with its delay after the previous one.",
      },
      {
        target: "sequence-analytics",
        title: "Funnel and exits",
        body: "How many people reach each step and why they left: replied, unsubscribed or failed.",
        example: { kind: "flow", nodes: ["Step 1: 200", "Step 2: 164", "Step 3: 120", "Replied: 38"] },
      },
    ],
  },

  {
    id: "templates",
    version: 2,
    title: "Templates",
    summary: "Reusable WhatsApp and email messages for campaigns, sequences and quick sends.",
    section: "Marketing",
    startHref: "/settings/templates",
    navHref: "/settings/templates",
    match: exact("/settings/templates"),
    steps: [
      {
        target: "templates-tabs",
        title: "WhatsApp or email",
        body: "Keep WhatsApp messages and emails in their own tabs. Email templates have a subject and a message.",
        example: { kind: "chips", items: ["WhatsApp", "Email"] },
      },
      {
        target: primaryAction(),
        title: "Create a template",
        body: "Write the message once with {{variables}} for the parts that change. Drag variables in from the panel on the right.",
        example: {
          kind: "template",
          name: "payment_reminder",
          body: "Hi {{name}}, a gentle reminder that invoice {{invoice_no}} of {{amount}} is due on {{due_date}}.",
          preview: "Hi Rahul, a gentle reminder that invoice INV-1042 of ₹12,000 is due on 5 Nov.",
        },
      },
      {
        title: "Generate with AI",
        body: "Describe what you need in plain words and AI drafts the template for you to edit.",
        example: {
          kind: "chat",
          messages: [
            { from: "you", text: "Thank-you message after a purchase with a 10% coupon for next time" },
            { from: "bot", text: "Hi {{name}}, thank you for shopping with us! 💛 Use THANKS10 for 10% off your next order." },
          ],
        },
      },
      {
        target: "template-preview",
        title: "Live preview",
        body: "See what a contact receives as you type, with the {{variables}} filled for a sample contact. On phones, switch to Preview.",
        ifMissing: "center",
      },
      {
        target: "templates-categories",
        title: "Categories",
        body: "Marketing, utility (order updates, reminders) and others.",
      },
      {
        target: listOrEmpty,
        title: "Your templates",
        body: "Edit, copy or delete; templates are available in campaigns, sequences and the inbox.",
      },
    ],
  },
];
