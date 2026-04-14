import { ObjectId } from 'mongodb';
import { getAdminDb } from '@/lib/db/mongo';

export type PaymentListFilters = {
  search?: string;
  status?: string;
  limit?: number;
};

const SUCCESS_STATUS_REGEX = /^(completed|captured|success|paid)$/i;

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

  return { $regex: new RegExp(`^${normalized}$`, 'i') };
}

export async function listPayments(filters: PaymentListFilters) {
  const db = await getAdminDb();
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));
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

  return db
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
      { $sort: { createdAt: -1 } },
      { $limit: limit },
    ])
    .toArray();
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
