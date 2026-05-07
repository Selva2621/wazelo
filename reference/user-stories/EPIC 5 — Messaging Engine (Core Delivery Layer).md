EPIC 5 — Messaging Engine (Core Delivery Layer)
User Story — Send Message via Queue

As a user
I want messages to be sent reliably
So that delivery is guaranteed even under load

Feature Specification

Feature: Queue-based message dispatch
Tags: @epic-messaging @queue @reliability @p1 @risk-critical

Background

Given a WhatsApp session is connected
And messaging service is active

Rules
All outgoing messages MUST go through a queue (no direct send).
Queue system must support:
Retry
Delayed jobs
Priority
Message states:
Pending
Processing
Sent
Failed
Messages must be idempotent (no duplicate sends).
Each message must have unique ID.
Worker must process messages sequentially per session (ordering guarantee).
Rate limiting must be enforced per session.
Failed messages must retry up to N times (configurable).
Dead-letter queue required for permanent failures.
All events must be logged.
Scenarios
1. Scenario: Successful message send

Given a valid message request
When message is queued
Then worker processes it
And message is sent
And status = Sent

2. Scenario: Temporary failure (network issue)

When send fails
Then message must retry automatically

3. Scenario: Permanent failure

After max retries
Then message moves to dead-letter queue
And status = Failed

4. Scenario: Duplicate send request

Given same message ID
Then system must prevent duplicate send

Acceptance Criteria
AC1: No direct send allowed
AC2: Retry mechanism works
AC3: Message ordering preserved
AC4: No duplicate sends
AC5: Dead-letter queue implemented
AC6: Logs recorded
User Story — Receive Incoming Messages (Event Ingestion)

As a system
I want to process incoming messages reliably
So that no customer message is lost

Rules
Incoming messages must be captured in real-time
Must pass through ingestion pipeline
Must be persisted before UI update
Must trigger:
Contact creation/update
Conversation update
Must handle duplicate webhook/events
Must support high throughput
Scenarios
1. Scenario: Incoming message received

Then message stored
And contact updated
And UI notified

2. Scenario: Duplicate event received

Then system must ignore duplicate

Acceptance Criteria
AC1: No message loss
AC2: Idempotency enforced
AC3: Processing latency ≤1s
User Story — Real-Time Messaging (WebSocket Layer)

As a user
I want real-time chat updates
So that conversations feel instant

Rules
WebSocket connection per active user session
Events:
New message
Status update
Typing (optional)
Must support reconnection
Must support multi-tab sync
Fallback polling if WebSocket fails
Scenarios
1. Scenario: New message arrives

Then UI updates instantly via WebSocket

2. Scenario: Connection lost

Then system must reconnect automatically

Acceptance Criteria
AC1: Latency ≤1s
AC2: Reconnect within 5s
AC3: No duplicate UI events
User Story — Message Status Tracking

As a user
I want to see delivery status
So that I know if messages reached the customer

Rules
Status lifecycle:
Pending → Sent → Delivered → Read
Status updates must be real-time
Status must be persisted
Failed status must be visible
Scenarios
1. Scenario: Message delivered

Then status updated to Delivered

2. Scenario: Message read

Then status updated to Read

Acceptance Criteria
AC1: Status accuracy maintained
AC2: Real-time updates
AC3: History stored
User Story — Rate Limiting & Throttling

As a system
I want to control message flow
So that WhatsApp does not block sessions

Rules
Per-user rate limit
Global rate limit
Burst control
Queue must delay messages when limit exceeded
Configurable limits
Scenarios
1. Scenario: Limit exceeded

Then messages delayed

Acceptance Criteria
AC1: No burst spikes
AC2: Smooth message flow
AC3: No ban-triggering behavior
User Story — Message Retry & Recovery

As a system
I want failed messages retried
So that temporary failures don’t cause data loss

Rules
Retry strategy:
Exponential backoff
Max retry count configurable
Retry only for retryable errors
Non-retryable → immediate failure
Scenarios
1. Scenario: Retry success

Then message status updated

2. Scenario: Retry exhausted

Then message marked failed

Acceptance Criteria
AC1: Backoff strategy implemented
AC2: Retry accuracy
AC3: No infinite loops