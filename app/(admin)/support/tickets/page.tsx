'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type TicketRow = {
  _id?: string;
  ticketId: string;
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
      setRows(payload.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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
    <main className="space-y-6 p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Support Tickets</h1>
          <p className="mt-2 text-slate-600">Assign, reply, and close support tickets from one queue.</p>
        </div>
        <Link
          href="/support/contact-requests"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View Contact Requests
        </Link>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Filters</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search ticket, user, subject"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Ticket records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading tickets...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No tickets found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
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
                {rows.map((row) => (
                  <tr key={row.ticketId} className="border-t border-slate-200">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{row.ticketId}</div>
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
                          disabled={updatingId === row.ticketId}
                          onClick={() => void assignTicket(row.ticketId)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Assign
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row.ticketId}
                          onClick={() => void replyTicket(row.ticketId)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reply
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row.ticketId || row.status === 'closed'}
                          onClick={() =>
                            void patchTicket(row.ticketId, {
                              status: 'closed',
                              reason: 'Closed from admin panel',
                            })
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Close
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