import { ObjectId } from 'mongodb';
import { getAdminDb } from '@/lib/db/mongo';

export type SubscriptionListFilters = {
  search?: string;
  status?: string;
  plan?: string;
  limit?: number;
};

const ALLOWED_STATUSES = ['active', 'trial', 'cancelled', 'expired', 'superseded', 'active_subscription'];
const ALLOWED_PLANS = ['basic', 'pro', 'enterprise', 'trial'];

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function normalizePlan(plan: string) {
  const p = plan.toLowerCase();
  if (p === 'pro') return 'Pro';
  if (p === 'enterprise') return 'Enterprise';
  if (p === 'trial') return 'trial';
  return 'Basic';
}

export async function listSubscriptions(filters: SubscriptionListFilters) {
  const db = await getAdminDb();
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));

  const match: Record<string, unknown> = {};
  const status = String(filters.status || '').trim().toLowerCase();
  const plan = String(filters.plan || '').trim().toLowerCase();

  if (status && ALLOWED_STATUSES.includes(status)) {
    match.status = status;
  }
  if (plan && ALLOWED_PLANS.includes(plan)) {
    match.plan = normalizePlan(plan);
  }

  const search = String(filters.search || '').trim();
  const searchMatch = search
    ? {
        $or: [
          { userId: toSafeRegex(search) },
          { userName: toSafeRegex(search) },
          { userEmail: toSafeRegex(search) },
          { plan: toSafeRegex(search) },
        ],
      }
    : {};

  return db
    .collection('subscriptions')
    .aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'userId',
          as: 'user',
        },
      },
      { $match: searchMatch },
      {
        $project: {
          _id: 1,
          userId: 1,
          userName: { $arrayElemAt: ['$user.username', 0] },
          userEmail: { $arrayElemAt: ['$user.email', 0] },
          plan: 1,
          status: 1,
          startDate: 1,
          endDate: 1,
          billingPeriod: 1,
          amount: 1,
          paymentId: 1,
          updatedAt: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
    ])
    .toArray();
}

export async function getSubscriptionById(id: string) {
  const db = await getAdminDb();
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return db.collection('subscriptions').findOne({ _id: new ObjectId(id) });
}

export async function updateSubscriptionById(id: string, patch: Record<string, unknown>) {
  const db = await getAdminDb();
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return db.collection('subscriptions').findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...patch,
        updatedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
}
