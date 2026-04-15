'use client';

import { useEffect, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

type UserRow = {
  _id?: string;
  userId: string;
  username?: string;
  email?: string;
  fullName?: string;
  banned?: boolean;
  createdAt?: string;
  updatedAt?: string;
  subscription?: {
    plan?: string;
    status?: string;
    endDate?: string;
    billingPeriod?: string;
  };
};

export default function UsersPage() {
  const STORAGE_KEY = 'lp_admin_users_table_v1';
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [updatingUserId, setUpdatingUserId] = useState('');
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'email' | 'username'>('createdAt');
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

      const response = await fetch(`/api/users?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch users');
      }

      setRows(payload.data || []);
      setTotal(Number(payload?.meta?.total || 0));
      setHasMore(Boolean(payload?.meta?.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch users');
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
        status?: 'all' | 'active' | 'banned';
        sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'username';
        sortDir?: 'asc' | 'desc';
        limit?: number;
      };
      if (typeof parsed.search === 'string') setSearch(parsed.search);
      if (parsed.status === 'all' || parsed.status === 'active' || parsed.status === 'banned') setStatus(parsed.status);
      if (parsed.sortBy === 'createdAt' || parsed.sortBy === 'updatedAt' || parsed.sortBy === 'email' || parsed.sortBy === 'username') setSortBy(parsed.sortBy);
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

  const editUser = async (row: UserRow) => {
    const fullName = (window.prompt('Full name:', row.fullName || row.username || '') || '').trim();
    if (!fullName) return;

    const email = (window.prompt('Email:', row.email || '') || '').trim().toLowerCase();
    if (!email) return;

    const username = (window.prompt('Username:', row.username || '') || '').trim();
    if (!username) return;

    const reason = (window.prompt('Reason for edit:', '') || '').trim();
    if (!reason) {
      setError('A reason is required to edit a user');
      return;
    }

    setUpdatingUserId(row.userId);
    setError('');
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(row.userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, username, reason }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to edit user');
      }

      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to edit user');
    } finally {
      setUpdatingUserId('');
    }
  };

  const deleteUser = async (row: UserRow) => {
    const reason = (window.prompt('Reason for delete:', '') || '').trim();
    if (!reason) {
      setError('A reason is required to delete a user');
      return;
    }

    if (!window.confirm(`Delete user ${row.userId}? This will remove the account from Clerk and MongoDB.`)) {
      return;
    }

    setUpdatingUserId(row.userId);
    setError('');
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(row.userId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to delete user');
      }

      await load();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete user');
    } finally {
      setUpdatingUserId('');
    }
  };

  const toggleSuspension = async (row: UserRow) => {
    setUpdatingUserId(row.userId);
    setError('');
    try {
      const reason = (window.prompt('Reason for suspension status change:', '') || '').trim();
      if (!reason) {
        setError('A reason is required to suspend or unsuspend a user');
        return;
      }

      const response = await fetch(`/api/users/${encodeURIComponent(row.userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          banned: !row.banned,
          reason,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update user');
      }

      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update user');
    } finally {
      setUpdatingUserId('');
    }
  };

  return (
    <main className="space-y-6 p-6 sm:p-8">
      <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <span className="admin-chip">Customer operations</span>
          <h1 className="admin-title mt-4">Users</h1>
          <p className="admin-subtitle">Manage customer lifecycle records. New users are created from the web portal to keep Clerk and MongoDB creation in one flow.</p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="grid gap-3 sm:grid-cols-3 flex-1">
            {[
              ['Total', String(total || rows.length)],
              ['Visible', String(rows.length)],
              ['Filter', status === 'all' ? 'All' : status],
            ].map(([label, value]) => (
              <article key={label} className="rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-2 font-display text-xl font-semibold text-slate-950">{value}</p>
              </article>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
            Customer onboarding is handled in the web portal.
          </div>
        </div>
      </header>



      <section className="admin-surface">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Filters</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-6">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Search user ID, name, email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as 'all' | 'active' | 'banned');
              setSkip(0);
            }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as 'createdAt' | 'updatedAt' | 'email' | 'username');
              setSkip(0);
            }}
          >
            <option value="createdAt">Sort: Created</option>
            <option value="updatedAt">Sort: Updated</option>
            <option value="email">Sort: Email</option>
            <option value="username">Sort: Username</option>
          </select>
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
            value={sortDir}
            onChange={(event) => {
              setSortDir(event.target.value as 'asc' | 'desc');
              setSkip(0);
            }}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
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
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">User records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-3 text-sm text-slate-500">Loading users...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-3 text-sm text-slate-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Subscription</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-t border-slate-200/80 transition hover:bg-slate-50/80">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{row.fullName || row.username || row.userId}</div>
                      <div className="text-xs text-slate-500">{row.userId}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{row.email || '-'}</td>
                    <td className="px-5 py-3 text-slate-700">{row.subscription?.plan || '-'}</td>
                    <td className="px-5 py-3 text-slate-700">{row.subscription?.status || '-'}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${row.banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {row.banned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          title="Edit user"
                          disabled={updatingUserId === row.userId}
                          onClick={() => void editUser(row)}
                          className="admin-focus rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          title={row.banned ? 'Restore user' : 'Suspend user'}
                          disabled={updatingUserId === row.userId}
                          onClick={() => void toggleSuspension(row)}
                          className="admin-focus rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingUserId === row.userId ? '...' : row.banned ? '✓' : '⊗'}
                        </button>
                        <button
                          type="button"
                          title="Delete user"
                          disabled={updatingUserId === row.userId}
                          onClick={() => void deleteUser(row)}
                          className="admin-focus rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-sm text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          🗑️
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