import type { TourDef } from "../types";
import { exact, listOrEmpty, primaryAction } from "../match";

/** Service, settings, billing, profile and support */
export const settingsTours: TourDef[] = [
  {
    id: "csat",
    version: 1,
    title: "Customer satisfaction",
    summary: "Ratings customers give after a chat, by agent and over time.",
    section: "Service",
    startHref: "/csat",
    navHref: "/csat",
    match: exact("/csat"),
    steps: [
      {
        title: "How ratings come in",
        body: "From a chat, choose “Send survey”. The customer gets a link to rate the conversation from 1 to 5 and leave a comment.",
        example: {
          kind: "chat",
          messages: [
            { from: "you", text: "Thanks for chatting with us! How did we do? ⭐ wazelo.app/csat/…" },
            { from: "customer", text: "⭐⭐⭐⭐⭐ Super quick help, thanks Priya!" },
          ],
        },
      },
      {
        target: ["page-actions", "csat-filters"],
        title: "Period and product",
        body: "Look at a time range, or only chats about one product.",
      },
      {
        target: ["csat-kpis", "empty-state"],
        title: "The score",
        body: "Average rating, number of responses, and how many were satisfied (4–5) or not (1–2).",
        example: {
          kind: "fields",
          rows: [
            ["Average", "4.6 / 5"],
            ["Responses", "132"],
            ["Satisfied", "91%"],
          ],
        },
      },
      {
        target: "csat-agents",
        title: "By agent",
        body: "Spot who delights customers and who might need help.",
      },
    ],
  },

  {
    id: "whatsapp",
    version: 1,
    title: "Connect WhatsApp",
    summary: "Link your WhatsApp number to send and receive messages.",
    section: "Settings",
    startHref: "/settings/whatsapp",
    navHref: "/settings/whatsapp",
    match: exact("/settings/whatsapp"),
    steps: [
      {
        target: "wa-panel",
        title: "Your own number",
        body: "Each person links their own WhatsApp. Chats on that number show up in their inbox; nothing is sent until you reply or start a campaign.",
      },
      {
        target: ["wa-methods", "wa-connect"],
        ifMissing: "center",
        title: "Scan a QR or use a code",
        body: "On a computer, scan the QR. On a phone, use the 8-digit pairing code instead.",
        example: {
          kind: "steps",
          items: [
            "Open WhatsApp on your phone",
            "Settings → Linked devices → Link a device",
            "Scan the QR (or tap “Link with phone number” and type the code)",
          ],
        },
      },
      {
        target: "[data-tour=\"wa-panel\"] .max-w-md.text-left",
        ifMissing: "skip",
        title: "Account health",
        body: "Once connected, see whether your number is healthy. Sending too many unwanted messages can get a number restricted.",
        example: { kind: "tip", text: "Message people who know you, and include a way to opt out in bulk messages." },
      },
    ],
  },

  {
    id: "settings",
    version: 1,
    title: "Workspace settings",
    summary: "Organisation, hours, notifications, channels, AI, SLA and developer tools.",
    section: "Settings",
    startHref: "/settings",
    navHref: "/settings",
    match: exact("/settings"),
    steps: [
      {
        target: ["settings-nav", "settings-list"],
        title: "All settings, grouped",
        body: "Workspace, Channels, AI, Service and Developers. Changes here apply to everyone in your organisation.",
        example: { kind: "chips", items: ["Workspace", "Channels", "AI", "Service", "Developers"] },
      },
      {
        title: "Workspace",
        body: "Organisation name and details, working hours with an automatic reply outside hours, and which notifications people get.",
        example: {
          kind: "template",
          name: "Outside hours",
          body: "Thanks for messaging {{business}}! We're closed now and will reply by {{opens_at}}.",
          preview: "Thanks for messaging Kavya Boutique! We're closed now and will reply by 10 am tomorrow.",
        },
      },
      {
        title: "Channels",
        body: "WhatsApp settings, custom contact fields and the Shopify integration (order and cart messages).",
      },
      {
        title: "AI and business knowledge",
        body: "Turn AI features on or off and teach the AI about your business: what you sell, your website, documents, FAQs and tone.",
        example: { kind: "steps", items: ["About your business", "Website", "Documents", "FAQs", "Rules & tone"] },
      },
      {
        title: "Service and developers",
        body: "SLA policies (how fast chats must get a reply), API keys with docs and logs, and webhooks to send events to your own systems.",
      },
    ],
  },

  {
    id: "billing",
    version: 1,
    title: "Billing and plan",
    summary: "Your plan, usage, invoices and AI credit packs.",
    section: "Settings",
    startHref: "/settings/billing",
    navHref: "/settings/billing",
    match: exact("/settings/billing"),
    steps: [
      {
        target: "billing-tabs",
        title: "Four tabs",
        body: "Overview, Plans, AI credits and History.",
      },
      {
        target: "section[aria-labelledby=\"plan-heading\"]",
        title: "Your plan",
        body: "Current plan, renewal date and status. Change or cancel from here.",
      },
      {
        target: "section[aria-labelledby=\"usage-heading\"]",
        title: "Usage",
        body: "How much of each limit you've used this period: contacts, messages, users and more.",
        example: {
          kind: "fields",
          rows: [
            ["Contacts", "3,420 / 5,000"],
            ["Users", "4 / 5"],
            ["Campaign messages", "8,100 / 10,000"],
          ],
        },
      },
      {
        title: "Plans and history",
        body: "Compare plans (yearly billing saves money) on the Plans tab; download invoices on History.",
      },
    ],
  },

  {
    id: "ai-credits",
    version: 1,
    title: "AI credits",
    summary: "Your AI balance, top-up packs and what used them.",
    section: "Settings",
    startHref: "/settings/ai-credits",
    navHref: "/settings/ai-credits",
    match: exact("/settings/ai-credits"),
    steps: [
      {
        target: "section[aria-labelledby=\"balance-heading\"]",
        title: "Balance",
        body: "Credits from your plan reset each month; bought credits don't expire with the month.",
      },
      {
        target: "section[aria-labelledby=\"packs-heading\"]",
        title: "Top up",
        body: "Buy a pack if you run low; it's added straight away.",
      },
      {
        target: "section[aria-labelledby=\"credit-history-heading\"]",
        title: "Where credits went",
        body: "Each AI action with its cost, so you can see which features your team uses most.",
        example: {
          kind: "fields",
          rows: [
            ["Reply suggestion", "−1"],
            ["Chatbot answer", "−1"],
            ["Template written", "−2"],
          ],
        },
      },
    ],
  },

  {
    id: "profile",
    version: 1,
    title: "My profile",
    summary: "Your name, email and password.",
    section: "Settings",
    startHref: "/settings/profile",
    match: exact("/settings/profile"),
    steps: [
      {
        target: "profile-details",
        title: "Your details",
        body: "Your name is shown to teammates and in assignments.",
      },
      {
        target: "profile-password",
        title: "Password",
        body: "Use at least 8 characters with a mix of letters, numbers and symbols.",
      },
    ],
  },

  {
    id: "custom-fields",
    version: 1,
    title: "Custom fields",
    summary: "Extra fields on contacts and deals for your business.",
    section: "Settings",
    startHref: "/settings/custom-fields",
    roles: ["ADMIN"],
    match: exact("/settings/custom-fields"),
    steps: [
      {
        target: primaryAction(),
        title: "Add a field",
        body: "Text, number, date, dropdown or yes/no. Fields show on every contact's Overview and can be used in templates.",
        example: {
          kind: "fields",
          rows: [
            ["Label", "Birthday"],
            ["Type", "Date"],
            ["Used in", "{{birthday}} wishes campaign"],
          ],
        },
      },
      {
        target: "custom-field-tabs",
        title: "Per record type",
        body: "Fields for contacts, deals and other records are kept separate.",
      },
      {
        target: listOrEmpty,
        title: "Your fields",
        body: "Edit or delete. Deleting a field removes its values too.",
      },
    ],
  },

  {
    id: "support",
    version: 1,
    title: "Support",
    summary: "Ask the Wazelo team for help and follow your tickets.",
    section: "Support",
    startHref: "/support",
    navHref: "/support",
    match: exact("/support"),
    steps: [
      {
        target: primaryAction(),
        title: "New ticket",
        body: "Describe the problem, pick a category and priority, and attach screenshots. We reply here and by email.",
        example: {
          kind: "fields",
          rows: [
            ["Title", "Campaign stuck at 40%"],
            ["Category", "Campaigns"],
            ["Priority", "High"],
          ],
        },
      },
      {
        target: listOrEmpty,
        title: "Your tickets",
        body: "Open a ticket to see replies and answer back (Ctrl+Enter sends).",
      },
    ],
  },
];
