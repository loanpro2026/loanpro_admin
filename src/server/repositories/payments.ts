import { ObjectId } from 'mongodb';
import { getAdminDb } from '@/lib/db/mongo';

export type PaymentListFilters = {
  search?: string;
  status?: string;
  limit?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'amount' | 'status';
  sortDir?: 'asc' | 'desc';
};

const SUCCESS_STATUS_REGEX = /^(completed|captured|success|paid)$/i;
const FAILED_STATUS_REGEX = /^(failed|failure|error|declined)$/i;

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function buildStatusFilter(status: string | undefined) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized || normalized === 'all') {
    return null;
  }

  if (normalized === 'completed' || normalized === 'successful') {
    return { $regex: SUCCESS_STATUS_REGEX };
  }

  if (normalized === 'failed') {
    return { $regex: FAILED_STATUS_REGEX };
  }

  return { $regex: new RegExp(`^${normalized}$`, 'i') };
}

function buildSortStage(sortBy: PaymentListFilters['sortBy'], sortDir: PaymentListFilters['sortDir']) {
  const direction = sortDir === 'asc' ? 1 : -1;
  if (sortBy === 'updatedAt') return { updatedAt: direction };
  if (sortBy === 'amount') return { amount: direction };
  if (sortBy === 'status') return { status: direction };
  return { createdAt: direction };
}

export async function listPayments(filters: PaymentListFilters) {
  const db = await getAdminDb();
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));
  const skip = Math.max(0, Number(filters.skip || 0));
  const sort = buildSortStage(filters.sortBy, filters.sortDir);
  const statusFilter = buildStatusFilter(filters.status);

  const match: Record<string, unknown> = {};
  if (statusFilter) {
    match.status = statusFilter;
  }

  const search = String(filters.search || '').trim();
  const searchMatch = search
    ? {
        $or: [
          { paymentId: toSafeRegex(search) },
          { orderId: toSafeRegex(search) },
          { userId: toSafeRegex(search) },
          { status: toSafeRegex(search) },
          { refundStatus: toSafeRegex(search) },
          { userEmail: toSafeRegex(search) },
        ],
      }
    : {};

  const rows = await db
    .collection('payments')
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
      {
        $project: {
          _id: 1,
          paymentId: 1,
          orderId: 1,
          userId: 1,
          userEmail: {
            $ifNull: ['$userEmail', { $arrayElemAt: ['$user.email', 0] }],
          },
          plan: 1,
          amount: 1,
          currency: 1,
          status: 1,
          refundStatus: 1,
          refundAmount: 1,
          refundPaymentId: 1,
          paymentMethod: 1,
          createdAt: 1,
          completedAt: 1,
          updatedAt: 1,
        },
      },
      { $match: searchMatch },
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

export async function getPaymentById(id: string) {
  const db = await getAdminDb();
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return db.collection('payments').findOne({ _id: new ObjectId(id) });
}

export async function updatePaymentById(id: string, patch: Record<string, unknown>) {
  const db = await getAdminDb();
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return db.collection('payments').findOneAndUpdate(
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
