import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminDb } from '@/lib/db/mongo';
import { getEnv } from '@/config/env';
import { ROLE_PERMISSIONS } from '@/lib/rbac/permissions';
import type { AdminUserDocument } from '@/types/admin';
import type { Permission, RoleKey } from '@/types/rbac';

export type AdminSession = {
  adminUserId: string;
  clerkUserId: string;
  email: string;
  role: RoleKey;
  permissions: Permission[];
};

function isRoleKey(value: string): value is RoleKey {
  return value in ROLE_PERMISSIONS;
}

function getPrimaryEmailFromClerkUser(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) return '';
  const primary = user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId);
  return String(primary?.emailAddress || '').trim().toLowerCase();
}

async function maybeBootstrapAdmin(clerkUserId: string, email: string, displayName: string) {
  const env = getEnv();
  const bootstrapUserId = String(env.ADMIN_BOOTSTRAP_CLERK_USER_ID || '').trim();
  const bootstrapEmail = String(env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  const matchesBootstrap = (bootstrapUserId && bootstrapUserId === clerkUserId) || (bootstrapEmail && bootstrapEmail === email);

  if (!matchesBootstrap) {
    return null;
  }

  const db = await getAdminDb();
  const now = new Date();

  const result = await db.collection<AdminUserDocument>('admin_users').findOneAndUpdate(
    { clerkUserId },
    {
      $set: {
        email,
        displayName,
        role: 'super_admin',
        status: 'active',
        mfaEnforced: true,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  return result;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const authState = await auth();
  const clerkUserId = String(authState.userId || '').trim();
  if (!clerkUserId) {
    return null;
  }

  const db = await getAdminDb();
  let adminUser = await db.collection<AdminUserDocument>('admin_users').findOne({ clerkUserId });

  const clerkUser = await currentUser();
  const email = getPrimaryEmailFromClerkUser(clerkUser);
  const displayName = String(clerkUser?.fullName || clerkUser?.username || email || clerkUserId).trim();

  if (!adminUser) {
    await maybeBootstrapAdmin(clerkUserId, email, displayName);
    adminUser = await db.collection<AdminUserDocument>('admin_users').findOne({ clerkUserId });
  }

  if (!adminUser || adminUser.status !== 'active') {
    return null;
  }

  const role = isRoleKey(String(adminUser.role || '')) ? adminUser.role : null;
  if (!role) {
    return null;
  }
  const permissions = ROLE_PERMISSIONS[role] || [];

  await db.collection<AdminUserDocument>('admin_users').updateOne(
    { clerkUserId },
    {
      $set: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  return {
    adminUserId: clerkUserId,
    clerkUserId,
    email: String(adminUser.email || email || '').trim().toLowerCase(),
    role,
    permissions,
  };
}
