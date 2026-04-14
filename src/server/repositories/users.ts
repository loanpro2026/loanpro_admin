import { getAdminDb } from '@/lib/db/mongo';

export type UserListFilters = {
  search?: string;
  status?: 'all' | 'active' | 'banned';
  limit?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'username';
  sortDir?: 'asc' | 'desc';
};

function buildSortStage(sortBy: UserListFilters['sortBy'], sortDir: UserListFilters['sortDir']) {
  const direction = sortDir === 'asc' ? 1 : -1;
  if (sortBy === 'updatedAt') return { updatedAt: direction };
  if (sortBy === 'email') return { email: direction };
  if (sortBy === 'username') return { username: direction };
  return { createdAt: direction };
}

export type UserCreateInput = {
  userId: string;
  clerkUserId?: string;
  username: string;
  email: string;
  fullName?: string;
  accessToken?: string | null;
  banned?: boolean;
  status?: string;
};

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function normalizeString(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function normalizeId(value: unknown) {
  return String(value || '').trim();
}

async function getAdminExclusionSets() {
  const db = await getAdminDb();
  const adminRows = await db
    .collection('admin_users')
    .find({})
    .project({ clerkUserId: 1, email: 1 })
    .toArray();

  const adminUserIds = Array.from(
    new Set(
      adminRows
        .map((row) => normalizeString((row as { clerkUserId?: unknown }).clerkUserId))
        .filter(Boolean)
    )
  );

  const adminEmails = Array.from(
    new Set(
      adminRows
        .map((row) => normalizeString((row as { email?: unknown }).email))
        .filter(Boolean)
    )
  );

  return { adminUserIds, adminEmails };
}

export async function listUsers(filters: UserListFilters) {
  const db = await getAdminDb();
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));
  const skip = Math.max(0, Number(filters.skip || 0));
  const sort = buildSortStage(filters.sortBy, filters.sortDir);
  const { adminUserIds, adminEmails } = await getAdminExclusionSets();

  const match: Record<string, unknown> = {};
  if (adminUserIds.length || adminEmails.length) {
    match.$nor = [
      ...(adminUserIds.length
        ? [{ $expr: { $in: [{ $toLower: { $ifNull: ['$userId', ''] } }, adminUserIds] } }]
        : []),
      ...(adminEmails.length
        ? [{ $expr: { $in: [{ $toLower: { $ifNull: ['$email', ''] } }, adminEmails] } }]
        : []),
    ];
  }

  if (filters.status === 'banned') {
    const andFilters = Array.isArray((match as { $and?: unknown[] }).$and) ? (match as { $and?: unknown[] }).$and || [] : [];
    andFilters.push({ banned: true });
    (match as { $and?: unknown[] }).$and = andFilters;
  } else if (filters.status === 'active') {
    const andFilters = Array.isArray((match as { $and?: unknown[] }).$and) ? (match as { $and?: unknown[] }).$and || [] : [];
    andFilters.push({ $or: [{ banned: { $exists: false } }, { banned: false }] });
    (match as { $and?: unknown[] }).$and = andFilters;
  }

  if (filters.search && filters.search.trim()) {
    const regex = toSafeRegex(filters.search.trim());
    const andFilters = Array.isArray((match as any).$and) ? (match as any).$and : [];
    andFilters.push({
      $or: [{ userId: regex }, { username: regex }, { email: regex }, { fullName: regex }],
    });
    (match as any).$and = andFilters;
  }

  const rows = await db
    .collection('users')
    .aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'userId',
          foreignField: 'userId',
          as: 'subscriptionData',
        },
      },
      {
        $addFields: {
          latestSubscription: {
            $first: {
              $sortArray: {
                input: '$subscriptionData',
                sortBy: { createdAt: -1 },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          username: 1,
          email: 1,
          fullName: 1,
          banned: 1,
          status: 1,
          createdAt: 1,
          lastLogin: 1,
          updatedAt: 1,
          subscription: {
            plan: '$latestSubscription.plan',
            status: '$latestSubscription.status',
            endDate: '$latestSubscription.endDate',
            billingPeriod: '$latestSubscription.billingPeriod',
          },
        },
      },
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

export async function findUserByUserId(userId: string) {
  const db = await getAdminDb();
  return db.collection('users').findOne({ userId: normalizeId(userId) });
}

export async function createUser(input: UserCreateInput) {
  const db = await getAdminDb();
  const { adminUserIds, adminEmails } = await getAdminExclusionSets();

  const normalizedUserId = normalizeString(input.userId);
  const normalizedEmail = normalizeString(input.email);
  if (
    (normalizedUserId && adminUserIds.includes(normalizedUserId)) ||
    (normalizedEmail && adminEmails.includes(normalizedEmail))
  ) {
    return { ok: false as const, reason: 'conflict_admin_identity' as const };
  }

  const duplicate = await db.collection('users').findOne({
    $or: [
      { userId: normalizeId(input.userId) },
      { username: normalizeId(input.username) },
      { email: normalizeId(input.email).toLowerCase() },
    ],
  });
  if (duplicate) {
    return { ok: false as const, reason: 'duplicate_user' as const };
  }

  const now = new Date();
  const doc = {
    userId: normalizeId(input.userId),
    clerkUserId: normalizeId(input.clerkUserId || input.userId) || normalizeId(input.userId),
    username: normalizeId(input.username),
    email: normalizeId(input.email).toLowerCase(),
    fullName: normalizeId(input.fullName),
    accessToken: typeof input.accessToken === 'string' ? input.accessToken : null,
    banned: Boolean(input.banned),
    status: normalizeId(input.status || 'active') || 'active',
    devices: [],
    dataUsage: 0,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection('users').insertOne(doc);
  return { ok: true as const, data: { ...doc, _id: result.insertedId } };
}

export async function deleteUserByUserId(userId: string) {
  const db = await getAdminDb();
  const { adminUserIds } = await getAdminExclusionSets();
  const normalizedUserId = normalizeString(userId);
  if (normalizedUserId && adminUserIds.includes(normalizedUserId)) {
    return null;
  }

  const before = await db.collection('users').findOne({ userId: normalizeId(userId) });
  if (!before) {
    return null;
  }

  await db.collection('users').deleteOne({ userId: normalizeId(userId) });
  return before;
}

export async function updateUserByUserId(userId: string, patch: Record<string, unknown>) {
  const db = await getAdminDb();
  const { adminUserIds, adminEmails } = await getAdminExclusionSets();
  const normalizedUserId = normalizeString(userId);
  if (normalizedUserId && adminUserIds.includes(normalizedUserId)) {
    return null;
  }

  const existing = await db.collection('users').findOne({ userId: normalizeId(userId) });
  if (!existing) {
    return null;
  }

  if (typeof patch.email === 'string') {
    const normalizedEmail = normalizeString(patch.email);
    if (normalizedEmail && adminEmails.includes(normalizedEmail)) {
      return null;
    }

    const duplicate = await db.collection('users').findOne({
      email: normalizeId(patch.email).toLowerCase(),
      userId: { $ne: normalizeId(userId) },
    });
    if (duplicate) {
      return { _error: 'duplicate_email' };
    }
  }

  if (typeof patch.username === 'string') {
    const duplicate = await db.collection('users').findOne({
      username: normalizeId(patch.username),
      userId: { $ne: normalizeId(userId) },
    });
    if (duplicate) {
      return { _error: 'duplicate_username' };
    }
  }

  return db.collection('users').findOneAndUpdate(
    { userId: normalizeId(userId) },
    {
      $set: {
        ...patch,
        ...(typeof patch.email === 'string' ? { email: normalizeId(patch.email).toLowerCase() } : {}),
        ...(typeof patch.username === 'string' ? { username: normalizeId(patch.username) } : {}),
        ...(typeof patch.fullName === 'string' ? { fullName: normalizeId(patch.fullName) } : {}),
        ...(typeof patch.status === 'string' ? { status: normalizeId(patch.status) || 'active' } : {}),
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
}
