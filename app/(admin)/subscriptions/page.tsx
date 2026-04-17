'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { CreateModal } from '@/components/admin/CreateModal';

type SubscriptionRow = {
  _id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  plan?: string;
  status?: string;
  billingPeriod?: string;
  amount?: number;
  startDate?: string;
  endDate?: string;
  updatedAt?: string;
};

type UserOption = {
  userId: string;
  email?: string;
  username?: string;
  fullName?: string;
};

const STORAGE_KEY = 'lp_admin_subscriptions_table_v1';

function formatCurrency(value?: number) {
  return `INR ${Number(value || 0).toLocaleString('en-IN')}`;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function subscriptionStatusTone(status?: string) {
  const key = String(status || '').toLowerCase();
  if (['active', 'active_subscription'].includes(key)) return 'bg-emerald-100 text-emerald-700';
  if (['trial'].includes(key)) return 'bg-sky-100 text-sky-700';
  if (['cancelled', 'expired', 'superseded'].includes(key)) return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'amount' | 'status' | 'plan'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [creating, setCreating] = useState(false);
  const [newSub, setNewSub] = useState({
    userId: '',
    plan: 'basic',
    billingPeriod: 'monthly',
    startDate: '',
    endDate: '',
    amount: '',
    remark: '',
    reason: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip),
        sortBy,
        sortDir,
      });
      if (search.trim()) params.set('search', search.trim());
      if (status.trim()) params.set('status', status.trim());
      if (plan.trim()) params.set('plan', plan.trim());

      const response = await fetch(`/api/subscriptions?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch subscriptions');
      }

      setRows(payload.data || []);
      setTotal(Number(payload?.meta?.total || 0));
      setHasMore(Boolean(payload?.meta?.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        search?: string;
        status?: string;
        plan?: string;
        sortBy?: 'createdAt' | 'updatedAt' | 'amount' | 'status' | 'plan';
        sortDir?: 'asc' | 'desc';
        limit?: number;
      };
      if (typeof parsed.search === 'string') setSearch(parsed.search);
      if (typeof parsed.status === 'string') setStatus(parsed.status);
      if (typeof parsed.plan === 'string') setPlan(parsed.plan);
      if (parsed.sortBy === 'createdAt' || parsed.sortBy === 'updatedAt' || parsed.sortBy === 'amount' || parsed.sortBy === 'status' || parsed.sortBy === 'plan') setSortBy(parsed.sortBy);
      if (parsed.sortDir === 'asc' || parsed.sortDir === 'desc') setSortDir(parsed.sortDir);
      if (typeof parsed.limit === 'number' && [10, 25, 50, 100].includes(parsed.limit)) setLimit(parsed.limit);
    } catch {
      // Ignore invalid saved preferences
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ search, status, plan, sortBy, sortDir, limit }));
    } catch {
      // Ignore storage errors
    }
  }, [search, status, plan, sortBy, sortDir, limit]);

  useEffect(() => {
    void load();
    void (async () => {
      try {
        const response = await fetch('/api/users?limit=200');
        const payload = await response.json();
        if (response.ok && payload?.success && Array.isArray(payload.data)) {
          setUsers(payload.data);
        }
      } catch {
        // helper data load
      }
    })();
  }, [skip, sortBy, sortDir, limit]);

  const createSubscription = async () => {
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: newSub.userId,
          plan: newSub.plan,
          billingPeriod: newSub.billingPeriod,
          ...(newSub.startDate ? { startDate: newSub.startDate } : {}),
          ...(newSub.endDate ? { endDate: newSub.endDate } : {}),
          ...(newSub.amount.trim() ? { amount: Number(newSub.amount) } : {}),
          remark: newSub.remark.trim(),
          reason: newSub.reason.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create subscription');
      }

      setNewSub({
        userId: '',
        plan: 'basic',
        billingPeriod: 'monthly',
        startDate: '',
        endDate: '',
        amount: '',
        remark: '',
        reason: '',
      });
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create subscription');
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (row: SubscriptionRow, nextStatus: string) => {
    setUpdatingId(row._id);
    setError('');
    try {
      const reason = (window.prompt('Reason for status change:', '') || '').trim();
      if (!reason) {
        setError('A reason is required for subscription status updates');
        return;
      }

      const response = await fetch(`/api/subscriptions/${encodeURIComponent(row._id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, reason }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update subscription');
      }

      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update subscription');
    } finally {
      setUpdatingId('');
    }
  };

  const statusSummary = useMemo(() => {
    const base = {
      active: 0,
      trial: 0,
      cancelled: 0,
      other: 0,
    };

    rows.forEach((row) => {
      const s = String(row.status || '').toLowerCase();
      if (s === 'active' || s === 'active_subscription') base.active += 1;
      else if (s === 'trial') base.trial += 1;
      else if (s === 'cancelled') base.cancelled += 1;
      else base.other += 1;
    });

    return base;
  }, [rows]);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Subscription control</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Subscriptions</h1>
          <p className="mt-2 text-base text-slate-600">
            Lifecycle management for customer plans, billing cadence, and subscription state transitions.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 lg:justify-self-end">
          {[
            ['Total', String(total || rows.length)],
            ['Visible', String(rows.length)],
            ['Active', String(statusSummary.active)],
            ['Trial', String(statusSummary.trial)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
            </article>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <AdminIcon name="subscriptions" size={18} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Filters & actions</h2>
              <p className="text-sm text-slate-500">Search, segment, and provision subscriptions.</p>
            </div>
          </div>

          <CreateModal
            title="Provision subscription"
            description="Create a subscription for an existing user"
            icon="subscriptions"
            onSubmit={createSubscription}
            isLoading={creating}
            disabled={!newSub.userId || !newSub.reason.trim()}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">Select user *</label>
                <select
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  value={newSub.userId}
                  onChange={(event) => setNewSub((prev) => ({ ...prev, userId: event.target.value }))}
                >
                  <option value="">Choose a user...</option>
                  {users.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.fullName || user.username || user.userId} ({user.email || user.userId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">Plan</label>
                  <select
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                    value={newSub.plan}
                    onChange={(event) => setNewSub((prev) => ({ ...prev, plan: event.target.value }))}
                  >
                    <option value="basic">basic</option>
                    <option value="pro">pro</option>
                    <option value="enterprise">enterprise</option>
                    <option value="trial">trial</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">Billing period</label>
                  <select
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                    value={newSub.billingPeriod}
                    onChange={(event) => setNewSub((prev) => ({ ...prev, billingPeriod: event.target.value }))}
                  >
                    <option value="monthly">monthly</option>
                    <option value="annually">annually</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">Amount (INR)</label>
                  <input
                    type="number"
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                    placeholder="0"
                    value={newSub.amount}
                    onChange={(event) => setNewSub((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">Remark</label>
                  <input
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                    placeholder="e.g., Manual grant"
                    value={newSub.remark}
                    onChange={(event) => setNewSub((prev) => ({ ...prev, remark: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">Start date</label>
                  <input
                    type="date"
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                    value={newSub.startDate}
                    onChange={(event) => setNewSub((prev) => ({ ...prev, startDate: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">End date</label>
                  <input
                    type="date"
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                    value={newSub.endDate}
                    onChange={(event) => setNewSub((prev) => ({ ...prev, endDate: event.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">Reason for creation *</label>
                <input
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  placeholder="e.g., Upgrade approved by support"
                  value={newSub.reason}
                  onChange={(event) => setNewSub((prev) => ({ ...prev, reason: event.target.value }))}
                />
              </div>
            </div>
          </CreateModal>
        </div>

        <div className="grid gap-2 md:grid-cols-7">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Search by user, email, or plan"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                setSkip(0);
                void load();
              }
            }}
          />

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setSkip(0);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="trial">trial</option>
            <option value="cancelled">cancelled</option>
            <option value="expired">expired</option>
            <option value="superseded">superseded</option>
            <option value="active_subscription">active_subscription</option>
          </select>

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={plan}
            onChange={(event) => {
              setPlan(event.target.value);
              setSkip(0);
            }}
          >
            <option value="">All plans</option>
            <option value="basic">basic</option>
            <option value="pro">pro</option>
            <option value="enterprise">enterprise</option>
            <option value="trial">trial</option>
          </select>

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as 'createdAt' | 'updatedAt' | 'amount' | 'status' | 'plan');
              setSkip(0);
            }}
          >
            <option value="createdAt">Sort by created</option>
            <option value="updatedAt">Sort by updated</option>
            <option value="amount">Sort by amount</option>
            <option value="status">Sort by status</option>
            <option value="plan">Sort by plan</option>
          </select>

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={sortDir}
            onChange={(event) => {
              setSortDir(event.target.value as 'asc' | 'desc');
              setSkip(0);
            }}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={String(limit)}
            onChange={(event) => {
              setLimit(Number(event.target.value || 25));
              setSkip(0);
            }}
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>

          <button
            className="admin-focus inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            type="button"
            onClick={() => {
              setSkip(0);
              void load();
            }}
          >
            <AdminIcon name="spark" size={14} />
            Apply
          </button>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Subscription records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading subscriptions...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No subscriptions found.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Billing</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-slate-200 transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-900">{row.userName || row.userId}</div>
                      <div className="text-xs text-slate-500">{row.userEmail || row.userId}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-700 capitalize">{row.plan || '-'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${subscriptionStatusTone(row.status)}`}>
                        {row.status || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700 capitalize">{row.billingPeriod || '-'}</td>
                    <td className="px-5 py-4 text-slate-700">{formatCurrency(row.amount)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(row.startDate)} - {formatDate(row.endDate)}</td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        disabled={updatingId === row._id}
                        onClick={() => void updateStatus(row, row.status === 'cancelled' ? 'active' : 'cancelled')}
                        className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingId === row._id ? 'Saving...' : row.status === 'cancelled' ? 'Reactivate' : 'Cancel'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Showing {rows.length === 0 ? 0 : skip + 1}-{skip + rows.length} of {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || skip === 0}
            onClick={() => setSkip((prev) => Math.max(0, prev - limit))}
            className="admin-focus rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={loading || !hasMore}
            onClick={() => setSkip((prev) => prev + limit)}
            className="admin-focus rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
