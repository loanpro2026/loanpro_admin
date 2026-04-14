'use client';

import { useEffect, useState } from 'react';

type PaymentRow = {
  _id: string;
  paymentId?: string;
  orderId?: string;
  userId?: string;
  userEmail?: string;
  plan?: string;
  amount?: number;
  status?: string;
  refundStatus?: string;
  refundAmount?: number;
  createdAt?: string;
};

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100', status });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/payments?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch payments');
      }
      setRows(payload.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const patchPayment = async (paymentId: string, body: Record<string, unknown>) => {
    setUpdatingId(paymentId);
    setError('');
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update payment');
      }
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update payment');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <main className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
        <p className="mt-2 text-slate-600">Monitor payment events and handle refund/reconciliation actions.</p>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Filters</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search by payment/user/order"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Payment records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading payments...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No payments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Refund</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-slate-200">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{row.paymentId || row._id}</div>
                      <div className="text-xs text-slate-500">{row.orderId || '-'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-800">{row.userEmail || '-'}</div>
                      <div className="text-xs text-slate-500">{row.userId || '-'}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{typeof row.amount === 'number' ? `Rs ${row.amount}` : '-'}</td>
                    <td className="px-5 py-3 text-slate-700">{row.status || '-'}</td>
                    <td className="px-5 py-3 text-slate-700">{row.refundStatus || '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={updatingId === row._id}
                          onClick={() =>
                            void patchPayment(row._id, {
                              action: 'refund_request',
                              note: 'Marked for refund review from admin panel',
                            })
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Refund Review
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row._id}
                          onClick={() =>
                            void patchPayment(row._id, {
                              action: 'refund_approve',
                              refundStatus: 'refunded',
                              refundAmount: row.amount || 0,
                              reason: 'Refund approved from admin panel',
                            })
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark Refunded
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row._id}
                          onClick={() =>
                            void patchPayment(row._id, {
                              action: 'reconcile',
                              note: 'Reconciled from admin panel',
                            })
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reconcile
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