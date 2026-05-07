/**
 * EPIC 8 — Granular Permission Definitions
 *
 * Convention: `resource:action`
 * Every API endpoint maps to exactly one permission string.
 * ADMIN role bypasses all checks (hardcoded in guard).
 */

// ─────────────────────────────────────────────
// Permission string constants
// ─────────────────────────────────────────────

export const PERMISSIONS = {
  // ── Contacts ──
  CONTACTS_READ: 'contacts:read',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_UPDATE: 'contacts:update',
  CONTACTS_DELETE: 'contacts:delete',
  CONTACTS_ASSIGN: 'contacts:assign',
  CONTACTS_MERGE: 'contacts:merge',
  CONTACTS_EXPORT: 'contacts:export',

  // ── Messages ──
  MESSAGES_READ: 'messages:read',
  MESSAGES_SEND: 'messages:send',

  // ── Conversations ──
  CONVERSATIONS_READ: 'conversations:read',
  CONVERSATIONS_UPDATE: 'conversations:update',

  // ── Campaigns ──
  CAMPAIGNS_READ: 'campaigns:read',
  CAMPAIGNS_CREATE: 'campaigns:create',
  CAMPAIGNS_UPDATE: 'campaigns:update',
  CAMPAIGNS_EXECUTE: 'campaigns:execute',
  CAMPAIGNS_CANCEL: 'campaigns:cancel',

  // ── Scheduled Messages ──
  SCHEDULER_READ: 'scheduler:read',
  SCHEDULER_CREATE: 'scheduler:create',
  SCHEDULER_UPDATE: 'scheduler:update',
  SCHEDULER_CANCEL: 'scheduler:cancel',

  // ── Automation ──
  AUTOMATION_READ: 'automation:read',
  AUTOMATION_CREATE: 'automation:create',
  AUTOMATION_UPDATE: 'automation:update',
  AUTOMATION_DELETE: 'automation:delete',
  AUTOMATION_LOGS_READ: 'automation:logs_read',

  // ── WhatsApp Sessions ──
  WHATSAPP_SESSION_OWN: 'whatsapp:session_own',
  WHATSAPP_SESSION_VIEW_ALL: 'whatsapp:session_view_all',
  WHATSAPP_SESSION_ADMIN: 'whatsapp:session_admin',

  // ── Users ──
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_INVITE: 'users:invite',
  USERS_CHANGE_ROLE: 'users:change_role',
  USERS_DISABLE: 'users:disable',

  // ── Organization ──
  ORG_READ: 'org:read',
  ORG_UPDATE: 'org:update',

  // ── RBAC Management ──
  RBAC_READ: 'rbac:read',
  RBAC_UPDATE: 'rbac:update',

  // ── Audit Logs ──
  AUDIT_READ: 'audit:read',

  // ── Dead Letters ──
  DEAD_LETTERS_READ: 'dead_letters:read',
  DEAD_LETTERS_REPROCESS: 'dead_letters:reprocess',

  // ── Billing & Subscriptions ──
  BILLING_READ: 'billing:read',
  BILLING_MANAGE: 'billing:manage',
  BILLING_PLANS_MANAGE: 'billing:plans_manage',
  BILLING_INVOICES_READ: 'billing:invoices_read',

  // ── Notifications ──
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_MANAGE: 'notifications:manage',

  // ── Settings & Configuration ──
  SETTINGS_READ: 'settings:read',
  SETTINGS_MANAGE: 'settings:manage',
  FEATURE_FLAGS_READ: 'feature_flags:read',
  FEATURE_FLAGS_MANAGE: 'feature_flags:manage',
  INTEGRATIONS_READ: 'integrations:read',
  INTEGRATIONS_MANAGE: 'integrations:manage',
  WEBHOOKS_READ: 'webhooks:read',
  WEBHOOKS_MANAGE: 'webhooks:manage',

  // ── Analytics ──
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',

  // ── Lead Ads (Social Ads Integration) ──
  LEAD_ADS_READ: 'lead_ads:read',
  LEAD_ADS_MANAGE: 'lead_ads:manage',

  // ── Channels (Multi-Channel Integration) ──
  CHANNELS_READ: 'channels:read',
  CHANNELS_CREATE: 'channels:create',
  CHANNELS_UPDATE: 'channels:update',
  CHANNELS_DELETE: 'channels:delete',
  CHANNELS_MANAGE: 'channels:manage',

  // ── SLA Tracking ──
  SLA_READ: 'sla:read',
  SLA_CREATE: 'sla:create',
  SLA_UPDATE: 'sla:update',
  SLA_DELETE: 'sla:delete',
  SLA_BREACH_READ: 'sla:breach_read',
  SLA_BREACH_ACKNOWLEDGE: 'sla:breach_acknowledge',
} as const;

