# Launch Checklist (admin.loanpro.tech)

## Security
- [ ] Clerk admin-only onboarding and invite policy enabled
- [ ] MFA enforced for all admin roles
- [ ] Route and API permission checks verified
- [ ] First super admin bootstrap verified (`ADMIN_BOOTSTRAP_*` or `ADMIN_INIT_SECRET` path)
- [ ] Cloudflare WAF/rate controls enabled
- [ ] Secrets configured only in Vercel env

## Reliability
- [ ] Mongo indexes applied
- [ ] Error monitoring and alert thresholds configured
- [ ] Audit logging coverage validated for all mutations
- [ ] Rollback plan documented

## Operations
- [ ] Integration health checks operational
- [ ] Integrations usage and limits page validated (GA, Razorpay, Brevo, queues)
- [ ] Payment/release high-risk action confirmation implemented
- [ ] Support/contact admin workflows smoke-tested
- [ ] Analytics dashboards validated

## Go-Live
- [ ] DNS/SSL verified for admin.loanpro.tech
- [ ] `npm run predeploy:check` passes with production environment values
- [ ] Production smoke tests passed
- [ ] Team access reviewed and approved
- [ ] On-call owner assigned for first 72 hours
