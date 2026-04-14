import { getAdminDb } from '@/lib/db/mongo';
import type { AdminUserDocument } from '@/types/admin';

export type AdminProfileRecord = {
  clerkUserId: string;
  email: string;
  displayName: string;
  role: AdminUserDocument['role'];
  mfaEnforced: boolean;
  timezone?: string;
  notificationEmail?: string;
  emailNotificationsEnabled: boolean;
  status: AdminUserDocument['status'];
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
};

function normalizeProfile(doc: Partial<AdminProfileRecord> | null, fallback: { clerkUserId: string; email: string }): AdminProfileRecord {
  return {
    clerkUserId: fallback.clerkUserId,
    email: String(doc?.email || fallback.email).trim().toLowerCase(),
    displayName: String(doc?.displayName || fallback.email || fallback.clerkUserId),
    role: (doc?.role || 'viewer') as AdminUserDocument['role'],
    mfaEnforced: typeof doc?.mfaEnforced === 'boolean' ? doc.mfaEnforced : true,
    timezone: doc?.timezone ? String(doc.timezone) : 'Asia/Kolkata',
    notificationEmail: doc?.notificationEmail ? String(doc.notificationEmail).trim().toLowerCase() : fallback.email,
    emailNotificationsEnabled:
      typeof doc?.emailNotificationsEnabled === 'boolean' ? doc.emailNotificationsEnabled : true,
    status: (doc?.status || 'active') as AdminUserDocument['status'],
    createdAt: doc?.createdAt,
    updatedAt: doc?.updatedAt,
    lastLoginAt: doc?.lastLoginAt,
  };
}

export async function getAdminProfileByClerkUserId(clerkUserId: string, email: string) {
  const db = await getAdminDb();
  const row = await db.collection('admin_users').findOne({ clerkUserId });
  return normalizeProfile((row || null) as Partial<AdminProfileRecord> | null, {
    clerkUserId,
    email,
  });
}

export async function updateAdminProfileByClerkUserId(
  clerkUserId: string,
  patch: {
    displayName?: string;
    timezone?: string;
    notificationEmail?: string;
    emailNotificationsEnabled?: boolean;
  }
) {
  const db = await getAdminDb();
  const beforeDoc = await db.collection('admin_users').findOne({ clerkUserId });
  if (!beforeDoc) {
    return null;
  }

  const setPatch: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (typeof patch.displayName === 'string') {
    setPatch.displayName = patch.displayName;
  }
  if (typeof patch.timezone === 'string') {
    setPatch.timezone = patch.timezone;
  }
  if (typeof patch.notificationEmail === 'string') {
    setPatch.notificationEmail = patch.notificationEmail;
  }
  if (typeof patch.emailNotificationsEnabled === 'boolean') {
    setPatch.emailNotificationsEnabled = patch.emailNotificationsEnabled;
  }

  const afterDoc = await db.collection('admin_users').findOneAndUpdate(
    { clerkUserId },
    {
      $set: setPatch,
    },
    { returnDocument: 'after' }
  );

  return {
    before: beforeDoc,
    after: afterDoc,
  };
}