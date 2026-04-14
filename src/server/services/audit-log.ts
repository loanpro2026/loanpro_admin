import { getAdminDb } from '@/lib/db/mongo';
import { createNotificationFromEvent } from '@/server/services/notifications';
import type { AdminSession } from '@/lib/auth/session';
import type { AuditLogDocument } from '@/types/admin';

export type WriteAuditLogInput = {
  actor: AdminSession;
  action: string;
  resource: string;
  resourceId?: string;
  reason?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: WriteAuditLogInput) {
  const db = await getAdminDb();
  const event: AuditLogDocument = {
    actor: {
      adminUserId: input.actor.adminUserId,
      clerkUserId: input.actor.clerkUserId,
      email: input.actor.email,
      role: input.actor.role,
    },
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId,
    reason: input.reason,
    before: input.before || null,
    after: input.after || null,
    metadata: input.metadata || {},
    createdAt: new Date(),
  };

  await db.collection<AuditLogDocument>('admin_audit_logs').insertOne(event);

  try {
    await createNotificationFromEvent(input);
  } catch (error) {
    // Notification writes should never block primary operations.
    console.error('[notifications] Failed to create notification from audit event', error);
  }
}
