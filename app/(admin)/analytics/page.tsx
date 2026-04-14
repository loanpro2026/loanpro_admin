'use client';

import { useEffect, useState } from 'react';

type AnalyticsPayload = {
  totalUsers: number;
  newUsers30d: number;
  activeUsers30d: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  conversionRate: number;
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyRefundedAmount: number;
  supportClosureRate: number;
  paymentsByStatus: Array<{ status: string; count: number }>;
  activePlanMix: Array<{ plan: string; count: number }>;
  generatedAt: string;
};

function card(title: string, value: string, hint: string) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/analytics/kpis');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load analytics');
      }
      setData(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load analytics');
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
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="mt-2 text-slate-600">Business and operational KPIs across growth, revenue, and support outcomes.</p>
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
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">Loading analytics...</p>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {card('Total Users', String(data.totalUsers), 'All registered accounts')}
            {card('New Users (30d)', String(data.newUsers30d), 'Recent sign-up growth')}
            {card('Active Users (30d)', String(data.activeUsers30d), 'Recent activity window')}
            {card('Conversion Rate', `${data.conversionRate}%`, 'Active subscriptions / users')}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {card('Active Subscriptions', String(data.activeSubscriptions), 'Paying subscriptions')}
            {card('Trial Subscriptions', String(data.trialSubscriptions), 'Users in trial phase')}
            {card('Monthly Revenue', `INR ${Number(data.monthlyRevenue || 0).toLocaleString('en-IN')}`, 'Current month captured revenue')}
            {card('Refunded (Month)', `INR ${Number(data.monthlyRefundedAmount || 0).toLocaleString('en-IN')}`, 'Refunded amount this month')}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Payments by status</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.paymentsByStatus.map((item) => (
                      <tr key={item.status} className="border-t border-slate-200">
                        <td className="px-5 py-3 text-slate-700">{item.status}</td>
                        <td className="px-5 py-3 text-slate-700">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Active plan mix</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3">Active count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activePlanMix.map((item) => (
                      <tr key={item.plan} className="border-t border-slate-200">
                        <td className="px-5 py-3 text-slate-700">{item.plan}</td>
                        <td className="px-5 py-3 text-slate-700">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-700">Support closure rate (30d): <span className="font-semibold">{data.supportClosureRate}%</span></p>
            <p className="mt-2 text-xs text-slate-500">Data generated at {new Date(data.generatedAt).toLocaleString()}</p>
          </section>
        </>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">No analytics data available.</p>
      )}
    </main>
  );
}