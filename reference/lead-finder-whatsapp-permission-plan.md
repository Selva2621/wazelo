# Lead finder: WhatsApp permission (plan)

**Date:** 2026-11-21 · **Status:** built, not committed, not browser-tested

## Why

WhatsApp's Business Messaging Policy (last updated 23 Sep 2026) only allows messages to people who gave you their number and agreed to hear from you. Businesses found with the lead finder (Google Maps, IndiaMART) haven't. Today Wazelo lets those contacts go straight into WhatsApp campaigns, sequences and automations, which risks the customer's number being restricted. Existing send-safety (cold daily caps, per-contact budget, delivery-health auto-pause) limits volume; nothing checks permission.

## Decisions (user, 2026-11-21)

- **Scope:** lead finder contacts only (`Contact.source = WEB_SCRAPE`). Other sources are unchanged.
- **Enforcement:** auto-exclude, no override. A lead finder contact gets no business-started WhatsApp message until it has permission.

## Rule

A `WEB_SCRAPE` contact **has WhatsApp permission** when either:

1. It has sent the org an inbound WhatsApp message (same check as `AccountSafetyService.isCold`), or
2. It has an active `ConsentRecord` with `consentType = 'whatsapp'`, `granted = true`, `revokedAt = null`.

Every other contact source counts as permitted (no change).

## Backend

- **New domain service** `WhatsAppPermissionService` (contacts module, `domain/services`): `hasPermission(orgId, contactId)` and a batch form for audiences; one place for the rule.
- **Recording permission:** use case + endpoint to create a `ConsentRecord` (`consentType: 'whatsapp'`, `source: call | email | in_person | other`, `metadata: { recordedBy, note }`), and to revoke it (`revokedAt`). Audit log entry. No migration: the table exists.
- **Enforcement points** (skip, never send):
  1. `campaigns/domain/services/audience-resolver.service.ts`: exclude unpermitted `WEB_SCRAPE` contacts from WhatsApp audiences; return the excluded count for the UI.
  2. `jobs/campaign/campaign-batch.worker.ts`: re-check at send time (permission may be revoked); mark recipient SKIPPED with reason.
  3. `sequences/application/use-cases/enroll-contact.use-case.ts`: refuse with `NO_WHATSAPP_PERMISSION`.
  4. `jobs/sequence/sequence-step.worker.ts`: re-check before each WhatsApp step.
  5. `automation/domain/services/action-executor.service.ts`: skip "send WhatsApp" actions, log the reason.
- Manual 1:1 messages from the inbox are **not** blocked (the member may have just called them); the frontend warns instead.

## Frontend

- **Contact page:** "WhatsApp permission" chip: *Agreed* / *Not yet* / *Messaged you first*; "Record permission" action (how: call, email, in person, other; optional note); revoke.
- **Lead finder results / imported contacts:** *Not yet* chip.
- **Campaign audience step:** "N lead finder contacts don't have WhatsApp permission and were left out."
- **Sequence enroll:** disabled for unpermitted lead finder contacts, with the reason.
- **Inbox:** warning banner when composing to an unpermitted lead finder contact, with a "Record permission" shortcut.
- **Layout chosen (user, 2026-11-21):** a header chip next to the contact name ("Not yet on WhatsApp ▾") whose menu has "Record permission" / "Revoke" / "Why is this needed?"; a simple record dialog: how they agreed as chips (Call / Email / In person / Other), optional note, Cancel / Save. No confirmation checkbox.
- Product tour: anchors and TourDef steps for the new chip and action.

## Follow-up decisions (user, 2026-11-21)

- **Sequences:** skip only the WhatsApp step for an unpermitted lead finder contact; later email steps still go out. Enroll is refused only when every step is WhatsApp.
- **Lead finder "Start outreach" (option B):** before starting, show "X of Y leads have agreed to WhatsApp messages"; outreach goes only to those X. With X = 0 the WhatsApp start is disabled and a call/email-first guide is shown.

## Tests

Unit: `WhatsAppPermissionService`; audience resolver excludes and counts; enroll refusal; batch and step workers skip; action executor skip. Run only the changed specs.

## Later (not in this plan)

- Same rule for CSV imports, if wanted.
- Website copy: say on `/features/lead-finder` that contacts need permission before WhatsApp campaigns.
