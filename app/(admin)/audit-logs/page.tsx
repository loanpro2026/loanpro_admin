'use client';

import { useEffect, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

type AuditLogRecord = {
  _id?: string;
  action: string;
  resource: string;
  resourceId?: string;
  reason?: string;
  createdAt: string;
  actor: {
    email: string;
    role: string;
  };
};

export default function AuditLogsPage() {
  const STORAGE_KEY = 'lp_admin_audit_logs_table_v1';
  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [actorEmailFilter, setActorEmailFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
      if (actionFilter.trim()) params.set('action', actionFilter.trim());
      if (resourceFilter.trim()) params.set('resource', resourceFilter.trim());
      if (actorEmailFilter.trim()) params.set('actorEmail', actorEmailFilter.trim().toLowerCase());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load audit logs');
      }

      setRows(payload.data || []);
      setTotal(Number(payload?.meta?.total || 0));
      setHasMore(Boolean(payload?.meta?.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        actionFilter?: string;
        resourceFilter?: string;
        actorEmailFilter?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: number;
      };
      if (typeof parsed.actionFilter === 'string') setActionFilter(parsed.actionFilter);
      if (typeof parsed.resourceFilter === 'string') setResourceFilter(parsed.resourceFilter);
      if (typeof parsed.actorEmailFilter === 'string') setActorEmailFilter(parsed.actorEmailFilter);
      if (typeof parsed.dateFrom === 'string') setDateFrom(parsed.dateFrom);
      if (typeof parsed.dateTo === 'string') setDateTo(parsed.dateTo);
      if (typeof parsed.limit === 'number' && [10, 25, 50, 100].includes(parsed.limit)) setLimit(parsed.limit);
    } catch {
      // Ignore invalid saved preferences
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ actionFilter, resourceFilter, actorEmailFilter, dateFrom, dateTo, limit })
      );
    } catch {
      // Ignore storage errors
    }
  }, [actionFilter, resourceFilter, actorEmailFilter, dateFrom, dateTo, limit]);

  useEffect(() => {
    void load();
  }, [skip, limit]);

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (actionFilter.trim()) params.set('action', actionFilter.trim());
      if (resourceFilter.trim()) params.set('resource', resourceFilter.trim());
      if (actorEmailFilter.trim()) params.set('actorEmail', actorEmailFilter.trim().toLowerCase());
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const response = await fetch(`/api/audit-logs/export?${params.toString()}`);
      if (!response.ok) {
        let message = 'Failed to export audit logs';
        try {
          const payload = await response.json();
          message = payload?.error || message;
        } catch {
          // non-json error body fallback
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `audit-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-1 lg:items-start xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Audit trail</span>
          <h1 className="admin-title mt-4">Audit Logs</h1>
          <p className="admin-subtitle">Review privileged admin actions with actor, reason, and timestamp details.</p>
        </div>
        <div className="flex gap-3 lg:justify-self-end">
          <div className="rounded-[22px] border border-slate-200 bg-white/88 p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Entries</p>
            <p className="mt-2 font-display text-xl font-semibold text-slate-950">{total || rows.length}</p>
          </div>
        </div>
      </header>

      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><AdminIcon name="audit-logs" size={18} /></span>
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-xs text-slate-500">Slice events by actor, action, resource, and date range.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Action (example: team.invite)"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          />
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Resource (example: roles)"
            value={resourceFilter}
            onChange={(event) => setResourceFilter(event.target.value)}
          />
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Actor email"
            value={actorEmailFilter}
            onChange={(event) => setActorEmailFilter(event.target.value)}
          />
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
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
            onClick={() => void exportCsv()}
            disabled={exporting}
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/88 shadow-sm">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Recent events</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading audit logs...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No audit events found.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Resource</th>
                  <th className="px-5 py-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id || `${row.action}-${row.createdAt}`} className="border-t border-slate-200/80 transition hover:bg-slate-50/80">
                    <td className="px-5 py-3 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-700">
                      <div>{row.actor?.email || '-'}</div>
                      <div className="text-xs text-slate-500">{row.actor?.role || '-'}</div>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.action}</td>
                    <td className="px-5 py-3 text-slate-700">{row.resource}{row.resourceId ? `:${row.resourceId}` : ''}</td>
                    <td className="px-5 py-3 text-slate-700">{row.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex items-center justify-between rounded-[28px] border border-slate-200 bg-white/88 px-5 py-4 shadow-sm">
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