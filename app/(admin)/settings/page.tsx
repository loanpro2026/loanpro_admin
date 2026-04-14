'use client';

import { useEffect, useState } from 'react';

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
    enableReleaseReadinessChecks: boolean;
  };
};

const EMPTY_FORM: SettingsPayload = {
  support: { defaultAssignee: '', slaHours: 24 },
  billing: { refundApprovalThreshold: 5000, autoReconcile: true },
  security: { enforceMfa: true, sessionTimeoutMinutes: 60 },
  features: {
    enableContactAutoAssign: false,
    enableRefundQueueAlerts: true,
    enableReleaseReadinessChecks: true,
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
          enableReleaseReadinessChecks:
            typeof payload.data?.features?.enableReleaseReadinessChecks === 'boolean'
              ? payload.data.features.enableReleaseReadinessChecks
              : true,
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
    <main className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-2 text-slate-600">Configure support SLAs, security policy, billing controls, and feature toggles.</p>
      </header>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">Loading settings...</p>
      ) : (
        <form className="space-y-6" onSubmit={save}>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Support Ops</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Default Assignee</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Billing Controls</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Refund Approval Threshold (INR)</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Security Policy</h2>
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
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Feature Flags</h2>
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
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.features.enableReleaseReadinessChecks}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      features: {
                        ...prev.features,
                        enableReleaseReadinessChecks: event.target.checked,
                      },
                    }))
                  }
                />
                Enable release readiness checks
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason for Change</span>
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Settings'}
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
          </section>
        </form>
      )}
    </main>
  );
}