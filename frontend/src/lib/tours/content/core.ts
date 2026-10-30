import type { TourDef } from "../types";
import { exact } from "../match";

/** App-wide tour (runs once, first) and the home, search, alerts and More screens */
export const coreTours: TourDef[] = [
  {
    id: "welcome",
    version: 1,
    title: "Welcome to Wazelo",
    summary: "The 1-minute lay of the land: menu, search, alerts and your account.",
    section: "Getting started",
    startHref: "/dashboard",
    // Runs on whatever screen the user lands on first
    match: () => true,
    steps: [
      {
        title: "Welcome to Wazelo 👋",
        body: "Wazelo puts your WhatsApp chats, leads, campaigns and automations in one place. This quick tour shows where everything lives. Each screen also has its own short tour the first time you open it.",
        example: {
          kind: "flow",
          nodes: ["Customer messages you", "Reply in Inbox", "Track as a lead", "Follow up automatically"],
        },
      },
      {
        target: "#app-sidebar",
        only: "desktop",
        placement: "right",
        title: "Your menu",
        body: "Every feature is grouped here: Messaging, Sales, Marketing, Automation and Settings. You only see what your role and plan include.",
        example: { kind: "tip", text: "Press [ to fold the menu into a slim rail and get more room." },
      },
      {
        target: "ai-credits-widget",
        only: "desktop",
        placement: "right",
        title: "AI credits",
        body: "AI features such as reply suggestions, summaries, the AI chatbot and writing templates use credits. This shows how many are left this month.",
        example: {
          kind: "fields",
          rows: [
            ["Suggest a reply", "1 credit"],
            ["Summarize a chat", "1 credit"],
            ["Search your FAQs", "Free"],
          ],
        },
      },
      {
        target: "search",
        only: "desktop",
        title: "Search everything",
        body: "Find any contact, chat or campaign by name, phone number or text. Press Ctrl+K (⌘K on Mac) from anywhere.",
        example: { kind: "chips", items: ["Priya Sharma", "+91 98765 43210", "Diwali sale"] },
      },
      {
        target: "status-chip",
        only: "desktop",
        title: "Health at a glance",
        body: "Credits left and your WhatsApp connection. It stays quiet while all is fine and turns amber or red when something needs you, for example a disconnected number.",
      },
      {
        target: "notifications",
        only: "desktop",
        title: "Notifications",
        body: "New chats assigned to you, campaign results, failed messages and team mentions arrive here.",
      },
      {
        target: "help",
        only: "desktop",
        title: "Replay any tour",
        body: "Click ? any time to watch this screen's tour again, as often as you like. Every tour is also listed under Support → Product tours.",
      },
      {
        target: "account-menu",
        only: "desktop",
        title: "Your account",
        body: "Your profile, plan and billing, light or dark theme, and sign out.",
      },
      // Phones and tablets
      {
        target: "[aria-label=\"Tabs\"]",
        only: "mobile",
        title: "The tab bar",
        body: "Your most used screens are one tap away: Home, Inbox, Contacts and More. Tap the current tab again to jump back to the top.",
        example: { kind: "chips", items: ["Home", "Inbox", "Apps", "Contacts", "More"] },
      },
      {
        target: "tab-apps",
        only: "mobile",
        title: "Every app in one sheet",
        body: "The + in the middle opens all your screens as app icons: campaigns, automation, chatbot, settings and more.",
      },
      {
        target: "tab-inbox",
        only: "mobile",
        title: "Inbox",
        body: "WhatsApp and website chats. The red number is how many chats are unread.",
      },
      {
        target: ["m-bell", "m-search"],
        only: "mobile",
        title: "Alerts and search",
        body: "The bell shows notifications. The magnifier searches contacts, chats and campaigns.",
      },
      {
        target: "m-help",
        only: "mobile",
        title: "Watch a tour again",
        body: "Tap ? at the top of any screen to replay its tour, as often as you like.",
      },
      {
        target: "tab-more",
        only: "mobile",
        title: "More",
        body: "Settings, your profile, notifications on this phone, theme, Install app and Product tours.",
        example: { kind: "tip", text: "Add Wazelo to your home screen from More → Install app for a full-screen app." },
      },
      {
        title: "You're ready",
        body: "Next is a short look at this screen. Skip any tour with Esc or ✕; the ? button replays it whenever you want.",
      },
    ],
  },

  {
    id: "dashboard",
    version: 1,
    title: "Dashboard",
    summary: "Setup checklist, key numbers and charts for your team.",
    section: "Getting started",
    startHref: "/dashboard",
    orgType: "TEAM",
    match: exact("/dashboard"),
    steps: [
      {
        target: "page-actions",
        title: "Pick a period",
        body: "Every number and chart on this page follows the period you choose: today, the last 7 or 30 days, or a custom range.",
        example: { kind: "chips", items: ["Today", "Last 7 days", "Last 30 days", "Custom"] },
      },
      {
        target: "setup-checklist",
        title: "Get set up",
        body: "Work down this checklist to go live. Each item opens the right screen and ticks itself once done.",
        example: {
          kind: "steps",
          items: ["Connect your WhatsApp number", "Import contacts from a CSV", "Create your first template", "Invite a teammate"],
        },
      },
      {
        target: "kpi-cards",
        title: "Key numbers",
        body: "Conversations, average first reply time, and conversion (managers) or messages sent (agents), compared with the previous period.",
        example: {
          kind: "fields",
          rows: [
            ["Conversations", "248  ▲ 12%"],
            ["First reply", "4m 20s  ▼ 1m"],
            ["Conversion", "18%  ▲ 3%"],
          ],
        },
      },
      {
        target: "dash-charts",
        title: "Message volume and reply speed",
        body: "See your busiest days and how quickly the team replies. A rising reply time usually means you need more people on the inbox at peak hours.",
      },
      {
        target: "dash-manager",
        roles: ["ADMIN", "MANAGER"],
        title: "Funnel, peak hours and team",
        body: "Track how many leads move from New to Converted, when customers message most, and how each agent is doing.",
        example: { kind: "flow", nodes: ["New 120", "Contacted 80", "Interested 34", "Converted 18"] },
      },
    ],
  },

  {
    id: "dashboard-freelancer",
    version: 1,
    title: "Home",
    summary: "What needs you today, your lead numbers and this week's activity.",
    section: "Getting started",
    startHref: "/dashboard/freelancer",
    orgType: "FREELANCER",
    match: exact("/dashboard/freelancer"),
    steps: [
      {
        target: "nav[aria-label=\"Quick actions\"]",
        only: "desktop",
        title: "Quick actions",
        body: "Jump straight to the inbox, find new leads, start a campaign or set up a follow-up sequence.",
      },
      {
        target: ["page-actions", "m-primary"],
        title: "Add a lead",
        body: "Met someone at an event or got a referral? Add them with name, phone and the service they need.",
        example: {
          kind: "fields",
          rows: [
            ["Name", "Rahul Verma"],
            ["Phone", "+91 98200 11223"],
            ["Needs", "Website redesign"],
          ],
        },
      },
      {
        target: "needs-you",
        title: "Needs you today",
        body: "Unread chats and follow-ups that are due. Tick a follow-up when it's done and it drops off the list.",
        example: { kind: "chips", items: ["2 unread chats", "Follow up: Anita (proposal sent)", "Call back: Rahul"] },
      },
      {
        target: "fl-kpis",
        title: "Your numbers",
        body: "Total leads, open conversations, interested leads and clients won.",
      },
      {
        target: "fl-week",
        title: "This week",
        body: "Messages sent and received each day, so you can see whether outreach is picking up.",
      },
      {
        target: "fl-pipeline",
        title: "Client pipeline",
        body: "How many leads sit at each stage, from first contact to won. Open Deals to move them along.",
      },
    ],
  },

  {
    id: "search",
    version: 1,
    title: "Search",
    summary: "Find contacts, conversations and campaigns from one box.",
    section: "Getting started",
    startHref: "/search",
    match: exact("/search"),
    steps: [
      {
        target: "search-input",
        title: "Search across your CRM",
        body: "Type a name, phone number, tag or campaign name. Results come in three groups: contacts, conversations and campaigns.",
        example: { kind: "chips", items: ["priya", "98765", "vip", "Diwali"] },
      },
      {
        title: "Tip: search from anywhere",
        body: "You don't need this page to search: press Ctrl+K (⌘K) on desktop, or tap the magnifier in the top bar on your phone.",
      },
    ],
  },

  {
    id: "notifications",
    version: 1,
    title: "Notifications",
    summary: "Read, filter and clear your alerts.",
    section: "Getting started",
    startHref: "/notifications",
    match: exact("/notifications"),
    steps: [
      {
        target: "notif-segments",
        title: "All or unread",
        body: "Switch to Unread to see only what you haven't opened yet.",
      },
      {
        target: ["notif-list", "empty-state"],
        title: "Your alerts",
        body: "Open an alert to go to the chat, campaign or contact it's about.",
        example: { kind: "chips", items: ["New chat assigned to you", "Campaign 'Diwali offer' completed", "3 messages failed"] },
      },
      {
        target: "notif-list",
        only: "mobile",
        title: "Swipe to tidy up",
        body: "Swipe an alert left to mark it read or delete it. Edit (top right) marks everything read or clears read alerts.",
      },
      {
        target: "page-actions",
        only: "desktop",
        title: "Clean up",
        body: "Mark all read, or clear the alerts you've already read.",
      },
    ],
  },

  {
    id: "more",
    version: 1,
    title: "More",
    summary: "Every screen not on the tab bar, plus this phone's settings.",
    section: "Getting started",
    startHref: "/more",
    match: exact("/more"),
    steps: [
      {
        target: "more-profile",
        title: "Your profile",
        body: "Tap to change your name, email or password.",
      },
      {
        target: "more-sections",
        title: "All your screens",
        body: "Everything from the desktop menu, in the same groups: Sales, Marketing, Automation, Settings and Support.",
      },
      {
        target: "more-device",
        title: "This device",
        body: "Turn on notifications for this phone, pick light or dark, and install Wazelo as an app.",
        example: { kind: "tip", text: "Turn on notifications to hear about new chats even when Wazelo is closed." },
      },
    ],
  },
];
