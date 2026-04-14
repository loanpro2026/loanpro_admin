# LoanPro Admin Next

Clean-slate admin control plane project for `admin.loanpro.tech`.

## Current Status
- New isolated Next.js project scaffolded.
- No code changes were made in `electron_app`, `loanpro_mobile_companion_suite`, or `loanpro_web`.
- Phase 0 foundation and folder architecture created.

## Quick Start
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:3000`

## Planned Phases
1. Foundation: auth gates, env validation, RBAC skeleton.
2. Team and roles: invite flow, permission management, audit logs.
3. Core operations: users, subscriptions, devices, support/contact.
4. Finance and analytics: payments, reconciliation, dashboards.
5. Hardening and rollout: observability, incident handling, production rollout.

## Key Folders
- `app`: route entry points and API handlers.
- `src/modules`: domain modules.
- `src/lib`: shared primitives for auth, db, rbac, logging.
- `src/server`: server-only services and repositories.
- `docs`: architecture, RBAC matrix, roadmap.

## Operations Guide
- Full setup, first-admin bootstrap, team onboarding, RBAC operations, integrations usage/limits, and Vercel deployment:
	- `docs/admin-operations-runbook.md`
