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
      <header className="grid gap-4 lg:grid-cols-1 lg:items-start xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
        <div className="max-w-3xl">
        <span className="admin-chip">Account center</span>
        <h1 className="admin-title mt-4">Profile</h1>
        <p className="admin-subtitle">Manage your admin identity, preferences, and notification settings.</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white/88 p-4 shadow-sm lg:justify-self-end">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Role</p>
          <p className="mt-2 font-display text-xl font-semibold text-slate-950">{profile?.role || 'Admin'}</p>
        </div>
      </header>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}
      {success ? <p className="admin-alert border-emerald-200 bg-emerald-50 text-emerald-700">{success}</p> : null}

      {loading ? (
        <p className="rounded-[28px] border border-slate-200 bg-white/88 px-5 py-4 text-sm text-slate-500 shadow-sm">Loading profile...</p>
      ) : profile ? (
        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-center gap-4">
              <div className="flex h-18 w-18 items-center justify-center rounded-[28px] bg-white/10 text-2xl font-semibold backdrop-blur">
                {String(profile.displayName || profile.email)
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() || '')
                  .join('') || 'A'}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">Admin profile</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{profile.displayName}</h2>
                <p className="mt-1 text-sm text-white/70">{profile.email}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                ['Role', profile.role],
                ['MFA', profile.mfaEnforced ? 'Enforced' : 'Optional'],
                ['Timezone', timezone],
                ['Email alerts', emailNotificationsEnabled ? 'Enabled' : 'Disabled'],
              ].map(([label, value]) => (
                <article key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{label}</p>
                  <p className="mt-2 font-display text-lg font-semibold">{value}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-white/80">
              <p className="font-semibold text-white">Activity</p>
              <p className="mt-2">Last login: {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Not available'}</p>
              <p className="mt-1">Account created: {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : 'Not available'}</p>
            </div>
          </section>

          <section className="space-y-5">
            <form className="space-y-5 rounded-[28px] border border-slate-200 bg-white/88 p-6 shadow-sm" onSubmit={save}>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <AdminIcon name="profile" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-950">Preferences</h2>
                  <p className="text-sm text-slate-500">Personalize how you work inside the admin panel.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Display Name</span>
                  <input
                    className="admin-focus w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-brand-200 focus:border-brand-400"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timezone</span>
                  <input
                    className="admin-focus w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-brand-200 focus:border-brand-400"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    required
                    placeholder="Asia/Kolkata"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notification Email</span>
                  <input
                    className="admin-focus w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-brand-200 focus:border-brand-400"
                    type="email"
                    value={notificationEmail}
                    onChange={(event) => setNotificationEmail(event.target.value)}
                    required
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
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
                  className="admin-focus inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={saving}
                  className="admin-focus rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>
              </div>
            </form>

            <section className="rounded-[28px] border border-slate-200 bg-white/88 p-6 shadow-sm">
              <h2 className="font-display text-xl font-semibold text-slate-950">Account Activity</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Last login', profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Not available'],
                  ['Account created', profile.createdAt ? new Date(profile.createdAt).toLocaleString() : 'Not available'],
                ].map(([label, value]) => (
                  <article key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                    <p className="mt-2 text-sm text-slate-700">{value}</p>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </div>
      ) : (
        <p className="admin-surface px-5 py-4 text-sm text-slate-500">Profile data not available.</p>
      )}
    </main>
  );
}