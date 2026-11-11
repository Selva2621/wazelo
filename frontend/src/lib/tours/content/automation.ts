import type { TourDef } from "../types";
import { detail, exact, listOrEmpty, primaryAction } from "../match";

type OrgTourType = NonNullable<TourDef["orgType"]>;
type ChatLine = { from: "customer" | "you" | "bot"; text: string };

/*
 * Automation, chatbot, builder and AI assistant tours come in a TEAM and a FREELANCER
 * version with the same steps and data-tour targets; only the examples differ.
 * TEAM ones also show for legacy CRM / DEVELOPER orgs (the provider only hides them from freelancers).
 */

function automationTour(o: { id: string; version: number; orgType: OrgTourType; rule: string[]; recipes: string[] }): TourDef {
  return {
    id: o.id,
    version: o.version,
    title: "Automation",
    summary: "“When this happens, do that” rules that run on their own.",
    section: "Automation",
    startHref: "/automation",
    navHref: "/automation",
    orgType: o.orgType,
    match: exact("/automation"),
    steps: [
      {
        title: "How a rule works",
        body: "A rule has a trigger (what happens), optional conditions (only if…) and actions (what Wazelo does).",
        example: { kind: "flow", nodes: o.rule },
      },
      {
        target: "section[aria-label=\"Start from a recipe\"]",
        title: "Start from a recipe",
        body: "Ready-made rules for common jobs. Pick one and adjust it.",
        example: { kind: "chips", items: o.recipes },
      },
      {
        target: primaryAction(),
        title: "New rule",
        body: "Build your own, or describe it in words and let AI set it up.",
        example: { kind: "tip", text: "Use “Max per contact” and “Cooldown” so nobody gets the same automatic message twice in a row." },
      },
      {
        target: "automation-tabs",
        title: "Rules and logs",
        body: "Execution logs show every time a rule ran, for whom, and whether it worked; check here if a rule didn't fire.",
      },
      {
        target: listOrEmpty,
        title: "Your rules",
        body: "Switch a rule on or off, or open it to edit.",
      },
    ],
  };
}

function chatbotTour(o: { id: string; version: number; orgType: OrgTourType; people: string; chat: ChatLine[] }): TourDef {
  return {
    id: o.id,
    version: o.version,
    title: "Chatbot",
    summary: `AI or step-by-step bots that answer ${o.people} for you.`,
    section: "Automation",
    startHref: "/chatbot",
    navHref: "/chatbot",
    orgType: o.orgType,
    match: exact("/chatbot"),
    steps: [
      {
        title: "Two kinds of bot",
        body: "An AI chatbot answers in its own words from your business knowledge. A custom flow follows the buttons and questions you design.",
        example: { kind: "chat", messages: o.chat },
      },
      {
        target: [...primaryAction(), "empty-state"],
        title: "Create a bot",
        body: "Start from a recipe or blank. Bots stay as drafts until you activate them.",
      },
      {
        target: "bot-health",
        title: "Bot health",
        body: "How many questions the bot answered, couldn't answer, or handed to a person. Unanswered questions are the best list of FAQs to add.",
      },
      {
        target: "bot-flows",
        title: "Your bots",
        body: `Edit, pause or activate each one. Only active bots reply to ${o.people}.`,
      },
    ],
  };
}

function builderTour(o: { id: string; version: number; orgType: OrgTourType; keyword: string; flow: string[]; aiTip: string }): TourDef {
  return {
    id: o.id,
    version: o.version,
    title: "Flow builder",
    summary: "Design a chatbot flow with nodes, or switch it to AI mode.",
    section: "Automation",
    startHref: "/chatbot",
    startHint: "Open any chatbot",
    navHref: "/chatbot",
    orgType: o.orgType,
    // /chatbot/knowledge only redirects to /ai-assistant
    match: (p) => p !== "/chatbot/knowledge" && detail("/chatbot")(p),
    steps: [
      {
        target: "[aria-label=\"Flow name\"]",
        title: "Name and status",
        body: "Draft bots don't reply yet; activate when you're happy with the test.",
      },
      {
        target: ["builder-left", "builder-mobile-pill"],
        title: "Trigger and nodes",
        body: `Set what starts the bot (e.g. the keyword “${o.keyword}” or any first message), then add nodes: message, buttons, question, condition, hand over to a person.`,
        example: { kind: "flow", nodes: o.flow },
      },
      {
        target: "[role=\"switch\"][aria-label=\"AI mode\"]",
        ifMissing: "skip",
        title: "AI mode",
        body: "Turn on to let AI answer instead of a fixed flow. It uses your AI assistant's knowledge and instructions; add extra ones for this bot only if needed.",
        example: { kind: "tip", text: `Example extra instruction: “${o.aiTip}”` },
      },
      {
        target: "builder-canvas",
        title: "Canvas",
        body: "Drag to connect nodes. Click a node to edit its text, buttons and next step.",
      },
      {
        target: ["builder-toolbar", "m-more"],
        title: "Test, tidy and save",
        body: "Test chats with your bot right here, Auto-layout tidies the nodes, Save keeps changes, Activate puts it live.",
      },
    ],
  };
}

