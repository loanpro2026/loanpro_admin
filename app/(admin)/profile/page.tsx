'use client';

import { useEffect, useState } from 'react';

type ProfilePayload = {
  clerkUserId: string;
  email: string;
  displayName: string;
  role: string;
  mfaEnforced: boolean;
  timezone?: string;
  notificationEmail?: string;
  emailNotificationsEnabled: boolean;
  lastLoginAt?: string;
  createdAt?: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/profile');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load profile');
      }

      const next = payload.data as ProfilePayload;
      setProfile(next);
      setDisplayName(next.displayName || '');
      setTimezone(next.timezone || 'Asia/Kolkata');
      setNotificationEmail(next.notificationEmail || next.email || '');
      setEmailNotificationsEnabled(Boolean(next.emailNotificationsEnabled));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          timezone,
          notificationEmail,
          emailNotificationsEnabled,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to save profile');
      }

      setSuccess('Profile updated successfully.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
        <p className="mt-2 text-slate-600">Manage your admin identity and notification preferences.</p>
      </header>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">Loading profile...</p>
      ) : profile ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{profile.email}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{profile.role}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">MFA Policy</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{profile.mfaEnforced ? 'Enforced' : 'Optional'}</p>
            </article>
          </section>

          <form className="space-y-5 rounded-xl border border-slate-200 bg-white p-5" onSubmit={save}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Preferences</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Display Name</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timezone</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  required
                  placeholder="Asia/Kolkata"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notification Email</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  type="email"
                  value={notificationEmail}
                  onChange={(event) => setNotificationEmail(event.target.value)}
                  required
                />
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={emailNotificationsEnabled}
                  onChange={(event) => setEmailNotificationsEnabled(event.target.checked)}
                />
                Receive admin operational notifications by email
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
              <button
                type="button"
                onClick={() => void load()}
                disabled={saving}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>
            </div>
          </form>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Account Activity</h2>
            <p className="mt-2 text-sm text-slate-700">Last login: {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Not available'}</p>
            <p className="mt-1 text-sm text-slate-700">Account created: {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : 'Not available'}</p>
          </section>
        </>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">Profile data not available.</p>
      )}
    </main>
  );
}