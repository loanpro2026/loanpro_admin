'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { CreateModal } from '@/components/admin/CreateModal';

type CouponRow = {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usedCount?: number;
  validFrom?: string;
  validUntil?: string | null;
  status: 'active' | 'inactive' | 'expired';
  appliesToPlans?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export default function CouponsPage() {
  const STORAGE_KEY = 'lp_admin_coupons_table_v1';
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortByInput, setSortByInput] = useState<'createdAt' | 'updatedAt' | 'discountValue' | 'code' | 'usedCount'>('createdAt');
  const [sortDirInput, setSortDirInput] = useState<'asc' | 'desc'>('desc');
  const [appliedQuery, setAppliedQuery] = useState({
    search: '',
    status: 'all',
    sortBy: 'createdAt' as 'createdAt' | 'updatedAt' | 'discountValue' | 'code' | 'usedCount',
    sortDir: 'desc' as 'asc' | 'desc',
  });

  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'percent',
    discountValue: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    validUntil: '',
    appliesToPlans: '',
    reason: '',
  });

  const activeCount = useMemo(() => rows.filter((row) => row.status === 'active').length, [rows]);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip),
        sortBy: appliedQuery.sortBy,
        sortDir: appliedQuery.sortDir,
      });
      if (appliedQuery.search.trim()) params.set('search', appliedQuery.search.trim());
      if (appliedQuery.status !== 'all') params.set('status', appliedQuery.status);

      const response = await fetch(`/api/coupons?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch coupons');
      }

      setRows(Array.isArray(payload.data) ? payload.data : []);
      setTotal(Number(payload?.meta?.total || 0));
      setHasMore(Boolean(payload?.meta?.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        searchInput?: string;
        statusInput?: string;
        sortByInput?: 'createdAt' | 'updatedAt' | 'discountValue' | 'code' | 'usedCount';
        sortDirInput?: 'asc' | 'desc';
        limit?: number;
      };
      if (typeof parsed.searchInput === 'string') setSearchInput(parsed.searchInput);
      if (
        parsed.statusInput === 'all' ||
        parsed.statusInput === 'active' ||
        parsed.statusInput === 'inactive' ||
        parsed.statusInput === 'expired'
      ) {
        setStatusInput(parsed.statusInput);
      }
      if (
        parsed.sortByInput === 'createdAt' ||
        parsed.sortByInput === 'updatedAt' ||
        parsed.sortByInput === 'discountValue' ||
        parsed.sortByInput === 'code' ||
        parsed.sortByInput === 'usedCount'
      ) {
        setSortByInput(parsed.sortByInput);
      }
      if (parsed.sortDirInput === 'asc' || parsed.sortDirInput === 'desc') setSortDirInput(parsed.sortDirInput);
      if (typeof parsed.limit === 'number' && [10, 25, 50, 100].includes(parsed.limit)) setLimit(parsed.limit);

      setAppliedQuery({
        search: typeof parsed.searchInput === 'string' ? parsed.searchInput : '',
        status:
          parsed.statusInput === 'all' ||
          parsed.statusInput === 'active' ||
          parsed.statusInput === 'inactive' ||
          parsed.statusInput === 'expired'
            ? parsed.statusInput
            : 'all',
        sortBy:
          parsed.sortByInput === 'createdAt' ||
          parsed.sortByInput === 'updatedAt' ||
          parsed.sortByInput === 'discountValue' ||
          parsed.sortByInput === 'code' ||
          parsed.sortByInput === 'usedCount'
            ? parsed.sortByInput
            : 'createdAt',
        sortDir: parsed.sortDirInput === 'asc' || parsed.sortDirInput === 'desc' ? parsed.sortDirInput : 'desc',
      });
    } catch {
      // Ignore invalid saved preferences
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ searchInput, statusInput, sortByInput, sortDirInput, limit })
      );
    } catch {
      // Ignore storage errors
    }
  }, [searchInput, statusInput, sortByInput, sortDirInput, limit]);

  useEffect(() => {
    void load();
  }, [skip, limit, appliedQuery.search, appliedQuery.status, appliedQuery.sortBy, appliedQuery.sortDir]);

  const applyFilters = () => {
    setSkip(0);
    setAppliedQuery({
      search: searchInput.trim(),
      status: statusInput,
      sortBy: sortByInput,
      sortDir: sortDirInput,
    });
  };

  const createCoupon = async () => {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          description: form.description.trim(),
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          ...(form.minOrderAmount.trim() ? { minOrderAmount: Number(form.minOrderAmount) } : {}),
          ...(form.maxDiscountAmount.trim() ? { maxDiscountAmount: Number(form.maxDiscountAmount) } : {}),
          ...(form.usageLimit.trim() ? { usageLimit: Number(form.usageLimit) } : {}),
          ...(form.validUntil ? { validUntil: form.validUntil } : {}),
          ...(form.appliesToPlans.trim()
            ? {
                appliesToPlans: form.appliesToPlans
                  .split(',')
                  .map((value) => value.trim())
                  .filter(Boolean),
              }
            : {}),
          reason: form.reason.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create coupon');
      }

      setForm({
        code: '',
        description: '',
        discountType: 'percent',
        discountValue: '',
        minOrderAmount: '',
        maxDiscountAmount: '',
        usageLimit: '',
        validUntil: '',
        appliesToPlans: '',
        reason: '',
      });

      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const updateCoupon = async (couponId: string, patch: Record<string, unknown>) => {
    setUpdatingId(couponId);
    setError('');

    try {
      const response = await fetch(`/api/coupons/${encodeURIComponent(couponId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update coupon');
      }

      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update coupon');
    } finally {
      setUpdatingId('');
    }
  };

  const deleteCoupon = async (couponId: string) => {
    setUpdatingId(couponId);
    setError('');

    try {
      const reason = (window.prompt('Reason for deleting this coupon:', '') || '').trim();
      if (!reason) {
        throw new Error('A reason is required to delete a coupon');
      }

      const confirmed = window.confirm('Delete this coupon? This action cannot be undone.');
      if (!confirmed) {
        return;
      }

      const response = await fetch(`/api/coupons/${encodeURIComponent(couponId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to delete coupon');
      }

      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete coupon');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Discount control</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Coupons</h1>
          <p className="mt-2 text-base text-slate-600">Create, tune, and retire promotional discounts with full audit reasons.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-4 lg:justify-self-end">
          {[
            ['Total', String(total || rows.length)],
            ['Visible', String(rows.length)],
            ['Active', String(activeCount)],
            ['Has more', hasMore ? 'Yes' : 'No'],
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
              <AdminIcon name="coupons" size={18} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Create coupon</h2>
              <p className="text-xs text-slate-500">Build a new coupon with discount constraints and mandatory audit reason.</p>
            </div>
          </div>
          <CreateModal
            title="Create New Coupon"
            description="Build a new promotional coupon code with audit trails"
            icon="coupons"
            onSubmit={createCoupon}
            isLoading={submitting}
            disabled={!form.code.trim() || !form.discountValue.trim() || !form.reason.trim()}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Code *</label>
                <input
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                  placeholder="e.g. APRIL50"
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Description</label>
                <input
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                  placeholder="e.g. April spring sale"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Type</label>
                  <select
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                    value={form.discountType}
                    onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value }))}
                  >
                    <option value="percent">percent</option>
                    <option value="fixed">fixed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Value *</label>
                  <input
                    type="number"
                    min="0"
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                    placeholder="Discount amount"
                    value={form.discountValue}
                    onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Min Order Amount</label>
                  <input
                    type="number"
                    min="0"
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                    placeholder="0"
                    value={form.minOrderAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Max Discount Amount</label>
                  <input
                    type="number"
                    min="0"
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                    placeholder="No limit"
                    value={form.maxDiscountAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, maxDiscountAmount: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                    placeholder="Unlimited"
                    value={form.usageLimit}
                    onChange={(event) => setForm((prev) => ({ ...prev, usageLimit: event.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-1">Valid Until</label>
                  <input
                    type="date"
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                    value={form.validUntil}
                    onChange={(event) => setForm((prev) => ({ ...prev, validUntil: event.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Applicable Plans</label>
                <input
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                  placeholder="Comma separated (e.g. basic, pro)"
                  value={form.appliesToPlans}
                  onChange={(event) => setForm((prev) => ({ ...prev, appliesToPlans: event.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Reason for Creation *</label>
                <input
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                  placeholder="e.g., Marketing campaign, special offer"
                  value={form.reason}
                  onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                />
              </div>
            </div>
          </CreateModal>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><AdminIcon name="coupons" size={18} /></span>
          <div>
              <h2 className="text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-xs text-slate-500">Search, sort, and review coupon lifecycle states.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-6">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Search code or description"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyFilters();
              }
            }}
          />
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="expired">expired</option>
          </select>
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={sortByInput}
            onChange={(event) => setSortByInput(event.target.value as 'createdAt' | 'updatedAt' | 'discountValue' | 'code' | 'usedCount')}
          >
            <option value="createdAt">Sort: Created</option>
            <option value="updatedAt">Sort: Updated</option>
            <option value="discountValue">Sort: Discount</option>
            <option value="code">Sort: Code</option>
            <option value="usedCount">Sort: Used</option>
          </select>
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={sortDirInput}
            onChange={(event) => setSortDirInput(event.target.value as 'asc' | 'desc')}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
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
            onClick={applyFilters}
          >
            <AdminIcon name="spark" size={14} />
            Apply
          </button>
        </div>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Coupon records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading coupons...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No coupons found.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Discount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Usage</th>
                  <th className="px-5 py-3">Validity</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-slate-200 transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{row.code}</div>
                      <div className="text-xs text-slate-500">{row.description || '-'}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {row.discountType === 'percent' ? `${row.discountValue}%` : `Rs ${row.discountValue}`}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          row.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : row.status === 'inactive'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {Number(row.usedCount || 0)} / {row.usageLimit ?? '-'}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {row.validUntil ? new Date(row.validUntil).toLocaleDateString() : 'No expiry'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={updatingId === row._id}
                          onClick={() => {
                            const reason = (window.prompt('Reason for status change:', '') || '').trim();
                            if (!reason) {
                              setError('A reason is required for status updates');
                              return;
                            }
                            void updateCoupon(row._id, {
                              status: row.status === 'active' ? 'inactive' : 'active',
                              reason,
                            });
                          }}
                          className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {row.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row._id}
                          onClick={() => {
                            const discountValue = (window.prompt('Updated discount value:', String(row.discountValue)) || '').trim();
                            const reason = (window.prompt('Reason for coupon update:', '') || '').trim();
                            if (!discountValue || !reason) {
                              setError('Discount value and reason are required for updates');
                              return;
                            }

                            void updateCoupon(row._id, {
                              discountValue: Number(discountValue),
                              reason,
                            });
                          }}
                          className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row._id}
                          onClick={() => void deleteCoupon(row._id)}
                          className="admin-focus rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
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

      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Showing {rows.length === 0 ? 0 : skip + 1}-{skip + rows.length} of {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || skip === 0}
            onClick={() => setSkip((prev) => Math.max(0, prev - limit))}
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={loading || !hasMore}
            onClick={() => setSkip((prev) => prev + limit)}
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}
