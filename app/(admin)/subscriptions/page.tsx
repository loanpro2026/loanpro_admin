'use client';

import { useEffect, useState } from 'react';

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

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [plan, setPlan] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search.trim()) params.set('search', search.trim());
      if (status.trim()) params.set('status', status.trim());
      if (plan.trim()) params.set('plan', plan.trim());

      const response = await fetch(`/api/subscriptions?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch subscriptions');
      }

      setRows(payload.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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

  return (
    <main className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Subscriptions</h1>
        <p className="mt-2 text-slate-600">Monitor subscription lifecycle and manage account status transitions.</p>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Filters</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search user, plan"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="trial">trial</option>
            <option value="cancelled">cancelled</option>
            <option value="expired">expired</option>
            <option value="superseded">superseded</option>
            <option value="active_subscription">active_subscription</option>
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={plan} onChange={(event) => setPlan(event.target.value)}>
            <option value="">All plans</option>
            <option value="basic">basic</option>
            <option value="pro">pro</option>
            <option value="enterprise">enterprise</option>
            <option value="trial">trial</option>
          </select>
          <button
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            type="button"
            onClick={() => void load()}
          >
            Search
          </button>
        </div>
      </section>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Subscription records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading subscriptions...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No subscriptions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">User</th>
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
                  <tr key={row._id} className="border-t border-slate-200">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{row.userName || row.userId}</div>
                      <div className="text-xs text-slate-500">{row.userEmail || row.userId}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{row.plan || '-'}</td>
                    <td className="px-5 py-3 text-slate-700">{row.status || '-'}</td>
                    <td className="px-5 py-3 text-slate-700">{row.billingPeriod || '-'}</td>
                    <td className="px-5 py-3 text-slate-700">INR {Number(row.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3 text-slate-500">
                      {row.startDate ? new Date(row.startDate).toLocaleDateString() : '-'} - {row.endDate ? new Date(row.endDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={updatingId === row._id}
                          onClick={() => void updateStatus(row, row.status === 'cancelled' ? 'active' : 'cancelled')}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingId === row._id ? 'Updating...' : row.status === 'cancelled' ? 'Reactivate' : 'Cancel'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}