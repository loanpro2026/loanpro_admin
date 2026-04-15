'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

type TicketRow = {
  _id?: string;
  ticketId?: string;
  userEmail?: string;
  userName?: string;
  subject?: string;
  issueType?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
  createdAt?: string;
  responses?: Array<unknown>;
};

export default function SupportTicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [updatingId, setUpdatingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100', status, priority });
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/support/tickets?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch support tickets');
      }
      setRows(
        Array.isArray(payload.data)
          ? payload.data.map((item: TicketRow) => ({
              ...item,
              ticketId: String(item.ticketId || item._id || ''),
              status: String(item.status || '').trim().toLowerCase().replace('_', '-'),
            }))
          : []
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, status, priority]);

  const patchTicket = async (ticketId: string, body: Record<string, unknown>) => {
    setUpdatingId(ticketId);
    setError('');
    try {
      const response = await fetch(`/api/support/tickets/${encodeURIComponent(ticketId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update ticket');
      }
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update ticket');
    } finally {
      setUpdatingId('');
    }
  };

  const assignTicket = async (ticketId: string) => {
    const assignee = window.prompt('Assign to (email/name):', '') || '';
    if (!assignee.trim()) return;
    await patchTicket(ticketId, { assignedTo: assignee.trim(), reason: 'Assigned from admin panel' });
  };

  const replyTicket = async (ticketId: string) => {
    const message = window.prompt('Reply message:', '') || '';
    if (!message.trim()) return;
    await patchTicket(ticketId, { message: message.trim(), reason: 'Reply sent from admin panel' });
  };

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-1 lg:items-start xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Support queue</span>
          <h1 className="admin-title mt-4">Support Tickets</h1>
          <p className="admin-subtitle">Assign, reply, and close support tickets from one queue.</p>
        </div>
        <Link
          href="/support/contact-requests"
          className="admin-focus inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 lg:justify-self-end"
        >
          View Contact Requests
        </Link>
      </header>

      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><AdminIcon name="support" /></span>
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-xs text-slate-500">Search, segment, and work the support queue.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Search ticket, user, subject"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In-progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button
            className="admin-focus rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
            type="button"
            onClick={() => void load()}
          >
            Search
          </button>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/88 shadow-sm">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ticket records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading tickets...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No tickets found.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Issue</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Responses</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const resolvedTicketId = String(row.ticketId || row._id || '');
                  return (
                    <tr key={resolvedTicketId} className="border-t border-slate-200/80 transition hover:bg-slate-50/80">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800">{resolvedTicketId || '-'}</div>
                        <div className="text-xs text-slate-500">{row.subject || '-'}</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-800">{row.userName || '-'}</div>
                        <div className="text-xs text-slate-500">{row.userEmail || '-'}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{row.issueType || '-'}</td>
                      <td className="px-5 py-3">
                        <div className="text-slate-700">{row.status || '-'}</div>
                        <div className="text-xs text-slate-500">{row.priority || '-'}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{Array.isArray(row.responses) ? row.responses.length : 0}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingId === resolvedTicketId || !resolvedTicketId}
                            onClick={() => void assignTicket(resolvedTicketId)}
                            className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Assign
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === resolvedTicketId || !resolvedTicketId}
                            onClick={() => void replyTicket(resolvedTicketId)}
                            className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reply
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === resolvedTicketId || row.status === 'closed' || !resolvedTicketId}
                            onClick={() =>
                              void patchTicket(resolvedTicketId, {
                                status: 'closed',
                                reason: 'Closed from admin panel',
                              })
                            }
                            className="admin-focus rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Close
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