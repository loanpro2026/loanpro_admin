'use client';

import { useEffect, useMemo, useState } from 'react';
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
const STORAGE_KEY = 'lp_admin_payments_table_v1';

function isSuccessfulPayment(status: string | undefined) {
  return SUCCESS_STATUS_REGEX.test(String(status || '').trim());
}

function isFailedOrPendingPayment(status: string | undefined) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return true;
  return FAILED_OR_PENDING_STATUS_REGEX.test(normalized);
}

function formatCurrency(amount?: number) {
  return `INR ${Number(amount || 0).toLocaleString('en-IN')}`;
}

function statusTone(status: string | undefined) {
  if (isSuccessfulPayment(status)) return 'bg-emerald-100 text-emerald-700';
  if (isFailedOrPendingPayment(status)) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function refundTone(status: string | undefined) {
  const key = String(status || '').toLowerCase();
  if (key === 'refunded') return 'bg-sky-100 text-sky-700';
  if (['pending', 'requested'].includes(key)) return 'bg-amber-100 text-amber-700';
  if (key) return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-500';
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function PaymentsPage() {
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
      // Ignore invalid saved preferences.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ search, status, sortBy, sortDir, limit }));
    } catch {
      // Ignore storage errors.
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

  const successfulRows = useMemo(() => rows.filter((row) => isSuccessfulPayment(row.status)), [rows]);
  const failedOrPendingRows = useMemo(() => rows.filter((row) => !isSuccessfulPayment(row.status) || isFailedOrPendingPayment(row.status)), [rows]);
  const refundedRows = useMemo(() => rows.filter((row) => String(row.refundStatus || '').toLowerCase() === 'refunded'), [rows]);
  const visibleAmount = useMemo(() => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0), [rows]);

  const renderRows = (tableRows: PaymentRow[]) => {
    if (tableRows.length === 0) {
      return <p className="px-5 py-4 text-sm text-slate-500">No matching payments found.</p>;
    }

    return (
      <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
        <table className="admin-table min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Refund</th>
              <th className="px-5 py-3">Created</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row._id} className="border-t border-slate-200 transition hover:bg-slate-50">
                <td className="px-5 py-4">
                  <div className="font-medium text-slate-900">{row.paymentId || row._id}</div>
                  <div className="text-xs text-slate-500">Order: {row.orderId || '-'}</div>
                </td>
                <td className="px-5 py-4">
                  <div className="text-slate-800">{row.userEmail || '-'}</div>
                  <div className="text-xs text-slate-500">{row.userId || '-'}</div>
                </td>
                <td className="px-5 py-4 text-slate-700 capitalize">{row.plan || '-'}</td>
                <td className="px-5 py-4 text-slate-700">{formatCurrency(row.amount)}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(row.status)}`}>
                    {row.status || 'unknown'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${refundTone(row.refundStatus)}`}>
                    {row.refundStatus || 'none'}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600">{formatDate(row.createdAt)}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
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
                      className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Review
                    </button>
                    <button
                      type="button"
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
                      className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Approve refund
                    </button>
                    <button
                      type="button"
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
                      className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
    );
  };

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Revenue operations</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Payments</h1>
          <p className="mt-2 text-base text-slate-600">
            Payment monitoring, refund handling, and reconciliation in one unified operations view.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 lg:justify-self-end">
          {[
            ['Total', String(total || rows.length)],
            ['Successful', String(successfulRows.length)],
            ['Exceptions', String(failedOrPendingRows.length)],
            ['Refunded', String(refundedRows.length)],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
            </article>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <AdminIcon name="payments" size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-sm text-slate-500">Search and segment payment states for rapid operations.</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-6">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Search payment, user, or order"
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
            <option value="all">All statuses</option>
            <option value="successful">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as 'createdAt' | 'updatedAt' | 'amount' | 'status');
              setSkip(0);
            }}
          >
            <option value="createdAt">Sort by created</option>
            <option value="updatedAt">Sort by updated</option>
            <option value="amount">Sort by amount</option>
            <option value="status">Sort by status</option>
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible value</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{formatCurrency(visibleAmount)}</p>
          <p className="mt-2 text-sm text-slate-600">Sum of payment amounts in the current filtered view.</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operational note</p>
          <p className="mt-2 text-sm text-slate-700">
            Use Review before approval when refund context is unclear; all actions require reason capture for audit trail.
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Successful payments</h2>
        </div>
        {loading ? <p className="px-5 py-4 text-sm text-slate-500">Loading payments...</p> : renderRows(successfulRows)}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Failed and pending payments</h2>
        </div>
        {loading ? <p className="px-5 py-4 text-sm text-slate-500">Loading payments...</p> : renderRows(failedOrPendingRows)}
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
