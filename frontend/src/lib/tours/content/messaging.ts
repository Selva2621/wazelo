import type { TourDef } from "../types";
import { exact } from "../match";

const memberInbox = (p: string) => /^\/(team\/members|admin\/users)\/[^/]+\/inbox$/.test(p);

/** Inbox: WhatsApp + website chats, AI help, quick replies */
export const messagingTours: TourDef[] = [
  {
    id: "inbox",
    version: 1,
    title: "Inbox",
    summary: "Reply to WhatsApp and website chats with AI help, quick replies and the contact panel.",
    section: "Messaging",
    startHref: "/inbox",
    navHref: "/inbox",
    match: exact("/inbox"),
    steps: [
      {
        target: "inbox-connect",
        title: "Connect WhatsApp first",
        body: "Your inbox fills up once your WhatsApp number is linked. It takes about a minute: scan a QR code from WhatsApp on your phone.",
        example: {
          kind: "steps",
          items: ["Click Connect WhatsApp", "On your phone: WhatsApp → Linked devices → Link a device", "Scan the QR code"],
        },
      },
      {
        target: "nav[aria-label=\"Inbox channel\"]",
        title: "WhatsApp and website chats",
        body: "Switch between WhatsApp chats and chats from the widget on your website. The number shows website visitors who are waiting for a reply.",
        example: { kind: "chips", items: ["WhatsApp", "Website · 2 waiting"] },
      },
      {
        target: "inbox-scope",
        roles: ["ADMIN", "MANAGER"],
        title: "Whose chats you see",
        body: "Admins can view everyone's chats; managers can view their team's or one person's. Agents always see only their own.",
        example: { kind: "chips", items: ["My chats", "My team's chats", "Everyone's chats", "Priya's chats"] },
      },
      {
        target: "chat-search",
        title: "Find a chat",
        body: "Search by name, phone number or message text.",
      },
      {
        target: "chat-filters",
        title: "Unread and mine",
        body: "All shows every chat; Unread shows the ones waiting for you; Mine shows chats assigned to you.",
      },
      {
        target: "chat-list",
        title: "Your conversations",
        body: "Newest first, with the last message, time and an unread count. Open one to read and reply.",
        example: {
          kind: "chat",
          messages: [{ from: "customer", text: "Hi, is the blue kurta available in size M?" }],
        },
      },
      {
        target: "chat-composer",
        ifMissing: "center",
        title: "Reply",
        body: "Type and press Enter to send. Attach photos, PDFs or voice notes with the paperclip, and add emoji. Shift+Enter adds a new line.",
        example: {
          kind: "chat",
          messages: [
            { from: "customer", text: "Hi, is the blue kurta available in size M?" },
            { from: "you", text: "Yes! Size M is in stock. Shall I share the payment link? 😊" },
          ],
        },
      },
      {
        target: ["chat-quick-replies", "chat-more"],
        ifMissing: "center",
        title: "Quick replies",
        body: "Save answers you type often and insert them with one click, or type / in the message box to search them.",
        example: {
          kind: "template",
          name: "/timings",
          body: "We're open Mon–Sat, 10 am to 8 pm. Visit us at {{address}}.",
          preview: "We're open Mon–Sat, 10 am to 8 pm. Visit us at MG Road, Bengaluru.",
        },
      },
      {
        target: "chat-ai",
        ifMissing: "center",
        title: "AI help",
        body: "“About this chat” reads the conversation and suggests a reply in your tone, or searches your FAQs for the answer. Suggestions cost a credit; FAQ search is free.",
        example: {
          kind: "chat",
          messages: [
            { from: "customer", text: "Do you deliver to Pune?" },
            { from: "bot", text: "Suggested: Yes, we deliver to Pune in 3–4 days. Shipping is free above ₹999." },
          ],
        },
      },
      {
        target: "chat-summarize",
        ifMissing: "skip",
        title: "Summarize long chats",
        body: "Catch up on a long conversation in three lines before you reply, for example when a chat is handed over to you.",
      },
      {
        target: ["chat-header-actions", "[aria-label=\"Conversation actions\"]"],
        ifMissing: "skip",
        title: "Chat actions",
        body: "Close or reopen the chat, archive it, create a deal, send a satisfaction survey (CSAT), or delete it.",
        example: { kind: "chips", items: ["Close", "Archive", "Create deal", "Send survey"] },
      },
      {
        target: "chat-contact-panel",
        ifMissing: "skip",
        only: "desktop",
        title: "Contact panel",
        body: "Everything about the person you're chatting with: lead status, tags, owner, notes and products. You can also send them a proposal from here.",
        example: {
          kind: "fields",
          rows: [
            ["Status", "Interested"],
            ["Tags", "vip, wholesale"],
            ["Owner", "Priya"],
          ],
        },
      },
    ],
  },

  {
    id: "member-inbox",
    version: 1,
    title: "Teammate's inbox",
    summary: "Read a teammate's chats to help or review (managers and admins).",
    section: "Messaging",
    startHref: "/team",
    startHint: "Open a teammate's inbox from My team or Users",
    roles: ["ADMIN", "MANAGER"],
    match: memberInbox,
    steps: [
      {
        title: "Viewing a teammate's inbox",
        body: "These are their WhatsApp chats on their own number. Use this to check how customers are handled or to pick up urgent chats while they're away.",
        example: { kind: "tip", text: "Agents see this as their own inbox; nothing changes for them." },
      },
      {
        target: "chat-list",
        title: "Their conversations",
        body: "Open any chat to read the full history.",
      },
    ],
  },
];
