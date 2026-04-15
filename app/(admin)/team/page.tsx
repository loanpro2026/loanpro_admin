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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | RoleKey>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'deactivated'>('all');
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'email' | 'displayName'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const roleMap = useMemo(() => new Map(ADMIN_ROLE_OPTIONS.map((role) => [role.key, role.label])), []);

  const loadTeam = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(skip),
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortDir,
      });
      if (search.trim()) params.set('search', search.trim());

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
        search?: string;
        roleFilter?: 'all' | RoleKey;
        statusFilter?: 'all' | 'active' | 'inactive' | 'deactivated';
        sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'displayName';
        sortDir?: 'asc' | 'desc';
        limit?: number;
      };
      if (typeof parsed.search === 'string') setSearch(parsed.search);
      if (parsed.roleFilter === 'all') {
        setRoleFilter('all');
      } else if (parsed.roleFilter && ADMIN_ROLE_OPTIONS.some((role) => role.key === parsed.roleFilter)) {
        setRoleFilter(parsed.roleFilter);
      }
      if (
        parsed.statusFilter === 'all' ||
        parsed.statusFilter === 'active' ||
        parsed.statusFilter === 'inactive' ||
        parsed.statusFilter === 'deactivated'
      ) {
        setStatusFilter(parsed.statusFilter);
      }
      if (parsed.sortBy === 'createdAt' || parsed.sortBy === 'updatedAt' || parsed.sortBy === 'email' || parsed.sortBy === 'displayName') {
        setSortBy(parsed.sortBy);
      }
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
        JSON.stringify({ search, roleFilter, statusFilter, sortBy, sortDir, limit })
      );
    } catch {
      // Ignore storage errors
    }
  }, [search, roleFilter, statusFilter, sortBy, sortDir, limit]);

  useEffect(() => {
    void loadTeam();
  }, [skip, sortBy, sortDir, limit]);

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
        body: JSON.stringify({
          role: nextRole,
          status: nextStatus,
          reason,
        }),
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
      <header className="grid gap-4 lg:grid-cols-1 lg:items-start xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Internal access</span>
          <h1 className="admin-title mt-4">Team Management</h1>
          <p className="admin-subtitle">Invite admins, review roles, and control account access for internal users.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:justify-self-end">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Members', String(total || members.length)],
              ['Visible', String(members.length)],
              ['Active', String(members.filter((m) => m.status === 'active').length)],
            ].map(([label, value]) => (
              <article key={label} className="rounded-[22px] border border-slate-200 bg-white/88 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p className="mt-2 font-display text-xl font-semibold text-slate-950">{value}</p>
              </article>
            ))}
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
                <label className="block text-sm font-medium text-slate-900 mb-1">Email Address *</label>
                <input
                  type="email"
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Role *</label>
                <select
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as RoleKey)}
                >
                  {ADMIN_ROLE_OPTIONS.map((role) => (
                    <option key={role.key} value={role.key}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-1">Reason for Invitation *</label>
                <input
                  type="text"
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-brand-200"
                  placeholder="e.g., New team member, admin promotion"
                  value={inviteReason}
                  onChange={(event) => setInviteReason(event.target.value)}
                  required
                />
              </div>
            </div>
          </CreateModal>
        </div>
      </header>

      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><AdminIcon name="team" size={18} /></span>
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-xs text-slate-500">Search by member, role, or status.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200" placeholder="Search team member" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value as 'all' | RoleKey); setSkip(0); }}>
            <option value="all">All roles</option>
            {ADMIN_ROLE_OPTIONS.map((role) => (
              <option key={role.key} value={role.key}>{role.label}</option>
            ))}
          </select>
          <select className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'all' | 'active' | 'inactive' | 'deactivated'); setSkip(0); }}>
            <option value="all">All statuses</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="deactivated">deactivated</option>
          </select>
          <select className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200" value={sortBy} onChange={(event) => { setSortBy(event.target.value as 'createdAt' | 'updatedAt' | 'email' | 'displayName'); setSkip(0); }}>
            <option value="createdAt">Sort: Created</option>
            <option value="updatedAt">Sort: Updated</option>
            <option value="email">Sort: Email</option>
            <option value="displayName">Sort: Name</option>
          </select>
          <select className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200" value={sortDir} onChange={(event) => { setSortDir(event.target.value as 'asc' | 'desc'); setSkip(0); }}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
          <select className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200" value={String(limit)} onChange={(event) => { setLimit(Number(event.target.value || 25)); setSkip(0); }}>
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
          <button type="button" onClick={() => { setSkip(0); void loadTeam(); }} className="admin-focus rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5">Search</button>
        </div>
      </section>

  {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">{error}</p> : null}

  <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/88 shadow-sm">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Current team members</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading team members...</p>
        ) : members.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No admin users found yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-xs uppercase tracking-wide text-slate-600">
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
                {members.map((member) => (
                  <tr key={member._id || member.clerkUserId} className="border-t border-slate-200/80 transition hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-medium text-slate-800">{member.displayName || '-'}</td>
                    <td className="px-5 py-3 text-slate-700">{member.email}</td>
                    <td className="px-5 py-3 text-slate-700">{roleMap.get(member.role) || member.role}</td>
                    <td className="px-5 py-3 text-slate-700">{member.status}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(member.updatedAt).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <select className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm transition hover:border-brand-200" defaultValue={member.role} onChange={(event) => { const nextRole = event.target.value as RoleKey; void handleMemberUpdate(member, nextRole, member.status); }} disabled={updatingId === String(member._id || member.clerkUserId)}>
                          {ADMIN_ROLE_OPTIONS.map((role) => (
                            <option key={role.key} value={role.key}>{role.label}</option>
                          ))}
                        </select>
                        <button type="button" className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={updatingId === String(member._id || member.clerkUserId)} onClick={() => void handleMemberUpdate(member, member.role, member.status === 'active' ? 'inactive' : 'active')}>
                          {member.status === 'active' ? 'Set Inactive' : 'Set Active'}
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

      <section className="flex items-center justify-between rounded-[28px] border border-slate-200 bg-white/88 px-5 py-4 shadow-sm">
        <p className="text-sm text-slate-600">Showing {members.length === 0 ? 0 : skip + 1}-{skip + members.length} of {total}</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={loading || skip === 0} onClick={() => setSkip((prev) => Math.max(0, prev - limit))} className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Previous</button>
          <button type="button" disabled={loading || !hasMore} onClick={() => setSkip((prev) => prev + limit)} className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">Next</button>
        </div>
      </section>
    </main>
  );
}