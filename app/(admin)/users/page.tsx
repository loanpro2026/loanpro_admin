'use client';

import { useEffect, useState } from 'react';

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
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [updatingUserId, setUpdatingUserId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100', status });
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/users?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch users');
      }

      setRows(payload.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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
    <main className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
        <p className="mt-2 text-slate-600">Search users, inspect subscription state, and control account suspension status.</p>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Filters</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search user ID, name, email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as 'all' | 'active' | 'banned')}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">User records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading users...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Subscription</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId} className="border-t border-slate-200">
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
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        disabled={updatingUserId === row.userId}
                        onClick={() => void toggleSuspension(row)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingUserId === row.userId ? 'Updating...' : row.banned ? 'Unsuspend' : 'Suspend'}
                      </button>
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