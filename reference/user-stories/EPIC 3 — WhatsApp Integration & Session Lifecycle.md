EPIC 3 — WhatsApp Integration & Session Lifecycle
User Story — Connect WhatsApp Account via QR

As an authorized user
I want to connect my WhatsApp account via QR
So that I can send and receive messages through the CRM

Feature Specification

Feature: WhatsApp Web QR session connection
Tags: @epic-whatsapp @component-integration @multi-session @p1 @risk-critical

Background

Given the user is authenticated
And belongs to an organization
And has permission to connect WhatsApp
And no active session exists

Rules
QR must be generated using WhatsApp Web protocol session.
QR must auto-refresh every 20–30 seconds.
Each user can have only one active session.
Session must persist across reloads and restarts.
Session must be encrypted at rest.
System must detect disconnect within ≤10 seconds.
Reconnection must require QR scan (no silent login).
Admin must see connection status of all users in real-time.
Multi-tenant isolation: sessions must never leak across orgs.
Session events must be audit logged.
Concurrent QR requests must invalidate previous QR.
System must handle WhatsApp Web version changes (resilience).
Scenarios
1. Scenario: Successful QR connection

Given a valid QR is generated
When the user scans QR
Then session must be established
And status becomes "Connected"
And messaging is enabled
And event logged

2. Scenario: QR expires before scan

Given QR is displayed
When it expires
Then system must auto-refresh QR
And invalidate previous QR

3. Scenario: User refreshes page during QR

Given QR is active
When user refreshes
Then QR must regenerate
And old QR must be invalid

4. Scenario: Unauthorized user attempts connection

Then system must reject with 403
And log the attempt

Acceptance Criteria
AC1: QR refresh ≤30s
AC2: Only one active session per user
AC3: Session persists after reload
AC4: Encryption enforced
AC5: Multi-tenant isolation verified
AC6: Audit logs recorded
AC7: QR invalidation works
User Story — Maintain WhatsApp Session Health

As a system
I want to monitor session health
So that disconnections are detected immediately

Rules
Heartbeat check every 5–10 seconds
Detect:
Logout from mobile
Network drop
Session expiry
Status states:
Connecting
Connected
Disconnected
Reconnecting
Auto-reconnect attempts allowed (max 3 retries)
After failure → require QR reconnect
Admin must see session health
Scenarios
1. Scenario: Session disconnect detected

When WhatsApp disconnects
Then system must update status ≤10s
And notify UI

2. Scenario: Auto-reconnect attempt

When temporary failure occurs
Then system retries connection
If fails → mark disconnected

3. Scenario: Manual logout from phone

Then session must terminate immediately

Acceptance Criteria
AC1: Detection latency ≤10s
AC2: Retry mechanism works
AC3: Status updates real-time
AC4: No ghost sessions
User Story — Send & Receive Messages via Connected Session

As a user
I want to send and receive messages
So that I can communicate with customers

Rules
Messages must be sent via active session only
Message types supported:
Text
Media (image, doc, video)
Incoming messages must be captured instantly
Delivery status must be tracked:
Sent
Delivered
Read
Failed messages must be retried
All messages must be stored in DB
Message queue must be used (NO direct send)
Scenarios
1. Scenario: Send message success

Then message must be queued
And sent via session
And stored in DB

2. Scenario: Send fails (network/session issue)

Then retry mechanism must trigger

3. Scenario: Incoming message received

Then message must be stored
And pushed to UI in real-time

Acceptance Criteria
AC1: Send latency ≤1s (queue → send)
AC2: Retry mechanism works
AC3: No message loss
AC4: Real-time updates ≤1s
User Story — Admin View All WhatsApp Sessions

As an admin
I want to see all users’ WhatsApp connections
So that I can monitor system usage

Rules
Admin dashboard must show:
User
Phone number
Status
Last active
Real-time updates required
Admin cannot access message content unless permitted
Filtering by:
Status
User
Org
Scenarios
1. Scenario: Admin views sessions

Then all sessions must be visible

2. Scenario: Session disconnect

Then dashboard updates in real-time

Acceptance Criteria
AC1: Dashboard loads ≤2s
AC2: Real-time updates ≤1s
AC3: Access control enforced
User Story — Disconnect WhatsApp Session

As a user/admin
I want to disconnect a session
So that I can revoke access

Rules
Manual disconnect must terminate session immediately
Session data must be cleared securely
User must reconnect via QR
Admin can force disconnect any user
Scenarios
1. Scenario: User disconnects

Then session ends
And status = Disconnected

2. Scenario: Admin force disconnect

Then user session terminates immediately

Acceptance Criteria
AC1: Disconnect ≤2s
AC2: Session cleared
AC3: UI reflects instantly