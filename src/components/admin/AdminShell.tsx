'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { ADMIN_NAV_ITEMS } from '@/constants/navigation';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { AdminNotificationsBell } from '@/components/admin/AdminNotificationsBell';
import { AdminProfileMenu } from '@/components/admin/AdminProfileMenu';

type AdminShellProps = {
  children: React.ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');

  const systemChecks = useMemo(
    () => [
      { label: 'Edge', value: 'Healthy', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      { label: 'Sync', value: 'Live', tone: 'text-sky-700 bg-sky-50 border-sky-200' },
      { label: 'Backup', value: 'Ready', tone: 'text-slate-700 bg-slate-50 border-slate-200' },
    ],
    []
  );

  const currentAccount = user?.primaryEmailAddress?.emailAddress || 'Loanprodesktop@gmail.com';
  const currentName = user?.fullName || user?.username || 'LoanPro Desktop';
  const normalizedSidebarSearch = sidebarSearch.trim().toLowerCase();

  const filteredNavItems = useMemo(() => {
    if (!normalizedSidebarSearch) return ADMIN_NAV_ITEMS;
    return ADMIN_NAV_ITEMS.filter((item) => {
      const haystack = `${item.label} ${item.key} ${item.href}`.toLowerCase();
      return haystack.includes(normalizedSidebarSearch);
    });
  }, [normalizedSidebarSearch]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSidebarSearchSubmit = () => {
    if (filteredNavItems.length === 0) return;
    router.push(filteredNavItems[0].href);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto w-full max-w-[1560px] px-3 pb-4 pt-3 sm:px-5 lg:px-6">
        <header className="sticky top-0 z-40 mb-4 rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.02)] backdrop-blur">
          <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                <AdminIcon name="spark" size={16} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">LoanPro Admin</p>
                <p className="truncate text-xs text-slate-500">Control workspace</p>
              </div>
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
                className="admin-focus inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                aria-label="System checks"
                title="System checks"
              >
                <AdminIcon name="status" className="text-slate-600" size={18} />
              </Link>
              <AdminProfileMenu />
            </div>
          </div>
        </header>

        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="sticky top-[92px] h-fit rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.02)] lg:max-h-[calc(100vh-112px)] lg:overflow-y-auto">
            <div className="space-y-4">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <AdminIcon name="user" size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{currentName}</p>
                    <p className="truncate text-xs text-slate-500">{currentAccount}</p>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100">
                <AdminIcon name="analytics" className="text-slate-400" size={18} />
                <input
                  ref={searchInputRef}
                  className="admin-focus w-full bg-transparent text-sm placeholder:text-slate-400"
                  placeholder="Search pages..."
                  aria-label="Sidebar search"
                  value={sidebarSearch}
                  onChange={(event) => setSidebarSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleSidebarSearchSubmit();
                    }
                  }}
                />
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Ctrl K</span>
              </label>

              <nav className="space-y-1">
                {filteredNavItems.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`admin-focus group flex items-center gap-3 rounded-[18px] border px-3 py-2.5 text-sm font-medium transition hover:bg-slate-50 ${
                        active ? 'border-slate-300 bg-slate-100 text-slate-950' : 'border-transparent text-slate-700'
                      }`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-500'}`}>
                        <AdminIcon name={item.icon} size={18} />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {active ? <span className="h-2 w-2 rounded-full bg-slate-900" /> : null}
                    </Link>
                  );
                })}
                {filteredNavItems.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">No matching pages</p>
                ) : null}
              </nav>
            </div>
          </aside>

          <section className="min-h-[calc(100vh-112px)] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}