function knowledgeTour(o: {
  id: string;
  version: number;
  orgType: OrgTourType;
  people: string;
  person: string;
  rule: string;
  sites: string[];
  faq: [q: string, a: string];
  files: string;
  handover: string;
  test: string;
}): TourDef {
  return {
    id: o.id,
    version: o.version,
    title: "AI assistant",
    summary: "One AI for WhatsApp and your website: what it knows and how it talks.",
    section: "Automation",
    startHref: "/ai-assistant",
    navHref: "/ai-assistant",
    orgType: o.orgType,
    match: exact("/ai-assistant"),
    steps: [
      {
        target: "ai-channels",
        title: "Where it answers",
        body: `Your WhatsApp chatbot and website chat both answer from this page, so ${o.people} get the same reply everywhere.`,
      },
      {
        target: "kb-instructions",
        title: "Instructions",
        body: `Tone and rules for every channel (e.g. “${o.rule}”).`,
      },
      {
        target: "kb-websites",
        title: "Your website",
        body: "Add your site's address and the bot reads its pages for answers.",
        example: { kind: "chips", items: o.sites },
      },
      {
        target: "kb-unanswered",
        title: "Unanswered questions",
        body: "Questions the bot couldn't answer. Turn each one into an FAQ with one click.",
      },
      {
        target: "kb-faqs",
        title: "FAQs",
        body: "Exact answers for common questions; the bot prefers these.",
        example: { kind: "fields", rows: [["Q", o.faq[0]], ["A", o.faq[1]]] },
      },
      {
        target: "kb-files",
        title: "Files",
        body: o.files,
      },
      {
        target: "kb-handover",
        title: "Handover",
        body: o.handover,
      },
      {
        target: "#test-bot",
        title: "Test your assistant",
        body: `Ask a question as ${o.person} would and see the answer and which source it used.`,
        example: { kind: "chat", messages: [{ from: "customer", text: o.test }] },
      },
    ],
  };
}

