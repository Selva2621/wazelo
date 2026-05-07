EPIC 9 — Subscription & Billing (SaaS Monetization)
User Story — Subscription Plan Management

As a system/admin
I want to define subscription plans
So that different pricing tiers can be offered

Feature Specification

Feature: Plan configuration system
Tags: @epic-billing @plans @p1 @risk-critical

Background

Given the platform supports paid subscriptions

Rules
Plans must include:
Name (Free, Starter, Pro, Enterprise)
Price
Billing cycle (monthly/yearly)
Each plan must define limits:
Max users
Max WhatsApp sessions
Max messages/month
Campaign limits
Plans must define feature access:
Campaigns enabled/disabled
Automation enabled/disabled
Plans must be versioned (future-proofing)
Plans must be configurable without code changes
Scenarios
1. Scenario: Create new plan

Then plan saved with limits and pricing

2. Scenario: Update plan

Then changes apply only to new subscriptions

Acceptance Criteria
AC1: Plans configurable dynamically
AC2: Limits enforced correctly
AC3: Backward compatibility maintained
User Story — Subscribe to Plan

As an organization admin
I want to subscribe to a plan
So that I can use premium features

Rules
Only admin can subscribe
Payment must be processed via gateway (Stripe/Razorpay)
Subscription must store:
Plan ID
Start date
Renewal date
Status
Trial support (optional)
Subscription status:
Active
Trial
Expired
Cancelled
Must handle payment success/failure
Scenarios
1. Scenario: Successful subscription

Then plan activated
And features unlocked

2. Scenario: Payment failure

Then subscription not activated

Acceptance Criteria
AC1: Payment processed securely
AC2: Subscription state accurate
AC3: Feature access updated immediately
User Story — Enforce Plan Limits (Critical)

As a system
I want to enforce usage limits
So that users cannot exceed their plan

Rules
Limits must be enforced on:
Users count
Messages sent
Campaign usage
WhatsApp sessions
Hard limits → block action
Soft limits → warn user
Limits must reset per billing cycle
All usage must be tracked in real-time
Scenarios
1. Scenario: User exceeds message limit

Then system blocks sending
And shows upgrade prompt

2. Scenario: User reaches 80% usage

Then warning displayed

Acceptance Criteria
AC1: Limits enforced strictly
AC2: No bypass possible
AC3: Usage tracking accurate
User Story — Usage Tracking System

As a system
I want to track usage metrics
So that billing and limits are accurate

Rules
Track:
Messages sent
Active users
Campaign executions
Must be near real-time
Must support aggregation (daily/monthly)
Must handle high volume efficiently
Scenarios
1. Scenario: Message sent

Then usage counter incremented

2. Scenario: Billing cycle reset

Then counters reset

Acceptance Criteria
AC1: Accurate counters
AC2: No data loss
AC3: Scalable tracking
User Story — Subscription Upgrade/Downgrade

As an admin
I want to change plans
So that I can scale usage

Rules
Upgrade → immediate effect
Downgrade → apply next billing cycle
Proration must be handled
Limits must adjust accordingly
Scenarios
1. Scenario: Upgrade plan

Then features unlocked immediately

2. Scenario: Downgrade plan

Then changes scheduled

Acceptance Criteria
AC1: Proration handled correctly
AC2: Limits updated
AC3: No service disruption
User Story — Payment & Invoice Management

As an admin
I want invoices and payment history
So that I can track billing

Rules
System must store:
Payment history
Invoice details
Invoices must be downloadable
Failed payments must trigger retry
Payment status must be visible
Scenarios
1. Scenario: Successful payment

Then invoice generated

2. Scenario: Failed payment

Then retry attempted

Acceptance Criteria
AC1: Invoice available
AC2: Payment status accurate
AC3: Retry mechanism works
User Story — Subscription Expiry & Grace Period

As a system
I want to handle expired subscriptions
So that access is controlled properly

Rules
Expired subscription → restrict features
Grace period (e.g., 3–7 days) optional
After grace:
Disable premium features
Data must NOT be deleted
Users must see upgrade prompts
Scenarios
1. Scenario: Subscription expired

Then features restricted

2. Scenario: Payment recovered

Then access restored

Acceptance Criteria
AC1: Expiry enforced
AC2: Grace period works
AC3: No data loss