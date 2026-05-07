EPIC 2 — Organization & User Management
User Story — Invite Users to Organization

As an admin
I want to invite users
So that they can join my organization

Rules
Admin can send invite via email
Invite must include:
Role
Expiry (48h)
Invite is single-use
Email must not already belong to another org (depending on model)
Scenarios
Valid invite → user joins org
Expired invite → reject
Already registered → attach to org
Acceptance Criteria
AC1: Invite email sent ≤2s
AC2: Expiry enforced
AC3: Role assigned correctly
User Story — Manage Users (CRUD)
Rules
Admin can:
Create users
Disable users
Delete users
Disabled users cannot login
Cannot delete last admin
Scenarios
Disable user → access revoked
Delete user → data retained (soft delete)
Acceptance Criteria
AC1: Role validation enforced
AC2: Soft delete implemented
AC3: Audit logs maintained
User Story — Role Assignment
Rules
Roles:
Admin
Manager
Employee
Permissions enforced server-side
Role changes must reflect immediately
Acceptance Criteria
AC1: Unauthorized access blocked
AC2: Role updates real-time
User Story — Organization Settings
Rules
Admin can update:
Org name
Branding
Timezone
Changes must not break existing data
Acceptance Criteria
AC1: Changes persist
AC2: Audit logs recorded