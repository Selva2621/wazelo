import type { TourDef } from "../types";
import { detail, exact, listOrEmpty, primaryAction } from "../match";

/** Contacts, lead finding, pipeline, deals, proposals and the product catalogue */
export const salesTours: TourDef[] = [
  {
    id: "contacts",
    version: 1,
    title: "Contacts",
    summary: "Add, import, filter and bulk-edit contacts and leads; list or board view.",
    section: "Sales",
    startHref: "/contacts",
    navHref: "/contacts",
    match: exact("/contacts"),
    steps: [
      {
        target: primaryAction("contacts-new"),
        title: "Add a contact",
        body: "Add one person with name, phone (with country code), email, tags and lead status.",
        example: {
          kind: "fields",
          rows: [
            ["Name", "Priya Sharma"],
            ["Phone", "+91 98765 43210"],
            ["Tags", "vip, diwali-2026"],
            ["Status", "New"],
          ],
        },
      },
      {
        target: ["contacts-tools", "m-more"],
        title: "Import, export and merge",
        body: "Import hundreds of contacts from a CSV, export your list, or merge duplicates of the same person.",
        example: {
          kind: "template",
          name: "contacts.csv",
          body: "name,phone,email,tags\nPriya Sharma,+919876543210,priya@mail.com,vip",
          preview: "1 contact imported with the tag “vip”",
        },
      },
      {
        target: "contacts-view-toggle",
        only: "desktop",
        title: "List or board",
        body: "The board shows contacts as cards in columns by lead status. Drag a card to change its status.",
      },
      {
        target: "filter-bar",
        title: "Filter",
        body: "Narrow by lead status, where the contact came from (a scrape run, campaign or the website), owner, tag or product.",
        example: { kind: "chips", items: ["Interested", "Source: Google Maps run", "Tag: vip", "Owner: Rahul"] },
      },
      {
        target: [...listOrEmpty, "contacts-board"],
        title: "Your contacts",
        body: "Open a contact for the full profile. Tick several to change status, add tags, assign an owner or start a campaign for just those people.",
        example: { kind: "chips", items: ["Change status", "Add tag", "Assign", "Delete"] },
      },
    ],
  },

  {
    id: "contact-detail",
    version: 1,
    title: "Contact profile",
    summary: "One contact's status, tags, deals, products, notes and history.",
    section: "Sales",
    startHref: "/contacts",
    startHint: "Open any contact",
    navHref: "/contacts",
    match: detail("/contacts"),
    steps: [
      {
        target: "contact-profile",
        title: "Profile",
        body: "Name, phone, email, owner and lead score. The score rises as the contact replies, opens proposals and moves through your pipeline.",
      },
      {
        target: ["contact-actions", "m-primary"],
        title: "Message or open the chat",
        body: "Send a WhatsApp message (or a template if it's been more than 24 hours), or jump to the conversation. Edit, assign and export are here too.",
      },
      {
        target: "contact-status",
        title: "Lead status",
        body: "Click to move the contact along. The pipeline and dashboard funnel update straight away.",
        example: { kind: "flow", nodes: ["New", "Contacted", "Interested", "Converted"] },
      },
      {
        target: "contact-tags",
        title: "Tags",
        body: "Labels you can filter and target campaigns by.",
        example: { kind: "chips", items: ["vip", "wholesale", "pune", "diwali-2026"] },
      },
      {
        target: "contact-tabs",
        title: "Everything else",
        body: "Overview with custom fields, Deals, Products they're interested in, private Notes for your team, and the Activity history.",
        example: { kind: "chips", items: ["Overview", "Deals", "Products", "Notes", "Activity"] },
      },
    ],
  },

  {
    id: "lead-scraper",
    version: 1,
    title: "Lead scraper",
    summary: "Find new leads on Google Maps, freelance sites and LinkedIn.",
    section: "Sales",
    startHref: "/leads/scraper",
    navHref: "/leads/scraper",
    match: exact("/leads/scraper"),
    steps: [
      {
        target: "scraper-sources",
        title: "Pick a source",
        body: "Google Maps finds local businesses with phone numbers. Upwork, Freelancer, Truelancer and LinkedIn find people posting work you can pitch for.",
        example: { kind: "chips", items: ["Google Maps", "Upwork", "Freelancer.in", "Truelancer", "LinkedIn"] },
      },
      {
        target: "scraper-form",
        ifMissing: "center",
        title: "Describe who you want",
        body: "Enter business types or keywords, a location and how many results. Filters can keep only places with a phone number or a minimum rating.",
        example: {
          kind: "fields",
          rows: [
            ["Looking for", "dental clinics, physiotherapy"],
            ["Location", "Koramangala, Bengaluru"],
            ["Max results", "100"],
          ],
        },
      },
      {
        target: ["scraper-runs", ...listOrEmpty],
        title: "Recent runs",
        body: "Each search is a run. Open one to review results, check who's on WhatsApp and import them as contacts. You can add a note, re-run or duplicate a run.",
        example: { kind: "flow", nodes: ["Run", "Check WhatsApp", "Import", "Message leads"] },
      },
    ],
  },

  {
    id: "scraper-run",
    version: 1,
    title: "Scraper results",
    summary: "Check WhatsApp, import and message the leads a run found.",
    section: "Sales",
    startHref: "/leads/scraper",
    startHint: "Open any scraper run",
    navHref: "/leads/scraper",
    match: detail("/leads/scraper"),
    steps: [
      {
        target: "run-counts",
        title: "What the run found",
        body: "How many results were found, how many are new and how many you've already imported.",
      },
      {
        target: "filter-bar",
        title: "Narrow the list",
        body: "Search, filter by category, rating score, imported or not, and WhatsApp status. “Select all WA active” picks everyone you can message.",
      },
      {
        target: ["run-toolbar", "m-more"],
        title: "Check, import, message",
        body: "Check WhatsApp tells you which numbers are on WhatsApp. Import adds the selected rows as contacts. Message leads starts an outreach with a pitch template.",
        example: {
          kind: "template",
          name: "Pitch",
          body: "Hi {{name}}, I came across {{business}} on Google Maps. We help clinics get more bookings on WhatsApp. Open to a quick chat?",
          preview: "Hi Dr. Mehta, I came across Smile Dental on Google Maps. We help clinics get more bookings on WhatsApp. Open to a quick chat?",
        },
      },
      {
        target: listOrEmpty,
        title: "Results",
        body: "Each row shows the business, phone, rating, address and website. Open a row for full details.",
      },
    ],
  },

  {
    id: "lead-pipeline",
    version: 1,
    title: "Lead pipeline",
    summary: "Move leads from New to Closed and turn them into deals.",
    section: "Sales",
    startHref: "/leads/pipeline",
    navHref: "/leads/pipeline",
    match: exact("/leads/pipeline"),
    steps: [
      {
        target: "filter-bar",
        title: "Pick a lead source",
        body: "Show every lead, or only those from one scrape run, campaign or the website widget.",
      },
      {
        target: ["pipeline-board", "[role=\"tablist\"][aria-label=\"Lead statuses\"]"],
        title: "One column per status",
        body: "On desktop, drag a card to the next column. On a phone, pick a status tab and use ⋮ on a lead to move it.",
        example: { kind: "flow", nodes: ["New", "Contacted", "Interested", "Converted", "Closed"] },
      },
      {
        title: "Convert to a deal",
        body: "When a lead is serious, use “Convert to deal” on its card. The deal gets a value and a stage so you can track the money.",
        example: {
          kind: "fields",
          rows: [
            ["Deal", "Smile Dental: website"],
            ["Value", "₹45,000"],
            ["Stage", "Proposal sent"],
          ],
        },
      },
    ],
  },

  {
    id: "deals",
    version: 1,
    title: "Deals",
    summary: "Track deals by stage, value and pipeline.",
    section: "Sales",
    startHref: "/deals",
    navHref: "/deals",
    match: exact("/deals"),
    steps: [
      {
        target: ["page-actions", "m-more", "empty-state"],
        title: "Pipelines",
        body: "A pipeline is your sales process as stages. Create one per service if they sell differently.",
        example: { kind: "flow", nodes: ["Enquiry", "Proposal sent", "Negotiation", "Won"] },
      },
      {
        target: "deals-summary",
        title: "At a glance",
        body: "Open deals, their total value and how much you've won.",
        example: {
          kind: "fields",
          rows: [
            ["Deals", "12"],
            ["Value", "₹3,40,000"],
            ["Won", "₹1,10,000"],
          ],
        },
      },
      {
        target: ["deals-board", "[role=\"tablist\"][aria-label=\"Stages\"]"],
        title: "Move deals along",
        body: "Drag a deal to the next stage (on a phone, use the stage tabs and ⋮). Open a deal to add notes, set a close date or send a proposal.",
      },
      {
        target: "m-primary",
        only: "mobile",
        title: "Add a deal",
        body: "Tap + to add a deal for a contact with its value and stage.",
      },
    ],
  },

  {
    id: "proposals",
    version: 1,
    title: "Proposals",
    summary: "See every proposal and where it stands.",
    section: "Sales",
    startHref: "/proposals",
    navHref: "/proposals",
    match: exact("/proposals"),
    steps: [
      {
        title: "Where proposals start",
        body: "Create a proposal from a chat's contact panel or from a deal (“Send proposal”). It's then listed here.",
        example: { kind: "flow", nodes: ["Chat or deal", "Send proposal", "Client opens link", "Accepts"] },
      },
      {
        target: "filter-bar",
        title: "Filter by status",
        body: "See drafts, sent, viewed (the client opened it), changes requested and accepted.",
        example: { kind: "chips", items: ["Draft", "Sent", "Viewed", "Changes", "Accepted"] },
      },
      {
        target: listOrEmpty,
        title: "Your proposals",
        body: "Open one to edit, resend or download it as a PDF.",
      },
    ],
  },

  {
    id: "proposal-editor",
    version: 1,
    title: "Proposal editor",
    summary: "Write a proposal with line items, preview it and send it on WhatsApp.",
    section: "Sales",
    startHref: "/proposals",
    startHint: "Open any proposal",
    navHref: "/proposals",
    match: detail("/proposals"),
    steps: [
      {
        target: "proposal-form",
        title: "Write it",
        body: "Title, intro, scope of work, tax, discount, validity and terms. Or let AI write a first draft from the chat.",
      },
      {
        target: "proposal-items",
        title: "Line items",
        body: "Add items by hand or pick from your product/service list. Totals and tax are worked out for you.",
        example: {
          kind: "fields",
          rows: [
            ["Website design", "₹30,000"],
            ["SEO setup", "₹10,000"],
            ["GST 18%", "₹7,200"],
            ["Total", "₹47,200"],
          ],
        },
      },
      {
        target: "proposal-preview",
        title: "Live preview",
        body: "Exactly what your client sees on their link, updated as you type.",
      },
      {
        target: ["page-actions", "m-primary"],
        title: "Send on WhatsApp",
        body: "Sends the client a link. You'll see here when they view it, ask for changes or accept. Copy link and Download PDF are next to it.",
        example: {
          kind: "chat",
          messages: [
            { from: "you", text: "Hi Anita, here's the proposal for your website: wazelo.app/p/7Hk2" },
            { from: "customer", text: "Looks good, accepted ✅" },
          ],
        },
      },
    ],
  },

  {
    id: "products",
    version: 1,
    title: "Products and services",
    summary: "Your catalogue for contacts, deals, proposals, chatbots and sequences.",
    section: "Sales",
    startHref: "/settings/products",
    navHref: "/settings/products",
    match: exact("/settings/products"),
    steps: [
      {
        target: primaryAction(),
        title: "Add what you sell",
        body: "Name, price, category and a short description. Products appear in proposals, contact profiles, campaign filters and chatbot answers.",
        example: {
          kind: "fields",
          rows: [
            ["Name", "Monthly SEO package"],
            ["Price", "₹12,000 / month"],
            ["Category", "Marketing"],
          ],
        },
      },
      {
        target: "filter-bar",
        title: "Categories",
        body: "Group items so they're easier to find, e.g. Design, Development, Marketing.",
      },
      {
        target: listOrEmpty,
        title: "Your catalogue",
        body: "Switch an item off to hide it without deleting it; edit or delete from its row.",
      },
    ],
  },
];
