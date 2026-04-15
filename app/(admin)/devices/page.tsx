'use client';

import { useEffect, useState } from 'react';
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

export default function DevicesPage() {
  const [rows, setRows] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [updatingKey, setUpdatingKey] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '150', status });
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
      const response = await fetch(`/api/devices/${encodeURIComponent(row.userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          deviceId: row.deviceId,
          reason: action === 'revoke' ? 'Revoked from admin panel' : 'Switch approved from admin panel',
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

  return (
    <main className="space-y-6 p-6 sm:p-8">
      <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <span className="admin-chip">Device trust</span>
          <h1 className="admin-title mt-4">Devices</h1>
          <p className="admin-subtitle">Review active and pending devices, then approve switches or revoke access.</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Loaded records</p>
          <p className="mt-2 font-display text-xl font-semibold text-slate-950">{rows.length}</p>
        </div>
      </header>

      <section className="admin-surface">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><AdminIcon name="devices" size={18} /></span>
          <div>
            <h2 className="font-semibold text-slate-950">Filters</h2>
            <p className="text-xs text-slate-500">Search users or device IDs, then apply trust actions.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Search user or device"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            className="admin-focus rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
            type="button"
            onClick={() => void load()}
          >
            Apply
          </button>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden admin-surface">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Device records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading devices...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No devices found.</p>
        ) : (
          <div className="overflow-x-auto">
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
                  return (
                      <tr key={key} className="border-t border-slate-200/80 transition hover:bg-slate-50/80">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800">{row.fullName || row.username || row.userId}</div>
                        <div className="text-xs text-slate-500">{row.email || row.userId}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-800">{row.deviceName || '-'}</div>
                        <div className="text-xs text-slate-500">{row.deviceId || '-'}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{row.status || '-'}</td>
                      <td className="px-5 py-3 text-slate-700">{row.lastActive ? new Date(row.lastActive).toLocaleString() : '-'}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingKey === key}
                            onClick={() => void updateDevice(row, 'revoke')}
                            className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Revoke
                          </button>
                          <button
                            type="button"
                            disabled={updatingKey === key || row.status !== 'pending'}
                            onClick={() => void updateDevice(row, 'approve_switch')}
                            className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Approve Switch
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