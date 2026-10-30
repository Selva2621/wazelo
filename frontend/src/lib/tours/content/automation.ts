import type { TourDef } from "../types";
import { detail, exact, listOrEmpty, primaryAction } from "../match";

/** Automation rules, chatbots, bot knowledge and the website chat widget */
export const automationTours: TourDef[] = [
  {
    id: "automation",
    version: 1,
    title: "Automation",
    summary: "“When this happens, do that” rules that run on their own.",
    section: "Automation",
    startHref: "/automation",
    navHref: "/automation",
    match: exact("/automation"),
    steps: [
      {
        title: "How a rule works",
        body: "A rule has a trigger (what happens), optional conditions (only if…) and actions (what Wazelo does).",
        example: {
          kind: "flow",
          nodes: ["New message contains “price”", "Contact is New", "Send price list", "Tag: pricing", "Assign to Rahul"],
        },
      },
      {
        target: "section[aria-label=\"Start from a recipe\"]",
        title: "Start from a recipe",
        body: "Ready-made rules for common jobs. Pick one and adjust it.",
        example: { kind: "chips", items: ["Welcome new contacts", "Out-of-hours reply", "Tag by keyword", "Assign round-robin"] },
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
  },

  {
    id: "automation-rule",
    version: 1,
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
        body: "What starts the rule: a new message, a keyword, a new contact, a status or tag change, and more.",
        example: { kind: "chips", items: ["Message received", "Keyword: price", "Contact created", "Tag added"] },
      },
      {
        target: "rule-conditions",
        title: "Conditions",
        body: "Optional checks that must all be true, e.g. status is New and tag is not “customer”.",
      },
      {
        target: "rule-actions",
        title: "Actions",
        body: "One or more things to do, in order: send a message or template, add a tag, change status, assign, start or stop a sequence.",
        example: { kind: "flow", nodes: ["Send template “price_list”", "Add tag “pricing”", "Assign to Sales team"] },
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

  {
    id: "chatbot",
    version: 1,
    title: "Chatbot",
    summary: "AI or step-by-step bots that answer customers for you.",
    section: "Automation",
    startHref: "/chatbot",
    navHref: "/chatbot",
    match: exact("/chatbot"),
    steps: [
      {
        title: "Two kinds of bot",
        body: "An AI chatbot answers in its own words from your business knowledge. A custom flow follows the buttons and questions you design.",
        example: {
          kind: "chat",
          messages: [
            { from: "customer", text: "What time do you close today?" },
            { from: "bot", text: "We're open till 8 pm today. Would you like to book a slot?" },
          ],
        },
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
        body: "Edit, pause or activate each one. Only active bots reply to customers.",
      },
    ],
  },

  {
    id: "chatbot-builder",
    version: 1,
    title: "Flow builder",
    summary: "Design a chatbot flow with nodes, or switch it to AI mode.",
    section: "Automation",
    startHref: "/chatbot",
    startHint: "Open any chatbot",
    navHref: "/chatbot",
    // /chatbot/knowledge has its own tour
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
        body: "Set what starts the bot (e.g. the keyword “menu” or any first message), then add nodes: message, buttons, question, condition, hand over to a person.",
        example: { kind: "flow", nodes: ["Trigger: “menu”", "Buttons: Prices / Timings / Talk to us", "Reply", "Hand over"] },
      },
      {
        target: "[role=\"switch\"][aria-label=\"AI mode\"]",
        ifMissing: "skip",
        title: "AI mode",
        body: "Turn on to let AI answer instead of a fixed flow, using a short instruction and your knowledge documents.",
        example: { kind: "tip", text: "Example instruction: “You are Kavya Boutique's assistant. Be brief, friendly, and offer the catalogue.”" },
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
  },

  {
    id: "bot-knowledge",
    version: 1,
    title: "Bot knowledge",
    summary: "What the AI bot knows: websites, files, FAQs and instructions.",
    section: "Automation",
    startHref: "/chatbot/knowledge",
    navHref: "/chatbot",
    match: exact("/chatbot/knowledge"),
    steps: [
      {
        target: "kb-websites",
        title: "Your website",
        body: "Add your site's address and the bot reads its pages for answers.",
        example: { kind: "chips", items: ["kavyaboutique.in", "kavyaboutique.in/shipping"] },
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
        example: {
          kind: "fields",
          rows: [
            ["Q", "Do you deliver outside India?"],
            ["A", "Yes, to the UAE and UK in 7–10 days."],
          ],
        },
      },
      {
        target: "kb-files",
        title: "Files",
        body: "Upload price lists, brochures or policies as PDF or text.",
      },
      {
        target: "kb-instructions",
        title: "Instructions and handover",
        body: "Tone and rules for the bot (e.g. “never promise discounts”), and when to pass the chat to a person.",
      },
      {
        target: "#test-bot",
        title: "Test your bot",
        body: "Ask a question as a customer would and see the answer and which source it used.",
        example: { kind: "chat", messages: [{ from: "customer", text: "What are your prices?" }] },
      },
    ],
  },

  {
    id: "chat-widget",
    version: 1,
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
        body: "Company name, colour, position, avatar, welcome message and a WhatsApp button so visitors can continue on WhatsApp.",
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
        title: "Ask for details first",
        body: "Optionally ask for name and phone before chatting, so every visitor becomes a contact.",
      },
      {
        target: "widget-ai",
        only: "desktop",
        title: "AI replies",
        body: "Let the AI assistant answer visitors at any hour using your bot knowledge.",
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
