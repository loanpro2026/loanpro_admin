'use client';

import { useEffect, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

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

const SUCCESS_STATUS_REGEX = /^(completed|captured|success|successful|paid)$/i;
const FAILED_OR_PENDING_STATUS_REGEX = /^(failed|failure|error|declined|pending)$/i;

function isSuccessfulPayment(status: string | undefined) {
  return SUCCESS_STATUS_REGEX.test(String(status || '').trim());
}

function isFailedOrPendingPayment(status: string | undefined) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return true;
  return FAILED_OR_PENDING_STATUS_REGEX.test(normalized);
}

export default function PaymentsPage() {
  const STORAGE_KEY = 'lp_admin_payments_table_v1';
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState('');
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'amount' | 'status'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip),
        status,
        sortBy,
        sortDir,
      });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/payments?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch payments');
      }
      setRows(payload.data || []);
      setTotal(Number(payload?.meta?.total || 0));
      setHasMore(Boolean(payload?.meta?.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch payments');
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
        sortBy?: 'createdAt' | 'updatedAt' | 'amount' | 'status';
        sortDir?: 'asc' | 'desc';
        limit?: number;
      };
      if (typeof parsed.search === 'string') setSearch(parsed.search);
      if (typeof parsed.status === 'string') setStatus(parsed.status);
      if (parsed.sortBy === 'createdAt' || parsed.sortBy === 'updatedAt' || parsed.sortBy === 'amount' || parsed.sortBy === 'status') setSortBy(parsed.sortBy);
      if (parsed.sortDir === 'asc' || parsed.sortDir === 'desc') setSortDir(parsed.sortDir);
      if (typeof parsed.limit === 'number' && [10, 25, 50, 100].includes(parsed.limit)) setLimit(parsed.limit);
    } catch {
      // Ignore invalid saved preferences
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ search, status, sortBy, sortDir, limit })
      );
    } catch {
      // Ignore storage errors
    }
  }, [search, status, sortBy, sortDir, limit]);

  useEffect(() => {
    void load();
  }, [skip, sortBy, sortDir, limit]);

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

  const askReason = (label: string) => {
    return (window.prompt(`Reason for ${label}:`, '') || '').trim();
  };

  const successfulRows = rows.filter((row) => isSuccessfulPayment(row.status));
  const failedOrPendingRows = rows.filter((row) => !isSuccessfulPayment(row.status) || isFailedOrPendingPayment(row.status));

  const renderRows = (tableRows: PaymentRow[]) => {
    if (tableRows.length === 0) {
      return <p className="px-5 py-4 text-sm text-slate-500">No matching payments found.</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="admin-table min-w-full text-left text-sm">
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
            {tableRows.map((row) => (
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
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      title="Mark for refund review"
                      disabled={updatingId === row._id}
                      onClick={() => {
                        const reason = askReason('refund review request');
                        if (!reason) {
                          setError('A reason is required for refund review');
                          return;
                        }
                        void patchPayment(row._id, {
                          action: 'refund_request',
                          note: 'Marked for refund review from admin panel',
                          reason,
                        });
                      }}
                      className="admin-focus rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      🔍
                    </button>
                    <button
                      type="button"
                      title="Approve refund"
                      disabled={updatingId === row._id}
                      onClick={() => {
                        const reason = askReason('refund approval');
                        if (!reason) {
                          setError('A reason is required for refund approval');
                          return;
                        }
                        void patchPayment(row._id, {
                          action: 'refund_approve',
                          refundStatus: 'refunded',
                          refundAmount: row.amount || 0,
                          reason,
                        });
                      }}
                      className="admin-focus rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      title="Reconcile payment"
                      disabled={updatingId === row._id}
                      onClick={() => {
                        const reason = askReason('payment reconciliation');
                        if (!reason) {
                          setError('A reason is required for reconciliation');
                          return;
                        }
                        void patchPayment(row._id, {
                          action: 'reconcile',
                          note: 'Reconciled from admin panel',
                          reason,
                        });
                      }}
                      className="admin-focus rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      🔄
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <main className="space-y-6 p-6 sm:p-8">
      <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <span className="admin-chip">Revenue operations</span>
          <h1 className="admin-title mt-4">Payments</h1>
          <p className="admin-subtitle">Monitor payment events and handle refund/reconciliation actions.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['Total', String(total || rows.length)],
            ['Visible', String(rows.length)],
            ['Failed/Pending', String(failedOrPendingRows.length)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
              <p className="mt-2 font-display text-xl font-semibold text-slate-950">{value}</p>
            </article>
          ))}
        </div>
      </header>

      <section className="admin-surface">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><AdminIcon name="payments" size={18} /></span>
          <div>
            <h2 className="font-semibold text-slate-950">Filters</h2>
            <p className="text-xs text-slate-500">Search, sort, and isolate payment states.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Search by payment/user/order"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setSkip(0);
            }}
          >
            <option value="all">All statuses</option>
            <option value="successful">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as 'createdAt' | 'updatedAt' | 'amount' | 'status');
              setSkip(0);
            }}
          >
            <option value="createdAt">Created</option>
            <option value="updatedAt">Updated</option>
            <option value="amount">Amount</option>
            <option value="status">Status</option>
          </select>
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
            value={sortDir}
            onChange={(event) => {
              setSortDir(event.target.value as 'asc' | 'desc');
              setSkip(0);
            }}
          >
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </select>
          <button
            className="admin-focus rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
            type="button"
            onClick={() => {
              setSkip(0);
              void load();
            }}
          >
            🔍
          </button>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden admin-surface">
        <div className="border-b border-slate-200/80 px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Successful payments</h2>
        </div>

        {loading ? (
          <p className="px-5 py-3 text-sm text-slate-500">Loading payments...</p>
        ) : (
          renderRows(successfulRows)
        )}
      </section>

      <section className="overflow-hidden admin-surface">
        <div className="border-b border-slate-200/80 px-5 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Failed and pending payments</h2>
        </div>

        {loading ? (
          <p className="px-5 py-3 text-sm text-slate-500">Loading payments...</p>
        ) : (
          renderRows(failedOrPendingRows)
        )}
      </section>

      <section className="flex items-center justify-between admin-surface">
        <p className="text-sm text-slate-600">
          Showing {rows.length === 0 ? 0 : skip + 1}-{skip + rows.length} of {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Previous page"
            disabled={loading || skip === 0}
            onClick={() => setSkip((prev) => Math.max(0, prev - limit))}
            className="admin-focus rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ←
          </button>
          <button
            type="button"
            title="Next page"
            disabled={loading || !hasMore}
            onClick={() => setSkip((prev) => prev + limit)}
            className="admin-focus rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            →
          </button>
        </div>
      </section>
    </main>
  );
}