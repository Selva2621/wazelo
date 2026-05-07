EPIC 7 — Scheduling & Automation (Workflow Engine)
User Story — Schedule Message (User-Level)

As a user
I want to schedule a message
So that I can send follow-ups automatically

Feature Specification

Feature: Message scheduling
Tags: @epic-automation @scheduler @p1 @risk-high

Background

Given a WhatsApp session is active
And messaging engine is available

Rules
User can schedule:
One-time message
Recurring message (optional future)
Message must be stored with:
Scheduled timestamp
Timezone
Scheduled jobs must go through queue (Epic 5)
Jobs must persist across restarts
If session disconnected → retry logic applies
User must be able to edit/cancel before execution
All scheduled events must be audit logged
Scenarios
1. Scenario: Schedule message

When user sets future time
Then message stored
And scheduled job created

2. Scenario: Scheduled time reached

Then job pushed to queue
And message sent

3. Scenario: User cancels schedule

Then job removed
And message not sent

Acceptance Criteria
AC1: Time accuracy ±2s
AC2: Persistence across restart
AC3: Cancel/edit works
AC4: Queue integration enforced
User Story — Automation Rule Creation

As an admin/user
I want to create automation rules
So that actions happen automatically based on triggers

Feature Specification

Feature: Rule-based automation engine
Tags: @epic-automation @rules-engine @p1 @risk-critical

Background

Given contacts and messaging system exist

Rules
Automation must consist of:
Trigger
Condition (optional)
Action(s)
Supported triggers:
New message received
Contact created
Lead status changed
Time-based trigger
Conditions:
Tags
Status
Owner
Actions:
Send message
Assign contact
Add tag
Update status
Rules must be enable/disable toggle
Execution must be asynchronous (queue-based)
Infinite loop prevention required
Scenarios
1. Scenario: New message trigger

When message received
Then automation evaluates rule
And executes action

2. Scenario: Condition not met

Then rule must not execute

3. Scenario: Rule disabled

Then no execution

Acceptance Criteria
AC1: Rule evaluation ≤500ms
AC2: Actions executed reliably
AC3: No duplicate execution
AC4: Loop prevention works
User Story — Follow-Up Automation

As a sales user
I want automatic follow-ups
So that leads are not missed

Rules
Follow-up triggers:
No reply within X time
Delay must be configurable
Must check latest conversation state before sending
Must not send if:
User already replied
Contact opted out
Must support multiple follow-ups (sequence)
Scenarios
1. Scenario: No reply after 24h

Then follow-up message sent

2. Scenario: Customer replies before trigger

Then follow-up cancelled

Acceptance Criteria
AC1: Accurate delay handling
AC2: No unnecessary messages
AC3: Sequence execution works
User Story — Automation Execution Engine

As a system
I want to process automation jobs
So that rules execute reliably at scale

Rules
Automation must run via queue workers
Must support:
Retry
Backoff
Must track execution logs:
Success
Failure
Must be idempotent
Must support high concurrency
Must isolate per organization
Scenarios
1. Scenario: Rule triggered

Then job created
And processed

2. Scenario: Failure

Then retry triggered

Acceptance Criteria
AC1: No missed triggers
AC2: Retry works
AC3: Logs stored
AC4: No duplicate actions
User Story — Automation Logs & Debugging

As an admin
I want to see automation logs
So that I can debug failures

Rules
Logs must include:
Rule ID
Trigger event
Execution result
Timestamp
Must support filtering:
Success/Failure
Rule
Logs must be retained
Scenarios
1. Scenario: View logs

Then system displays execution history

2. Scenario: Failed automation

Then error details visible

Acceptance Criteria
AC1: Logs accessible ≤2s
AC2: Filtering works
AC3: Errors clearly visible