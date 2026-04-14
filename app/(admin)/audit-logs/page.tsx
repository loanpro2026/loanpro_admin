'use client';

import { useEffect, useState } from 'react';

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
  const [rows, setRows] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [actorEmailFilter, setActorEmailFilter] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (actionFilter.trim()) params.set('action', actionFilter.trim());
      if (resourceFilter.trim()) params.set('resource', resourceFilter.trim());
      if (actorEmailFilter.trim()) params.set('actorEmail', actorEmailFilter.trim().toLowerCase());

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load audit logs');
      }

      setRows(payload.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Logs</h1>
        <p className="mt-2 text-slate-600">Review privileged admin actions with actor, reason, and timestamp details.</p>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Filters</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Action (example: team.invite)"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Resource (example: roles)"
            value={resourceFilter}
            onChange={(event) => setResourceFilter(event.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Actor email"
            value={actorEmailFilter}
            onChange={(event) => setActorEmailFilter(event.target.value)}
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Refresh
          </button>
        </div>
      </section>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Recent events</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading audit logs...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No audit events found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
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
                  <tr key={row._id || `${row.action}-${row.createdAt}`} className="border-t border-slate-200">
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
    </main>
  );
}