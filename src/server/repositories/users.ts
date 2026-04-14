import { getAdminDb } from '@/lib/db/mongo';

export type UserListFilters = {
  search?: string;
  status?: 'all' | 'active' | 'banned';
  limit?: number;
};

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export async function listUsers(filters: UserListFilters) {
  const db = await getAdminDb();
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));

  const match: Record<string, unknown> = {};
  if (filters.status === 'banned') {
    match.banned = true;
  } else if (filters.status === 'active') {
    match.$or = [{ banned: { $exists: false } }, { banned: false }];
  }

  if (filters.search && filters.search.trim()) {
    const regex = toSafeRegex(filters.search.trim());
    const andFilters = Array.isArray((match as any).$and) ? (match as any).$and : [];
    andFilters.push({
      $or: [{ userId: regex }, { username: regex }, { email: regex }, { fullName: regex }],
    });
    (match as any).$and = andFilters;
  }

  return db
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
      { $sort: { createdAt: -1 } },
      { $limit: limit },
    ])
    .toArray();
}

export async function updateUserByUserId(userId: string, patch: Record<string, unknown>) {
  const db = await getAdminDb();
  return db.collection('users').findOneAndUpdate(
    { userId },
    {
      $set: {
        ...patch,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
}
