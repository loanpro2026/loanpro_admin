'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { AdminNotificationsBell } from '@/components/admin/AdminNotificationsBell';
import { AdminProfileMenu } from '@/components/admin/AdminProfileMenu';

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  const systemChecks = useMemo(
    () => [
      { label: 'Edge', value: 'Healthy', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      { label: 'Sync', value: 'Live', tone: 'text-sky-700 bg-sky-50 border-sky-200' },
      { label: 'Backup', value: 'Ready', tone: 'text-slate-700 bg-slate-50 border-slate-200' },
    ],
    []
  );

  const currentAccount = 'Loanprodesktop@gmail.com';

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <AdminIcon name="spark" size={18} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">LoanPro Admin</p>
              <p className="truncate text-xs text-slate-500">{currentAccount}</p>
            </div>
          </div>

          <div className="hidden flex-1 items-center px-6 xl:flex">
            <label className="flex w-full max-w-[520px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 shadow-sm transition focus-within:border-brand-300 focus-within:bg-white">
              <AdminIcon name="analytics" className="text-slate-400" size={18} />
              <input
                className="admin-focus w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400"
                placeholder="Search users, subscriptions, payments, tickets..."
                aria-label="Global search"
              />
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">Ctrl K</span>
            </label>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {systemChecks.map((check) => (
              <div key={check.label} className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold lg:flex ${check.tone}`}>
                <span>{check.label}</span>
                <span className="text-slate-500">{check.value}</span>
              </div>
            ))}
            <AdminNotificationsBell />
            <Link
              href="/status"
              className="admin-focus inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <AdminIcon name="status" className="text-slate-500" size={18} />
              <span className="hidden md:inline">System checks</span>
            </Link>
            <AdminProfileMenu />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[308px_minmax(0,1fr)] lg:px-8">
        <aside className="sticky top-[88px] h-fit rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <AdminIcon name="user" size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{currentAccount}</p>
                  <p className="text-xs text-slate-500">Cloud control workspace</p>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
              <AdminIcon name="analytics" className="text-slate-400" size={18} />
              <input className="admin-focus w-full bg-transparent text-sm placeholder:text-slate-400" placeholder="Quick search..." aria-label="Sidebar search" />
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Ctrl K</span>
            </label>

            <nav className="space-y-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`admin-focus group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition hover:bg-slate-50 ${
                      active ? 'border-slate-300 bg-slate-100 text-slate-950 shadow-sm' : 'border-transparent text-slate-700'
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                      <AdminIcon name={item.icon} size={18} />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {active ? <span className="h-2 w-2 rounded-full bg-slate-900" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="min-h-[calc(100vh-112px)] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          {children}
        </section>
      </div>
    </div>
  );
}
