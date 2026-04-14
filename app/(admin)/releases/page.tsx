'use client';

import { useEffect, useState } from 'react';

type ReleaseRow = {
  _id: string;
  version: string;
  title: string;
  channel: string;
  status: string;
  rolloutPercent?: number;
  source?: string;
  publishedAt?: string;
  updatedAt?: string;
};

type GitHubRelease = {
  id: number;
  tagName: string;
  name: string;
  prerelease: boolean;
  draft: boolean;
  publishedAt: string;
  htmlUrl: string;
};

type ReleasesPayload = {
  releases: ReleaseRow[];
  github: {
    configured: boolean;
    owner?: string;
    repo?: string;
    items: GitHubRelease[];
    error?: string;
  };
};

export default function ReleasesPage() {
  const [data, setData] = useState<ReleasesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [newRelease, setNewRelease] = useState({
    version: '',
    title: '',
    channel: 'beta',
    rolloutPercent: 10,
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100', status, channel });
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const response = await fetch(`/api/releases?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to fetch releases');
      }

      setData(payload.data || { releases: [], github: { configured: false, items: [] } });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch releases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status, channel]);

  const createDraft = async () => {
    const reason = window.prompt('Reason for creating this release draft:', '') || '';
    if (!reason.trim()) {
      setError('A reason is required for release creation');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRelease,
          reason: reason.trim(),
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create release draft');
      }

      setNewRelease({
        version: '',
        title: '',
        channel: 'beta',
        rolloutPercent: 10,
        notes: '',
      });
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create release draft');
    } finally {
      setSaving(false);
    }
  };

  const patchRelease = async (releaseId: string, action: 'publish' | 'promote' | 'rollback') => {
    const reason = window.prompt(`Reason for ${action} action:`, '') || '';
    if (!reason.trim()) {
      setError('A reason is required for release action');
      return;
    }

    let targetChannel: 'stable' | 'beta' | 'alpha' | 'hotfix' | undefined;
    if (action === 'promote') {
      const selected = (window.prompt('Target channel (stable/beta/alpha/hotfix):', 'stable') || '').trim().toLowerCase();
      if (!selected) {
        setError('A target channel is required for promote action');
        return;
      }

      if (selected !== 'stable' && selected !== 'beta' && selected !== 'alpha' && selected !== 'hotfix') {
        setError('Invalid target channel. Use one of: stable, beta, alpha, hotfix');
        return;
      }

      targetChannel = selected;
    }

    setUpdatingId(releaseId);
    setError('');

    try {
      const response = await fetch(`/api/releases/${encodeURIComponent(releaseId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: reason.trim(),
          targetChannel,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || `Failed to ${action} release`);
      }

      await load();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : `Failed to ${action} release`);
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <main className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Releases</h1>
        <p className="mt-2 text-slate-600">Manage desktop release drafts, publish promotions, rollback controls, and GitHub release visibility.</p>
      </header>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Create draft</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Version (e.g., v2.3.1)"
            value={newRelease.version}
            onChange={(event) => setNewRelease((prev) => ({ ...prev, version: event.target.value }))}
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Release title"
            value={newRelease.title}
            onChange={(event) => setNewRelease((prev) => ({ ...prev, title: event.target.value }))}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={newRelease.channel}
            onChange={(event) => setNewRelease((prev) => ({ ...prev, channel: event.target.value }))}
          >
            <option value="stable">stable</option>
            <option value="beta">beta</option>
            <option value="alpha">alpha</option>
            <option value="hotfix">hotfix</option>
          </select>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="number"
            min={1}
            max={100}
            value={newRelease.rolloutPercent}
            onChange={(event) => setNewRelease((prev) => ({ ...prev, rolloutPercent: Number(event.target.value) || 10 }))}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void createDraft()}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Create Draft'}
          </button>
        </div>
        <textarea
          className="mt-3 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Release notes"
          value={newRelease.notes}
          onChange={(event) => setNewRelease((prev) => ({ ...prev, notes: event.target.value }))}
        />
      </section>

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Filters</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search by version/title/notes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="promoted">promoted</option>
            <option value="rolled_back">rolled_back</option>
          </select>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={channel} onChange={(event) => setChannel(event.target.value)}>
            <option value="all">All channels</option>
            <option value="stable">stable</option>
            <option value="beta">beta</option>
            <option value="alpha">alpha</option>
            <option value="hotfix">hotfix</option>
          </select>
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
      </section>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <section className="rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Release records</h2>
        </div>

        {loading ? (
          <p className="px-5 py-4 text-sm text-slate-500">Loading releases...</p>
        ) : !data || data.releases.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">No releases found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3">Version</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Rollout</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.releases.map((row) => (
                  <tr key={row._id} className="border-t border-slate-200">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-800">{row.version}</div>
                      <div className="text-xs text-slate-500">{row.title}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{row.channel}</td>
                    <td className="px-5 py-3 text-slate-700">{row.status}</td>
                    <td className="px-5 py-3 text-slate-700">{Number(row.rolloutPercent || 0)}%</td>
                    <td className="px-5 py-3 text-slate-700">{row.source || '-'}</td>
                    <td className="px-5 py-3 text-slate-500">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '-'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={updatingId === row._id || row.status !== 'draft'}
                          onClick={() => void patchRelease(row._id, 'publish')}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Publish
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row._id || row.status !== 'published'}
                          onClick={() => void patchRelease(row._id, 'promote')}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Promote
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === row._id || (row.status !== 'published' && row.status !== 'promoted')}
                          onClick={() => void patchRelease(row._id, 'rollback')}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Rollback
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

      <section className="rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">GitHub release feed</h2>
        {!data ? null : (
          <>
            <p className="mt-2 text-sm text-slate-600">
              {data.github.configured
                ? `Connected to ${data.github.owner}/${data.github.repo}`
                : 'GitHub release integration is not configured.'}
            </p>
            {data.github.error ? <p className="mt-2 text-sm text-amber-700">{data.github.error}</p> : null}
            <div className="mt-4 space-y-2">
              {data.github.items.length === 0 ? (
                <p className="text-sm text-slate-500">No GitHub releases available.</p>
              ) : (
                data.github.items.slice(0, 8).map((item) => (
                  <a
                    key={item.id}
                    href={item.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span className="font-medium">{item.tagName}</span> - {item.name}
                  </a>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}