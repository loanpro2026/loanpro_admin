'use client';

import { useEffect, useState } from 'react';

type KpiPayload = {
  totalUsers: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  openTickets: number;
  openContactRequests: number;
  totalRevenue: number;
  monthlyRevenue: number;
  serverTime: string;
};

function kpiCard(title: string, value: string, hint: string) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<KpiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/dashboard/kpis');
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load dashboard KPIs');
        }
        setData(payload.data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard KPIs');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <main className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-600">Operational overview of users, subscriptions, support load, and revenue.</p>
      </header>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">Loading dashboard...</p>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCard('Total Users', String(data.totalUsers), 'All registered users')}
            {kpiCard('Active Subscriptions', String(data.activeSubscriptions), 'Current paying users')}
            {kpiCard('Trial Subscriptions', String(data.trialSubscriptions), 'Users currently on trial')}
            {kpiCard('Cancelled Subscriptions', String(data.cancelledSubscriptions), 'Total cancelled users')}
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCard('Open Tickets', String(data.openTickets), 'Support tickets needing action')}
            {kpiCard('Open Contact Requests', String(data.openContactRequests), 'Contact inbox pending items')}
            {kpiCard('Total Revenue', `INR ${Number(data.totalRevenue || 0).toLocaleString('en-IN')}`, 'Captured/completed payments')}
            {kpiCard('Monthly Revenue', `INR ${Number(data.monthlyRevenue || 0).toLocaleString('en-IN')}`, 'Current month revenue')}
          </section>

          <p className="text-xs text-slate-500">Server time: {new Date(data.serverTime).toLocaleString()}</p>
        </>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">No KPI data available.</p>
      )}
    </main>
  );
}