export type PermissionString = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─────────────────────────────────────────────
// All permissions as a flat array (used for seeding)
// ─────────────────────────────────────────────

export interface PermissionSeed {
  resource: string;
  action: string;
  description: string;
}

export const ALL_PERMISSIONS: PermissionSeed[] = [
  // Contacts
  { resource: 'contacts', action: 'read', description: 'View contacts list and details' },
  { resource: 'contacts', action: 'create', description: 'Create new contacts' },
  { resource: 'contacts', action: 'update', description: 'Edit contact information' },
  { resource: 'contacts', action: 'delete', description: 'Delete contacts (soft delete)' },
  { resource: 'contacts', action: 'assign', description: 'Reassign contact ownership' },
  { resource: 'contacts', action: 'merge', description: 'Merge duplicate contacts' },
  { resource: 'contacts', action: 'export', description: 'Export contacts data' },

  // Messages
  { resource: 'messages', action: 'read', description: 'View messages' },
  { resource: 'messages', action: 'send', description: 'Send WhatsApp messages' },

  // Conversations
  { resource: 'conversations', action: 'read', description: 'View conversations' },
  { resource: 'conversations', action: 'update', description: 'Mark conversations as read' },

  // Campaigns
  { resource: 'campaigns', action: 'read', description: 'View campaigns and analytics' },
  { resource: 'campaigns', action: 'create', description: 'Create new campaigns' },
  { resource: 'campaigns', action: 'update', description: 'Edit campaign details' },
  { resource: 'campaigns', action: 'execute', description: 'Start, pause, resume campaigns' },
  { resource: 'campaigns', action: 'cancel', description: 'Cancel campaigns' },

  // Scheduled Messages
  { resource: 'scheduler', action: 'read', description: 'View scheduled messages' },
  { resource: 'scheduler', action: 'create', description: 'Create scheduled messages' },
  { resource: 'scheduler', action: 'update', description: 'Edit scheduled messages' },
  { resource: 'scheduler', action: 'cancel', description: 'Cancel scheduled messages' },

  // Automation
  { resource: 'automation', action: 'read', description: 'View automation rules' },
  { resource: 'automation', action: 'create', description: 'Create automation rules' },
  { resource: 'automation', action: 'update', description: 'Edit and enable/disable automation rules' },
  { resource: 'automation', action: 'delete', description: 'Delete automation rules' },
  { resource: 'automation', action: 'logs_read', description: 'View automation execution logs' },

  // WhatsApp Sessions
  { resource: 'whatsapp', action: 'session_own', description: 'Manage own WhatsApp session' },
  { resource: 'whatsapp', action: 'session_view_all', description: 'View all WhatsApp sessions' },
  { resource: 'whatsapp', action: 'session_admin', description: 'Force disconnect any session' },

  // Users
  { resource: 'users', action: 'read', description: 'View user list and details' },
  { resource: 'users', action: 'create', description: 'Create users directly' },
  { resource: 'users', action: 'update', description: 'Edit user information' },
  { resource: 'users', action: 'delete', description: 'Delete users (soft delete)' },
  { resource: 'users', action: 'invite', description: 'Send user invitations' },
  { resource: 'users', action: 'change_role', description: 'Change user roles' },
  { resource: 'users', action: 'disable', description: 'Disable/enable user accounts' },

  // Organization
  { resource: 'org', action: 'read', description: 'View organization settings' },
  { resource: 'org', action: 'update', description: 'Update organization settings' },

  // RBAC
  { resource: 'rbac', action: 'read', description: 'View role-permission assignments' },
  { resource: 'rbac', action: 'update', description: 'Modify role-permission assignments' },

  // Audit
  { resource: 'audit', action: 'read', description: 'View audit logs' },

  // Dead Letters
  { resource: 'dead_letters', action: 'read', description: 'View dead-letter messages' },
  { resource: 'dead_letters', action: 'reprocess', description: 'Reprocess dead-letter messages' },

  // Billing & Subscriptions
  { resource: 'billing', action: 'read', description: 'View subscription and usage info' },
  { resource: 'billing', action: 'manage', description: 'Subscribe, upgrade, downgrade, cancel' },
  { resource: 'billing', action: 'plans_manage', description: 'Create and update billing plans (system admin)' },
  { resource: 'billing', action: 'invoices_read', description: 'View and download invoices' },

  // Notifications
  { resource: 'notifications', action: 'read', description: 'View and read notifications' },
  { resource: 'notifications', action: 'manage', description: 'Delete notifications and manage preferences' },

  // Settings & Configuration
  { resource: 'settings', action: 'read', description: 'View organization settings' },
  { resource: 'settings', action: 'manage', description: 'Create, update, and delete settings' },
  { resource: 'feature_flags', action: 'read', description: 'View feature flags' },
  { resource: 'feature_flags', action: 'manage', description: 'Create, update, and delete feature flags' },
  { resource: 'integrations', action: 'read', description: 'View integration configurations' },
  { resource: 'integrations', action: 'manage', description: 'Create, update, delete, and test integrations' },
  { resource: 'webhooks', action: 'read', description: 'View webhooks and delivery logs' },
  { resource: 'webhooks', action: 'manage', description: 'Create, update, delete, and test webhooks' },

  // Analytics
  { resource: 'analytics', action: 'read', description: 'View analytics dashboards and reports' },
  { resource: 'analytics', action: 'export', description: 'Export analytics data' },

  // Lead Ads (Social Ads Integration)
  { resource: 'lead_ads', action: 'read', description: 'View lead ads entries and analytics' },
  { resource: 'lead_ads', action: 'manage', description: 'Configure lead ads integration and retry failed leads' },

  // Channels (Multi-Channel Integration)
  { resource: 'channels', action: 'read', description: 'View channels and their status' },
  { resource: 'channels', action: 'create', description: 'Create new channels' },
  { resource: 'channels', action: 'update', description: 'Update channel configuration' },
  { resource: 'channels', action: 'delete', description: 'Delete channels (soft delete)' },
  { resource: 'channels', action: 'manage', description: 'Suspend and reactivate channels' },

  // SLA Tracking
  { resource: 'sla', action: 'read', description: 'View SLA policies and tracking data' },
  { resource: 'sla', action: 'create', description: 'Create SLA policies' },
  { resource: 'sla', action: 'update', description: 'Update SLA policies' },
  { resource: 'sla', action: 'delete', description: 'Delete SLA policies' },
  { resource: 'sla', action: 'breach_read', description: 'View SLA breach logs' },
  { resource: 'sla', action: 'breach_acknowledge', description: 'Acknowledge SLA breaches' },
];

