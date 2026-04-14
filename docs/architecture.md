# Admin Architecture (v1)

## Product Boundary
- Admin-only product hosted at `admin.loanpro.tech`.
- No customer-facing routes.
- Strict RBAC and full audit logging for privileged actions.

## Service Integrations
- Clerk: admin authentication and team identity.
- MongoDB: admin control-plane and operational reads/writes.
- Brevo and Gmail mailbox: transactional and inbound support workflows.
- Razorpay: payments and refunds.
- Cloud Run: Android capture service health and controls.
- Cloudflare: DNS, SSL, WAF, and edge controls.
- GitHub: releases metadata and operational controls.
- Google Analytics: usage and conversion analytics.

## Layering
- `app/*`: route handlers, page entry points.
- `src/modules/*`: feature modules (UI + module-level logic).
- `src/server/*`: server services and repositories.
- `src/lib/*`: cross-cutting primitives.

## Security Rules
- Every mutating API endpoint checks permissions server-side.
- High-risk operations must include reason metadata.
- Every privileged action writes an audit log event.
- Secrets are consumed from environment variables only.
