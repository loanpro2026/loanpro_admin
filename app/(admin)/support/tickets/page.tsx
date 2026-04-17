'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { AdminInlineTableSkeleton } from '@/components/admin/AdminLoading';

type TicketResponse = {
  from?: string;
  message?: string;
  timestamp?: string;
  adminName?: string;
  userName?: string;
};

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
  updatedAt?: string;
  responses?: TicketResponse[];
};

const STORAGE_KEY = 'lp_admin_support_tickets_v1';

function normalizeStatus(value?: string) {
  return String(value || '').trim().toLowerCase().replace('_', '-');
}

function statusTone(status?: string) {
  const key = normalizeStatus(status);
  if (key === 'open') return 'bg-sky-100 text-sky-700';
  if (key === 'in-progress') return 'bg-amber-100 text-amber-700';
  if (key === 'resolved') return 'bg-emerald-100 text-emerald-700';
  if (key === 'closed') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-600';
}

function priorityTone(priority?: string) {
  const key = String(priority || '').trim().toLowerCase();
  if (key === 'urgent') return 'bg-rose-100 text-rose-700';
  if (key === 'high') return 'bg-orange-100 text-orange-700';
  if (key === 'medium') return 'bg-amber-100 text-amber-700';
  if (key === 'low') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-600';
}

