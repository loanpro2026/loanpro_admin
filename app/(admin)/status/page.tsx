'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

type StatusPayload = {
  generatedAt: string;
  summary: {
    healthy: number;
    degraded: number;
    missing: number;
    total: number;
  };
  queues: {
    openTickets: number;
    openContacts: number;
    pendingRefunds: number;
  };
  integrations: Array<{
    key: string;
    label: string;
    status: 'healthy' | 'degraded' | 'missing';
    details: string;
    checkedAt: string;
  }>;
};

function summaryCard(title: string, value: string, highlightClass = 'text-slate-900') {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${highlightClass}`}>{value}</p>
    </article>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const healthPercent = useMemo(() => {
    if (!data || data.summary.total <= 0) return 0;
    return Math.round((data.summary.healthy / data.summary.total) * 100);
  }, [data]);

  const queuePeak = useMemo(() => {
    if (!data) return 1;
    return Math.max(data.queues.openTickets, data.queues.openContacts, data.queues.pendingRefunds, 1);
  }, [data]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/status/overview');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load system status');
      }
      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load system status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Operational overview</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">System Status</h1>
          <p className="mt-2 text-base text-slate-600">Live operational summary for integrations and pending operational queues.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="admin-focus inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 lg:justify-self-end"
        >
          <AdminIcon name="spark" size={14} />
          Refresh
        </button>
      </header>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">Loading system status...</p>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCard('Healthy Integrations', String(data.summary.healthy), 'text-emerald-700')}
            {summaryCard('Degraded Integrations', String(data.summary.degraded), 'text-amber-700')}
            {summaryCard('Missing Config', String(data.summary.missing), 'text-slate-700')}
            {summaryCard('Total Integrations', String(data.summary.total))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Integration health distribution</h2>
                <span className="text-sm font-semibold text-slate-700">Healthy {healthPercent}%</span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500" style={{ width: `${healthPercent}%` }} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Healthy</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-700">{data.summary.healthy}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Degraded</p>
                  <p className="mt-1 text-lg font-semibold text-amber-700">{data.summary.degraded}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Missing</p>
                  <p className="mt-1 text-lg font-semibold text-slate-700">{data.summary.missing}</p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Queue pressure</h2>
              <div className="mt-4 space-y-4">
                {[
                  ['Support tickets', data.queues.openTickets],
                  ['Contact requests', data.queues.openContacts],
                  ['Pending refunds', data.queues.pendingRefunds],
                ].map(([label, value]) => {
                  const numeric = Number(value || 0);
                  const width = Math.max(6, Math.round((numeric / queuePeak) * 100));
                  return (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                        <span>{label}</span>
                        <span className="font-semibold text-slate-800">{numeric}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-slate-800" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {summaryCard('Open Support Tickets', String(data.queues.openTickets))}
            {summaryCard('Open Contact Requests', String(data.queues.openContacts))}
            {summaryCard('Pending Refund Requests', String(data.queues.pendingRefunds))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Integration Signals</h2>
            </div>
            <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
              <table className="admin-table min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Integration</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.integrations.map((item) => (
                    <tr key={item.key} className="border-t border-slate-200 transition hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">{item.label}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            item.status === 'healthy'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.status === 'degraded'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{item.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-slate-500">Generated at {new Date(data.generatedAt).toLocaleString()}</p>
        </>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">No status data available.</p>
      )}
    </main>
  );
}