'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

type RoleRecord = {
  key: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  updatedAt: string;
};

export default function RolesPage() {
  const STORAGE_KEY = 'lp_admin_roles_table_v1';
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [updatingRoleKey, setUpdatingRoleKey] = useState('');
  const [deletingRoleKey, setDeletingRoleKey] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'custom'>('all');
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'name' | 'key'>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [newKey, setNewKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPermissionsText, setNewPermissionsText] = useState('');
  const [newReason, setNewReason] = useState('');

  const roleCountText = useMemo(() => `${roles.length} roles`, [roles.length]);

  const loadRoles = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip),
        type: typeFilter,
        sortBy,
        sortDir,
      });
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/roles?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load roles');
      }
      setRoles(payload.data || []);
      setTotal(Number(payload?.meta?.total || 0));
      setHasMore(Boolean(payload?.meta?.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load roles');
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
        typeFilter?: 'all' | 'system' | 'custom';
        sortBy?: 'updatedAt' | 'name' | 'key';
        sortDir?: 'asc' | 'desc';
        limit?: number;
      };
      if (typeof parsed.search === 'string') setSearch(parsed.search);
      if (parsed.typeFilter === 'all' || parsed.typeFilter === 'system' || parsed.typeFilter === 'custom') {
        setTypeFilter(parsed.typeFilter);
      }
      if (parsed.sortBy === 'updatedAt' || parsed.sortBy === 'name' || parsed.sortBy === 'key') setSortBy(parsed.sortBy);
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
        JSON.stringify({ search, typeFilter, sortBy, sortDir, limit })
      );
    } catch {
      // Ignore storage errors
    }
  }, [search, typeFilter, sortBy, sortDir, limit]);

  useEffect(() => {
    void loadRoles();
  }, [skip, sortBy, sortDir, limit]);

  const handleCreateRole = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      if (!newReason.trim()) {
        throw new Error('A reason is required to create a custom role');
      }

      const permissions = newPermissionsText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey,
          name: newName,
          description: newDescription,
          permissions,
          reason: newReason.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create role');
      }

      setNewKey('');
      setNewName('');
      setNewDescription('');
      setNewPermissionsText('');
      setNewReason('');
      await loadRoles();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create role');
    } finally {
      setCreating(false);
    }
  };

  const handleEditRole = async (role: RoleRecord) => {
    if (role.isSystemRole) {
      setError('System roles cannot be edited from this screen');
      return;
    }

    setUpdatingRoleKey(role.key);
    setError('');

    try {
      const nextName = (window.prompt('Updated role name:', role.name) || '').trim();
      if (!nextName) {
        throw new Error('Role name is required');
      }

      const nextDescription = (window.prompt('Updated description:', role.description || '') || '').trim();
      const currentPermissions = Array.isArray(role.permissions) ? role.permissions.join(',') : '';
      const nextPermissionsText = (window.prompt('Permissions (comma separated):', currentPermissions) || '').trim();
      const permissions = nextPermissionsText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const reason = (window.prompt('Reason for role update:', '') || '').trim();
      if (!reason) {
        throw new Error('A reason is required to update a role');
      }

      const response = await fetch(`/api/roles/${encodeURIComponent(role.key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextName,
          description: nextDescription,
          permissions,
          reason,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update role');
      }

      await loadRoles();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update role');
    } finally {
      setUpdatingRoleKey('');
    }
  };

  const handleDeleteRole = async (role: RoleRecord) => {
    if (role.isSystemRole) {
      setError('System roles cannot be deleted');
      return;
    }

    setDeletingRoleKey(role.key);
    setError('');

    try {
      const reason = (window.prompt('Reason for deleting this role:', '') || '').trim();
      if (!reason) {
        throw new Error('A reason is required to delete a role');
      }

      const confirmed = window.confirm(`Delete role "${role.name}" (${role.key})?`);
      if (!confirmed) {
        return;
      }

      const response = await fetch(`/api/roles/${encodeURIComponent(role.key)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to delete role');
      }

      await loadRoles();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete role');
    } finally {
      setDeletingRoleKey('');
    }
  };

  return (
    <main className="space-y-6 p-6 sm:p-8">
      <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <span className="admin-chip">Authorization control</span>
          <h1 className="admin-title mt-4">Roles and Permissions</h1>
          <p className="admin-subtitle">Manage role templates and permission sets for the admin control plane.</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Role catalog</p>
          <p className="mt-2 font-display text-xl font-semibold text-slate-950">{roleCountText}</p>
        </div>
      </header>

      <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Filters</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Search role key or name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as 'all' | 'system' | 'custom');
              setSkip(0);
            }}
          >
            <option value="all">All types</option>
            <option value="system">System</option>
            <option value="custom">Custom</option>
          </select>
          <select
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as 'updatedAt' | 'name' | 'key');
              setSkip(0);
            }}
          >
            <option value="updatedAt">Sort: Updated</option>
            <option value="name">Sort: Name</option>
            <option value="key">Sort: Key</option>
          </select>
          <select
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
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
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
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
            type="button"
            onClick={() => {
              setSkip(0);
              void loadRoles();
            }}
            className="admin-focus rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
          >
            Search
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Create custom role</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateRole}>
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            type="text"
            required
            placeholder="role key (example: ops_l1)"
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
          />
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            type="text"
            required
            placeholder="display name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200 md:col-span-2"
            type="text"
            placeholder="description"
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
          />
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200 md:col-span-2"
            type="text"
            placeholder="permissions comma separated (example: users:read,subscriptions:read)"
            value={newPermissionsText}
            onChange={(event) => setNewPermissionsText(event.target.value)}
          />
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200 md:col-span-2"
            type="text"
            placeholder="reason for creating this role"
            value={newReason}
            onChange={(event) => setNewReason(event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="admin-focus rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create Role'}
          </button>
        </form>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/85 shadow-sm">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Role catalog</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading roles...</p>
        ) : roles.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No roles found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Key</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Permission Count</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.key} className="border-t border-slate-200/80 transition hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-medium text-slate-800">{role.key}</td>
                    <td className="px-5 py-3 text-slate-700">{role.name}</td>
                    <td className="px-5 py-3 text-slate-700">{role.isSystemRole ? 'System' : 'Custom'}</td>
                    <td className="px-5 py-3 text-slate-700">{role.permissions?.length || 0}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(role.updatedAt).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      {role.isSystemRole ? (
                        <span className="text-xs text-slate-400">System managed</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleEditRole(role)}
                            disabled={updatingRoleKey === role.key || deletingRoleKey === role.key}
                            className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingRoleKey === role.key ? 'Updating...' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteRole(role)}
                            disabled={updatingRoleKey === role.key || deletingRoleKey === role.key}
                            className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingRoleKey === role.key ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex items-center justify-between rounded-[28px] border border-slate-200 bg-white/85 px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Showing {roles.length === 0 ? 0 : skip + 1}-{skip + roles.length} of {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || skip === 0}
            onClick={() => setSkip((prev) => Math.max(0, prev - limit))}
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={loading || !hasMore}
            onClick={() => setSkip((prev) => prev + limit)}
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </section>
    </main>
  );
}