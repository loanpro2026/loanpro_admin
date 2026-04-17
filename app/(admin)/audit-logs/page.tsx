'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { AdminInlineTableSkeleton } from '@/components/admin/AdminLoading';

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
  const [actionInput, setActionInput] = useState('');
  const [resourceInput, setResourceInput] = useState('');
  const [actorEmailInput, setActorEmailInput] = useState('');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [exporting, setExporting] = useState(false);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [appliedQuery, setAppliedQuery] = useState({
    action: '',
    resource: '',
    actorEmail: '',
    dateFrom: '',
    dateTo: '',
  });

  const summary = useMemo(() => {
    const counts = { visible: rows.length, total, withReason: 0 };
    rows.forEach((row) => {
      if (String(row.reason || '').trim()) counts.withReason += 1;
    });
    return counts;
  }, [rows, total]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
      if (appliedQuery.action.trim()) params.set('action', appliedQuery.action.trim());
      if (appliedQuery.resource.trim()) params.set('resource', appliedQuery.resource.trim());
      if (appliedQuery.actorEmail.trim()) params.set('actorEmail', appliedQuery.actorEmail.trim().toLowerCase());
      if (appliedQuery.dateFrom) params.set('dateFrom', appliedQuery.dateFrom);
      if (appliedQuery.dateTo) params.set('dateTo', appliedQuery.dateTo);

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
        actionInput?: string;
        resourceInput?: string;
        actorEmailInput?: string;
        dateFromInput?: string;
        dateToInput?: string;
        limit?: number;
      };
      if (typeof parsed.actionInput === 'string') setActionInput(parsed.actionInput);
      if (typeof parsed.resourceInput === 'string') setResourceInput(parsed.resourceInput);
      if (typeof parsed.actorEmailInput === 'string') setActorEmailInput(parsed.actorEmailInput);
      if (typeof parsed.dateFromInput === 'string') setDateFromInput(parsed.dateFromInput);
      if (typeof parsed.dateToInput === 'string') setDateToInput(parsed.dateToInput);
      if (typeof parsed.limit === 'number' && [10, 25, 50, 100].includes(parsed.limit)) setLimit(parsed.limit);

      setAppliedQuery({
        action: typeof parsed.actionInput === 'string' ? parsed.actionInput : '',
        resource: typeof parsed.resourceInput === 'string' ? parsed.resourceInput : '',
        actorEmail: typeof parsed.actorEmailInput === 'string' ? parsed.actorEmailInput : '',
        dateFrom: typeof parsed.dateFromInput === 'string' ? parsed.dateFromInput : '',
        dateTo: typeof parsed.dateToInput === 'string' ? parsed.dateToInput : '',
      });
    } catch {
      // Ignore invalid saved preferences
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ actionInput, resourceInput, actorEmailInput, dateFromInput, dateToInput, limit })
      );
    } catch {
      // Ignore storage errors
    }
  }, [actionInput, resourceInput, actorEmailInput, dateFromInput, dateToInput, limit]);

  useEffect(() => {
    void load();
  }, [skip, limit, appliedQuery.action, appliedQuery.resource, appliedQuery.actorEmail, appliedQuery.dateFrom, appliedQuery.dateTo]);

  const applyFilters = () => {
    setSkip(0);
    setAppliedQuery({
      action: actionInput.trim(),
      resource: resourceInput.trim(),
      actorEmail: actorEmailInput.trim(),
      dateFrom: dateFromInput,
      dateTo: dateToInput,
    });
  };

  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (appliedQuery.action.trim()) params.set('action', appliedQuery.action.trim());
      if (appliedQuery.resource.trim()) params.set('resource', appliedQuery.resource.trim());
      if (appliedQuery.actorEmail.trim()) params.set('actorEmail', appliedQuery.actorEmail.trim().toLowerCase());
      if (appliedQuery.dateFrom) params.set('dateFrom', appliedQuery.dateFrom);
      if (appliedQuery.dateTo) params.set('dateTo', appliedQuery.dateTo);

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
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Audit trail</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Audit Logs</h1>
          <p className="mt-2 text-base text-slate-600">Review privileged admin actions with actor, reason, and timestamp details.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:justify-self-end">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.total || summary.visible}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.visible}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">With reason</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.withReason}</p>
          </article>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><AdminIcon name="audit-logs" size={18} /></span>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-xs text-slate-500">Slice events by actor, action, resource, and date range.</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-8">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Action (example: team.invite)"
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
            placeholder="Resource (example: roles)"
            value={resourceInput}
            onChange={(event) => setResourceInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyFilters();
              }
            }}
          />
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Actor email"
            value={actorEmailInput}
            onChange={(event) => setActorEmailInput(event.target.value)}
          />
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            type="date"
            value={dateFromInput}
            onChange={(event) => setDateFromInput(event.target.value)}
          />
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            type="date"
            value={dateToInput}
            onChange={(event) => setDateToInput(event.target.value)}
          />
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
            onClick={() => void exportCsv()}
            disabled={exporting}
            className="admin-focus rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Recent events</h2>
        </div>

        {loading ? (
          <AdminInlineTableSkeleton rows={8} />
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No audit events found.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
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
                  <tr key={row._id || `${row.action}-${row.createdAt}`} className="border-t border-slate-200 transition hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-500">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-700">
                      <div className="font-medium text-slate-800">{row.actor?.email || '-'}</div>
                      <div className="text-xs text-slate-500">{row.actor?.role || '-'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{row.action}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{row.resource}{row.resourceId ? `:${row.resourceId}` : ''}</td>
                    <td className="px-5 py-3 text-slate-700">{row.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Showing {rows.length === 0 ? 0 : skip + 1}-{skip + rows.length} of {total}
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