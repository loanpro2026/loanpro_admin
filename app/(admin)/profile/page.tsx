'use client';

import { useEffect, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

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
    <main className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <span className="admin-chip">Account center</span>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Profile</h1>
          <p className="mt-2 text-base text-slate-600">Manage your admin identity, preferences, and notification settings.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:justify-self-end">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{profile?.role || 'Admin'}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">MFA</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{profile?.mfaEnforced ? 'On' : 'Off'}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notifications</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{emailNotificationsEnabled ? 'On' : 'Off'}</p>
          </article>
        </div>
      </header>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}
      {success ? <p className="admin-alert border-emerald-200 bg-emerald-50 text-emerald-700">{success}</p> : null}

      {loading ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">Loading profile...</p>
      ) : profile ? (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-xl font-semibold text-slate-700">
                {String(profile.displayName || profile.email)
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() || '')
                  .join('') || 'A'}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Admin profile</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{profile.displayName}</h2>
                <p className="mt-1 text-sm text-slate-600">{profile.email}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                ['Role', profile.role],
                ['MFA', profile.mfaEnforced ? 'Enforced' : 'Optional'],
                ['Timezone', timezone],
                ['Email alerts', emailNotificationsEnabled ? 'Enabled' : 'Disabled'],
              ].map(([label, value]) => (
                <article key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Activity</p>
              <p className="mt-2">Last login: {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Not available'}</p>
              <p className="mt-1">Account created: {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : 'Not available'}</p>
            </div>
          </section>

          <section className="space-y-5">
            <form className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" onSubmit={save}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <AdminIcon name="profile" size={18} />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Preferences</h2>
                  <p className="text-sm text-slate-500">Personalize how you work inside the admin panel.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Display Name</span>
                  <input
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timezone</span>
                  <input
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    required
                    placeholder="Asia/Kolkata"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notification Email</span>
                  <input
                    className="admin-focus w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm"
                    type="email"
                    value={notificationEmail}
                    onChange={(event) => setNotificationEmail(event.target.value)}
                    required
                  />
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 md:col-span-2">
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
                  className="admin-focus inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={saving}
                  className="admin-focus rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </form>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Account Activity</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Last login', profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Not available'],
                  ['Account created', profile.createdAt ? new Date(profile.createdAt).toLocaleString() : 'Not available'],
                ].map(([label, value]) => (
                  <article key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                    <p className="mt-2 text-sm text-slate-700">{value}</p>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      ) : (
        <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">Profile data not available.</p>
      )}
    </main>
  );
}