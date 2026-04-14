# API Contracts (Admin v1)

## Auth and Session
- `GET /api/auth/me`: current admin identity, role, permissions.
- `POST /api/auth/sign-out`: revoke admin session.

## Team and Roles
- `GET /api/team`: list admin users.
- `POST /api/team/invite`: invite team member with role(s).
- `PATCH /api/team/:id`: update role/status.
- `GET /api/roles`: list roles and permissions.
- `POST /api/roles`: create role.
- `PATCH /api/roles/:id`: update role permissions.
- `DELETE /api/roles/:id`: delete role.

## Users and Subscription Ops
- `GET /api/users`: user search and filters.
- `GET /api/users/:id`: profile with timeline.
- `PATCH /api/users/:id`: update flags/status.
- `GET /api/subscriptions`: subscription list.
- `PATCH /api/subscriptions/:id`: lifecycle actions.

## Finance
- `GET /api/payments`: payment events and filters.
- `POST /api/payments/:id/refund-request`: create refund request.
- `POST /api/payments/:id/refund-approve`: approve refund.
- `POST /api/payments/reconcile`: reconciliation run.

## Devices
- `GET /api/devices`: list device state.
- `POST /api/devices/:id/revoke`: revoke bound device.
- `POST /api/devices/:id/approve-switch`: approve switch request.

## Support and Contact
- `GET /api/support/tickets`: ticket list.
- `PATCH /api/support/tickets/:id`: assign/status/reply.
- `GET /api/support/contact-requests`: contact queue.
- `PATCH /api/support/contact-requests/:id`: assign/close.

## Integrations, Releases, Analytics
- `GET /api/integrations/health`: integration health matrix.
- `GET /api/integrations/usage`: provider/queue usage and configured limits.
- `GET /api/status/overview`: system status with queue pressure summary.
- `GET /api/releases`: releases list and status.
- `PATCH /api/releases/:id`: publish/promote/rollback.
- `GET /api/analytics/kpis`: high-level KPIs.

## Audit and Settings
- `GET /api/audit-logs`: privileged action stream.
- `GET /api/settings`: admin app settings.
- `PATCH /api/settings`: update settings.

## Cross-Cutting Rules
- Every mutation endpoint requires permission checks.
- Every mutation writes an audit log event with actor, action, reason, and before/after snapshots.
- High-risk actions require reason and explicit confirmation.
- Reason is mandatory for users/team/roles/subscriptions/releases/payment-support-contact high-risk mutations.
