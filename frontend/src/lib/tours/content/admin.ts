import type { TourDef } from "../types";
import { exact, listOrEmpty, primaryAction } from "../match";

/** Manager's team page and the admin pages */
export const adminTours: TourDef[] = [
  {
    id: "team",
    version: 1,
    title: "My team",
    summary: "Your team members, their WhatsApp status and inboxes.",
    section: "Team and admin",
    startHref: "/team",
    navHref: "/team",
    match: exact("/team"),
    steps: [
      {
        target: listOrEmpty,
        title: "Your team",
        body: "Each member with their team and whether their WhatsApp is connected.",
      },
      {
        title: "View a member's inbox",
        body: "Use “View inbox” to read their chats, e.g. to cover while they're on leave. It's available once their number is connected.",
      },
    ],
  },

  {
    id: "admin-users",
    version: 1,
    title: "Users",
    summary: "Invite people, set roles and disable access.",
    section: "Team and admin",
    startHref: "/admin/users",
    navHref: "/admin/users",
    match: exact("/admin/users"),
    steps: [
      {
        target: primaryAction(),
        title: "Add people",
        body: "Invite by email; they set their own password. Choose a role.",
        example: {
          kind: "fields",
          rows: [
            ["Admin", "Everything, including billing"],
            ["Manager", "Their team, campaigns, automation"],
            ["Employee", "Their own chats and contacts"],
          ],
        },
      },
      {
        target: "admin-invites",
        title: "Pending invitations",
        body: "Invites not yet accepted. Revoke one if it went to the wrong address.",
      },
      {
        target: listOrEmpty,
        title: "Everyone",
        body: "Click a role to change it, view someone's inbox, or disable a user who left (their chats and contacts stay).",
      },
    ],
  },

  {
    id: "admin-teams",
    version: 1,
    title: "Teams",
    summary: "Group people into teams with a manager.",
    section: "Team and admin",
    startHref: "/admin/teams",
    navHref: "/admin/teams",
    match: exact("/admin/teams"),
    steps: [
      {
        target: primaryAction(),
        title: "Create a team",
        body: "Give it a name and a manager. Managers see their team's chats and numbers.",
        example: { kind: "chips", items: ["Sales · Rahul", "Support · Priya", "Wholesale · Arjun"] },
      },
      {
        target: listOrEmpty,
        title: "Your teams",
        body: "Open a team to add or remove members.",
      },
    ],
  },

  {
    id: "admin-whatsapp-sessions",
    version: 1,
    title: "WhatsApp sessions",
    summary: "Everyone's WhatsApp connections in one place.",
    section: "Team and admin",
    startHref: "/admin/whatsapp-sessions",
    navHref: "/admin/whatsapp-sessions",
    match: exact("/admin/whatsapp-sessions"),
    steps: [
      {
        target: "filter-bar",
        title: "Find a session",
        body: "Search by person and filter by status: connected, connecting or disconnected.",
      },
      {
        target: listOrEmpty,
        title: "Fix connections",
        body: "Reconnect or disconnect a number. A disconnected number can't send or receive until its owner links it again.",
      },
    ],
  },

  {
    id: "admin-permissions",
    version: 1,
    title: "Permissions",
    summary: "Fine-tune what managers and employees can do.",
    section: "Team and admin",
    startHref: "/admin/roles-permissions",
    navHref: "/admin/roles-permissions",
    match: exact("/admin/roles-permissions"),
    steps: [
      {
        target: "permissions-matrix",
        title: "Role × permission",
        body: "Tick what each role may do. Admin always has everything and can't be changed.",
        example: { kind: "chips", items: ["contacts: delete", "campaigns: create", "billing: read"] },
      },
      {
        target: ["page-actions", "permissions-save"],
        ifMissing: "skip",
        title: "Save or reset",
        body: "Save applies the changes at people's next action; Reset goes back to the defaults.",
      },
    ],
  },

  {
    id: "admin-audit-logs",
    version: 1,
    title: "Audit logs",
    summary: "Who did what, and when.",
    section: "Team and admin",
    startHref: "/admin/audit-logs",
    navHref: "/admin/audit-logs",
    match: exact("/admin/audit-logs"),
    steps: [
      {
        target: "filter-bar",
        title: "Filter",
        body: "By action type and date range.",
      },
      {
        target: listOrEmpty,
        title: "The log",
        body: "Click a row for the details: who, what changed, IP address and time.",
        example: { kind: "fields", rows: [["Rahul", "deleted contact “Test”"], ["When", "30 Oct, 11:42 am"]] },
      },
    ],
  },

  {
    id: "admin-gdpr",
    version: 1,
    title: "GDPR",
    summary: "Data export and erasure requests.",
    section: "Team and admin",
    startHref: "/admin/gdpr",
    navHref: "/admin/gdpr",
    match: exact("/admin/gdpr"),
    steps: [
      {
        target: "gdpr-counts",
        title: "Requests",
        body: "Exports (a copy of someone's data) and erasures (delete it), and how many are pending.",
      },
      {
        target: listOrEmpty,
        title: "Request list",
        body: "Requests are started from a contact's profile and tracked here until done.",
      },
    ],
  },
];
