'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { AdminInlineTableSkeleton } from '@/components/admin/AdminLoading';

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
  const [actionInput, setActionInput] = useState('');
  const [resourceInput, setResourceInput] = useState('');
  const [onlyUnreadInput, setOnlyUnreadInput] = useState(false);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState('');
  const [groupByResource, setGroupByResource] = useState(true);
  const [appliedQuery, setAppliedQuery] = useState({ action: '', resource: '', onlyUnread: false });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip),
        unreadOnly: String(appliedQuery.onlyUnread),
      });
      if (appliedQuery.action.trim()) params.set('action', appliedQuery.action.trim());
      if (appliedQuery.resource.trim()) params.set('resource', appliedQuery.resource.trim());

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
        actionInput?: string;
        resourceInput?: string;
        onlyUnreadInput?: boolean;
        groupByResource?: boolean;
        limit?: number;
      };

      if (typeof parsed.actionInput === 'string') {
        setActionInput(parsed.actionInput);
      }
      if (typeof parsed.resourceInput === 'string') {
        setResourceInput(parsed.resourceInput);
      }
      if (typeof parsed.onlyUnreadInput === 'boolean') {
        setOnlyUnreadInput(parsed.onlyUnreadInput);
      }
      if (typeof parsed.groupByResource === 'boolean') setGroupByResource(parsed.groupByResource);
      if (typeof parsed.limit === 'number' && [10, 25, 50, 100].includes(parsed.limit)) setLimit(parsed.limit);

      setAppliedQuery({
        action: typeof parsed.actionInput === 'string' ? parsed.actionInput : '',
        resource: typeof parsed.resourceInput === 'string' ? parsed.resourceInput : '',
        onlyUnread: typeof parsed.onlyUnreadInput === 'boolean' ? parsed.onlyUnreadInput : false,
      });
    } catch {
      // Ignore invalid saved preferences
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ actionInput, resourceInput, onlyUnreadInput, groupByResource, limit })
      );
    } catch {
      // Ignore storage errors
    }
  }, [actionInput, resourceInput, onlyUnreadInput, groupByResource, limit]);

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
  }, [skip, limit, appliedQuery.action, appliedQuery.resource, appliedQuery.onlyUnread]);

  const applyFilters = () => {
    setSkip(0);
    setAppliedQuery({
      action: actionInput.trim(),
      resource: resourceInput.trim(),
      onlyUnread: onlyUnreadInput,
    });
  };

  const groupedRows = useMemo(
    () =>
      groupByResource
        ? Array.from(
            rows.reduce((map, row) => {
              const key = row.resource || 'other';
              const existing = map.get(key) || [];
              existing.push(row);
              map.set(key, existing);
              return map;
            }, new Map<string, NotificationRow[]>()).entries()
          ).map(([label, items]) => ({ label, items }))
        : [{ label: 'All notifications', items: rows }],
    [rows, groupByResource]
  );

  const visibleEnd = rows.length === 0 ? 0 : skip + rows.length;

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Live signal center</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Notifications</h1>
          <p className="mt-2 text-base text-slate-600">
            Track admin-side mutations in real time, isolate critical resources, and maintain response awareness.
          </p>
        </div>
        <div className="admin-kpi-grid lg:justify-self-end">
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{rows.length}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unread</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{unreadTotal}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{total}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Groups</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{groupedRows.length}</p>
          </article>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <AdminIcon name="notifications" size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-sm text-slate-500">Control visibility by action, resource, and unread state.</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-6">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Action (example: users.update)"
            value={actionInput}
            onChange={(event) => setActionInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyFilters();
              }
            }}
          />
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Resource (example: subscriptions)"
            value={resourceInput}
            onChange={(event) => setResourceInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyFilters();
              }
            }}
          />

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={onlyUnreadInput}
              onChange={(event) => setOnlyUnreadInput(event.target.checked)}
            />
            Only unread
          </label>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={groupByResource}
              onChange={(event) => setGroupByResource(event.target.checked)}
            />
            Group by resource
          </label>

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
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
              onClick={applyFilters}
              className="admin-focus inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <AdminIcon name="spark" size={14} />
              Apply
            </button>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={markingAll || unreadTotal === 0}
              className="admin-focus rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markingAll ? 'Marking...' : 'Mark all read'}
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Event stream</h2>
        </div>

        {loading ? (
          <AdminInlineTableSkeleton rows={8} />
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No notifications found.</p>
        ) : (
          <div className="space-y-5 px-5 py-4">
            {groupedRows.map((group) => (
              <section key={group.label} className="space-y-2">
                {groupByResource ? <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</h3> : null}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="admin-table min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
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
                        const actor = row.actor?.email || '-';
                        return (
                          <tr key={id || `${row.action}-${row.createdAt}`} className="border-t border-slate-200 align-top transition hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td>
                            <td className="px-5 py-3 text-slate-700">
                              <div className="font-medium text-slate-800">{actor}</div>
                              <div className="text-xs text-slate-500">{row.actor?.role || '-'}</div>
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {row.action}
                              </span>
                            </td>
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
                                  className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Mark read
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void setReadState(row, false)}
                                  disabled={markingId === id}
                                  className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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

      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Showing {rows.length === 0 ? 0 : skip + 1}-{visibleEnd} of {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || skip === 0}
            onClick={() => setSkip((prev) => Math.max(0, prev - limit))}
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={loading || !hasMore}
            onClick={() => setSkip((prev) => prev + limit)}
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
