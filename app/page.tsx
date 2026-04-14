import Link from 'next/link';
import { AdminIcon } from '@/components/admin/AdminIcons';

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1480px] gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="admin-surface relative overflow-hidden p-8 sm:p-10 lg:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.18),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.14),_transparent_24%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <span className="admin-chip">LoanPro Admin</span>
              <div className="max-w-3xl space-y-5">
                <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  A control center that feels built for real operations.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Fast navigation, secure admin workflows, live notifications, and a cleaner system overview designed for daily operational work.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/sign-in" className="admin-focus inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:shadow-[0_24px_80px_rgba(37,99,235,0.26)]">
                  <AdminIcon name="shield" />
                  Sign in
                </Link>
                <Link href="/dashboard" className="admin-focus inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-panel">
                  <AdminIcon name="dashboard" className="text-brand-600" />
                  Open dashboard
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['RBAC', 'Granular permissions'],
                ['Live alerts', 'In-app activity stream'],
                ['Audit-ready', 'Reason-backed actions'],
                ['Responsive', 'Full-width workspace'],
              ].map(([title, desc]) => (
                <article key={title} className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur animate-fadeUp">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white shadow-glow">
                      <AdminIcon name="spark" />
                    </span>
                    <div>
                      <p className="font-display text-lg font-semibold text-slate-950">{title}</p>
                      <p className="text-sm text-slate-600">{desc}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="admin-surface flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="space-y-5">
            <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Operations preview</p>
              <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {[
                  ['Users', '12.4k'],
                  ['Subscriptions', '3.2k'],
                  ['Revenue', 'INR 8.6L'],
                  ['Tickets', '34 open'],
                  ['Notifications', '16 unread'],
                  ['Health', 'Stable'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">{label}</p>
                    <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Secure by design</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Clerk auth, RBAC, audit logs, and role-aware navigation keep the admin layer safe while staying quick to use.
                </p>
              </article>
              <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Visual system</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Branded gradients, soft shadows, motion, and better spacing make the app feel polished rather than basic.
                </p>
              </article>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-brand-100 bg-gradient-to-r from-brand-50 to-cyan-50 p-5">
            <p className="text-sm font-semibold text-brand-900">Ready for operations</p>
            <p className="mt-1 text-sm text-slate-600">Open the dashboard and continue with the redesigned admin experience.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
