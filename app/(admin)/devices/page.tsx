'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

type DeviceRow = {
  userId: string;
  email?: string;
  username?: string;
  fullName?: string;
  deviceId?: string;
  deviceName?: string;
  status?: string;
  lastActive?: string;
};

const STORAGE_KEY = 'lp_admin_devices_table_v1';

function deviceStatusTone(status?: string) {
  const key = String(status || '').toLowerCase();
  if (key === 'active') return 'bg-emerald-100 text-emerald-700';
  if (key === 'pending') return 'bg-amber-100 text-amber-700';
  if (key === 'inactive') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-100 text-slate-500';
}

function userLabel(row: DeviceRow) {
  return row.fullName || row.username || row.userId;
}

function userInitials(row: DeviceRow) {
  const source = userLabel(row);
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
  return initials || 'U';
}

export default function DevicesPage() {
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [limit, setLimit] = useState(150);
  const [updatingKey, setUpdatingKey] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: String(limit), status });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/devices?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch devices');
      }
      setRows(payload.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { search?: string; status?: string; limit?: number };
      if (typeof parsed.search === 'string') setSearch(parsed.search);
      if (typeof parsed.status === 'string') setStatus(parsed.status);
      if (typeof parsed.limit === 'number' && [50, 100, 150, 300].includes(parsed.limit)) setLimit(parsed.limit);
    } catch {
      // Ignore invalid saved preferences.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ search, status, limit }));
    } catch {
      // Ignore storage errors.
    }
  }, [search, status, limit]);

  useEffect(() => {
    void load();
  }, []);

  const updateDevice = async (row: DeviceRow, action: 'revoke' | 'approve_switch') => {
    if (!row.deviceId) {
      setError('Missing deviceId for selected device');
      return;
    }

    const key = `${row.userId}:${row.deviceId}`;
    setUpdatingKey(key);
    setError('');
    try {
      const reason = (window.prompt(`Reason for ${action === 'revoke' ? 'revoking device' : 'approving switch'}:`, '') || '').trim();
      if (!reason) {
        setError('A reason is required for device trust actions');
        return;
      }

      const response = await fetch(`/api/devices/${encodeURIComponent(row.userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          deviceId: row.deviceId,
          reason,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update device');
      }
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update device');
    } finally {
      setUpdatingKey('');
    }
  };

  const summary = useMemo(() => {
    const base = { total: rows.length, active: 0, pending: 0, inactive: 0 };
    rows.forEach((row) => {
      const key = String(row.status || '').toLowerCase();
      if (key === 'active') base.active += 1;
      else if (key === 'pending') base.pending += 1;
      else if (key === 'inactive') base.inactive += 1;
    });
    return base;
  }, [rows]);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Device trust</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Devices</h1>
          <p className="mt-2 text-base text-slate-600">
            Manage active devices, verify pending switches, and revoke trusted sessions when needed.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 lg:justify-self-end">
          {[
            ['Total', String(summary.total)],
            ['Active', String(summary.active)],
            ['Pending', String(summary.pending)],
            ['Inactive', String(summary.inactive)],
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
            <AdminIcon name="devices" size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-sm text-slate-500">Search user/device records and isolate trust state.</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Search user, email, or device ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void load();
              }
            }}
          />

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={String(limit)}
            onChange={(event) => setLimit(Number(event.target.value || 150))}
          >
            <option value="50">50 records</option>
            <option value="100">100 records</option>
            <option value="150">150 records</option>
            <option value="300">300 records</option>
          </select>

          <button
            className="admin-focus inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            type="button"
            onClick={() => void load()}
          >
            <AdminIcon name="spark" size={14} />
            Apply
          </button>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Device records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading devices...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No devices found.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Device</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last active</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = `${row.userId}:${row.deviceId || 'unknown'}`;
                  const pending = String(row.status || '').toLowerCase() === 'pending';
                  return (
                    <tr key={key} className="border-t border-slate-200 transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                            {userInitials(row)}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">{userLabel(row)}</p>
                            <p className="text-xs text-slate-500">{row.email || row.userId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-slate-800">{row.deviceName || '-'}</div>
                        <div className="text-xs text-slate-500">{row.deviceId || '-'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${deviceStatusTone(row.status)}`}>
                          {row.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{row.lastActive ? new Date(row.lastActive).toLocaleString() : '-'}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingKey === key}
                            onClick={() => void updateDevice(row, 'revoke')}
                            className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Revoke
                          </button>
                          <button
                            type="button"
                            disabled={updatingKey === key || !pending}
                            onClick={() => void updateDevice(row, 'approve_switch')}
                            className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Approve switch
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
