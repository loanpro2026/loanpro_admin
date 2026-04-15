'use client';

import { useEffect, useState } from 'react';
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
    <article className="rounded-[22px] border border-slate-200 bg-white/88 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 font-display text-2xl font-semibold ${highlightClass}`}>{value}</p>
    </article>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <header className="grid gap-4 lg:grid-cols-1 lg:items-start xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Operational overview</span>
          <h1 className="admin-title mt-4">System Status</h1>
          <p className="admin-subtitle">Live operational summary for integrations and pending operational queues.</p>
        </div>
        <button type="button" onClick={() => void load()} className="admin-focus rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 lg:justify-self-end">
          Refresh
        </button>
      </header>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-[28px] border border-slate-200 bg-white/88 px-5 py-4 text-sm text-slate-500 shadow-sm">Loading system status...</p>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCard('Healthy Integrations', String(data.summary.healthy), 'text-emerald-700')}
            {summaryCard('Degraded Integrations', String(data.summary.degraded), 'text-amber-700')}
            {summaryCard('Missing Config', String(data.summary.missing), 'text-slate-700')}
            {summaryCard('Total Integrations', String(data.summary.total))}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {summaryCard('Open Support Tickets', String(data.queues.openTickets))}
            {summaryCard('Open Contact Requests', String(data.queues.openContacts))}
            {summaryCard('Pending Refund Requests', String(data.queues.pendingRefunds))}
          </section>

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/88 shadow-sm">
            <div className="border-b border-slate-200/80 px-5 py-4">
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
                    <tr key={item.key} className="border-t border-slate-200/80 transition hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-medium text-slate-800">{item.label}</td>
                      <td className="px-5 py-3 text-slate-700">{item.status}</td>
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
        <p className="rounded-[28px] border border-slate-200 bg-white/88 px-5 py-4 text-sm text-slate-500 shadow-sm">No status data available.</p>
      )}
    </main>
  );
}