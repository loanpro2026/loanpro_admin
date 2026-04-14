'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

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
    <article className="group rounded-[26px] border border-slate-200 bg-white/85 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </article>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<KpiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const overviewBars = useMemo(() => {
    if (!data) return [];
    const entries = [
      { label: 'Users', value: data.totalUsers },
      { label: 'Active subs', value: data.activeSubscriptions },
      { label: 'Trials', value: data.trialSubscriptions },
      { label: 'Support', value: data.openTickets + data.openContactRequests },
      { label: 'Revenue', value: Math.max(1, Math.round(data.monthlyRevenue / 1000)) },
    ];
    const max = Math.max(...entries.map((entry) => entry.value), 1);
    return entries.map((entry) => ({ ...entry, width: Math.max(12, Math.round((entry.value / max) * 100)) }));
  }, [data]);

  const glowNumber = useMemo(() => {
    if (!data) return '0';
    return Number(data.monthlyRevenue || 0).toLocaleString('en-IN');
  }, [data]);

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
    <main className="space-y-6 p-6 sm:p-8">
      <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <span className="admin-chip">Command center</span>
          <h1 className="admin-title mt-4">Dashboard</h1>
          <p className="admin-subtitle">A full-width operational overview of users, subscriptions, support load, notifications, and revenue.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Live revenue', `INR ${glowNumber}`],
            ['Open support', String((data?.openTickets || 0) + (data?.openContactRequests || 0))],
            ['Server time', data ? new Date(data.serverTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'],
          ].map(([label, value]) => (
            <article key={label} className="rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-2 font-display text-xl font-semibold text-slate-950">{value}</p>
            </article>
          ))}
        </div>
      </header>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      {loading ? (
        <p className="admin-surface px-5 py-4 text-sm text-slate-500">Loading dashboard...</p>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiCard('Total Users', String(data.totalUsers), 'Customer accounts only')}
            {kpiCard('Active Subscriptions', String(data.activeSubscriptions), 'Current paying users')}
            {kpiCard('Trial Subscriptions', String(data.trialSubscriptions), 'Users currently on trial')}
            {kpiCard('Cancelled Subscriptions', String(data.cancelledSubscriptions), 'Total cancelled users')}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Operational mix</p>
                  <h2 className="mt-2 font-display text-xl font-semibold text-slate-950">Live load distribution</h2>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Updated live</span>
              </div>
              <div className="mt-6 space-y-4">
                {overviewBars.map((entry) => (
                  <div key={entry.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{entry.label}</span>
                      <span className="text-slate-500">{entry.value.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-600 via-cyan-500 to-sky-400 transition-all duration-700 ease-out"
                        style={{ width: `${entry.width}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">Revenue pulse</p>
                  <h2 className="mt-2 font-display text-xl font-semibold">Monthly activity chart</h2>
                </div>
                <AdminIcon name="chart" className="text-cyan-300" />
              </div>
              <div className="mt-6 grid h-64 grid-cols-6 items-end gap-3">
                {overviewBars.map((entry, index) => (
                  <div key={entry.label} className="flex h-full flex-col justify-end gap-2">
                    <div className="flex items-end justify-center">
                      <div
                        className="w-full rounded-t-2xl bg-gradient-to-t from-cyan-400 via-brand-500 to-brand-300 shadow-[0_18px_40px_rgba(37,99,235,0.28)] transition-transform duration-300 hover:scale-y-105"
                        style={{ height: `${28 + entry.width * 1.9}px` }}
                      />
                    </div>
                    <div>
                      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{entry.label}</p>
                      <p className="mt-1 text-center text-sm font-semibold text-white">{index === 4 ? `INR ${entry.value.toLocaleString('en-IN')}` : entry.value.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
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
        <p className="admin-surface px-5 py-4 text-sm text-slate-500">No KPI data available.</p>
      )}
    </main>
  );
}
