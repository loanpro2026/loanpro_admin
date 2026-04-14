'use client';

import { useEffect, useState } from 'react';

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
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-2 text-2xl font-semibold ${highlightClass}`}>{value}</p>
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
    <main className="space-y-6 p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">System Status</h1>
          <p className="mt-2 text-slate-600">Live operational summary for integrations and pending operational queues.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Refresh
        </button>
      </header>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">Loading system status...</p>
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

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Integration Signals</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Integration</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.integrations.map((item) => (
                    <tr key={item.key} className="border-t border-slate-200">
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
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">No status data available.</p>
      )}
    </main>
  );
}