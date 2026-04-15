import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/db/mongo';

export type SubscriptionListFilters = {
  search?: string;
  status?: string;
  plan?: string;
  limit?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'amount' | 'status' | 'plan';
  sortDir?: 'asc' | 'desc';
};

function buildSortStage(sortBy: SubscriptionListFilters['sortBy'], sortDir: SubscriptionListFilters['sortDir']) {
  const direction = sortDir === 'asc' ? 1 : -1;
  if (sortBy === 'updatedAt') return { updatedAt: direction };
  if (sortBy === 'amount') return { amount: direction };
  if (sortBy === 'status') return { status: direction };
  if (sortBy === 'plan') return { plan: direction };
  return { createdAt: direction };
}

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

function normalizeBillingPeriod(value: string) {
  const billing = String(value || '').trim().toLowerCase();
  return billing === 'annually' ? 'annually' : 'monthly';
}

function computeEndDate(startDate: Date, billingPeriod: string) {
  const endDate = new Date(startDate);
  if (normalizeBillingPeriod(billingPeriod) === 'annually') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }
  return endDate;
}

export type ManualSubscriptionInput = {
  userId: string;
  plan: string;
  billingPeriod: 'monthly' | 'annually';
  status?: 'active' | 'trial' | 'cancelled' | 'expired' | 'superseded' | 'active_subscription';
  amount?: number;
  baseAmount?: number;
  discountAmount?: number;
  startDate?: Date;
  endDate?: Date;
  remark?: string;
  paymentId?: string;
  couponCode?: string;
  replaceExistingActive?: boolean;
  createdByAdmin?: string;
};

export async function listSubscriptions(filters: SubscriptionListFilters) {
  const db = await getAdminDb();
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));
  const skip = Math.max(0, Number(filters.skip || 0));
  const sort = buildSortStage(filters.sortBy, filters.sortDir);

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

  const rows = await db
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

export async function createManualSubscription(input: ManualSubscriptionInput) {
  const db = await getAdminDb();
  const userId = String(input.userId || '').trim();
  if (!userId) {
    return { ok: false as const, reason: 'invalid_user' as const };
  }

  const user = await db.collection('users').findOne({ userId });
  if (!user) {
    return { ok: false as const, reason: 'user_not_found' as const };
  }

  const now = new Date();
  const startDate = input.startDate ? new Date(input.startDate) : now;
  const billingPeriod = normalizeBillingPeriod(input.billingPeriod);
  const plan = normalizePlan(String(input.plan || '').trim());
  const isPaidPlan = plan !== 'trial';
  const normalizedStatus = String(input.status || (isPaidPlan ? 'active' : 'trial')).trim().toLowerCase();
  const status = normalizedStatus === 'active_subscription' ? 'active_subscription' : normalizedStatus;
  const endDate = input.endDate ? new Date(input.endDate) : computeEndDate(startDate, billingPeriod);
  const replaceExistingActive = input.replaceExistingActive !== false;

  let supersededCount = 0;
  if (replaceExistingActive && isPaidPlan) {
    const superseded = await db.collection('subscriptions').updateMany(
      {
        userId,
        status: { $in: ['active', 'trial', 'active_subscription'] },
        plan: { $ne: 'trial' },
      },
      {
        $set: {
          status: 'superseded',
          supersededDate: now,
          supersededReason: 'Replaced by admin-created paid subscription',
          updatedAt: now,
        },
      }
    );
    supersededCount = superseded.modifiedCount;

    if (supersededCount === 0) {
      await db.collection('subscriptions').updateMany(
        {
          userId,
          status: 'trial',
          plan: 'trial',
        },
        {
          $set: {
            status: 'completed',
            completedDate: now,
            completedReason: 'Trial converted to paid subscription via admin panel',
            updatedAt: now,
          },
        }
      );
    }
  } else if (replaceExistingActive) {
    const superseded = await db.collection('subscriptions').updateMany(
      {
        userId,
        status: { $in: ['active', 'active_subscription'] },
      },
      {
        $set: {
          status: 'superseded',
          supersededDate: now,
          supersededReason: 'Replaced by admin-created trial subscription',
          updatedAt: now,
        },
      }
    );
    supersededCount = superseded.modifiedCount;
  }

  const shouldActivateAccess = ['active', 'trial', 'active_subscription'].includes(status);
  const accessToken = shouldActivateAccess ? crypto.randomBytes(48).toString('hex') : null;
  const doc = {
    userId,
    plan,
    status,
    billingPeriod,
    amount: Number.isFinite(Number(input.amount)) ? Number(input.amount) : 0,
    baseAmount: Number.isFinite(Number(input.baseAmount)) ? Number(input.baseAmount) : 0,
    discountAmount: Number.isFinite(Number(input.discountAmount)) ? Number(input.discountAmount) : 0,
    couponCode: String(input.couponCode || '').trim().toUpperCase() || null,
    startDate,
    endDate,
    gracePeriodEndsAt: new Date(endDate.getTime() + 15 * 24 * 60 * 60 * 1000),
    paymentId: String(input.paymentId || '').trim() || null,
    createdByAdmin: String(input.createdByAdmin || '').trim() || null,
    source: 'admin_panel',
    flowType: 'website-like-provision',
    manualRemark: String(input.remark || '').trim(),
    createdAt: now,
    updatedAt: now,
  };

  const insertResult = await db.collection('subscriptions').insertOne(doc);
  if (shouldActivateAccess) {
    await db.collection('users').updateOne(
      { userId },
      {
        $set: {
          accessToken,
          status: 'active_subscription',
          lastSubscribedAt: now,
          subscriptionPlan: plan,
          updatedAt: now,
        },
      }
    );
  } else {
    const activeCount = await db.collection('subscriptions').countDocuments({
      userId,
      status: { $in: ['active', 'trial', 'active_subscription'] },
    });

    if (activeCount === 0) {
      await db.collection('users').updateOne(
        { userId },
        {
          $set: {
            accessToken: null,
            status: 'cancelled_subscription',
            cancelledDate: now,
            subscriptionPlan: plan,
            updatedAt: now,
          },
        }
      );
    }
  }

  return {
    ok: true as const,
    data: {
      ...doc,
      _id: insertResult.insertedId,
      accessToken,
      supersededCount,
    },
  };
}
