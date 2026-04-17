'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { CreateModal } from '@/components/admin/CreateModal';
import { ADMIN_ROLE_OPTIONS } from '@/constants/roles';
import type { RoleKey } from '@/types/rbac';

type TeamMember = {
  _id?: string;
  clerkUserId: string;
  email: string;
  displayName: string;
  role: RoleKey;
  status: 'active' | 'inactive' | 'deactivated';
  createdAt: string;
  updatedAt: string;
};

export default function TeamPage() {
  const STORAGE_KEY = 'lp_admin_team_table_v1';
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleKey>('viewer');
  const [inviteReason, setInviteReason] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [roleFilterInput, setRoleFilterInput] = useState<'all' | RoleKey>('all');
  const [statusFilterInput, setStatusFilterInput] = useState<'all' | 'active' | 'inactive' | 'deactivated'>('all');
  const [sortByInput, setSortByInput] = useState<'createdAt' | 'updatedAt' | 'email' | 'displayName'>('createdAt');
  const [sortDirInput, setSortDirInput] = useState<'asc' | 'desc'>('desc');

  const [appliedQuery, setAppliedQuery] = useState({
    search: '',
    role: 'all' as 'all' | RoleKey,
    status: 'all' as 'all' | 'active' | 'inactive' | 'deactivated',
    sortBy: 'createdAt' as 'createdAt' | 'updatedAt' | 'email' | 'displayName',
    sortDir: 'desc' as 'asc' | 'desc',
  });

  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const roleMap = useMemo(() => new Map(ADMIN_ROLE_OPTIONS.map((role) => [role.key, role.label])), []);

  const statusCounts = useMemo(
    () => ({
      active: members.filter((member) => member.status === 'active').length,
      inactive: members.filter((member) => member.status === 'inactive').length,
    }),
    [members]
  );

  const memberName = (member: TeamMember) => member.displayName || member.email || member.clerkUserId;

  const memberInitials = (member: TeamMember) => {
    const source = memberName(member);
    const initials = source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
    return initials || 'A';
  };

  const loadTeam = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip),
        role: appliedQuery.role,
        status: appliedQuery.status,
        sortBy: appliedQuery.sortBy,
        sortDir: appliedQuery.sortDir,
      });
      if (appliedQuery.search.trim()) params.set('search', appliedQuery.search.trim());

      const response = await fetch(`/api/team?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load team');
      }

      setMembers(payload.data || []);
      setTotal(Number(payload?.meta?.total || 0));
      setHasMore(Boolean(payload?.meta?.hasMore));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load team');
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
        roleFilterInput?: 'all' | RoleKey;
        statusFilterInput?: 'all' | 'active' | 'inactive' | 'deactivated';
        sortByInput?: 'createdAt' | 'updatedAt' | 'email' | 'displayName';
        sortDirInput?: 'asc' | 'desc';
        limit?: number;
      };

      if (typeof parsed.searchInput === 'string') setSearchInput(parsed.searchInput);

      if (parsed.roleFilterInput === 'all') {
        setRoleFilterInput('all');
      } else if (parsed.roleFilterInput && ADMIN_ROLE_OPTIONS.some((role) => role.key === parsed.roleFilterInput)) {
        setRoleFilterInput(parsed.roleFilterInput);
      }

      if (
        parsed.statusFilterInput === 'all' ||
        parsed.statusFilterInput === 'active' ||
        parsed.statusFilterInput === 'inactive' ||
        parsed.statusFilterInput === 'deactivated'
      ) {
        setStatusFilterInput(parsed.statusFilterInput);
      }

      if (
        parsed.sortByInput === 'createdAt' ||
        parsed.sortByInput === 'updatedAt' ||
        parsed.sortByInput === 'email' ||
        parsed.sortByInput === 'displayName'
      ) {
        setSortByInput(parsed.sortByInput);
      }

      if (parsed.sortDirInput === 'asc' || parsed.sortDirInput === 'desc') {
        setSortDirInput(parsed.sortDirInput);
      }

      if (typeof parsed.limit === 'number' && [10, 25, 50, 100].includes(parsed.limit)) {
        setLimit(parsed.limit);
      }

      setAppliedQuery({
        search: typeof parsed.searchInput === 'string' ? parsed.searchInput : '',
        role:
          parsed.roleFilterInput === 'all' ||
          (parsed.roleFilterInput && ADMIN_ROLE_OPTIONS.some((role) => role.key === parsed.roleFilterInput))
            ? (parsed.roleFilterInput as 'all' | RoleKey)
            : 'all',
        status:
          parsed.statusFilterInput === 'all' ||
          parsed.statusFilterInput === 'active' ||
          parsed.statusFilterInput === 'inactive' ||
          parsed.statusFilterInput === 'deactivated'
            ? parsed.statusFilterInput
            : 'all',
        sortBy:
          parsed.sortByInput === 'createdAt' ||
          parsed.sortByInput === 'updatedAt' ||
          parsed.sortByInput === 'email' ||
          parsed.sortByInput === 'displayName'
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
        JSON.stringify({ searchInput, roleFilterInput, statusFilterInput, sortByInput, sortDirInput, limit })
      );
    } catch {
      // Ignore storage errors
    }
  }, [searchInput, roleFilterInput, statusFilterInput, sortByInput, sortDirInput, limit]);

  useEffect(() => {
    void loadTeam();
  }, [skip, limit, appliedQuery.search, appliedQuery.role, appliedQuery.status, appliedQuery.sortBy, appliedQuery.sortDir]);

  const applyFilters = () => {
    setSkip(0);
    setAppliedQuery({
      search: searchInput.trim(),
      role: roleFilterInput,
      status: statusFilterInput,
      sortBy: sortByInput,
      sortDir: sortDirInput,
    });
  };

  const sendInvite = async () => {
    setInviting(true);
    setError('');

    try {
      if (!inviteReason.trim()) {
        throw new Error('A reason is required for team invites');
      }

      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          reason: inviteReason.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to send invite');
      }

      setInviteEmail('');
      setInviteRole('viewer');
      setInviteReason('');
      await loadTeam();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleMemberUpdate = async (member: TeamMember, nextRole: RoleKey, nextStatus: TeamMember['status']) => {
    const id = String(member._id || member.clerkUserId || '').trim();
    if (!id) return;

    setUpdatingId(id);
    setError('');
    try {
      const reason = (window.prompt('Reason for this change:', '') || '').trim();
      if (!reason) {
        throw new Error('A reason is required for team role/status updates');
      }

      const response = await fetch(`/api/team/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole, status: nextStatus, reason }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update team member');
      }

      await loadTeam();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update team member');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Internal access</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Team Management</h1>
          <p className="mt-2 text-base text-slate-600">
            Invite admins, assign roles, and enforce accountable access changes with required reasons.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 lg:justify-self-end">
          {[
            ['Members', String(total || members.length)],
            ['Visible', String(members.length)],
            ['Active', String(statusCounts.active)],
            ['Inactive', String(statusCounts.inactive)],
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
              <AdminIcon name="team" size={18} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Invite team member</h2>
              <p className="text-xs text-slate-500">Send role-based access invites with mandatory audit reason.</p>
            </div>
          </div>

          <CreateModal
            title="Invite Team Member"
            description="Send an invite to a new admin with role-based permissions"
            icon="team"
            onSubmit={sendInvite}
            isLoading={inviting}
            disabled={!inviteEmail.trim() || !inviteReason.trim()}
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">Email Address *</label>
                <input
                  type="email"
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">Role *</label>
                <select
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as RoleKey)}
                >
                  {ADMIN_ROLE_OPTIONS.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">Reason for Invitation *</label>
                <input
                  type="text"
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  placeholder="e.g., New team member, admin promotion"
                  value={inviteReason}
                  onChange={(event) => setInviteReason(event.target.value)}
                  required
                />
              </div>
            </div>
          </CreateModal>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <AdminIcon name="team" size={18} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Filters</h2>
              <p className="text-xs text-slate-500">Search by member, role, or status.</p>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-7">
            <input
              className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
              placeholder="Search team member"
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
              value={roleFilterInput}
              onChange={(event) => setRoleFilterInput(event.target.value as 'all' | RoleKey)}
            >
              <option value="all">All roles</option>
              {ADMIN_ROLE_OPTIONS.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.label}
                </option>
              ))}
            </select>

            <select
              className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
              value={statusFilterInput}
              onChange={(event) => setStatusFilterInput(event.target.value as 'all' | 'active' | 'inactive' | 'deactivated')}
            >
              <option value="all">All statuses</option>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="deactivated">deactivated</option>
            </select>

            <select
              className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
              value={sortByInput}
              onChange={(event) => setSortByInput(event.target.value as 'createdAt' | 'updatedAt' | 'email' | 'displayName')}
            >
              <option value="createdAt">Sort: Created</option>
              <option value="updatedAt">Sort: Updated</option>
              <option value="email">Sort: Email</option>
              <option value="displayName">Sort: Name</option>
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
        </div>
      </section>

      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">{error}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Current team members</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading team members...</p>
        ) : members.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No admin users found yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const id = String(member._id || member.clerkUserId);
                  return (
                    <tr key={id} className="border-t border-slate-200 transition hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                            {memberInitials(member)}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">{memberName(member)}</p>
                            <p className="text-xs text-slate-500">{member.clerkUserId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{member.email}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {roleMap.get(member.role) || member.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            member.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : member.status === 'inactive'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{new Date(member.updatedAt).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm"
                            defaultValue={member.role}
                            onChange={(event) => {
                              const nextRole = event.target.value as RoleKey;
                              void handleMemberUpdate(member, nextRole, member.status);
                            }}
                            disabled={updatingId === id}
                          >
                            {ADMIN_ROLE_OPTIONS.map((role) => (
                              <option key={role.key} value={role.key}>
                                {role.label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={updatingId === id}
                            onClick={() =>
                              void handleMemberUpdate(member, member.role, member.status === 'active' ? 'inactive' : 'active')
                            }
                          >
                            {member.status === 'active' ? 'Set Inactive' : 'Set Active'}
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

      <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Showing {members.length === 0 ? 0 : skip + 1}-{skip + members.length} of {total}
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
