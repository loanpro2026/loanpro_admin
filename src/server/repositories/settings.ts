import { getAdminDb } from '@/lib/db/mongo';

export type AdminSettingsDocument = {
  key: 'global';
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
  updatedAt: Date;
  updatedBy: string;
};

type SettingsPatch = {
  support?: Partial<AdminSettingsDocument['support']>;
  billing?: Partial<AdminSettingsDocument['billing']>;
  security?: Partial<AdminSettingsDocument['security']>;
  features?: Partial<AdminSettingsDocument['features']>;
};

const DEFAULT_SETTINGS: Omit<AdminSettingsDocument, 'updatedAt' | 'updatedBy'> = {
  key: 'global',
  support: {
    defaultAssignee: '',
    slaHours: 24,
  },
  billing: {
    refundApprovalThreshold: 5000,
    autoReconcile: true,
  },
  security: {
    enforceMfa: true,
    sessionTimeoutMinutes: 60,
  },
  features: {
    enableContactAutoAssign: false,
    enableRefundQueueAlerts: true,
    enableReleaseReadinessChecks: true,
  },
};

function normalizeSettings(doc: Partial<AdminSettingsDocument> | null): AdminSettingsDocument {
  const now = new Date();
  return {
    key: 'global',
    support: {
      defaultAssignee: String(doc?.support?.defaultAssignee ?? DEFAULT_SETTINGS.support.defaultAssignee),
      slaHours: Number(doc?.support?.slaHours ?? DEFAULT_SETTINGS.support.slaHours),
    },
    billing: {
      refundApprovalThreshold: Number(
        doc?.billing?.refundApprovalThreshold ?? DEFAULT_SETTINGS.billing.refundApprovalThreshold
      ),
      autoReconcile:
        typeof doc?.billing?.autoReconcile === 'boolean'
          ? doc.billing.autoReconcile
          : DEFAULT_SETTINGS.billing.autoReconcile,
    },
    security: {
      enforceMfa:
        typeof doc?.security?.enforceMfa === 'boolean'
          ? doc.security.enforceMfa
          : DEFAULT_SETTINGS.security.enforceMfa,
      sessionTimeoutMinutes: Number(doc?.security?.sessionTimeoutMinutes ?? DEFAULT_SETTINGS.security.sessionTimeoutMinutes),
    },
    features: {
      enableContactAutoAssign:
        typeof doc?.features?.enableContactAutoAssign === 'boolean'
          ? doc.features.enableContactAutoAssign
          : DEFAULT_SETTINGS.features.enableContactAutoAssign,
      enableRefundQueueAlerts:
        typeof doc?.features?.enableRefundQueueAlerts === 'boolean'
          ? doc.features.enableRefundQueueAlerts
          : DEFAULT_SETTINGS.features.enableRefundQueueAlerts,
      enableReleaseReadinessChecks:
        typeof doc?.features?.enableReleaseReadinessChecks === 'boolean'
          ? doc.features.enableReleaseReadinessChecks
          : DEFAULT_SETTINGS.features.enableReleaseReadinessChecks,
    },
    updatedAt: doc?.updatedAt instanceof Date ? doc.updatedAt : now,
    updatedBy: String(doc?.updatedBy ?? 'system'),
  };
}

export async function getAdminSettings() {
  const db = await getAdminDb();
  const existing = await db.collection<AdminSettingsDocument>('admin_settings').findOne({ key: 'global' });
  return normalizeSettings(existing);
}

export async function updateAdminSettings(patch: SettingsPatch, actorEmail: string) {
  const db = await getAdminDb();
  const before = await getAdminSettings();

  const next = normalizeSettings({
    ...before,
    support: {
      ...before.support,
      ...(patch.support || {}),
    },
    billing: {
      ...before.billing,
      ...(patch.billing || {}),
    },
    security: {
      ...before.security,
      ...(patch.security || {}),
    },
    features: {
      ...before.features,
      ...(patch.features || {}),
    },
    updatedAt: new Date(),
    updatedBy: actorEmail,
  });

  await db.collection<AdminSettingsDocument>('admin_settings').updateOne(
    { key: 'global' },
    {
      $set: next,
      $setOnInsert: {
        key: 'global',
      },
    },
    { upsert: true }
  );

  return { before, after: next };
}