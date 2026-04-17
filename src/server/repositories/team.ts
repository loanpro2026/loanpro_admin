import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import { getAdminDb } from '@/lib/db/mongo';
import type { AdminInviteDocument, AdminUserDocument } from '@/types/admin';
import type { RoleKey } from '@/types/rbac';

export type TeamListFilters = {
  search?: string;
  role?: RoleKey | 'all';
  status?: AdminUserDocument['status'] | 'all';
  limit?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'displayName';
  sortDir?: 'asc' | 'desc';
};

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function buildSortStage(sortBy: TeamListFilters['sortBy'], sortDir: TeamListFilters['sortDir']) {
  const direction = sortDir === 'asc' ? 1 : -1;
  if (sortBy === 'updatedAt') return { updatedAt: direction };
  if (sortBy === 'email') return { email: direction };
  if (sortBy === 'displayName') return { displayName: direction };
  return { createdAt: direction };
}

export async function listTeamMembers(filters: TeamListFilters = {}) {
  const db = await getAdminDb();
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));
  const skip = Math.max(0, Number(filters.skip || 0));
  const sort = buildSortStage(filters.sortBy, filters.sortDir);

  const match: Record<string, unknown> = {};
  if (filters.role && filters.role !== 'all') {
    match.role = filters.role;
  }
  if (filters.status && filters.status !== 'all') {
    match.status = filters.status;
  }
  if (String(filters.search || '').trim()) {
    const regex = toSafeRegex(String(filters.search || '').trim());
    match.$or = [{ email: regex }, { displayName: regex }, { clerkUserId: regex }];
  }

  const rows = await db
    .collection<AdminUserDocument>('admin_users')
    .aggregate([
      { $match: match },
      {
        $facet: {
          items: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ])
    .toArray();

  const first = rows[0] as { items?: unknown[]; totalCount?: Array<{ count?: number }> } | undefined;
  return {
    items: Array.isArray(first?.items) ? first?.items : [],
    total: Number(first?.totalCount?.[0]?.count || 0),
  };
}

export async function createTeamInvite(input: { email: string; role: RoleKey; invitedBy: string }) {
  const db = await getAdminDb();
  const now = new Date();
  const token = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const email = input.email.toLowerCase();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const updated = await db.collection<AdminInviteDocument>('admin_invites').findOneAndUpdate(
    { email, status: 'pending' },
    {
      $set: {
        role: input.role,
        invitedBy: input.invitedBy,
        tokenHash,
        expiresAt,
        updatedAt: now,
      },
      $setOnInsert: {
        email,
        status: 'pending',
        createdAt: now,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  if (!updated) {
    const doc: AdminInviteDocument = {
      email,
      role: input.role,
      invitedBy: input.invitedBy,
      status: 'pending',
      tokenHash,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };
    return { ...doc, inviteToken: token };
  }

  return { ...updated, inviteToken: token };
}

export async function updateTeamMember(adminUserId: string, patch: Partial<Pick<AdminUserDocument, 'role' | 'status'>>) {
  const db = await getAdminDb();

  const filter = ObjectId.isValid(adminUserId)
    ? { _id: new ObjectId(adminUserId) }
    : { clerkUserId: adminUserId };

  return db.collection<AdminUserDocument>('admin_users').findOneAndUpdate(
    filter,
    {
      $set: {
        ...patch,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
}

export async function getTeamMemberById(adminUserId: string) {
  const db = await getAdminDb();
  const filter = ObjectId.isValid(adminUserId)
    ? { _id: new ObjectId(adminUserId) }
    : { clerkUserId: adminUserId };

  return db.collection<AdminUserDocument>('admin_users').findOne(filter);
}

export async function getTeamMemberByEmail(email: string) {
  const db = await getAdminDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  return db.collection<AdminUserDocument>('admin_users').findOne({ email: normalizedEmail });
}

export async function getPendingTeamInviteByEmail(email: string) {
  const db = await getAdminDb();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  return db.collection<AdminInviteDocument>('admin_invites').findOne({
    email: normalizedEmail,
    status: 'pending',
  });
}

export async function countActiveSuperAdmins() {
  const db = await getAdminDb();
  return db.collection<AdminUserDocument>('admin_users').countDocuments({
    role: 'super_admin',
    status: 'active',
  });
}

export async function upsertTeamMemberFromIdentity(input: {
  clerkUserId: string;
  email: string;
  displayName: string;
  role: RoleKey;
  invitedBy: string;
}) {
  const db = await getAdminDb();
  const now = new Date();

  const result = await db.collection<AdminUserDocument>('admin_users').findOneAndUpdate(
    { clerkUserId: input.clerkUserId },
    {
      $set: {
        email: String(input.email || '').trim().toLowerCase(),
        displayName: String(input.displayName || '').trim() || String(input.email || '').trim().toLowerCase(),
        role: input.role,
        status: 'active',
        mfaEnforced: true,
        invitedBy: input.invitedBy,
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
