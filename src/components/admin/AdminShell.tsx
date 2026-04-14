'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { AdminNotificationsBell } from '@/components/admin/AdminNotificationsBell';
import { AdminProfileMenu } from '@/components/admin/AdminProfileMenu';

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.12),_transparent_26%),linear-gradient(180deg,_#eef4ff_0%,_#f8fafc_22%,_#f8fafc_100%)] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-500 text-white shadow-glow">
              <AdminIcon name="spark" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">LoanPro Admin</p>
              <p className="text-xs text-slate-500">admin.loanpro.tech · control center</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-xs text-slate-600 shadow-sm lg:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
              Live operations online
            </div>
            <AdminNotificationsBell />
            <Link href="/status" className="admin-focus inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-panel">
              <AdminIcon name="status" className="text-brand-600" />
              System Status
            </Link>
            <AdminProfileMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="sticky top-[5.75rem] h-fit rounded-[28px] border border-white/70 bg-white/85 p-3 shadow-panel backdrop-blur-xl lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="mb-3 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 px-4 py-4 text-white shadow-glow">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Command Hub</p>
            <h2 className="mt-1 font-display text-lg font-semibold">Navigate the control plane</h2>
            <p className="mt-1 text-xs leading-5 text-white/70">Fast access to every operational surface in one place.</p>
          </div>
          <nav className="grid gap-1.5">
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`admin-focus group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-slate-100/80 hover:shadow-sm ${
                  pathname === item.href || pathname?.startsWith(`${item.href}/`)
                    ? 'bg-gradient-to-r from-brand-600 to-cyan-500 text-white shadow-glow'
                    : 'text-slate-700'
                }`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${pathname === item.href || pathname?.startsWith(`${item.href}/`) ? 'bg-white/15 text-white' : 'bg-slate-100 text-brand-600'}`}>
                  <AdminIcon name={item.icon} />
                </span>
                <span className="flex-1">{item.label}</span>
                {(pathname === item.href || pathname?.startsWith(`${item.href}/`)) ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
              </Link>
            ))}
          </nav>
        </aside>
        <section className="min-h-[calc(100vh-7rem)] overflow-hidden rounded-[30px] border border-white/70 bg-white/85 shadow-panel backdrop-blur-xl">
          {children}
        </section>
      </div>
    </div>
  );
}
