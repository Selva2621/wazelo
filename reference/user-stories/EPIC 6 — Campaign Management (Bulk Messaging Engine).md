EPIC 6 — Campaign Management (Bulk Messaging Engine)
User Story — Create Campaign

As an admin/marketing user
I want to create a messaging campaign
So that I can send bulk messages to selected contacts

Feature Specification

Feature: Campaign creation & configuration
Tags: @epic-campaign @bulk-messaging @p1 @risk-critical

Background

Given the user is authenticated
And has campaign permissions
And contacts exist

Rules
Campaign must include:
Name
Message template/content
Target audience (contacts/filters)
Campaign must support:
Immediate send
Scheduled send
Campaign must be editable before execution
Campaign must have status:
Draft
Scheduled
Running
Completed
Failed
Campaign must store total recipients count
Campaign must be linked to organization
All campaign actions must be audit logged
Scenarios
1. Scenario: Create draft campaign

Then campaign saved as Draft

2. Scenario: Create campaign with invalid data

Then system must reject with field-level errors

Acceptance Criteria
AC1: Campaign saved ≤2s
AC2: Draft persists
AC3: Validation enforced
AC4: Audit logs recorded
User Story — Select Target Audience

As a user
I want to target specific contacts
So that campaigns are relevant

Rules
Audience selection must support:
All contacts
Filtered contacts (status, tags, owner)
Contacts must be deduplicated before sending
Only valid phone numbers allowed
Opt-out contacts must be excluded
Final recipient count must be calculated before send
Scenarios
1. Scenario: Filter contacts

Then only matching contacts selected

2. Scenario: Duplicate contacts

Then duplicates removed

Acceptance Criteria
AC1: Accurate recipient count
AC2: No duplicate sends
AC3: Filters work correctly
User Story — Execute Campaign (Bulk Send via Queue)

As a system
I want to send campaign messages via queue
So that large-scale messaging is reliable

Rules
Campaign must NOT send messages directly
Each recipient → individual message job
Jobs must go through messaging queue (Epic 5)
Campaign must enforce rate limiting:
Per user/session
Global
Campaign must support batching (chunk processing)
Failures must not stop entire campaign
Campaign must track progress:
Total
Sent
Failed
Campaign must be resumable
Scenarios
1. Scenario: Campaign execution

Then jobs created per contact
And processed via queue

2. Scenario: Partial failure

Then failed messages retried
And campaign continues

3. Scenario: System crash during campaign

Then campaign resumes from last state

Acceptance Criteria
AC1: No direct sending
AC2: Queue integration enforced
AC3: Campaign progress tracked
AC4: Resume capability works
AC5: No system crash under load
User Story — Campaign Scheduling

As a user
I want to schedule campaigns
So that messages are sent at the right time

Rules
Campaign must support scheduled execution
Timezone must be respected
Scheduled jobs must persist across restarts
Scheduler must trigger campaign execution
Scenarios
1. Scenario: Schedule campaign

Then campaign status = Scheduled

2. Scenario: Scheduled time reached

Then campaign starts automatically

Acceptance Criteria
AC1: Time accuracy ±2 seconds
AC2: Persistence across restart
AC3: Scheduler reliability
User Story — Campaign Analytics & Reporting

As an admin
I want to track campaign performance
So that I can measure effectiveness

Rules
Metrics:
Total sent
Delivered
Failed
Read (if available)
Must support real-time updates
Historical campaigns must be stored
Data must be queryable
Scenarios
1. Scenario: View campaign report

Then metrics displayed

2. Scenario: Campaign in progress

Then metrics update live

Acceptance Criteria
AC1: Accurate metrics
AC2: Real-time updates
AC3: Historical data retained
User Story — Opt-Out & Compliance Management

As a system
I want to respect user opt-outs
So that messaging complies with policies

Rules
Contacts must have opt-in/opt-out flag
Opt-out contacts must NEVER receive campaigns
Opt-out must be:
Manual
Triggered by keyword (e.g., STOP)
Compliance logs must be maintained
Scenarios
1. Scenario: Contact opts out

Then contact excluded from all campaigns

2. Scenario: Campaign execution

Then system skips opted-out contacts

Acceptance Criteria
AC1: Opt-out enforced strictly
AC2: No violations
AC3: Logs available