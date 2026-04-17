import Link from 'next/link';
import { AdminIcon } from '@/components/admin/AdminIcons';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-[1320px] gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10 lg:p-12">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            LoanPro Admin
          </span>

          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Admin workspace for operations, support, and billing teams.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Role-based access, audit-safe actions, and centralized tools for user lifecycle, subscriptions, payments, and support workflows.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="admin-focus inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <AdminIcon name="shield" size={16} />
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="admin-focus inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <AdminIcon name="dashboard" size={16} />
              Open dashboard
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ['Access control', 'Permissions are enforced at route and action level.'],
              ['Operational visibility', 'Teams can monitor payments, support, and account states.'],
              ['Traceability', 'Sensitive updates are logged with actor and reason context.'],
              ['Team workflows', 'Role-aware navigation keeps each admin focused on approved tasks.'],
            ].map(([title, desc]) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-9">
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Control areas</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ['Users', 'Identity and profile controls'],
                ['Subscriptions', 'Plan and lifecycle actions'],
                ['Payments', 'Status, review, and reconciliation'],
                ['Support', 'Ticket and contact pipelines'],
                ['Roles', 'RBAC policy management'],
                ['Notifications', 'Operational activity stream'],
              ].map(([label, desc]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Authentication and permission checks are enforced before admin routes are rendered.</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              If a signed-in account does not match required roles, access is blocked and users can switch accounts immediately from the restricted screen.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Authentication</p>
              <p className="mt-2 text-sm text-slate-700">Managed with Clerk session controls and secure redirects.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Authorization</p>
              <p className="mt-2 text-sm text-slate-700">RBAC policy checks gate pages and sensitive mutations.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