/** Automation rules, chatbots, bot knowledge and the website chat widget */
export const automationTours: TourDef[] = [
  // Team and freelancer versions differ only in the examples; recipe chips match getAutomationPresets()
  automationTour({
    id: "automation",
    version: 2,
    orgType: "TEAM",
    rule: ["Message says “price”", "Reply with prices", "Mark Interested", "Assign to a teammate"],
    recipes: ["Welcome new customers", "Answer pricing questions", "Follow up after 2 days", "Tag website leads"],
  }),
  automationTour({
    id: "automation-freelancer",
    version: 1,
    orgType: "FREELANCER",
    rule: ["Message says “price”", "Ask scope and timeline", "Mark Interested"],
    recipes: ["Welcome new enquiries", "Answer pricing questions", "Follow up after 2 days", "Chase a sent proposal", "Thank a new client"],
  }),

  {
    id: "automation-rule",
    version: 5,
    title: "Rule editor",
    summary: "Set the trigger, conditions and actions of one rule.",
    section: "Automation",
    startHref: "/automation",
    startHint: "Open any automation rule",
    navHref: "/automation",
    match: detail("/automation"),
    steps: [
      {
        target: "[aria-label=\"Rule name\"]",
        title: "Name it clearly",
        body: "Say what it does, e.g. “Reply to price questions”.",
      },
      {
        target: "rule-trigger",
        title: "Trigger",
        body: "What starts the rule: a new message, a keyword, a new contact, a Facebook or Instagram lead form, a status change, and more.",
        example: { kind: "chips", items: ["Message received", "Keyword: price", "Contact created", "Lead ad received"] },
      },
      {
        target: "rule-lead-filters",
        ifMissing: "skip",
        title: "Lead ad filters",
        body: "One rule per brand or product: pick its Facebook Page or lead form, then add “Add to product” and its own welcome. Form answers go into messages as {{lead.city}}, {{lead.campaign}}…",
        example: { kind: "chips", items: ["Page: Brand A", "Form: Villa plots", "Add to product", "Send welcome"] },
      },
      {
        target: "rule-conditions",
        title: "Conditions",
        body: "Optional checks that must all be true, e.g. status is New and tag is not “customer”.",
      },
      {
        target: "rule-actions",
        title: "Actions",
        body: "One or more things to do, in order: send a WhatsApp message or an email, add a tag, add to a product, change status, assign, start or stop a sequence. Official numbers send a Meta-approved template.",
        example: { kind: "flow", nodes: ["Send template “price_list”", "Send email “Welcome”", "Add tag “pricing”"] },
      },
      {
        target: "rule-advanced",
        title: "Limits",
        body: "Priority (which rule wins), max runs per contact, and a cooldown between runs.",
      },
      {
        target: ["rule-save", "m-primary"],
        title: "Save",
        body: "Changes apply to new events right after saving.",
      },
    ],
  },

  // Recipes: getChatbotPresets()
  chatbotTour({
    id: "chatbot",
    version: 1,
    orgType: "TEAM",
    people: "customers",
    chat: [
      { from: "customer", text: "What time do you close today?" },
      { from: "bot", text: "We're open till 8 pm today. Would you like to book a slot?" },
    ],
  }),
  chatbotTour({
    id: "chatbot-freelancer",
    version: 1,
    orgType: "FREELANCER",
    people: "clients",
    chat: [
      { from: "customer", text: "Can you design a logo for my café?" },
      { from: "bot", text: "Happy to help! What style do you like, and when do you need it?" },
    ],
  }),

  builderTour({
    id: "chatbot-builder",
    version: 2,
    orgType: "TEAM",
    keyword: "menu",
    flow: ["Trigger: “menu”", "Buttons: Prices / Timings / Talk to us", "Reply", "Hand over"],
    aiTip: "Only talk about bookings. Ask for the date and number of people.",
  }),
  builderTour({
    id: "chatbot-builder-freelancer",
    version: 1,
    orgType: "FREELANCER",
    keyword: "portfolio",
    flow: ["Trigger: “portfolio”", "Send my recent work", "Ask: which kind of project?", "Reply"],
    aiTip: "Only talk about my services. Ask what they need and by when.",
  }),

  knowledgeTour({
    id: "bot-knowledge",
    version: 2,
    orgType: "TEAM",
    people: "customers",
    person: "a customer",
    rule: "never promise discounts",
    sites: ["kavyaboutique.in", "kavyaboutique.in/shipping"],
    faq: ["Do you deliver outside India?", "Yes, to the UAE and UK in 7–10 days."],
    files: "Upload price lists, brochures or policies as PDF or text.",
    handover: "When to pass the chat to a person, and your opening hours.",
    test: "What are your prices?",
  }),
  knowledgeTour({
    id: "bot-knowledge-freelancer",
    version: 1,
    orgType: "FREELANCER",
    people: "clients",
    person: "a client",
    rule: "never promise a deadline",
    sites: ["priyadesigns.in", "priyadesigns.in/portfolio"],
    faq: ["How long does a logo take?", "Usually 5–7 days, with two rounds of changes."],
    files: "Upload your rate card, service list or past work as PDF or text.",
    handover: "When to pass the chat to you, and the hours you reply.",
    test: "What are your rates?",
  }),

  {
    id: "chat-widget",
    version: 3,
    title: "Website chat widget",
    summary: "A chat bubble for your website that lands in your inbox.",
    section: "Automation",
    startHref: "/settings/chat-widget",
    navHref: "/settings/chat-widget",
    match: exact("/settings/chat-widget"),
    steps: [
      {
        target: ["widget-enable", "widget-phone-preview"],
        title: "Turn it on",
        body: "Visitors on your site see a chat bubble. Their messages arrive in Inbox → Website.",
      },
      {
        target: ["widget-appearance", "widget-segments"],
        title: "Make it yours",
        body: "Company name, colour, position, avatar and welcome message.",
        example: {
          kind: "fields",
          rows: [
            ["Welcome", "Hi 👋 How can we help?"],
            ["Colour", "#16a34a"],
            ["Position", "Bottom right"],
          ],
        },
      },
      {
        target: "widget-prechat",
        only: "desktop",
        title: "Details before the chat",
        body: "Every visitor gives first name, mobile and email first. Those who tick “I agree to be contacted” become contacts, and your welcome message goes when the chat ends.",
      },
      {
        target: "widget-ai",
        only: "desktop",
        title: "AI replies",
        body: "Let the AI answer visitors at any hour. It uses the same knowledge and instructions as WhatsApp, set in AI assistant.",
      },
      {
        target: ["widget-embed", "widget-segments"],
        title: "Install",
        body: "Copy one line of code into your site before </body>. One widget works on all your sites; the inbox shows which site each chat came from.",
        example: {
          kind: "template",
          body: "<script src=\"https://wazelo.app/widget.js\" data-key=\"wz_…\"></script>",
          preview: "A chat bubble appears on every page of your site",
        },
      },
      {
        target: "widget-preview",
        only: "desktop",
        title: "Live preview",
        body: "See your changes as a visitor would, then save.",
      },
    ],
  },
];
