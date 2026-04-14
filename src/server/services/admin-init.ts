import { getAdminDb } from '@/lib/db/mongo';
import { syncSystemRoles } from '@/server/repositories/roles';

export async function ensureAdminIndexes() {
  const db = await getAdminDb();

  await Promise.all([
    db.collection('admin_users').createIndex({ clerkUserId: 1 }, { unique: true }),
    db.collection('admin_users').createIndex({ email: 1 }, { unique: true }),
    db.collection('admin_roles').createIndex({ key: 1 }, { unique: true }),
    db.collection('admin_invites').createIndex({ email: 1, status: 1 }),
    db.collection('admin_invites').createIndex({ expiresAt: 1 }),
    db.collection('admin_audit_logs').createIndex({ createdAt: -1 }),
    db.collection('admin_audit_logs').createIndex({ 'actor.adminUserId': 1, createdAt: -1 }),
    db.collection('admin_audit_logs').createIndex({ resource: 1, resourceId: 1, createdAt: -1 }),
    db.collection('admin_notifications').createIndex({ createdAt: -1 }),
    db.collection('admin_notifications').createIndex({ action: 1, createdAt: -1 }),
    db.collection('admin_notifications').createIndex({ resource: 1, resourceId: 1, createdAt: -1 }),
    db.collection('admin_notifications').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

export async function runAdminInitialization() {
  await syncSystemRoles();
  await ensureAdminIndexes();

  return {
    initializedAt: new Date().toISOString(),
    indexesEnsured: true,
    rolesSynced: true,
  };
}
