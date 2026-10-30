import type { TourDef } from "../types";
import { detail, exact, listOrEmpty, primaryAction } from "../match";

/** Campaigns, drip sequences and message templates */
export const marketingTours: TourDef[] = [
  {
    id: "campaigns",
    version: 1,
    title: "Campaigns",
    summary: "Send one message to many contacts, now or on a schedule.",
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
    version: 1,
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
        body: "Sent, delivered, read and failed. Read rate is the best sign the message landed.",
        example: {
          kind: "fields",
          rows: [
            ["Sent", "500"],
            ["Delivered", "488 (97.6%)"],
            ["Read", "341 (68%)"],
            ["Failed", "12"],
          ],
        },
      },
      {
        target: "campaign-details",
        title: "What was sent",
        body: "The message, audience, sending number and schedule.",
      },
      {
        target: "campaign-recipients",
        title: "Every recipient",
        body: "Filter by Sent, Delivered, Failed or Skipped to see who got it and why some didn't (e.g. not on WhatsApp).",
      },
    ],
  },

  {
    id: "sequences",
    version: 1,
    title: "Sequences",
    summary: "Automatic follow-up messages over days or weeks.",
    section: "Marketing",
    startHref: "/sequences",
    navHref: "/sequences",
    match: exact("/sequences"),
    steps: [
      {
        target: primaryAction(),
        title: "New sequence",
        body: "A sequence sends a series of messages on a timer, stopping when the person replies. Start blank, from a template, or let AI write it.",
        example: {
          kind: "flow",
          nodes: ["Day 0: Intro", "Day 2: Case study", "Day 5: Offer", "Stops on reply"],
        },
      },
      {
        title: "Example: follow up a lead",
        body: "Enrol new leads and the sequence keeps in touch for you, so nobody is forgotten.",
        example: {
          kind: "chat",
          messages: [
            { from: "you", text: "Day 0 · Hi Rahul, thanks for your interest in our website packages!" },
            { from: "you", text: "Day 2 · Here's how we doubled bookings for a Pune clinic 👉 link" },
            { from: "customer", text: "Interesting, can we talk tomorrow?" },
          ],
        },
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
  },

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
    version: 1,
    title: "Templates",
    summary: "Reusable messages for campaigns, sequences and quick sends.",
    section: "Marketing",
    startHref: "/settings/templates",
    navHref: "/settings/templates",
    match: exact("/settings/templates"),
    steps: [
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
        target: "templates-tabs",
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
