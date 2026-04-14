import Link from 'next/link';
import { AdminIcon } from '@/components/admin/AdminIcons';

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center px-4 py-6 sm:px-6 lg:px-8">
      <section className="admin-surface mx-auto grid w-full max-w-4xl gap-6 overflow-hidden p-6 sm:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
        <div className="rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 p-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.26)]">
          <span className="admin-chip border-white/10 bg-white/10 text-white/80">Restricted</span>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">Access denied</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75">
            Your current role does not have permission to open this area. If you need elevated access, ask a super administrator to review your role.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/dashboard" className="admin-focus inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5">
              <AdminIcon name="dashboard" className="text-brand-600" />
              Go to dashboard
            </Link>
            <Link href="/sign-in" className="admin-focus inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
              <AdminIcon name="user" />
              Switch account
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-[28px] border border-slate-200 bg-white p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">What this means</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ['Role gated', 'Your role is not allowed on this page'],
                ['Session valid', 'You are authenticated, but not authorized'],
                ['Admin review', 'A super admin can update your access'],
                ['Audit-safe', 'All attempts remain protected and logged'],
              ].map(([title, desc]) => (
                <article key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="mt-1 text-sm text-slate-600">{desc}</p>
                </article>
              ))}
            </div>
          </div>

          <p className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
            This is intentional. The admin panel now separates identity from authorization, so only approved team roles can access privileged pages.
          </p>
        </div>
      </section>
    </main>
  );
}
