import { ObjectId } from 'mongodb';
import { getEnv } from '@/config/env';
import { getAdminDb } from '@/lib/db/mongo';
import { invalidateCacheByPrefix } from '@/server/services/response-cache';
import { getAdminSettings } from '@/server/repositories/settings';
import type { AdminSession } from '@/lib/auth/session';
import type { AdminNotificationDocument } from '@/types/admin';

const COLLECTION = 'admin_notifications';
let indexesEnsured = false;

type NotificationEventInput = {
  actor: AdminSession;
  action: string;
  resource: string;
  resourceId?: string;
  reason?: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

function shouldCreateNotification(action: string, resource: string) {
  const normalizedAction = String(action || '').trim().toLowerCase();
  const normalizedResource = String(resource || '').trim().toLowerCase();

  if (!normalizedAction || !normalizedResource) return false;
  if (normalizedAction.endsWith('.read') || normalizedAction.includes('view') || normalizedAction.includes('list')) {
    return false;
  }

  return true;
}

function buildNotificationMessage(action: string, resource: string, resourceId?: string, reason?: string) {
  const target = resourceId ? `${resource}:${resourceId}` : resource;
  if (reason) {
    return `${action} on ${target} | Reason: ${reason}`;
  }
  return `${action} on ${target}`;
}

async function ensureNotificationIndexes() {
  if (indexesEnsured) return;
  const db = await getAdminDb();
  await Promise.all([
    db.collection(COLLECTION).createIndex({ createdAt: -1 }),
    db.collection(COLLECTION).createIndex({ action: 1, createdAt: -1 }),
    db.collection(COLLECTION).createIndex({ resource: 1, resourceId: 1, createdAt: -1 }),
    db.collection(COLLECTION).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  indexesEnsured = true;
}

async function getRetentionDays() {
  try {
    const settings = await getAdminSettings();
    const configured = Number(settings.notifications?.retentionDays || 14);
    if (Number.isFinite(configured) && configured > 0) {
      return Math.max(1, Math.min(365, configured));
    }
  } catch {
    // Fall back to env.
  }

  const env = getEnv();
  return Math.max(1, Number(env.ADMIN_NOTIFICATION_RETENTION_DAYS || 14));
}

async function getExpiryDate() {
  const days = await getRetentionDays();
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function createNotificationFromEvent(event: NotificationEventInput) {
  if (!shouldCreateNotification(event.action, event.resource)) {
    return;
  }

  await ensureNotificationIndexes();
  const db = await getAdminDb();
  const now = new Date();

  const doc: AdminNotificationDocument = {
    actor: {
      adminUserId: event.actor.adminUserId,
      clerkUserId: event.actor.clerkUserId,
      email: event.actor.email,
      role: event.actor.role,
    },
    action: event.action,
    resource: event.resource,
    resourceId: event.resourceId,
    reason: event.reason,
    before: event.before || null,
    after: event.after || null,
    metadata: event.metadata || {},
    message: buildNotificationMessage(event.action, event.resource, event.resourceId, event.reason),
    readBy: [],
    createdAt: now,
    expiresAt: await getExpiryDate(),
  };

  await db.collection<AdminNotificationDocument>(COLLECTION).insertOne(doc);
  invalidateCacheByPrefix('notifications:list:');
}

export async function listNotifications(options: {
  adminUserId: string;
  limit: number;
  skip: number;
  unreadOnly?: boolean;
  action?: string;
  resource?: string;
}) {
  await ensureNotificationIndexes();
  const db = await getAdminDb();

  const filter: Record<string, unknown> = {};
  if (options.unreadOnly) {
    filter.readBy = { $ne: options.adminUserId };
  }
  if (options.action) {
    filter.action = new RegExp(options.action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  if (options.resource) {
    filter.resource = new RegExp(options.resource.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  const [total, unreadTotal, rows] = await Promise.all([
    db.collection<AdminNotificationDocument>(COLLECTION).countDocuments(filter),
    db.collection<AdminNotificationDocument>(COLLECTION).countDocuments({ readBy: { $ne: options.adminUserId } }),
    db
      .collection<AdminNotificationDocument>(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .toArray(),
  ]);

  return { rows, total, unreadTotal };
}

export async function markNotificationReadStatus(options: {
  notificationId: string;
  adminUserId: string;
  read: boolean;
}) {
  await ensureNotificationIndexes();
  const db = await getAdminDb();

  const objectId = new ObjectId(options.notificationId);
  const update = options.read
    ? { $addToSet: { readBy: options.adminUserId } }
    : { $pull: { readBy: options.adminUserId } };

  const result = await db.collection<AdminNotificationDocument>(COLLECTION).updateOne({ _id: objectId }, update);
  invalidateCacheByPrefix('notifications:list:');
  return result.matchedCount > 0;
}

export async function markAllNotificationsAsRead(adminUserId: string) {
  await ensureNotificationIndexes();
  const db = await getAdminDb();
  const result = await db
    .collection<AdminNotificationDocument>(COLLECTION)
    .updateMany({ readBy: { $ne: adminUserId } }, { $addToSet: { readBy: adminUserId } });

  invalidateCacheByPrefix('notifications:list:');
  return result.modifiedCount;
}
