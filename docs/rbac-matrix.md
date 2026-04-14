# RBAC Matrix (v1)

## System Roles
- `super_admin`
- `admin_ops`
- `support_agent`
- `finance_admin`
- `release_manager`
- `analyst`
- `viewer`

## Resources and Actions
- `users`: `read`, `update`, `suspend`, `export`
- `subscriptions`: `read`, `update`, `cancel`, `renew`, `upgrade`, `export`
- `payments`: `read`, `refund_request`, `refund_approve`, `reconcile`, `export`
- `devices`: `read`, `bind`, `revoke`, `switch_approve`
- `support`: `read`, `reply`, `assign`, `close`, `escalate`
- `contact`: `read`, `assign`, `close`, `export`
- `releases`: `read`, `publish`, `rollback`, `promote`
- `integrations`: `read`, `test`, `reconfigure`
- `team`: `read`, `invite`, `role_assign`, `deactivate`
- `roles`: `read`, `create`, `update`, `delete`
- `settings`: `read`, `update`
- `audit`: `read`, `export`

## Enforcement
- Route-level checks in middleware for protected pages.
- Action-level checks in server routes and service layer.
- Denials and approvals both logged to audit stream.
