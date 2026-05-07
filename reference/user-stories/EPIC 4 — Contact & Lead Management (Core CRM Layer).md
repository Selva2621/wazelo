EPIC 4 — Contact & Lead Management (Core CRM Layer)
User Story — Auto Create Contact from WhatsApp Interaction

As a system
I want to automatically create contacts from WhatsApp messages
So that no lead is missed

Feature Specification

Feature: Auto contact creation from conversations
Tags: @epic-crm @component-contacts @automation @p1 @risk-high

Background

Given a WhatsApp session is connected
And message ingestion pipeline is active

Rules
Every new phone number must create a contact.
Phone number is the primary unique identifier.
Contact must be linked to:
Organization
WhatsApp session (user)
Default owner = session owner (employee).
Contact fields:
Name (optional initially)
Phone number (required)
Source (WhatsApp)
Created timestamp
Must avoid duplicate creation under race conditions.
Contact must be created within ≤2 seconds of message receipt.
All events must be audit logged.
Scenarios
1. Scenario: New contact created

Given a message from unknown number
When message is received
Then contact must be created
And assigned to user

2. Scenario: Existing contact message

Given a known phone number
When message arrives
Then system must not create duplicate

3. Scenario: Concurrent messages (race condition)

Given multiple messages from same new number
When processed simultaneously
Then only one contact must be created

Acceptance Criteria
AC1: Contact created ≤2s
AC2: No duplicate contacts
AC3: Correct owner assignment
AC4: Audit logs recorded
User Story — Contact Deduplication & Merge

As a system/admin
I want duplicate contacts merged
So that data remains clean

Rules
Duplicate detection based on phone number
Manual merge allowed by admin
Merge must:
Preserve full conversation history
Preserve activity timeline
No data loss allowed
Soft-delete duplicate records (not hard delete)
Scenarios
1. Scenario: Auto deduplication

Then system merges silently

2. Scenario: Manual merge

Given admin selects duplicates
Then system merges records
And logs event

Acceptance Criteria
AC1: Zero data loss
AC2: History preserved
AC3: Merge logged
User Story — Assign & Reassign Contact (Lead Ownership)

As an admin/manager
I want to assign contacts to employees
So that leads are handled properly

Rules
Each contact must have exactly one owner
Admin can reassign anytime
Reassignment must not affect:
Chat history
Lead stage
Assignment history must be tracked
Optional: auto-assignment rules (round-robin)
Scenarios
1. Scenario: Assign contact

Then owner = selected user

2. Scenario: Reassign contact

Then ownership updated
And previous owner retained in history

Acceptance Criteria
AC1: Ownership updated instantly
AC2: History preserved
AC3: Assignment logs available
User Story — Lead Status & Pipeline Management

As a sales/admin user
I want to track lead status
So that I can manage conversions

Rules
Default lead stages:
New
Contacted
Interested
Converted
Closed
Status must be manually editable
Status changes must be timestamped
Pipeline must support filtering
Status history must be stored
Scenarios
1. Scenario: Update lead status

Then system records new status
And timestamp

2. Scenario: Filter leads

Then system returns leads by status

Acceptance Criteria
AC1: Status updates ≤1s
AC2: History tracked
AC3: Filters work correctly
User Story — Contact Profile View (Single Source of Truth)

As a user
I want to view full contact details
So that I can understand customer context

Rules
Contact profile must show:
Basic info
Full conversation history
Lead status
Assigned owner
Must load within ≤2s
Must support real-time updates
Must support notes & tags
Scenarios
1. Scenario: View contact

Then full profile loads

2. Scenario: Live message arrives

Then profile updates instantly

Acceptance Criteria
AC1: Load ≤2s
AC2: Real-time updates
AC3: Data consistency maintained
User Story — Notes & Tags Management

As a user
I want to add notes and tags to contacts
So that I can categorize leads

Rules
Notes must be timestamped
Tags must be:
Customizable
Multi-select
Tags must support filtering
Notes must be immutable (edit history optional)
Scenarios
1. Scenario: Add note

Then note saved with timestamp

2. Scenario: Add tag

Then tag assigned to contact

Acceptance Criteria
AC1: Notes persist
AC2: Tags filterable
AC3: No data overwrite issues
User Story — Contact Search & Filtering

As a user
I want to search and filter contacts
So that I can quickly find leads

Rules
Search by:
Name
Phone number
Filters:
Status
Owner
Tags
Pagination required
Response ≤1s for typical queries
Scenarios
1. Scenario: Search contact

Then relevant results returned

2. Scenario: Apply filters

Then filtered dataset returned

Acceptance Criteria
AC1: Search ≤1s
AC2: Accurate results
AC3: Pagination works