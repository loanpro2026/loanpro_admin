'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useClerk, useUser } from '@clerk/nextjs';
import { AdminIcon } from '@/components/admin/AdminIcons';

export function AdminProfileMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const initials = useMemo(() => {
    const name = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || 'A';
    return String(name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'A';
  }, [user]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="admin-focus group flex h-10 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-xs font-semibold text-white shadow-sm">
          {initials}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Profile</span>
          <span className="block max-w-[150px] truncate text-sm font-semibold text-slate-900">{user?.fullName || user?.username || 'Administrator'}</span>
        </span>
        <svg className={`h-4 w-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[300px] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <div className="bg-slate-950 px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold backdrop-blur">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{user?.fullName || 'Administrator'}</p>
                <p className="truncate text-xs text-white/80">{user?.primaryEmailAddress?.emailAddress || 'No email available'}</p>
              </div>
            </div>
          </div>

          <div className="p-3">
            <Link href="/profile" onClick={() => setOpen(false)} className="admin-focus flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              <AdminIcon name="profile" className="text-brand-600" />
              Manage profile
            </Link>
            <Link href="/notifications" onClick={() => setOpen(false)} className="admin-focus flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              <AdminIcon name="notifications" className="text-brand-600" />
              Notifications
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="admin-focus flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
              <AdminIcon name="settings" className="text-brand-600" />
              Settings
            </Link>

            <button
              type="button"
              onClick={() => void signOut({ redirectUrl: '/sign-in' })}
              className="admin-focus mt-2 flex w-full items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              <AdminIcon name="shield" className="text-red-600" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}