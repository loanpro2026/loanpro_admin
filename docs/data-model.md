# Data Model (Admin v1)

## Core Collections
- `admin_users`
  - `clerkUserId`, `email`, `displayName`, `roleIds[]`, `status`, `mfaEnforced`, `lastLoginAt`, `createdAt`, `updatedAt`
- `admin_roles`
  - `key`, `name`, `description`, `permissions[]`, `isSystemRole`, `createdAt`, `updatedAt`
- `admin_invites`
  - `email`, `roleIds[]`, `tokenHash`, `invitedBy`, `expiresAt`, `status`, `createdAt`, `updatedAt`
- `admin_audit_logs`
  - `actor`, `action`, `resource`, `resourceId`, `reason`, `before`, `after`, `ip`, `userAgent`, `requestId`, `createdAt`
- `admin_sessions`
  - `adminUserId`, `sessionId`, `issuedAt`, `expiresAt`, `revokedAt`
- `admin_feature_flags`
  - `key`, `value`, `environment`, `updatedBy`, `updatedAt`

## Optional Operational Collections
- `admin_notifications`
- `admin_incidents`
- `admin_saved_views`

## Indexes (Initial)
- `admin_users`: `{ clerkUserId: 1 }` unique, `{ email: 1 }` unique
- `admin_roles`: `{ key: 1 }` unique
- `admin_invites`: `{ email: 1, status: 1 }`, `{ expiresAt: 1 }`
- `admin_audit_logs`: `{ createdAt: -1 }`, `{ actor.adminUserId: 1, createdAt: -1 }`, `{ resource: 1, resourceId: 1, createdAt: -1 }`

## Audit Retention
- Hot logs: 180 days
- Cold archive: 365+ days (export storage)
