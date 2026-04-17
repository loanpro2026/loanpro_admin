'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { AdminInlineTableSkeleton } from '@/components/admin/AdminLoading';

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
  const [searchInput, setSearchInput] = useState('');
  const [typeFilterInput, setTypeFilterInput] = useState<'all' | 'system' | 'custom'>('all');
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortByInput, setSortByInput] = useState<'updatedAt' | 'name' | 'key'>('updatedAt');
  const [sortDirInput, setSortDirInput] = useState<'asc' | 'desc'>('desc');
  const [appliedQuery, setAppliedQuery] = useState({
    search: '',
    typeFilter: 'all' as 'all' | 'system' | 'custom',
    sortBy: 'updatedAt' as 'updatedAt' | 'name' | 'key',
    sortDir: 'desc' as 'asc' | 'desc',
  });

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
        type: appliedQuery.typeFilter,
        sortBy: appliedQuery.sortBy,
        sortDir: appliedQuery.sortDir,
      });
      if (appliedQuery.search.trim()) params.set('search', appliedQuery.search.trim());

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
        searchInput?: string;
        typeFilterInput?: 'all' | 'system' | 'custom';
        sortByInput?: 'updatedAt' | 'name' | 'key';
        sortDirInput?: 'asc' | 'desc';
        limit?: number;
      };
      if (typeof parsed.searchInput === 'string') setSearchInput(parsed.searchInput);
      if (parsed.typeFilterInput === 'all' || parsed.typeFilterInput === 'system' || parsed.typeFilterInput === 'custom') {
        setTypeFilterInput(parsed.typeFilterInput);
      }
      if (parsed.sortByInput === 'updatedAt' || parsed.sortByInput === 'name' || parsed.sortByInput === 'key') {
        setSortByInput(parsed.sortByInput);
      }
      if (parsed.sortDirInput === 'asc' || parsed.sortDirInput === 'desc') setSortDirInput(parsed.sortDirInput);
      if (typeof parsed.limit === 'number' && [10, 25, 50, 100].includes(parsed.limit)) setLimit(parsed.limit);

      setAppliedQuery({
        search: typeof parsed.searchInput === 'string' ? parsed.searchInput : '',
        typeFilter:
          parsed.typeFilterInput === 'all' || parsed.typeFilterInput === 'system' || parsed.typeFilterInput === 'custom'
            ? parsed.typeFilterInput
            : 'all',
        sortBy: parsed.sortByInput === 'updatedAt' || parsed.sortByInput === 'name' || parsed.sortByInput === 'key' ? parsed.sortByInput : 'updatedAt',
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
        JSON.stringify({ searchInput, typeFilterInput, sortByInput, sortDirInput, limit })
      );
    } catch {
      // Ignore storage errors
    }
  }, [searchInput, typeFilterInput, sortByInput, sortDirInput, limit]);

  useEffect(() => {
    void loadRoles();
  }, [skip, limit, appliedQuery.search, appliedQuery.typeFilter, appliedQuery.sortBy, appliedQuery.sortDir]);

  const applyFilters = () => {
    setSkip(0);
    setAppliedQuery({
      search: searchInput.trim(),
      typeFilter: typeFilterInput,
      sortBy: sortByInput,
      sortDir: sortDirInput,
    });
  };

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
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,560px)] xl:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Authorization control</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Roles and Permissions</h1>
          <p className="mt-2 text-base text-slate-600">Define role templates, control permission boundaries, and protect privileged operations.</p>
        </div>
        <div className="admin-kpi-grid xl:justify-self-end">
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visible</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{roles.length}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{total}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">System</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{roles.filter((role) => role.isSystemRole).length}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Custom</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{roles.filter((role) => !role.isSystemRole).length}</p>
          </article>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><AdminIcon name="roles" size={18} /></span>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-xs text-slate-500">Search role templates and permission sets.</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-6">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Search role key or name"
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
            value={typeFilterInput}
            onChange={(event) => setTypeFilterInput(event.target.value as 'all' | 'system' | 'custom')}
          >
            <option value="all">All types</option>
            <option value="system">System</option>
            <option value="custom">Custom</option>
          </select>
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={sortByInput}
            onChange={(event) => setSortByInput(event.target.value as 'updatedAt' | 'name' | 'key')}
          >
            <option value="updatedAt">Sort: Updated</option>
            <option value="name">Sort: Name</option>
            <option value="key">Sort: Key</option>
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
            type="button"
            onClick={applyFilters}
            className="admin-focus inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <AdminIcon name="spark" size={14} />
            Apply
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Create custom role</h2>
        <p className="mt-2 text-sm text-slate-500">Custom roles require valid permissions and a mandatory audit reason.</p>
        <form className="mt-4 grid gap-2 md:grid-cols-2" onSubmit={handleCreateRole}>
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            type="text"
            required
            placeholder="role key (example: ops_l1)"
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
          />
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            type="text"
            required
            placeholder="display name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm md:col-span-2"
            type="text"
            placeholder="description"
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
          />
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm md:col-span-2"
            type="text"
            placeholder="permissions comma separated (example: users:read,subscriptions:read)"
            value={newPermissionsText}
            onChange={(event) => setNewPermissionsText(event.target.value)}
          />
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm md:col-span-2"
            type="text"
            placeholder="reason for creating this role"
            value={newReason}
            onChange={(event) => setNewReason(event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="admin-focus rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create Role'}
          </button>
        </form>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Role catalog</h2>
        </div>

        {loading ? (
          <AdminInlineTableSkeleton rows={8} />
        ) : roles.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No roles found.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
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
                  <tr key={role.key} className="border-t border-slate-200 transition hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{role.key}</td>
                    <td className="px-5 py-3 text-slate-700">{role.name}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          role.isSystemRole ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {role.isSystemRole ? 'System' : 'Custom'}
                      </span>
                    </td>
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
                            className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingRoleKey === role.key ? 'Updating...' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteRole(role)}
                            disabled={updatingRoleKey === role.key || deletingRoleKey === role.key}
                            className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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

      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Showing {roles.length === 0 ? 0 : skip + 1}-{skip + roles.length} of {total}
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