function formatTimestamp(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function toTicketId(row: TicketRow) {
  return String(row.ticketId || row._id || '').trim();
}

function toChatMessages(row: TicketRow | null) {
  if (!row) return [] as Array<{ id: string; from: string; message: string; timestamp?: string; name?: string }>;

  const messages: Array<{ id: string; from: string; message: string; timestamp?: string; name?: string }> = [
    {
      id: `${toTicketId(row)}-subject`,
      from: 'system',
      message: row.subject ? `Ticket created: ${row.subject}` : 'Ticket created',
      timestamp: row.createdAt,
      name: row.userName || row.userEmail || 'User',
    },
  ];

  const responseRows = Array.isArray(row.responses) ? row.responses : [];
  responseRows.forEach((item, idx) => {
    const message = String(item?.message || '').trim();
    if (!message) return;

    messages.push({
      id: `${toTicketId(row)}-msg-${idx}`,
      from: String(item?.from || 'unknown').toLowerCase(),
      message,
      timestamp: item?.timestamp,
      name: item?.adminName || item?.userName,
    });
  });

  return messages;
}

export default function SupportTicketsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState('all');
  const [priorityInput, setPriorityInput] = useState('all');
  const [limit, setLimit] = useState(100);
  const [appliedQuery, setAppliedQuery] = useState({ search: '', status: 'all', priority: 'all' });

  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [chatDraft, setChatDraft] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        status: appliedQuery.status,
        priority: appliedQuery.priority,
      });
      if (appliedQuery.search.trim()) params.set('search', appliedQuery.search.trim());

      const response = await fetch(`/api/support/tickets?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch support tickets');
      }

      const nextRows: TicketRow[] =
        Array.isArray(payload.data)
          ? payload.data.map((item: TicketRow) => ({
              ...item,
              ticketId: toTicketId(item),
              status: normalizeStatus(item.status),
            }))
          : [];

      setRows(nextRows);
      setSelectedTicketId((prev) => {
        if (!prev) return prev;
        const found = nextRows.some((row) => toTicketId(row) === prev);
        return found ? prev : '';
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch support tickets');
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
        statusInput?: string;
        priorityInput?: string;
        limit?: number;
      };

      if (typeof parsed.searchInput === 'string') setSearchInput(parsed.searchInput);
      if (typeof parsed.statusInput === 'string') setStatusInput(parsed.statusInput);
      if (typeof parsed.priorityInput === 'string') setPriorityInput(parsed.priorityInput);
      if (typeof parsed.limit === 'number' && [50, 100, 150, 200].includes(parsed.limit)) setLimit(parsed.limit);

      setAppliedQuery({
        search: typeof parsed.searchInput === 'string' ? parsed.searchInput : '',
        status: typeof parsed.statusInput === 'string' ? parsed.statusInput : 'all',
        priority: typeof parsed.priorityInput === 'string' ? parsed.priorityInput : 'all',
      });
    } catch {
      // Ignore invalid saved preferences.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ searchInput, statusInput, priorityInput, limit })
      );
    } catch {
      // Ignore storage errors.
    }
  }, [searchInput, statusInput, priorityInput, limit]);

  useEffect(() => {
    void load();
  }, [appliedQuery.search, appliedQuery.status, appliedQuery.priority, limit]);

  const patchTicket = async (ticketId: string, body: Record<string, unknown>) => {
    setUpdatingId(ticketId);
    setError('');
    setSuccess('');
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
      setSuccess(`Updated ticket ${ticketId} successfully.`);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update ticket');
    } finally {
      setUpdatingId('');
    }
  };

  const applyFilters = () => {
    setAppliedQuery({
      search: searchInput.trim(),
      status: statusInput,
      priority: priorityInput,
    });
  };

  const assignTicket = async (ticketId: string) => {
    const assignee = window.prompt('Assign to (email/name):', '') || '';
    if (!assignee.trim()) return;
    await patchTicket(ticketId, { assignedTo: assignee.trim(), reason: 'Assigned from admin panel' });
  };

  const replyFromChat = async () => {
    const ticketId = selectedTicketId;
    const message = chatDraft.trim();
    if (!ticketId || !message) return;

    await patchTicket(ticketId, { message, reason: 'Reply sent from admin panel chat' });
    setChatDraft('');
  };

  const selectedTicket = useMemo(
    () => rows.find((row) => toTicketId(row) === selectedTicketId) || null,
    [rows, selectedTicketId]
  );

  const chatMessages = useMemo(() => toChatMessages(selectedTicket), [selectedTicket]);

  const summary = useMemo(() => {
    const counts = { total: rows.length, open: 0, inProgress: 0, resolved: 0, closed: 0 };
    rows.forEach((row) => {
      const key = normalizeStatus(row.status);
      if (key === 'open') counts.open += 1;
      else if (key === 'in-progress') counts.inProgress += 1;
      else if (key === 'resolved') counts.resolved += 1;
      else if (key === 'closed') counts.closed += 1;
    });
    return counts;
  }, [rows]);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Support queue</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Support Tickets</h1>
          <p className="mt-2 text-base text-slate-600">Assign, reply, and close tickets while reviewing conversation history in chat form.</p>
        </div>

        <div className="admin-kpi-grid lg:justify-self-end">
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.total}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.open}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">In progress</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.inProgress}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resolved</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.resolved}</p>
          </article>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <AdminIcon name="support" size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Filters</h2>
            <p className="text-sm text-slate-500">Search, segment, and open any ticket to view the full conversation.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-6">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Search ticket, user, subject"
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
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In-progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={priorityInput}
            onChange={(event) => setPriorityInput(event.target.value)}
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={String(limit)}
            onChange={(event) => setLimit(Number(event.target.value || 100))}
          >
            <option value="50">50 records</option>
            <option value="100">100 records</option>
            <option value="150">150 records</option>
            <option value="200">200 records</option>
          </select>

          <button
            className="admin-focus inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            type="button"
            onClick={applyFilters}
          >
            <AdminIcon name="spark" size={14} />
            Apply
          </button>

          <Link
            href="/contact-requests"
            className="admin-focus inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Contact requests
          </Link>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}
      {success ? <p className="admin-alert border-emerald-200 bg-emerald-50 text-emerald-700">{success}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ticket records</h2>
          </div>

          {loading ? (
            <AdminInlineTableSkeleton rows={8} />
          ) : rows.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">No tickets found.</p>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
              <table className="admin-table min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Ticket</th>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Responses</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const ticketId = toTicketId(row);
                    const isSelected = ticketId === selectedTicketId;
                    return (
                      <tr
                        key={ticketId}
                        onClick={() => setSelectedTicketId(ticketId)}
                        className={`cursor-pointer border-t border-slate-200 transition hover:bg-slate-50 ${
                          isSelected ? 'bg-slate-50' : ''
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-800">{ticketId || '-'}</div>
                          <div className="text-xs text-slate-500">{row.subject || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-800">{row.userName || '-'}</div>
                          <div className="text-xs text-slate-500">{row.userEmail || '-'}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(row.status)}`}>
                              {row.status || 'unknown'}
                            </span>
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${priorityTone(row.priority)}`}>
                              {row.priority || 'unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-700">{Array.isArray(row.responses) ? row.responses.length : 0}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                            <button
                              type="button"
                              disabled={updatingId === ticketId || !ticketId}
                              onClick={() => void assignTicket(ticketId)}
                              className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Assign
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === ticketId || row.status === 'closed' || !ticketId}
                              onClick={() =>
                                void patchTicket(ticketId, {
                                  status: 'closed',
                                  reason: 'Closed from admin panel',
                                })
                              }
                              className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
        </article>

        <article className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ticket conversation</h2>
          </div>

          {!selectedTicket ? (
            <div className="flex flex-1 items-center justify-center px-6 py-8 text-center text-sm text-slate-500">
              Click a ticket from the table to open its chat conversation.
            </div>
          ) : (
            <>
              <div className="space-y-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{toTicketId(selectedTicket)}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(selectedTicket.status)}`}>
                      {selectedTicket.status || 'unknown'}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${priorityTone(selectedTicket.priority)}`}>
                      {selectedTicket.priority || 'unknown'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-700">{selectedTicket.subject || 'No subject provided'}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{selectedTicket.userName || selectedTicket.userEmail || '-'}</span>
                  <span>Created: {formatTimestamp(selectedTicket.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-500">Updated: {formatTimestamp(selectedTicket.updatedAt || selectedTicket.createdAt)}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 px-5 py-4">
                {chatMessages.map((item) => {
                  const isAdmin = item.from === 'admin';
                  const isSystem = item.from === 'system';
                  return (
                    <div key={item.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isSystem
                            ? 'border border-slate-200 bg-white text-slate-700'
                            : isAdmin
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-800'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{item.message}</p>
                        <p className={`mt-2 text-[11px] ${isAdmin ? 'text-slate-200' : 'text-slate-500'}`}>
                          {item.name ? `${item.name} • ` : ''}
                          {formatTimestamp(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {chatMessages.length === 0 ? (
                  <p className="text-sm text-slate-500">No conversation messages yet.</p>
                ) : null}
              </div>

              <div className="space-y-3 border-t border-slate-200 px-5 py-4">
                <textarea
                  rows={3}
                  className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
                  placeholder="Type a reply to this ticket..."
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">Replies are appended to the ticket conversation and audited.</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={updatingId === selectedTicketId || !chatDraft.trim()}
                      onClick={() => void replyFromChat()}
                      className="admin-focus inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingId === selectedTicketId ? 'Sending...' : 'Send reply'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </article>
      </section>
    </main>
  );
}