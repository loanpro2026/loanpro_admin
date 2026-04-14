'use client';

import { useEffect, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

type NotificationRow = {
  _id?: string;
  message: string;
  action: string;
  resource: string;
  resourceId?: string;
  reason?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  actor?: {
    email?: string;
    role?: string;
  };
};

export default function NotificationsPage() {
  const STORAGE_KEY = 'lp_admin_notifications_table_v1';

  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState('');
  const [groupByResource, setGroupByResource] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip),
        unreadOnly: String(onlyUnread),
      });
      if (actionFilter.trim()) params.set('action', actionFilter.trim());
      if (resourceFilter.trim()) params.set('resource', resourceFilter.trim());

      const response = await fetch(`/api/notifications?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load notifications');
      }

      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotal(Number(payload?.meta?.total || 0));
      setUnreadTotal(Number(payload?.meta?.unreadTotal || 0));
      setHasMore(Boolean(payload?.meta?.hasMore));
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

  const setReadState = async (row: NotificationRow, read: boolean) => {
    const id = String(row._id || '').trim();
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
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        actionFilter?: string;
        resourceFilter?: string;
        onlyUnread?: boolean;
        groupByResource?: boolean;
        limit?: number;
      };

      if (typeof parsed.actionFilter === 'string') setActionFilter(parsed.actionFilter);
      if (typeof parsed.resourceFilter === 'string') setResourceFilter(parsed.resourceFilter);
      if (typeof parsed.onlyUnread === 'boolean') setOnlyUnread(parsed.onlyUnread);
      if (typeof parsed.groupByResource === 'boolean') setGroupByResource(parsed.groupByResource);
      if (typeof parsed.limit === 'number' && [10, 25, 50, 100].includes(parsed.limit)) setLimit(parsed.limit);
    } catch {
      // Ignore invalid saved preferences
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ actionFilter, resourceFilter, onlyUnread, groupByResource, limit })
      );
    } catch {
      // Ignore storage errors
    }
  }, [actionFilter, resourceFilter, onlyUnread, groupByResource, limit]);

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
  }, [skip, limit]);

  const groupedRows = groupByResource
    ? Array.from(
        rows.reduce((map, row) => {
          const key = row.resource || 'other';
          const existing = map.get(key) || [];
          existing.push(row);
          map.set(key, existing);
          return map;
        }, new Map<string, NotificationRow[]>()).entries()
      ).map(([label, items]) => ({ label, items }))
    : [{ label: 'All notifications', items: rows }];

  return (
    <main className="space-y-6 p-6 sm:p-8">
      <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <span className="admin-chip">Live signal center</span>
          <h1 className="admin-title mt-4">Notifications</h1>
          <p className="admin-subtitle">Live admin activity stream generated from database-changing operations.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visible</p>
            <p className="mt-2 font-display text-xl font-semibold text-slate-950">{rows.length}</p>
          </article>
          <article className="rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Unread</p>
            <p className="mt-2 font-display text-xl font-semibold text-slate-950">{unreadTotal}</p>
          </article>
        </div>
      </header>

      <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><AdminIcon name="notifications" /></span>
          <h2 className="font-display text-xl font-semibold text-slate-950">Filters</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Action (example: users.update)"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          />
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Resource (example: subscriptions)"
            value={resourceFilter}
            onChange={(event) => setResourceFilter(event.target.value)}
          />
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={onlyUnread}
              onChange={(event) => {
                setOnlyUnread(event.target.checked);
                setSkip(0);
              }}
            />
            Only unread
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={groupByResource}
              onChange={(event) => setGroupByResource(event.target.checked)}
            />
            Group by resource
          </label>
          <select
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            value={String(limit)}
            onChange={(event) => {
              setLimit(Number(event.target.value || 25));
              setSkip(0);
            }}
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSkip(0);
                void load();
              }}
              className="admin-focus rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={markingAll || unreadTotal === 0}
              className="admin-focus rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markingAll ? 'Marking...' : 'Mark all read'}
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/85 shadow-sm">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Event stream</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading notifications...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No notifications found.</p>
        ) : (
          <div className="space-y-5 px-5 py-4">
            {groupedRows.map((group) => (
              <section key={group.label} className="space-y-2">
                {groupByResource ? <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</h3> : null}
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table className="admin-table min-w-full text-left text-sm">
                    <thead className="bg-slate-50/90 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-5 py-3">Time</th>
                        <th className="px-5 py-3">Actor</th>
                        <th className="px-5 py-3">Action</th>
                        <th className="px-5 py-3">Target</th>
                        <th className="px-5 py-3">Details</th>
                        <th className="px-5 py-3">Read</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((row) => {
                        const id = String(row._id || '').trim();
                        return (
                          <tr key={id || `${row.action}-${row.createdAt}`} className="border-t border-slate-200/80 align-top transition hover:bg-slate-50/80">
                            <td className="px-5 py-3 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td>
                            <td className="px-5 py-3 text-slate-700">
                              <div>{row.actor?.email || '-'}</div>
                              <div className="text-xs text-slate-500">{row.actor?.role || '-'}</div>
                            </td>
                            <td className="px-5 py-3 font-medium text-slate-800">{row.action}</td>
                            <td className="px-5 py-3 text-slate-700">
                              {row.resource}
                              {row.resourceId ? `:${row.resourceId}` : ''}
                            </td>
                            <td className="px-5 py-3 text-xs text-slate-700">
                              <div>{row.message}</div>
                              {row.reason ? <div className="mt-1 text-slate-500">Reason: {row.reason}</div> : null}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void setReadState(row, true)}
                                  disabled={markingId === id}
                                  className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Mark read
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void setReadState(row, false)}
                                  disabled={markingId === id}
                                  className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Mark unread
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="flex items-center justify-between rounded-[28px] border border-slate-200 bg-white/85 px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Showing {rows.length === 0 ? 0 : skip + 1}-{skip + rows.length} of {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || skip === 0}
            onClick={() => setSkip((prev) => Math.max(0, prev - limit))}
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={loading || !hasMore}
            onClick={() => setSkip((prev) => prev + limit)}
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
