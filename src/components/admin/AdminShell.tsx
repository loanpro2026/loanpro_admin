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

type NavItem = (typeof ADMIN_NAV_ITEMS)[number];
type NavChild = { label: string; href: string };

const NAV_GROUPS: Array<{ title: string; keys: NavItem['key'][] }> = [
  { title: 'Account home', keys: ['dashboard', 'analytics'] },
  { title: 'Customers', keys: ['users', 'subscriptions', 'payments', 'devices', 'coupons'] },
  { title: 'Support', keys: ['support', 'contact-requests', 'notifications'] },
  { title: 'Administration', keys: ['team', 'roles', 'audit-logs', 'integrations'] },
  { title: 'Manage account', keys: ['settings'] },
];

const NAV_CHILDREN: Partial<Record<NavItem['key'], NavChild[]>> = {
  users: [
    { label: 'All users', href: '/users' },
    { label: 'Device inventory', href: '/devices' },
  ],
  support: [
    { label: 'Tickets', href: '/support/tickets' },
    { label: 'Contact requests', href: '/contact-requests' },
  ],
  team: [
    { label: 'Team members', href: '/team' },
    { label: 'Roles', href: '/roles' },
    { label: 'Audit logs', href: '/audit-logs' },
  ],
  integrations: [
    { label: 'Connections', href: '/integrations' },
    { label: 'Status overview', href: '/status' },
  ],
};

