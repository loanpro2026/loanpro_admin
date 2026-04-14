'use client';

import { useEffect, useMemo, useState } from 'react';

type IntegrationRecord = {
  key: string;
  label: string;
  status: 'healthy' | 'degraded' | 'missing';
  details: string;
  checkedAt: string;
};

type IntegrationPayload = {
  data: IntegrationRecord[];
  summary: {
    healthy: number;
    degraded: number;
    missing: number;
    total: number;
  };
  generatedAt: string;
};

type IntegrationUsageRecord = {
  key: string;
  label: string;
  unit: string;
  window: string;
  usage: number | null;
  limit: number | null;
  usagePercent: number | null;
  status: 'healthy' | 'degraded' | 'missing';
  source: 'live-api' | 'local-aggregate' | 'config-only';
  details: string;
  lastSyncedAt: string;
};

type IntegrationUsagePayload = {
  data: IntegrationUsageRecord[];
  summary: {
    healthy: number;
    degraded: number;
    missing: number;
    total: number;
  };
  generatedAt: string;
};

function badgeClass(status: IntegrationRecord['status']) {
  if (status === 'healthy') return 'bg-emerald-100 text-emerald-700';
  if (status === 'degraded') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-200 text-slate-700';
}

export default function IntegrationsPage() {
  const [payload, setPayload] = useState<IntegrationPayload | null>(null);
  const [usagePayload, setUsagePayload] = useState<IntegrationUsagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [healthResponse, usageResponse] = await Promise.all([
        fetch('/api/integrations/health'),
        fetch('/api/integrations/usage'),
      ]);

      const healthBody = await healthResponse.json();
      if (!healthResponse.ok || !healthBody?.success) {
        throw new Error(healthBody?.error || 'Failed to fetch integration health');
      }
      setPayload(healthBody.data);

      const usageBody = await usageResponse.json();
      if (!usageResponse.ok || !usageBody?.success) {
        throw new Error(usageBody?.error || 'Failed to fetch integration usage');
      }
      setUsagePayload(usageBody.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch integration health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(() => {
    if (!payload) return { healthy: 0, degraded: 0, missing: 0, total: 0 };
    return payload.summary;
  }, [payload]);

  return (
    <main className="space-y-6 p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Integrations</h1>
          <p className="mt-2 text-slate-600">Operational health matrix for third-party and platform dependencies.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Run Health Check
        </button>
      </header>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Integrations</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Healthy</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{summary.healthy}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Degraded</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{summary.degraded}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missing Config</p>
          <p className="mt-2 text-2xl font-semibold text-slate-700">{summary.missing}</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Health Matrix</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Checking integrations...</p>
        ) : !payload || payload.data.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No integration data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Integration</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">Checked</th>
                </tr>
              </thead>
              <tbody>
                {payload.data.map((record) => (
                  <tr key={record.key} className="border-t border-slate-200">
                    <td className="px-5 py-3 font-medium text-slate-800">{record.label}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${badgeClass(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{record.details}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(record.checkedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Usage and Limits</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading usage metrics...</p>
        ) : !usagePayload || usagePayload.data.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No usage data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Usage</th>
                  <th className="px-5 py-3">Limit</th>
                  <th className="px-5 py-3">Percent</th>
                  <th className="px-5 py-3">Window</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {usagePayload.data.map((item) => (
                  <tr key={item.key} className="border-t border-slate-200">
                    <td className="px-5 py-3 font-medium text-slate-800">{item.label}</td>
                    <td className="px-5 py-3 text-slate-700">
                      {item.usage === null ? '-' : `${item.usage.toLocaleString()} ${item.unit}`}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {item.limit === null ? 'Not set' : `${item.limit.toLocaleString()} ${item.unit}`}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{item.usagePercent === null ? '-' : `${item.usagePercent}%`}</td>
                    <td className="px-5 py-3 text-slate-700">{item.window}</td>
                    <td className="px-5 py-3 text-slate-700">{item.source}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${badgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="space-y-1 text-xs text-slate-500">
        {payload ? <p>Health generated at {new Date(payload.generatedAt).toLocaleString()}</p> : null}
        {usagePayload ? <p>Usage generated at {new Date(usagePayload.generatedAt).toLocaleString()}</p> : null}
      </div>
    </main>
  );
}