// ─────────────────────────────────────────────
// Default role → permission mapping
// ADMIN gets everything (bypassed in guard, but seeded for completeness)
// MANAGER gets most operational permissions
// EMPLOYEE gets basic read + send
// ─────────────────────────────────────────────

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionString[]> = {
  ADMIN: Object.values(PERMISSIONS),

  MANAGER: [
    // Contacts — full CRUD except merge
    PERMISSIONS.CONTACTS_READ,
    PERMISSIONS.CONTACTS_CREATE,
    PERMISSIONS.CONTACTS_UPDATE,
    PERMISSIONS.CONTACTS_DELETE,
    PERMISSIONS.CONTACTS_ASSIGN,
    PERMISSIONS.CONTACTS_EXPORT,

    // Messages & Conversations
    PERMISSIONS.MESSAGES_READ,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.CONVERSATIONS_READ,
    PERMISSIONS.CONVERSATIONS_UPDATE,

    // Campaigns — full operational
    PERMISSIONS.CAMPAIGNS_READ,
    PERMISSIONS.CAMPAIGNS_CREATE,
    PERMISSIONS.CAMPAIGNS_UPDATE,
    PERMISSIONS.CAMPAIGNS_EXECUTE,
    PERMISSIONS.CAMPAIGNS_CANCEL,

    // Scheduler
    PERMISSIONS.SCHEDULER_READ,
    PERMISSIONS.SCHEDULER_CREATE,
    PERMISSIONS.SCHEDULER_UPDATE,
    PERMISSIONS.SCHEDULER_CANCEL,

    // Automation
    PERMISSIONS.AUTOMATION_READ,
    PERMISSIONS.AUTOMATION_CREATE,
    PERMISSIONS.AUTOMATION_UPDATE,
    PERMISSIONS.AUTOMATION_DELETE,
    PERMISSIONS.AUTOMATION_LOGS_READ,

    // WhatsApp
    PERMISSIONS.WHATSAPP_SESSION_OWN,
    PERMISSIONS.WHATSAPP_SESSION_VIEW_ALL,

    // Users — read only
    PERMISSIONS.USERS_READ,

    // Org — read only
    PERMISSIONS.ORG_READ,

    // Dead letters
    PERMISSIONS.DEAD_LETTERS_READ,

    // Billing — read + invoices
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_INVOICES_READ,

    // Notifications
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_MANAGE,

    // Settings — read only for managers
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.FEATURE_FLAGS_READ,
    PERMISSIONS.INTEGRATIONS_READ,
    PERMISSIONS.WEBHOOKS_READ,

    // Analytics — read (team-scoped in use-case logic)
    PERMISSIONS.ANALYTICS_READ,

    // SLA — read + breach management
    PERMISSIONS.SLA_READ,
    PERMISSIONS.SLA_BREACH_READ,
    PERMISSIONS.SLA_BREACH_ACKNOWLEDGE,

    // Channels — read, create, update
    PERMISSIONS.CHANNELS_READ,
    PERMISSIONS.CHANNELS_CREATE,
    PERMISSIONS.CHANNELS_UPDATE,

    // Lead Ads — read only
    PERMISSIONS.LEAD_ADS_READ,
  ],

  EMPLOYEE: [
    // Contacts — read, create, update own
    PERMISSIONS.CONTACTS_READ,
    PERMISSIONS.CONTACTS_CREATE,
    PERMISSIONS.CONTACTS_UPDATE,

    // Messages & Conversations
    PERMISSIONS.MESSAGES_READ,
    PERMISSIONS.MESSAGES_SEND,
    PERMISSIONS.CONVERSATIONS_READ,
    PERMISSIONS.CONVERSATIONS_UPDATE,

    // Scheduler — own scheduled messages
    PERMISSIONS.SCHEDULER_READ,
    PERMISSIONS.SCHEDULER_CREATE,
    PERMISSIONS.SCHEDULER_UPDATE,
    PERMISSIONS.SCHEDULER_CANCEL,

    // Automation — read only
    PERMISSIONS.AUTOMATION_READ,

    // WhatsApp — own session
    PERMISSIONS.WHATSAPP_SESSION_OWN,

    // Org — read settings
    PERMISSIONS.ORG_READ,

    // Notifications
    PERMISSIONS.NOTIFICATIONS_READ,
    PERMISSIONS.NOTIFICATIONS_MANAGE,

    // Settings — read only
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.FEATURE_FLAGS_READ,

    // Analytics — read (self-scoped in use-case logic)
    PERMISSIONS.ANALYTICS_READ,

    // SLA — read only
    PERMISSIONS.SLA_READ,
    PERMISSIONS.SLA_BREACH_READ,

    // Channels — read only
    PERMISSIONS.CHANNELS_READ,

    // Lead Ads — read only
    PERMISSIONS.LEAD_ADS_READ,
  ],
};
