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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_28%),linear-gradient(180deg,#eef3fb_0%,#f7f9fd_22%,#f4f7fb_100%)] text-slate-900">
      <div className="mx-auto w-full max-w-[1600px] px-3 py-3 sm:px-5 lg:px-6 lg:py-4">
        <div className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <header className="relative z-20 border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.92)_100%)]">
            <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]">
                  <AdminIcon name="spark" size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">LoanPro Admin</p>
                  <p className="truncate text-xs text-slate-500">Control workspace</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {systemChecks.map((check) => (
                  <div key={check.label} className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold xl:flex ${check.tone}`}>
                    <span>{check.label}</span>
                    <span className="text-slate-500">{check.value}</span>
                  </div>
                ))}
                <AdminNotificationsBell />
                <Link
                  href="/status"
                  className="admin-focus inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  aria-label="System checks"
                  title="System checks"
                >
                  <AdminIcon name="status" className="text-slate-600" size={18} />
                </Link>
                <AdminProfileMenu />
              </div>
            </div>
          </header>

          <div className="grid min-h-[calc(100vh-108px)] grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(255,255,255,1)_100%)] lg:border-b-0 lg:border-r lg:border-slate-200/80">
              <div className="sticky top-0 h-full max-h-[calc(100vh-108px)] overflow-y-auto px-4 py-4 sm:px-5 lg:px-5 lg:py-5">
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-sm">
                        <AdminIcon name="user" size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">{currentName}</p>
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

                  <nav className="space-y-1.5 pt-1">
                    {filteredNavItems.map((item) => {
                      const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.key}
                          href={item.href}
                          className={`admin-focus group flex items-center gap-3 rounded-[18px] border px-3 py-2.5 text-sm font-medium transition ${
                            active
                              ? 'border-slate-200 bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)]'
                              : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <AdminIcon name={item.icon} size={18} />
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {active ? <span className="h-2 w-2 rounded-full bg-cyan-300" /> : null}
                        </Link>
                      );
                    })}
                    {filteredNavItems.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-500">No matching pages</p>
                    ) : null}
                  </nav>
                </div>
              </div>
            </aside>

            <section className="min-h-0 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,1)_100%)]">
              <div className="h-full">{children}</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
