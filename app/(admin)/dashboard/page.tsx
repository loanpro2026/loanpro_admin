'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { AdminCardGridSkeleton, AdminPanelSkeleton } from '@/components/admin/AdminLoading';

type DashboardKpis = {
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

type AnalyticsKpis = {
  newUsers30d: number;
  activeUsers30d: number;
  conversionRate: number;
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

type DashboardData = {
  kpis: DashboardKpis;
  analytics: AnalyticsKpis | null;
};

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString('en-IN');
}

function formatCurrency(value: number) {
  return `INR ${Number(value || 0).toLocaleString('en-IN')}`;
}

function pct(part: number, whole: number) {
  if (!whole || whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

function toneForStatus(status: string) {
  const key = String(status || '').toLowerCase();
  if (['captured', 'completed', 'success', 'successful', 'paid'].includes(key)) {
    return 'bg-emerald-500';
  }
  if (['failed', 'cancelled', 'declined', 'refunded'].includes(key)) {
    return 'bg-rose-500';
  }
  if (['pending', 'requested', 'processing'].includes(key)) {
    return 'bg-amber-500';
  }
  return 'bg-slate-500';
}

function donutProgress(value: number, total: number) {
  const ratio = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  const circumference = 2 * Math.PI * 42;
  return {
    dasharray: `${circumference} ${circumference}`,
    dashoffset: circumference * (1 - ratio),
    percent: Math.round(ratio * 100),
  };
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold leading-none text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{hint}</p>
    </article>
  );
}

export default function DashboardPage() {
  const [payload, setPayload] = useState<DashboardData | null>(null);
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [kpisResponse, analyticsResponse] = await Promise.all([
          fetch('/api/dashboard/kpis', { cache: 'no-store' }),
          fetch(`/api/analytics/kpis?days=${rangeDays}`, { cache: 'no-store' }),
        ]);

        const kpisPayload = await kpisResponse.json();
        if (!kpisResponse.ok || !kpisPayload?.success) {
          throw new Error(kpisPayload?.error || 'Failed to load dashboard data');
        }

        let analyticsData: AnalyticsKpis | null = null;
        if (analyticsResponse.ok) {
          const analyticsPayload = await analyticsResponse.json();
          if (analyticsPayload?.success && analyticsPayload?.data) {
            analyticsData = analyticsPayload.data as AnalyticsKpis;
          }
        }

        setPayload({
          kpis: kpisPayload.data as DashboardKpis,
          analytics: analyticsData,
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [rangeDays]);

  const supportBacklog = useMemo(() => {
    if (!payload) return 0;
    return (payload.kpis.openTickets || 0) + (payload.kpis.openContactRequests || 0);
  }, [payload]);

  const paymentStatusTotal = useMemo(() => {
    if (!payload?.analytics?.paymentsByStatus?.length) return 0;
    return payload.analytics.paymentsByStatus.reduce((sum, row) => sum + Number(row.count || 0), 0);
  }, [payload]);

  const engagementBars = useMemo(() => {
    const ga = payload?.analytics?.googleAnalytics;
    const source = [
      { label: 'Active users', value: Number(ga?.activeUsers30d || 0) },
      { label: 'Sessions', value: Number(ga?.sessions30d || 0) },
      { label: 'Events', value: Number(ga?.eventCount30d || 0) },
    ];
    const max = Math.max(...source.map((item) => item.value), 1);
    return source.map((item) => ({
      ...item,
      width: Math.max(10, Math.round((item.value / max) * 100)),
    }));
  }, [payload]);

  const monthlyRevenueDonut = useMemo(() => {
    const monthly = Number(payload?.kpis.monthlyRevenue || 0);
    const total = Number(payload?.kpis.totalRevenue || 0);
    return donutProgress(monthly, total);
  }, [payload]);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <span className="admin-chip">Operations dashboard</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-2 max-w-3xl text-base text-slate-600">
            Real-time business and product signals from subscriptions, payments, support, and Google Analytics.
          </p>
        </div>

        {payload ? (
          <div className="admin-kpi-grid lg:justify-self-end">
            <article className="admin-kpi-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monthly revenue</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(payload.kpis.monthlyRevenue)}</p>
            </article>
            <article className="admin-kpi-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Support backlog</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{formatNumber(supportBacklog)}</p>
            </article>
            <article className="admin-kpi-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Server time</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{new Date(payload.kpis.serverTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </article>
            <label className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Analytics range</p>
              <select
                value={rangeDays}
                onChange={(event) => setRangeDays(Number(event.target.value) as 7 | 30 | 90)}
                className="admin-focus mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </label>
          </div>
        ) : null}
      </header>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      {loading ? (
        <>
          <AdminCardGridSkeleton cards={4} />
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <AdminPanelSkeleton rows={6} />
            <AdminPanelSkeleton rows={5} />
          </section>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <AdminPanelSkeleton rows={4} />
            <AdminPanelSkeleton rows={4} />
            <AdminPanelSkeleton rows={4} />
          </section>
        </>
      ) : payload ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Link href="/users" className="block">
              <StatCard title="Total users" value={formatNumber(payload.kpis.totalUsers)} hint="Customer accounts" />
            </Link>
            <Link href="/subscriptions" className="block">
              <StatCard title="Active subscriptions" value={formatNumber(payload.kpis.activeSubscriptions)} hint="Currently paying" />
            </Link>
            <Link href="/subscriptions" className="block">
              <StatCard title="Trial subscriptions" value={formatNumber(payload.kpis.trialSubscriptions)} hint="In trial period" />
            </Link>
            <Link href="/subscriptions" className="block">
              <StatCard title="Cancelled subscriptions" value={formatNumber(payload.kpis.cancelledSubscriptions)} hint="Historical churn" />
            </Link>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer health funnel</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">Acquisition to conversion</h2>
                </div>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{rangeDays}-day context</span>
              </div>

              <div className="space-y-4">
                {[
                  {
                    label: `New users (${rangeDays}d)`,
                    value: Number(payload.analytics?.newUsers30d || 0),
                    ratio: pct(Number(payload.analytics?.newUsers30d || 0), Number(payload.kpis.totalUsers || 0)),
                  },
                  {
                    label: `Active users (${rangeDays}d)`,
                    value: Number(payload.analytics?.activeUsers30d || 0),
                    ratio: pct(Number(payload.analytics?.activeUsers30d || 0), Number(payload.kpis.totalUsers || 0)),
                  },
                  {
                    label: 'Active subscriptions',
                    value: Number(payload.kpis.activeSubscriptions || 0),
                    ratio: pct(Number(payload.kpis.activeSubscriptions || 0), Number(payload.kpis.totalUsers || 0)),
                  },
                  {
                    label: 'Support backlog',
                    value: Number(supportBacklog || 0),
                    ratio: pct(Number(supportBacklog || 0), Math.max(1, Number(payload.kpis.totalUsers || 0))),
                  },
                ].map((row) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium text-slate-700">{row.label}</p>
                      <p className="text-slate-500">{formatNumber(row.value)}</p>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 transition-all duration-700"
                        style={{ width: `${Math.max(8, Math.round(row.ratio))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Link href="/analytics" className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conversion rate</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{payload.analytics ? `${payload.analytics.conversionRate.toFixed(1)}%` : '--'}</p>
                </Link>
                <Link href="/support/tickets" className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Support closure</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{payload.analytics ? `${payload.analytics.supportClosureRate.toFixed(1)}%` : '--'}</p>
                </Link>
                <Link href="/contact-requests" className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open contact requests</p>
                  <p className="mt-1 text-xl font-semibold text-slate-950">{formatNumber(payload.kpis.openContactRequests)}</p>
                </Link>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue composition</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">Monthly vs total</h2>
                </div>
                <AdminIcon name="payments" className="text-slate-500" />
              </div>

              <div className="mx-auto grid w-full max-w-[260px] place-items-center">
                <svg viewBox="0 0 100 100" className="h-52 w-52">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#revGradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={monthlyRevenueDonut.dasharray}
                    strokeDashoffset={monthlyRevenueDonut.dashoffset}
                    transform="rotate(-90 50 50)"
                  />
                  <defs>
                    <linearGradient id="revGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <text x="50" y="46" textAnchor="middle" className="fill-slate-500 text-[7px] font-semibold uppercase tracking-wide">
                    Monthly share
                  </text>
                  <text x="50" y="56" textAnchor="middle" className="fill-slate-900 text-[12px] font-semibold">
                    {monthlyRevenueDonut.percent}%
                  </text>
                </svg>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Monthly revenue</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(payload.kpis.monthlyRevenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total revenue</span>
                  <span className="font-semibold text-slate-950">{formatCurrency(payload.kpis.totalRevenue)}</span>
                </div>
              </div>
              <Link href="/payments" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                View payments
                <span aria-hidden="true">&gt;</span>
              </Link>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Google Analytics</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Engagement snapshot</h2>
                </div>
                <AdminIcon name="analytics" className="text-slate-500" />
              </div>

              <div className="space-y-3">
                {engagementBars.map((entry) => (
                  <div key={entry.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">{entry.label}</span>
                      <span className="text-slate-500">{formatNumber(entry.value)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500" style={{ width: `${entry.width}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {payload.analytics?.googleAnalytics.message || 'Analytics service data unavailable'}
              </p>
              <Link href="/analytics" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Open analytics
                <span aria-hidden="true">&gt;</span>
              </Link>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payments</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Status distribution</h2>
                </div>
                <AdminIcon name="status" className="text-slate-500" />
              </div>

              <div className="space-y-3">
                {(payload.analytics?.paymentsByStatus || []).map((row) => {
                  const count = Number(row.count || 0);
                  const width = paymentStatusTotal > 0 ? Math.max(8, Math.round((count / paymentStatusTotal) * 100)) : 0;
                  return (
                    <div key={row.status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 capitalize">{row.status || 'Unknown'}</span>
                        <span className="text-slate-500">{formatNumber(count)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${toneForStatus(row.status)}`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(!payload.analytics?.paymentsByStatus || payload.analytics.paymentsByStatus.length === 0) ? (
                  <p className="text-sm text-slate-500">No payment status data found.</p>
                ) : null}
              </div>
              <Link href="/payments" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Open payments
                <span aria-hidden="true">&gt;</span>
              </Link>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subscriptions</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Plan mix</h2>
                </div>
                <AdminIcon name="subscriptions" className="text-slate-500" />
              </div>

              <div className="space-y-3">
                {(payload.analytics?.activePlanMix || []).map((row) => {
                  const total = (payload.analytics?.activePlanMix || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
                  const width = total > 0 ? Math.max(8, Math.round((Number(row.count || 0) / total) * 100)) : 0;
                  return (
                    <div key={row.plan} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700 capitalize">{row.plan || 'Unknown'}</span>
                        <span className="text-slate-500">{formatNumber(row.count || 0)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(!payload.analytics?.activePlanMix || payload.analytics.activePlanMix.length === 0) ? (
                  <p className="text-sm text-slate-500">No active plan mix data found.</p>
                ) : null}
              </div>
              <Link href="/subscriptions" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Open subscriptions
                <span aria-hidden="true">&gt;</span>
              </Link>
            </article>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            <span>Server time: {new Date(payload.kpis.serverTime).toLocaleString()}</span>
            <span>Analytics refreshed: {payload.analytics ? new Date(payload.analytics.generatedAt).toLocaleString() : 'Unavailable'}</span>
          </footer>
        </>
      ) : (
        <p className="admin-surface px-5 py-4 text-sm text-slate-500">No dashboard data available.</p>
      )}
    </main>
  );
}
