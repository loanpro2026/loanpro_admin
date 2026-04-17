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
    rangeDays: number;
    dailyTrend: Array<{ date: string; activeUsers: number; sessions: number; eventCount: number }>;
    countryBreakdown: Array<{ country: string; activeUsers: number; sessions: number }>;
    channelBreakdown: Array<{ channel: string; sessions: number; activeUsers: number }>;
    message: string;
  };
  generatedAt: string;
};

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('en-IN');
}

function formatCurrency(value: number) {
  return `INR ${Number(value || 0).toLocaleString('en-IN')}`;
}

function countryToCoords(country: string) {
  const key = String(country || '').trim().toLowerCase();
  const table: Record<string, { x: number; y: number }> = {
    india: { x: 69, y: 52 },
    'united states': { x: 20, y: 44 },
    usa: { x: 20, y: 44 },
    canada: { x: 18, y: 31 },
    'united kingdom': { x: 47, y: 37 },
    uk: { x: 47, y: 37 },
    germany: { x: 51, y: 40 },
    france: { x: 49, y: 42 },
    spain: { x: 47, y: 47 },
    italy: { x: 53, y: 45 },
    nigeria: { x: 50, y: 62 },
    'south africa': { x: 55, y: 79 },
    uae: { x: 62, y: 55 },
    australia: { x: 84, y: 77 },
    singapore: { x: 74, y: 66 },
    japan: { x: 84, y: 46 },
    brazil: { x: 33, y: 71 },
    mexico: { x: 18, y: 54 },
    indonesia: { x: 76, y: 70 },
  };

  return table[key] || { x: 50, y: 50 };
}

