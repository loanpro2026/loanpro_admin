'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleKey>('viewer');
  const [inviteReason, setInviteReason] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const roleMap = useMemo(() => new Map(ADMIN_ROLE_OPTIONS.map((role) => [role.key, role.label])), []);

  const loadTeam = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/team');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load team');
      }
      setMembers(payload.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTeam();
  }, []);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
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
    <main className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Team Management</h1>
        <p className="mt-2 text-slate-600">Invite admins, review roles, and control account access for internal users.</p>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Invite team member</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={handleInvite}>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="email"
            required
            placeholder="teammate@loanpro.tech"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value as RoleKey)}
          >
            {ADMIN_ROLE_OPTIONS.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="text"
            placeholder="Reason (required)"
            value={inviteReason}
            onChange={(event) => setInviteReason(event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={inviting}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      </section>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Current team members</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading team members...</p>
        ) : members.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No admin users found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
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
                {members.map((member) => (
                  <tr key={member._id || member.clerkUserId} className="border-t border-slate-200">
                    <td className="px-5 py-3 font-medium text-slate-800">{member.displayName || '-'}</td>
                    <td className="px-5 py-3 text-slate-700">{member.email}</td>
                    <td className="px-5 py-3 text-slate-700">{roleMap.get(member.role) || member.role}</td>
                    <td className="px-5 py-3 text-slate-700">{member.status}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(member.updatedAt).toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          defaultValue={member.role}
                          onChange={(event) => {
                            const nextRole = event.target.value as RoleKey;
                            void handleMemberUpdate(member, nextRole, member.status);
                          }}
                          disabled={updatingId === String(member._id || member.clerkUserId)}
                        >
                          {ADMIN_ROLE_OPTIONS.map((role) => (
                            <option key={role.key} value={role.key}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                          disabled={updatingId === String(member._id || member.clerkUserId)}
                          onClick={() =>
                            void handleMemberUpdate(
                              member,
                              member.role,
                              member.status === 'active' ? 'inactive' : 'active'
                            )
                          }
                        >
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
    </main>
  );
}