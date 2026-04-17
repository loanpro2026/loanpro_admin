'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

type NotificationRow = {
  _id?: string;
  message: string;
  action: string;
  resource: string;
  resourceId?: string;
  reason?: string;
  createdAt: string;
  actor?: {
    email?: string;
    role?: string;
  };
  readBy?: string[];
};

type NotificationsPayload = {
  success?: boolean;
  data?: NotificationRow[];
  meta?: {
    unreadTotal?: number;
  };
  error?: string;
};

function formatAgo(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AdminNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState('');
  const [groupByResource, setGroupByResource] = useState(true);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/notifications?limit=8&unreadOnly=true', { cache: 'no-store' });
      const payload = (await response.json()) as NotificationsPayload;
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load notifications');
      }
      setItems(Array.isArray(payload.data) ? payload.data : []);
      setUnreadCount(Number(payload?.meta?.unreadTotal || 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setError('');
    try {
      const response = await fetch('/api/notifications', { method: 'PATCH' });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to mark all as read');
      }
      await load();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const toggleRead = async (item: NotificationRow, read: boolean) => {
    const id = String(item._id || '').trim();
    if (!id) return;

    setMarkingId(id);
    setError('');
    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update read state');
      }
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update read state');
    } finally {
      setMarkingId('');
    }
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 10000);

    const handleFocus = () => void load();
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!panelRef.current) return;
      const target = event.target as Node;
      if (!panelRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const badgeText = useMemo(() => {
    if (unreadCount <= 0) return '';
    if (unreadCount > 99) return '99+';
    return String(unreadCount);
  }, [unreadCount]);

  const groupedItems = useMemo(() => {
    if (!groupByResource) {
      return [{ label: 'All notifications', items }];
    }

    const groups = new Map<string, NotificationRow[]>();
    for (const item of items) {
      const key = item.resource || 'other';
      const existing = groups.get(key) || [];
      existing.push(item);
      groups.set(key, existing);
    }

    return Array.from(groups.entries()).map(([label, grouped]) => ({ label, items: grouped }));
  }, [groupByResource, items]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="admin-focus relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        aria-label="Notifications"
      >
        <AdminIcon name="bell" size={18} className="text-slate-600" />
        {badgeText ? (
          <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm">
            {badgeText}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-3 w-[360px] rounded-[20px] border border-slate-200 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  checked={groupByResource}
                  onChange={(event) => setGroupByResource(event.target.checked)}
                />
                Group
              </label>
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={markingAll || unreadCount === 0}
                className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {markingAll ? 'Marking...' : 'Mark all read'}
              </button>
            </div>
          </div>

          {error ? <p className="admin-alert mb-2 border-red-200 bg-red-50 text-red-700">{error}</p> : null}

          {loading ? (
            <p className="py-6 text-center text-xs text-slate-500">Loading notifications...</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">No notifications yet.</p>
          ) : (
            <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
              {groupedItems.map((group) => (
                <div key={group.label} className="space-y-2">
                  {groupByResource ? <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{group.label}</p> : null}
                  {group.items.map((item) => {
                    const id = String(item._id || '').trim();
                    const target = item.resourceId ? `${item.resource}:${item.resourceId}` : item.resource;
                    return (
                      <article key={id || `${item.action}-${item.createdAt}`} className="rounded-2xl border border-slate-200 p-3">
                        <p className="text-xs font-semibold text-slate-800">{item.action}</p>
                        <p className="mt-0.5 text-xs text-slate-700">{item.message}</p>
                        <p className="mt-1 text-[11px] text-slate-500">Target: {target}</p>
                        <p className="text-[11px] text-slate-500">Actor: {item.actor?.email || '-'} | {formatAgo(item.createdAt)}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">{item.reason ? `Reason: ${item.reason}` : 'No reason provided'}</span>
                          <button
                            type="button"
                            disabled={markingId === id}
                            onClick={() => void toggleRead(item, true)}
                            className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {markingId === id ? 'Saving...' : 'Mark read'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <Link href="/notifications" className="admin-focus rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800">
              Open Full Center
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
