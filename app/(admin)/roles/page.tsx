'use client';

import { useEffect, useMemo, useState } from 'react';

type RoleRecord = {
  key: string;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole: boolean;
  updatedAt: string;
};

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

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
      const response = await fetch('/api/roles');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load roles');
      }
      setRoles(payload.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

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

  return (
    <main className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Roles and Permissions</h1>
        <p className="mt-2 text-slate-600">Manage role templates and permission sets for the admin control plane.</p>
        <p className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
          {roleCountText}
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Create custom role</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateRole}>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="text"
            required
            placeholder="role key (example: ops_l1)"
            value={newKey}
            onChange={(event) => setNewKey(event.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="text"
            required
            placeholder="display name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            type="text"
            placeholder="description"
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            type="text"
            placeholder="permissions comma separated (example: users:read,subscriptions:read)"
            value={newPermissionsText}
            onChange={(event) => setNewPermissionsText(event.target.value)}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            type="text"
            placeholder="reason for creating this role"
            value={newReason}
            onChange={(event) => setNewReason(event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create Role'}
          </button>
        </form>
      </section>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Role catalog</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading roles...</p>
        ) : roles.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No roles found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Key</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Permission Count</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.key} className="border-t border-slate-200">
                    <td className="px-5 py-3 font-medium text-slate-800">{role.key}</td>
                    <td className="px-5 py-3 text-slate-700">{role.name}</td>
                    <td className="px-5 py-3 text-slate-700">{role.isSystemRole ? 'System' : 'Custom'}</td>
                    <td className="px-5 py-3 text-slate-700">{role.permissions?.length || 0}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(role.updatedAt).toLocaleString()}</td>
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