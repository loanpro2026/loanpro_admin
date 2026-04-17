'use client';

import { AdminIcon } from '@/components/admin/AdminIcons';

type ReleaseTrack = {
  id: string;
  title: string;
  stage: 'planned' | 'in-progress' | 'ready';
  target: string;
  owner: string;
  summary: string;
  checklist: string[];
};

const TRACKS: ReleaseTrack[] = [
  {
    id: 'r-ops-001',
    title: 'Admin UX consistency rollout',
    stage: 'in-progress',
    target: 'Q2 2026',
    owner: 'Admin Platform',
    summary: 'Finalize visual consistency and dense operations workflows across all admin modules.',
    checklist: ['Page consistency pass', 'Navigation state QA', 'Cross-browser smoke test'],
  },
  {
    id: 'r-ops-002',
    title: 'Support automation controls',
    stage: 'planned',
    target: 'Q2 2026',
    owner: 'Support Systems',
    summary: 'Introduce configurable automation rules for ticket routing and contact triage.',
    checklist: ['Routing policy schema', 'Admin override actions', 'Alerting thresholds'],
  },
  {
    id: 'r-ops-003',
    title: 'Finance reconciliation hardening',
    stage: 'ready',
    target: 'Q2 2026',
    owner: 'Finance Ops',
    summary: 'Stabilize reconciliation checkpoints and improve failure diagnostics for refund lifecycle.',
    checklist: ['Retry visibility panel', 'Audit completeness check', 'Export parity verification'],
  },
];

function stageTone(stage: ReleaseTrack['stage']) {
  if (stage === 'ready') return 'bg-emerald-100 text-emerald-700';
  if (stage === 'in-progress') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default function ReleasesPage() {
  const summary = {
    total: TRACKS.length,
    planned: TRACKS.filter((track) => track.stage === 'planned').length,
    inProgress: TRACKS.filter((track) => track.stage === 'in-progress').length,
    ready: TRACKS.filter((track) => track.stage === 'ready').length,
  };

  return (
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Release management</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Releases</h1>
          <p className="mt-2 text-base text-slate-600">
            Centralize release readiness, owners, and delivery checkpoints for admin-facing operations.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 lg:justify-self-end">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.total}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planned</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.planned}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">In progress</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.inProgress}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ready</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.ready}</p>
          </article>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <AdminIcon name="spark" size={18} />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Release tracks</h2>
            <p className="text-sm text-slate-500">Current roadmap tracks and execution checkpoints.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {TRACKS.map((track) => (
            <article key={track.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">{track.title}</h3>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${stageTone(track.stage)}`}>
                  {track.stage.replace('-', ' ')}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-600">{track.summary}</p>

              <div className="mt-4 grid gap-2 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">Target:</span> {track.target}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Owner:</span> {track.owner}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {track.checklist.map((item) => (
                  <p key={item} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                    {item}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Notes</h2>
        <p className="mt-3 text-sm text-slate-600">
          This page provides release planning visibility. API-backed release lifecycle actions can be enabled once release endpoints are finalized.
        </p>
      </section>
    </main>
  );
}
