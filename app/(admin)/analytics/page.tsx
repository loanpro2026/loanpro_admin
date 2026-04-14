'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

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
  googleAnalytics: {
    source: 'live-api' | 'config-missing' | 'error';
    configured: boolean;
    eventCount30d: number | null;
    activeUsers30d: number | null;
    sessions30d: number | null;
    message: string;
  };
  generatedAt: string;
};

function card(title: string, value: string, hint: string) {
  return (
    <article className="group rounded-[26px] border border-slate-200 bg-white/85 p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </article>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const statusBars = useMemo(() => {
    const counts = data?.paymentsByStatus.map((item) => item.count) || [1];
    const max = Math.max(...counts, 1);
    return data?.paymentsByStatus.map((item) => ({
      ...item,
      width: Math.max(8, Math.round((item.count / max) * 100)),
    })) || [];
  }, [data]);

  const planBars = useMemo(() => {
    const counts = data?.activePlanMix.map((item) => item.count) || [1];
    const max = Math.max(...counts, 1);
    return data?.activePlanMix.map((item) => ({
      ...item,
      width: Math.max(8, Math.round((item.count / max) * 100)),
    })) || [];
  }, [data]);

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
    <main className="space-y-6 p-6 sm:p-8">
      <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <span className="admin-chip">Insights hub</span>
          <h1 className="admin-title mt-4">Analytics</h1>
          <p className="admin-subtitle">Business and operational KPIs across growth, revenue, support outcomes, and payment mix.</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="admin-focus inline-flex items-center gap-2 justify-self-start rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
        >
          <AdminIcon name="spark" />
          Refresh
        </button>
      </header>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      {loading ? (
        <p className="admin-surface px-5 py-4 text-sm text-slate-500">Loading analytics...</p>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {card('Total Users', String(data.totalUsers), 'Customer accounts only')}
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

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {card(
              'GA Events (30d)',
              data.googleAnalytics.eventCount30d === null ? '-' : data.googleAnalytics.eventCount30d.toLocaleString('en-IN'),
              'Google Analytics total events'
            )}
            {card(
              'GA Active Users (30d)',
              data.googleAnalytics.activeUsers30d === null ? '-' : data.googleAnalytics.activeUsers30d.toLocaleString('en-IN'),
              'Google Analytics active users'
            )}
            {card(
              'GA Sessions (30d)',
              data.googleAnalytics.sessions30d === null ? '-' : data.googleAnalytics.sessions30d.toLocaleString('en-IN'),
              'Google Analytics sessions'
            )}
            {card('GA Source', data.googleAnalytics.source, data.googleAnalytics.configured ? 'GA credentials configured' : 'GA credentials missing')}
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.95fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Payments by status</p>
                  <h2 className="mt-2 font-display text-xl font-semibold text-slate-950">Status distribution</h2>
                </div>
                <AdminIcon name="payments" className="text-brand-600" />
              </div>
              <div className="mt-6 space-y-4">
                {statusBars.map((item) => (
                  <div key={item.status}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.status}</span>
                      <span className="text-slate-500">{item.count}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-cyan-500 transition-all duration-700" style={{ width: `${item.width}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">Active plan mix</p>
                  <h2 className="mt-2 font-display text-xl font-semibold">Plan adoption</h2>
                </div>
                <AdminIcon name="chart" className="text-cyan-300" />
              </div>
              <div className="mt-6 space-y-4">
                {planBars.map((item, index) => (
                  <div key={item.plan} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{item.plan}</span>
                      <span className="text-white/70">{item.count}</span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${index % 2 === 0 ? 'bg-gradient-to-r from-cyan-400 to-brand-500' : 'bg-gradient-to-r from-emerald-400 to-cyan-500'}`}
                        style={{ width: `${item.width}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
            <p className="text-sm text-slate-700">Support closure rate (30d): <span className="font-semibold">{data.supportClosureRate}%</span></p>
            <p className="mt-2 text-xs text-slate-500">Google Analytics: {data.googleAnalytics.message}</p>
            <p className="mt-2 text-xs text-slate-500">Data generated at {new Date(data.generatedAt).toLocaleString()}</p>
          </section>
        </>
      ) : (
        <p className="admin-surface px-5 py-4 text-sm text-slate-500">No analytics data available.</p>
      )}
    </main>
  );
}