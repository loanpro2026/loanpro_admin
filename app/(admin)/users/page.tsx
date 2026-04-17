'use client';

import { useEffect, useMemo, useState } from 'react';
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

const STORAGE_KEY = 'lp_admin_users_table_v1';

function userDisplayName(row: UserRow) {
  return row.fullName || row.username || row.userId;
}

function userInitials(row: UserRow) {
  const source = userDisplayName(row);
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
  return initials || 'U';
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function subscriptionTone(status: string) {
  const key = String(status || '').toLowerCase();
  if (['active', 'active_subscription'].includes(key)) return 'bg-emerald-100 text-emerald-700';
  if (['trial'].includes(key)) return 'bg-sky-100 text-sky-700';
  if (['cancelled', 'expired', 'suspended'].includes(key)) return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [updatingUserId, setUpdatingUserId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'email' | 'username'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

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

      const nextRows: UserRow[] = payload.data || [];
      setRows(nextRows);
      setSelectedUserId((prev) => (prev && nextRows.some((row) => row.userId === prev) ? prev : ''));
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
    setSuccess('');

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

      setSuccess(`Updated user ${row.userId}.`);
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
    setSuccess('');

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

      setSuccess(`Deleted user ${row.userId}.`);
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
    setSuccess('');

    try {
      const reason = (window.prompt('Reason for suspension status change:', '') || '').trim();
      if (!reason) {
        setError('A reason is required to suspend or unsuspend a user');
        return;
      }

      const response = await fetch(`/api/users/${encodeURIComponent(row.userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: !row.banned, reason }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update user');
      }

      setSuccess(`${row.banned ? 'Restored' : 'Suspended'} user ${row.userId}.`);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update user');
    } finally {
      setUpdatingUserId('');
    }
  };

  const activeCount = useMemo(() => rows.filter((row) => !row.banned).length, [rows]);
  const bannedCount = useMemo(() => rows.filter((row) => row.banned).length, [rows]);
  const selectedUser = useMemo(() => rows.find((row) => row.userId === selectedUserId) || null, [rows, selectedUserId]);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] xl:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Customer operations</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Users</h1>
          <p className="mt-2 text-base text-slate-600">
            Customer directory, account state, and subscription snapshot in one operating view.
          </p>
        </div>

        <div className="admin-kpi-grid xl:justify-self-end">
          {[
            ['Total', String(total || rows.length)],
            ['Visible', String(rows.length)],
            ['Active', String(activeCount)],
            ['Banned', String(bannedCount)],
          ].map(([label, value]) => (
            <article key={label} className="admin-kpi-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
            </article>
          ))}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <AdminIcon name="users" size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-sm text-slate-500">Search, sort, and narrow user records.</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-6">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Search user ID, name, email"
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
              setStatus(event.target.value as 'all' | 'active' | 'banned');
              setSkip(0);
            }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="banned">Banned only</option>
          </select>

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as 'createdAt' | 'updatedAt' | 'email' | 'username');
              setSkip(0);
            }}
          >
            <option value="createdAt">Sort by created</option>
            <option value="updatedAt">Sort by updated</option>
            <option value="email">Sort by email</option>
            <option value="username">Sort by username</option>
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
      {success ? <p className="admin-alert border-emerald-200 bg-emerald-50 text-emerald-700">{success}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Row actions</h2>
            <p className="text-sm text-slate-500">
              {selectedUser
                ? `Selected: ${userDisplayName(selectedUser)} (${selectedUser.userId})`
                : 'Select one user row from the table to enable actions.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!selectedUser || updatingUserId === selectedUser.userId}
              onClick={() => selectedUser && void editUser(selectedUser)}
              className="admin-focus rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={!selectedUser || updatingUserId === selectedUser.userId}
              onClick={() => selectedUser && void toggleSuspension(selectedUser)}
              className="admin-focus rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {selectedUser?.banned ? 'Restore' : 'Suspend'}
            </button>
            <button
              type="button"
              disabled={!selectedUser || updatingUserId === selectedUser.userId}
              onClick={() => selectedUser && void deleteUser(selectedUser)}
              className="admin-focus rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">User records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading users...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Subscription</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const subStatus = String(row.subscription?.status || '-');
                  const selected = selectedUserId === row.userId;
                  return (
                    <tr
                      key={row.userId}
                      onClick={() => setSelectedUserId(row.userId)}
                      className={`cursor-pointer border-t border-slate-200 transition hover:bg-slate-50 ${selected ? 'bg-slate-50' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                            {userInitials(row)}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">{userDisplayName(row)}</p>
                            <p className="text-xs text-slate-500">{row.userId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{row.email || '-'}</td>
                      <td className="px-5 py-4 text-slate-700 capitalize">{row.subscription?.plan || '-'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${subscriptionTone(subStatus)}`}>
                          {subStatus}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.banned ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {row.banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{formatDate(row.createdAt)}</td>
                    </tr>
                  );
                })}
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