function metricCard(title: string, value: string, subtitle: string, icon: 'users' | 'chart' | 'spark' | 'status') {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold leading-none text-slate-950">{value}</p>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <AdminIcon name={icon} size={18} />
        </span>
      </div>
    </article>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/analytics/kpis?days=${dateRange}`, { cache: 'no-store' });
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
  }, [dateRange]);

  const trendChart = useMemo(() => {
    const rows = data?.googleAnalytics.dailyTrend || [];
    if (rows.length < 2) {
      return null;
    }

    const width = 720;
    const height = 230;
    const padX = 24;
    const padY = 20;
    const maxY = Math.max(
      ...rows.flatMap((row) => [Number(row.sessions || 0), Number(row.activeUsers || 0)]),
      1
    );
    const stepX = (width - padX * 2) / (rows.length - 1);

    const toX = (idx: number) => padX + idx * stepX;
    const toY = (value: number) => height - padY - (value / maxY) * (height - padY * 2);

    const sessionsPath = rows
      .map((row, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(idx)} ${toY(Number(row.sessions || 0))}`)
      .join(' ');

    const usersPath = rows
      .map((row, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(idx)} ${toY(Number(row.activeUsers || 0))}`)
      .join(' ');

    return {
      width,
      height,
      sessionsPath,
      usersPath,
      labels: [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]],
    };
  }, [data]);

  const countryMax = useMemo(() => {
    return Math.max(...(data?.googleAnalytics.countryBreakdown || []).map((item) => item.activeUsers), 1);
  }, [data]);

  const channelTotal = useMemo(() => {
    return (data?.googleAnalytics.channelBreakdown || []).reduce((sum, item) => sum + Number(item.sessions || 0), 0);
  }, [data]);

  const geoPoints = useMemo(() => {
    const rows = data?.googleAnalytics.countryBreakdown || [];
    const maxUsers = Math.max(...rows.map((item) => Number(item.activeUsers || 0)), 1);
    return rows.slice(0, 10).map((item) => {
      const coords = countryToCoords(item.country);
      return {
        ...item,
        ...coords,
        radius: Math.max(3, Math.round((Number(item.activeUsers || 0) / maxUsers) * 9)),
      };
    });
  }, [data]);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Real-time insights</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Analytics</h1>
          <p className="mt-2 text-base text-slate-600">
            Product and traffic intelligence from GA4, payments, subscriptions, and support behavior.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(event) => setDateRange(Number(event.target.value) as 7 | 30 | 90)}
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="admin-focus inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <AdminIcon name="spark" size={16} />
            Refresh
          </button>
        </div>
      </header>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      {loading ? (
        <p className="admin-surface px-5 py-4 text-sm text-slate-500">Loading analytics...</p>
      ) : data ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCard('Active Users', formatNumber(data.googleAnalytics.activeUsers30d), `${dateRange}-day unique visitors`, 'users')}
            {metricCard('Sessions', formatNumber(data.googleAnalytics.sessions30d), `${dateRange}-day sessions`, 'chart')}
            {metricCard('Events', formatNumber(data.googleAnalytics.eventCount30d), `${dateRange}-day tracked events`, 'spark')}
            {metricCard('Conversion', `${data.conversionRate.toFixed(1)}%`, 'Active subscriptions / total users', 'status')}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Traffic trend</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">Sessions vs active users</h2>
              </div>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{dateRange}-day range</span>
            </div>

            {trendChart ? (
              <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                <svg viewBox={`0 0 ${trendChart.width} ${trendChart.height}`} className="h-60 min-w-[680px] w-full">
                  {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                    const y = trendChart.height - 20 - ratio * (trendChart.height - 40);
                    return <line key={ratio} x1="24" x2={String(trendChart.width - 24)} y1={String(y)} y2={String(y)} stroke="#e2e8f0" strokeDasharray="3 3" />;
                  })}
                  <path d={trendChart.sessionsPath} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
                  <path d={trendChart.usersPath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Not enough trend data points for charting yet.</p>
            )}

            {trendChart ? (
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{trendChart.labels[0].date}</span>
                <span>{trendChart.labels[1].date}</span>
                <span>{trendChart.labels[2].date}</span>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-5 text-xs font-medium text-slate-600">
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />Sessions</span>
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Active users</span>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Geography</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Global activity map</h2>
                </div>
                <AdminIcon name="chart" className="text-slate-500" />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <svg viewBox="0 0 100 56" className="h-52 w-full">
                  <rect x="0" y="0" width="100" height="56" rx="4" fill="#f8fafc" />
                  {[20, 40, 60, 80].map((x) => (
                    <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="56" stroke="#e2e8f0" strokeDasharray="2 2" />
                  ))}
                  {[14, 28, 42].map((y) => (
                    <line key={`h-${y}`} x1="0" y1={y} x2="100" y2={y} stroke="#e2e8f0" strokeDasharray="2 2" />
                  ))}

                  <path d="M8 19 L20 16 L28 20 L35 18 L43 22 L54 18 L62 20 L70 17 L82 22 L92 20" stroke="#cbd5e1" strokeWidth="1.3" fill="none" />
                  <path d="M12 32 L20 35 L30 34 L38 37 L48 35 L56 38 L66 36 L78 39 L90 37" stroke="#cbd5e1" strokeWidth="1.3" fill="none" />

                  {geoPoints.map((point) => (
                    <g key={point.country}>
                      <circle cx={point.x} cy={point.y} r={point.radius + 2} fill="rgba(14,165,233,0.18)" />
                      <circle cx={point.x} cy={point.y} r={point.radius} fill="#0ea5e9" />
                    </g>
                  ))}
                </svg>
              </div>

              <div className="mt-4 space-y-3">
                {(data.googleAnalytics.countryBreakdown || []).slice(0, 5).map((country) => (
                  <div key={country.country} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{country.country}</span>
                      <span className="text-slate-500">{formatNumber(country.activeUsers)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{ width: `${Math.max(8, Math.round((country.activeUsers / countryMax) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(data.googleAnalytics.countryBreakdown || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Country data unavailable for this range.</p>
                ) : null}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Acquisition</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Channel mix</h2>
                </div>
                <AdminIcon name="analytics" className="text-slate-500" />
              </div>
              <div className="space-y-3">
                {(data.googleAnalytics.channelBreakdown || []).map((channel) => {
                  const pct = channelTotal > 0 ? Math.round((channel.sessions / channelTotal) * 100) : 0;
                  return (
                    <div key={channel.channel} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{channel.channel}</span>
                        <span className="text-slate-500">{pct}% ({formatNumber(channel.sessions)})</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                          style={{ width: `${Math.max(8, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {(data.googleAnalytics.channelBreakdown || []).length === 0 ? (
                  <p className="text-sm text-slate-500">Channel breakdown unavailable for this range.</p>
                ) : null}
              </div>
            </article>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Commerce</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Payment status distribution</h2>
                </div>
                <AdminIcon name="payments" className="text-slate-500" />
              </div>
              <div className="space-y-3">
                {data.paymentsByStatus.map((row) => {
                  const total = data.paymentsByStatus.reduce((sum, item) => sum + Number(item.count || 0), 0);
                  const width = total > 0 ? Math.max(8, Math.round((Number(row.count || 0) / total) * 100)) : 0;
                  return (
                    <div key={row.status} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize text-slate-700">{row.status}</span>
                        <span className="text-slate-500">{formatNumber(row.count)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product mix</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Active plan distribution</h2>
                </div>
                <AdminIcon name="subscriptions" className="text-slate-500" />
              </div>
              <div className="space-y-3">
                {data.activePlanMix.map((row) => {
                  const total = data.activePlanMix.reduce((sum, item) => sum + Number(item.count || 0), 0);
                  const width = total > 0 ? Math.max(8, Math.round((Number(row.count || 0) / total) * 100)) : 0;
                  return (
                    <div key={row.plan} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize text-slate-700">{row.plan}</span>
                        <span className="text-slate-500">{formatNumber(row.count)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>

          {data.googleAnalytics.source === 'config-missing' ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Google Analytics is not configured</p>
              <p className="mt-1">Set GOOGLE_ANALYTICS_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.</p>
            </section>
          ) : null}

          {data.googleAnalytics.source === 'error' ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <p className="font-semibold">Google Analytics query error</p>
              <p className="mt-1">{data.googleAnalytics.message}</p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>GA status: {data.googleAnalytics.message}</span>
              <span>Updated: {new Date(data.generatedAt).toLocaleString()}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span>Monthly revenue: {formatCurrency(data.monthlyRevenue)}</span>
              <span>Monthly refunds: {formatCurrency(data.monthlyRefundedAmount)}</span>
              <span>Support closure: {data.supportClosureRate.toFixed(1)}%</span>
            </div>
          </section>
        </>
      ) : (
        <p className="admin-surface px-5 py-4 text-sm text-slate-500">No analytics data available.</p>
      )}
    </main>
  );
}
