'use client';

import { useEffect, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

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
};

export default function ContactRequestsPage() {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [inquiryType, setInquiryType] = useState('all');

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

      setRows(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch contact requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="space-y-6 p-6 sm:p-8">
      <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <span className="admin-chip">Lead intake</span>
          <h1 className="admin-title mt-4">Contact Forms</h1>
          <p className="admin-subtitle">Read and search inbound contact submissions.</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Loaded requests</p>
          <p className="mt-2 font-display text-xl font-semibold text-slate-950">{rows.length}</p>
        </div>
      </header>

      <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><AdminIcon name="support" /></span>
          <h2 className="font-display text-xl font-semibold text-slate-950">Filters</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
            placeholder="Search request, email, org"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
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
            className="admin-focus rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
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
            className="admin-focus rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5"
            type="button"
            onClick={() => void load()}
          >
            Search
          </button>
        </div>
      </section>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/85 shadow-sm">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Contact submission records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading contact requests...</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No contact requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table min-w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Request</th>
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-5 py-3">Inquiry</th>
                  <th className="px-5 py-3">Message</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.requestId} className="border-t border-slate-200/80 transition hover:bg-slate-50/80">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{row.requestId}</div>
                      <div className="text-xs text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}</div>
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
                    <td className="px-5 py-3 text-slate-700">{row.message || '-'}</td>
                    <td className="px-5 py-3">
                      <div className="text-slate-700">{row.status || '-'}</div>
                      <div className="text-xs text-slate-500">{row.priority || '-'}</div>
                      <div className="text-xs text-slate-500">Owner: {row.assignedTo || '-'}</div>
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