const SIDEBAR_STORAGE_KEY = 'lp_admin_sidebar_prefs_v1';

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

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

  const groupedNavItems = useMemo(() => {
    const byKey = new Map<NavItem['key'], NavItem>();
    filteredNavItems.forEach((item) => {
      byKey.set(item.key, item);
    });

    const knownKeys = new Set<NavItem['key']>();
    const groups = NAV_GROUPS.map((group) => {
      const items = group.keys
        .map((key) => {
          knownKeys.add(key);
          return byKey.get(key);
        })
        .filter((item): item is NavItem => Boolean(item));
      return { title: group.title, items };
    }).filter((group) => group.items.length > 0);

    const ungrouped = filteredNavItems.filter((item) => !knownKeys.has(item.key));
    if (ungrouped.length > 0) {
      groups.push({ title: 'More', items: ungrouped });
    }

    return groups;
  }, [filteredNavItems]);

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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        compact?: boolean;
        collapsedGroups?: Record<string, boolean>;
        expandedItems?: Record<string, boolean>;
      };
      if (typeof parsed.compact === 'boolean') {
        setSidebarCompact(parsed.compact);
      }
      if (parsed.collapsedGroups && typeof parsed.collapsedGroups === 'object') {
        setCollapsedGroups(parsed.collapsedGroups);
      }
      if (parsed.expandedItems && typeof parsed.expandedItems === 'object') {
        setExpandedItems(parsed.expandedItems);
      }
    } catch {
      // Ignore invalid or unavailable storage
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        JSON.stringify({ compact: sidebarCompact, collapsedGroups, expandedItems })
      );
    } catch {
      // Ignore storage write failures
    }
  }, [sidebarCompact, collapsedGroups, expandedItems]);

  useEffect(() => {
    setExpandedItems((prev) => {
      let changed = false;
      const next = { ...prev };

      (Object.entries(NAV_CHILDREN) as Array<[NavItem['key'], NavChild[]]>).forEach(([key, children]) => {
        const hasActiveChild = children.some((child) => pathname === child.href || pathname?.startsWith(`${child.href}/`));
        if (hasActiveChild && typeof next[key] === 'undefined') {
          next[key] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [pathname]);

  const handleSidebarSearchSubmit = () => {
    if (filteredNavItems.length === 0) return;
    router.push(filteredNavItems[0].href);
  };

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleItemChildren = (key: NavItem['key']) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f7f7f8] text-slate-900">
      <div className="flex h-full min-h-0 w-full">
        <aside className={`hidden h-full shrink-0 border-r border-slate-200 bg-[#f3f3f4] transition-[width] duration-300 ease-out motion-reduce:transition-none lg:flex lg:flex-col ${sidebarCompact ? 'w-[84px]' : 'w-[280px]'}`}>
          <div className={`flex min-h-[60px] items-center border-b border-slate-200 transition-all duration-200 motion-reduce:transition-none ${sidebarCompact ? 'justify-center px-2' : 'px-5'}`}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f38020] text-white">
                <AdminIcon name="spark" size={14} />
              </div>
              <p className={`truncate text-[15px] font-semibold text-slate-900 transition-all duration-200 motion-reduce:transition-none ${sidebarCompact ? 'pointer-events-none w-0 opacity-0' : 'w-auto opacity-100'}`}>{currentAccount}</p>
            </div>
            <button
              type="button"
              className={`admin-focus ml-auto rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 ${sidebarCompact ? 'ml-0 mt-0.5' : ''}`}
              onClick={() => setSidebarCompact((prev) => !prev)}
              aria-label={sidebarCompact ? 'Expand sidebar' : 'Compact sidebar'}
              title={sidebarCompact ? 'Expand sidebar' : 'Compact sidebar'}
            >
              {sidebarCompact ? '>' : '<'}
            </button>
          </div>

          <div className={`flex min-h-0 flex-1 flex-col pb-4 pt-4 transition-all duration-200 motion-reduce:transition-none ${sidebarCompact ? 'px-2' : 'px-4'}`}>
            <label className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-within:border-brand-300 focus-within:ring-2 focus-within:ring-brand-100 ${sidebarCompact ? 'justify-center px-2' : ''}`}>
              <AdminIcon name="analytics" className="text-slate-400" size={16} />
              {sidebarCompact ? null : (
                <>
                  <input
                    ref={searchInputRef}
                    className="admin-focus w-full bg-transparent text-sm placeholder:text-slate-400"
                    placeholder="Quick search..."
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
                </>
              )}
            </label>

            <nav className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              {groupedNavItems.map((group) => (
                <div key={group.title} className="space-y-1">
                  {sidebarCompact ? null : (
                    <button
                      type="button"
                      className="admin-focus flex w-full items-center rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-white/70"
                      onClick={() => toggleGroup(group.title)}
                      aria-expanded={!collapsedGroups[group.title]}
                    >
                      <span className="flex-1 text-left">{group.title}</span>
                      <span
                        className={`text-xs text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${collapsedGroups[group.title] ? '' : 'rotate-90'}`}
                        aria-hidden="true"
                      >
                        &gt;
                      </span>
                    </button>
                  )}
                  {(sidebarCompact || !collapsedGroups[group.title]) && group.items.map((item, itemIndex) => {
                    const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                    const childItems = NAV_CHILDREN[item.key] || [];
                    const hasChildren = childItems.length > 0;
                    const childActive = childItems.some((child) => pathname === child.href || pathname?.startsWith(`${child.href}/`));
                    const childrenExpanded = Boolean(expandedItems[item.key]);
                    return (
                      <div key={item.key}>
                        <div className="group relative">
                          <Link
                            href={item.href}
                            title={item.label}
                            className={`admin-focus relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 pr-10 text-[15px] font-medium transition ${
                              active
                                ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                                : 'text-slate-700 hover:bg-white/80'
                            } ${sidebarCompact ? 'justify-center px-2 pr-2' : ''}`}
                          >
                            <span
                              className={`absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-[#f38020] transition-all duration-200 motion-reduce:transition-none ${active || childActive ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-70'}`}
                              aria-hidden="true"
                            />
                            <span className={`flex h-5 w-5 items-center justify-center ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                              <AdminIcon name={item.icon} size={16} />
                            </span>
                            {sidebarCompact ? null : (
                              <span
                                className="flex-1 truncate transition-all duration-200 motion-reduce:transition-none"
                                style={{ transitionDelay: `${Math.min(itemIndex * 20, 120)}ms` }}
                              >
                                {item.label}
                              </span>
                            )}
                            {sidebarCompact ? null : <span className={`text-sm ${active || childActive ? 'text-slate-400' : 'text-slate-300 group-hover:text-slate-400'}`} aria-hidden="true">&gt;</span>}
                          </Link>

                          {!sidebarCompact && hasChildren ? (
                            <button
                              type="button"
                              className="admin-focus absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                              aria-label={childrenExpanded ? `Collapse ${item.label} section` : `Expand ${item.label} section`}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                toggleItemChildren(item.key);
                              }}
                            >
                              <span
                                className={`block text-xs transition-transform duration-200 motion-reduce:transition-none ${childrenExpanded ? 'rotate-90' : ''}`}
                                aria-hidden="true"
                              >
                                &gt;
                              </span>
                            </button>
                          ) : null}
                        </div>

                        {!sidebarCompact && hasChildren && childrenExpanded ? (
                          <div className="ml-8 mt-1 space-y-1 border-l border-slate-200 pl-3">
                            {childItems.map((child) => {
                              const childIsActive = pathname === child.href || pathname?.startsWith(`${child.href}/`);
                              return (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={`admin-focus flex items-center rounded-md px-2 py-1.5 text-xs font-medium transition ${
                                    childIsActive
                                      ? 'bg-white text-slate-900 ring-1 ring-slate-200'
                                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-800'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
              {filteredNavItems.length === 0 ? <p className="px-3 py-2 text-xs text-slate-500">No matching pages</p> : null}
            </nav>

            {sidebarCompact ? null : (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 transition-opacity duration-200 motion-reduce:transition-none">
                <p className="font-semibold text-slate-700">LoanPro Admin</p>
                <p className="mt-1 truncate">{currentName}</p>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex min-h-[60px] items-center justify-between border-b border-slate-200 bg-[#f7f7f8] px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <p className="truncate text-sm font-medium text-slate-600">Control workspace</p>
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
                className="admin-focus inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                aria-label="System checks"
                title="System checks"
              >
                <AdminIcon name="status" className="text-slate-600" size={18} />
              </Link>
              <AdminProfileMenu />
            </div>
          </header>

          <div className="border-b border-slate-200 bg-[#f7f7f8] px-3 py-2 lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`admin-focus inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      active
                        ? 'border-slate-300 bg-white text-slate-900'
                        : 'border-transparent bg-white/60 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <AdminIcon name={item.icon} size={14} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <section className="min-h-0 flex-1 overflow-auto bg-white">{children}</section>
        </div>
      </div>
    </div>
  );
}
