'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';
import { AdminInlineTableSkeleton } from '@/components/admin/AdminLoading';

type ContactRow = {
  requestId: string;
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  inquiryType?: string;
  message?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  createdAt?: string;
  updatedAt?: string;
};

const STORAGE_KEY = 'lp_admin_contact_requests_v1';

function statusTone(status?: string) {
  const key = String(status || '').trim().toLowerCase();
  if (key === 'new') return 'bg-sky-100 text-sky-700';
  if (key === 'called') return 'bg-amber-100 text-amber-700';
  if (key === 'follow-up') return 'bg-violet-100 text-violet-700';
  if (key === 'converted') return 'bg-emerald-100 text-emerald-700';
  if (key === 'closed') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-100 text-slate-600';
}

function priorityTone(priority?: string) {
  const key = String(priority || '').trim().toLowerCase();
  if (key === 'high' || key === 'urgent') return 'bg-rose-100 text-rose-700';
  if (key === 'medium') return 'bg-amber-100 text-amber-700';
  if (key === 'normal' || key === 'low') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-600';
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function ContactRequestsPage() {
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState('all');
  const [inquiryTypeInput, setInquiryTypeInput] = useState('all');
  const [limit, setLimit] = useState(100);
  const [appliedQuery, setAppliedQuery] = useState({ search: '', status: 'all', inquiryType: 'all' });

  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        status: appliedQuery.status,
        inquiryType: appliedQuery.inquiryType,
      });
      if (appliedQuery.search.trim()) params.set('search', appliedQuery.search.trim());

      const response = await fetch(`/api/support/contact-requests?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch contact requests');
      }

      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch contact requests');
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
        inquiryTypeInput?: string;
        limit?: number;
      };

      if (typeof parsed.searchInput === 'string') setSearchInput(parsed.searchInput);
      if (typeof parsed.statusInput === 'string') setStatusInput(parsed.statusInput);
      if (typeof parsed.inquiryTypeInput === 'string') setInquiryTypeInput(parsed.inquiryTypeInput);
      if (typeof parsed.limit === 'number' && [50, 100, 150, 200].includes(parsed.limit)) setLimit(parsed.limit);

      setAppliedQuery({
        search: typeof parsed.searchInput === 'string' ? parsed.searchInput : '',
        status: typeof parsed.statusInput === 'string' ? parsed.statusInput : 'all',
        inquiryType: typeof parsed.inquiryTypeInput === 'string' ? parsed.inquiryTypeInput : 'all',
      });
    } catch {
      // Ignore invalid saved preferences.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ searchInput, statusInput, inquiryTypeInput, limit })
      );
    } catch {
      // Ignore storage errors.
    }
  }, [searchInput, statusInput, inquiryTypeInput, limit]);

  useEffect(() => {
    void load();
  }, [appliedQuery.search, appliedQuery.status, appliedQuery.inquiryType, limit]);

  const applyFilters = () => {
    setAppliedQuery({
      search: searchInput.trim(),
      status: statusInput,
      inquiryType: inquiryTypeInput,
    });
  };

  const patchRequest = async (requestId: string, body: Record<string, unknown>) => {
    setUpdatingId(requestId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/support/contact-requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update contact request');
      }

      setSuccess(`Updated request ${requestId} successfully.`);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update contact request');
    } finally {
      setUpdatingId('');
    }
  };

  const assignRequest = async (requestId: string) => {
    const assignedTo = (window.prompt('Assign to (email/name):', '') || '').trim();
    if (!assignedTo) return;

    const reason = (window.prompt('Reason for assignment:', '') || '').trim();
    if (!reason) {
      setError('A reason is required for assignment updates');
      return;
    }

    await patchRequest(requestId, { assignedTo, reason });
  };

  const addNote = async (requestId: string) => {
    const note = (window.prompt('Internal note:', '') || '').trim();
    if (!note) return;

    const reason = (window.prompt('Reason for adding this note:', '') || '').trim();
    if (!reason) {
      setError('A reason is required for notes');
      return;
    }

    await patchRequest(requestId, { note, reason });
  };

  const moveStatus = async (requestId: string, status: 'called' | 'follow-up' | 'converted' | 'closed') => {
    const reason = (window.prompt(`Reason for marking as ${status}:`, '') || '').trim();
    if (!reason) {
      setError('A reason is required for status updates');
      return;
    }

    await patchRequest(requestId, { status, reason });
  };

  const summary = useMemo(() => {
    const counts = { total: rows.length, new: 0, followUp: 0, converted: 0, highPriority: 0 };
    rows.forEach((row) => {
      const status = String(row.status || '').trim().toLowerCase();
      const priority = String(row.priority || '').trim().toLowerCase();
      if (status === 'new') counts.new += 1;
      if (status === 'follow-up') counts.followUp += 1;
      if (status === 'converted') counts.converted += 1;
      if (priority === 'high' || priority === 'urgent') counts.highPriority += 1;
    });
    return counts;
  }, [rows]);

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Lead intake</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Contact Forms</h1>
          <p className="mt-2 text-base text-slate-600">Review inbound submissions, assign ownership, and move leads through contact workflow states.</p>
        </div>

        <div className="admin-kpi-grid lg:justify-self-end">
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.total}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.new}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Follow-up</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.followUp}</p>
          </article>
          <article className="admin-kpi-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">High Priority</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.highPriority}</p>
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
            <p className="text-sm text-slate-500">Search and segment contact submissions by status and inquiry type.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-6">
          <input
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            placeholder="Search request, email, org"
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
            <option value="new">New</option>
            <option value="called">Called</option>
            <option value="follow-up">Follow-up</option>
            <option value="converted">Converted</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="admin-focus rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm"
            value={inquiryTypeInput}
            onChange={(event) => setInquiryTypeInput(event.target.value)}
          >
            <option value="all">All inquiry types</option>
            <option value="sales">Sales</option>
            <option value="demo-request">Demo request</option>
            <option value="pricing">Pricing</option>
            <option value="application-setup">Application setup</option>
            <option value="partnership">Partnership</option>
            <option value="other">Other</option>
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
            href="/support/tickets"
            className="admin-focus inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Support tickets
          </Link>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}
      {success ? <p className="admin-alert border-emerald-200 bg-emerald-50 text-emerald-700">{success}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Contact submission records</h2>
        </div>

        {loading ? (
          <AdminInlineTableSkeleton rows={8} />
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No contact requests found.</p>
        ) : (
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Request</th>
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-5 py-3">Inquiry</th>
                  <th className="px-5 py-3">Message</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.requestId} className="border-t border-slate-200 transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{row.requestId}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(row.createdAt)}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-800">{row.name || '-'}</div>
                      <div className="text-xs text-slate-500">{row.email || '-'}</div>
                      <div className="text-xs text-slate-500">{row.phone || '-'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-700">{row.inquiryType || '-'}</div>
                      <div className="text-xs text-slate-500">{row.organization || '-'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="max-w-[440px] truncate text-slate-700" title={row.message || ''}>{row.message || '-'}</p>
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
                      <div className="mt-1 text-xs text-slate-500">Owner: {row.assignedTo || '-'}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{formatDateTime(row.updatedAt || row.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={updatingId === row.requestId || String(row.status || '').toLowerCase() === 'called'}
                          onClick={() => void moveStatus(row.requestId, 'called')}
                          className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark called
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row.requestId}
                          onClick={() => void assignRequest(row.requestId)}
                          className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Assign
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row.requestId}
                          onClick={() => void addNote(row.requestId)}
                          className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Add note
                        </button>
                        <button
                          type="button"
                          disabled={
                            updatingId === row.requestId ||
                            ['follow-up', 'converted', 'closed'].includes(String(row.status || '').toLowerCase())
                          }
                          onClick={() => void moveStatus(row.requestId, 'follow-up')}
                          className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Follow-up
                        </button>
                        <button
                          type="button"
                          disabled={
                            updatingId === row.requestId ||
                            ['converted', 'closed'].includes(String(row.status || '').toLowerCase())
                          }
                          onClick={() => void moveStatus(row.requestId, 'converted')}
                          className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Convert
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row.requestId || String(row.status || '').toLowerCase() === 'closed'}
                          onClick={() => void moveStatus(row.requestId, 'closed')}
                          className="admin-focus rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
