'use client';

import { useEffect, useState } from 'react';
import { AdminIcon } from '@/components/admin/AdminIcons';

type SettingsPayload = {
  support: {
    defaultAssignee: string;
    slaHours: number;
  };
  billing: {
    refundApprovalThreshold: number;
    autoReconcile: boolean;
  };
  security: {
    enforceMfa: boolean;
    sessionTimeoutMinutes: number;
  };
  features: {
    enableContactAutoAssign: boolean;
    enableRefundQueueAlerts: boolean;
  };
  notifications: {
    retentionDays: number;
  };
};

const EMPTY_FORM: SettingsPayload = {
  support: { defaultAssignee: '', slaHours: 24 },
  billing: { refundApprovalThreshold: 5000, autoReconcile: true },
  security: { enforceMfa: true, sessionTimeoutMinutes: 60 },
  features: {
    enableContactAutoAssign: false,
    enableRefundQueueAlerts: true,
  },
  notifications: {
    retentionDays: 14,
  },
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsPayload>(EMPTY_FORM);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/settings');
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load settings');
      }
      setForm({
        support: {
          defaultAssignee: payload.data?.support?.defaultAssignee || '',
          slaHours: Number(payload.data?.support?.slaHours ?? 24),
        },
        billing: {
          refundApprovalThreshold: Number(payload.data?.billing?.refundApprovalThreshold ?? 5000),
          autoReconcile:
            typeof payload.data?.billing?.autoReconcile === 'boolean'
              ? payload.data.billing.autoReconcile
              : true,
        },
        security: {
          enforceMfa:
            typeof payload.data?.security?.enforceMfa === 'boolean' ? payload.data.security.enforceMfa : true,
          sessionTimeoutMinutes: Number(payload.data?.security?.sessionTimeoutMinutes ?? 60),
        },
        features: {
          enableContactAutoAssign:
            typeof payload.data?.features?.enableContactAutoAssign === 'boolean'
              ? payload.data.features.enableContactAutoAssign
              : false,
          enableRefundQueueAlerts:
            typeof payload.data?.features?.enableRefundQueueAlerts === 'boolean'
              ? payload.data.features.enableRefundQueueAlerts
              : true,
        },
        notifications: {
          retentionDays: Number(payload.data?.notifications?.retentionDays ?? 14),
        },
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load settings');
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
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          reason,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to save settings');
      }

      setSuccess('Settings updated successfully.');
      setReason('');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6 p-6 sm:p-8">
      <header className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div>
          <span className="admin-chip">Platform settings</span>
          <h1 className="admin-title mt-4">Settings</h1>
          <p className="admin-subtitle">Configure support SLAs, security policy, billing controls, and feature toggles.</p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Notification retention</p>
          <p className="mt-2 font-display text-xl font-semibold text-slate-950">{form.notifications.retentionDays} days</p>
        </div>
      </header>

      {error ? <p className="admin-alert border-red-200 bg-red-50 text-red-700">{error}</p> : null}
      {success ? <p className="admin-alert border-emerald-200 bg-emerald-50 text-emerald-700">{success}</p> : null}

      {loading ? (
        <p className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500 shadow-sm">Loading settings...</p>
      ) : (
        <form className="space-y-6" onSubmit={save}>
          <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><AdminIcon name="support" /></span>
              <h2 className="font-display text-xl font-semibold text-slate-950">Support Ops</h2>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Default Assignee</span>
                <input
                  className="admin-focus w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
                  value={form.support.defaultAssignee}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      support: {
                        ...prev.support,
                        defaultAssignee: event.target.value,
                      },
                    }))
                  }
                  placeholder="support.lead@loanpro.tech"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">SLA Hours</span>
                <input
                  className="admin-focus w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
                  type="number"
                  min={1}
                  max={168}
                  value={form.support.slaHours}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      support: {
                        ...prev.support,
                        slaHours: Number(event.target.value || 24),
                      },
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><AdminIcon name="payments" /></span>
              <h2 className="font-display text-xl font-semibold text-slate-950">Billing Controls</h2>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Refund Approval Threshold (INR)</span>
                <input
                  className="admin-focus w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
                  type="number"
                  min={0}
                  value={form.billing.refundApprovalThreshold}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      billing: {
                        ...prev.billing,
                        refundApprovalThreshold: Number(event.target.value || 0),
                      },
                    }))
                  }
                />
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.billing.autoReconcile}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      billing: {
                        ...prev.billing,
                        autoReconcile: event.target.checked,
                      },
                    }))
                  }
                />
                Enable automatic daily reconciliation
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-slate-950">Security Policy</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.security.enforceMfa}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        enforceMfa: event.target.checked,
                      },
                    }))
                  }
                />
                Enforce MFA for all admin users
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Session Timeout (minutes)</span>
                <input
                  className="admin-focus w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
                  type="number"
                  min={5}
                  max={1440}
                  value={form.security.sessionTimeoutMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        sessionTimeoutMinutes: Number(event.target.value || 60),
                      },
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-slate-950">Feature Flags</h2>
            <div className="mt-4 grid gap-3">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.features.enableContactAutoAssign}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      features: {
                        ...prev.features,
                        enableContactAutoAssign: event.target.checked,
                      },
                    }))
                  }
                />
                Enable auto-assignment for contact requests
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.features.enableRefundQueueAlerts}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      features: {
                        ...prev.features,
                        enableRefundQueueAlerts: event.target.checked,
                      },
                    }))
                  }
                />
                Enable refund queue alerts
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-slate-950">Notifications</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Retention Days</span>
                <input
                  className="admin-focus w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
                  type="number"
                  min={1}
                  max={365}
                  value={form.notifications.retentionDays}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        retentionDays: Number(event.target.value || 14),
                      },
                    }))
                  }
                />
              </label>
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Notifications older than this value will be auto-cleaned from MongoDB using TTL behavior.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason for Change</span>
              <input
                className="admin-focus w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-brand-200"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={3}
                required
                placeholder="Explain why these settings were changed"
              />
            </label>
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="admin-focus rounded-2xl bg-gradient-to-r from-brand-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={() => void load()}
                disabled={saving}
                className="admin-focus rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>
            </div>
          </section>
        </form>
      )}
    </main>
  );
}