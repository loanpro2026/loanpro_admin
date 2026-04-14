'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type ContactRow = {
  _id?: string;
  requestId: string;
  name?: string;
  email?: string;
  organization?: string;
  inquiryType?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  createdAt?: string;
};

export default function ContactRequestsPage() {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [inquiryType, setInquiryType] = useState('all');
  const [updatingId, setUpdatingId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100', status, inquiryType });
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/support/contact-requests?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch contact requests');
      }

      setRows(payload.data || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch contact requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const patchRequest = async (requestId: string, body: Record<string, unknown>) => {
    setUpdatingId(requestId);
    setError('');
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
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update contact request');
    } finally {
      setUpdatingId('');
    }
  };

  const assignLead = async (requestId: string) => {
    const assignee = window.prompt('Assign lead to:', '') || '';
    if (!assignee.trim()) return;
    await patchRequest(requestId, {
      assignedTo: assignee.trim(),
      reason: 'Assigned from admin panel',
    });
  };

  return (
    <main className="space-y-6 p-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Contact Requests</h1>
          <p className="mt-2 text-slate-600">Track inbound leads, ownership, and follow-up lifecycle.</p>
        </div>
        <Link
          href="/support/tickets"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View Support Tickets
        </Link>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Filters</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search request, email, org"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="called">Called</option>
            <option value="follow-up">Follow-up</option>
            <option value="converted">Converted</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={inquiryType}
            onChange={(event) => setInquiryType(event.target.value)}
          >
            <option value="all">All inquiry types</option>
            <option value="sales">Sales</option>
            <option value="demo-request">Demo request</option>
            <option value="pricing">Pricing</option>
            <option value="application-setup">Application setup</option>
            <option value="partnership">Partnership</option>
            <option value="other">Other</option>
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
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Lead queue</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading contact requests...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No contact requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Request</th>
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-5 py-3">Inquiry</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.requestId} className="border-t border-slate-200">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{row.requestId}</div>
                      <div className="text-xs text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-800">{row.name || '-'}</div>
                      <div className="text-xs text-slate-500">{row.email || '-'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-700">{row.inquiryType || '-'}</div>
                      <div className="text-xs text-slate-500">{row.organization || '-'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-slate-700">{row.status || '-'}</div>
                      <div className="text-xs text-slate-500">{row.priority || '-'}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={updatingId === row.requestId}
                          onClick={() => void assignLead(row.requestId)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Assign
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row.requestId || row.status === 'called'}
                          onClick={() =>
                            void patchRequest(row.requestId, {
                              status: 'called',
                              note: 'Marked called from admin panel',
                              reason: 'Lead contacted',
                            })
                          }
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark Called
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row.requestId || row.status === 'closed'}
                          onClick={() =>
                            void patchRequest(row.requestId, {
                              status: 'closed',
                              note: 'Closed from admin panel',
                              reason: 'Lead lifecycle completed',
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