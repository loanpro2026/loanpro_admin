# Admin Operations Runbook

This runbook covers production setup for admin.loanpro.tech, first super-admin onboarding, team member onboarding, RBAC controls, integrations usage/limits, and go-live verification.

## 1) Production Environment Setup (Vercel)

Set these variables in Vercel for the `loanpro_admin_next` project.

Required core:
- `NODE_ENV=production`
- `NEXT_PUBLIC_APP_URL=https://admin.loanpro.tech`
- `MONGODB_URI`
- `MONGODB_DB_NAME=AdminDB`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

Required security/bootstrap:
- `ADMIN_INIT_SECRET` (strong random secret)
- `ADMIN_INVITE_REDIRECT_URL=https://admin.loanpro.tech/sign-in`

Recommended first-admin bootstrap (pick at least one):
- `ADMIN_BOOTSTRAP_CLERK_USER_ID`
- `ADMIN_BOOTSTRAP_EMAIL`

Integrations:
- `BREVO_API_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `CLOUD_RUN_BASE_URL`
- `CLOUD_RUN_API_TOKEN`
- `GITHUB_TOKEN`
- `GITHUB_RELEASE_OWNER`
- `GITHUB_RELEASE_REPO`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`

Optional GA usage API credentials (for live GA usage in Integrations > Usage and Limits):
- `GOOGLE_ANALYTICS_PROPERTY_ID=`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (escaped `\n` line breaks)

Optional queue/provider limits for alerts:
- `ADMIN_LIMIT_GA_MONTHLY_EVENTS`
- `ADMIN_LIMIT_RAZORPAY_MONTHLY_TXNS`
- `ADMIN_LIMIT_BREVO_MONTHLY_EMAILS`
- `ADMIN_LIMIT_SUPPORT_OPEN_TICKETS`
- `ADMIN_LIMIT_CONTACT_OPEN_REQUESTS`

Never set in production:
- `ADMIN_DEV_BYPASS_KEY`

## 2) Clerk Setup for Admin Access

1. Configure Clerk application domain and redirect URLs for admin hostname.
2. Ensure sign-in route is `/sign-in`.
3. Disable/avoid public sign-up for admin app usage.
4. Create your first internal user in Clerk Dashboard (email that will be super admin).

## 3) First Super Admin Bootstrap

### Path A (recommended): Bootstrap by email or Clerk user ID
1. Set `ADMIN_BOOTSTRAP_EMAIL` or `ADMIN_BOOTSTRAP_CLERK_USER_ID` in Vercel.
2. Log in to admin panel with that user.
3. On first authenticated API access, the account is auto-created as `super_admin`.

### Path B: Initialization endpoint (secret protected)
Use when authenticated super-admin session is not yet available.

```powershell
$headers = @{ "x-admin-init-secret" = "<ADMIN_INIT_SECRET>" }
Invoke-RestMethod -Method POST -Uri "https://admin.loanpro.tech/api/admin/init" -Headers $headers
```

Expected result:
- System roles synced.
- Required indexes ensured.

## 4) Add Team Members and Restrict Permissions

1. Go to Team page.
2. Invite member with role and required reason.
3. User accepts Clerk invitation and signs in.
4. Adjust role/status from Team page with required reason.
5. Verify effective access by signing in as that role and opening modules.

Role strategy:
- `super_admin`: full control.
- `admin_ops`: day-to-day operations.
- `support_agent`: support and contact queues.
- `finance_admin`: payment/refund/reconciliation.
- `release_manager`: release lifecycle.
- `analyst`: read/export-heavy access.
- `viewer`: read-only baseline.

## 5) Users, Team, Roles Governance (Now Enforced)

Reason is required for:
- User suspend/unsuspend.
- Team invite.
- Team role/status updates.
- Role creation.
- Role updates and deletes.
- Subscription status changes.
- Release create and release actions.

Invalid lifecycle transitions are blocked for:
- Releases (publish/promote/rollback rules).
- Subscriptions.
- Support tickets.
- Contact requests.
- Payments refund/reconcile actions.

## 6) Integrations Usage and Limits in Admin Panel

Use Integrations page:
- Health Matrix: config/connectivity state.
- Usage and Limits: provider and queue usage with limits.

Current usage integrations:
- Google Analytics: live usage via GA Data API (if GA service-account vars configured).
- Razorpay: monthly transaction usage from local records + API reachability check.
- Brevo: account usage/credits from provider API when available.
- Support queue and Contact queue: live operational workload with optional thresholds.

## 7) Vercel Deploy Sequence

1. Add all env vars in Vercel project.
2. Run pre-deploy checks locally (with production-like env values exported):

```powershell
Set-Location "C:\Users\jaksh\OneDrive\Desktop\web_loanpro\loanpro_admin_next"
npm run predeploy:check
```

3. Deploy latest main branch.
4. Verify production health:
   - `/api/health`
   - `/api/admin/init` (secret-auth path only when needed)
   - `/api/auth/me` after sign-in
   - `/api/integrations/health`
   - `/api/integrations/usage`
5. Validate role-gated screens with at least 2 non-super-admin roles.

## 8) Production Verification Checklist

1. First super admin can access dashboard and team management.
2. Team invite flow works and invited user can sign in.
3. Role changes apply immediately to API permissions.
4. Users/Team/Roles mutations reject empty reason.
5. Integrations health and usage load successfully.
6. Limits show expected status (`healthy`/`degraded`/`missing`).
7. Audit log entries include actor, reason, and before/after snapshots.

## 9) Suggested First-Team Rollout

1. Add one `super_admin` (primary owner).
2. Add one `admin_ops`.
3. Add one `support_agent`.
4. Add one `finance_admin`.
5. Validate each role’s allowed pages/actions.
6. Freeze role model before broader invites.