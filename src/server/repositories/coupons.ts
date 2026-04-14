import { ObjectId } from 'mongodb';
import { getAdminDb } from '@/lib/db/mongo';

export type CouponStatus = 'active' | 'inactive' | 'expired';
export type CouponDiscountType = 'percent' | 'fixed';

export type CouponListFilters = {
  search?: string;
  status?: string;
  limit?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'discountValue' | 'code' | 'usedCount';
  sortDir?: 'asc' | 'desc';
};

function buildSortStage(sortBy: CouponListFilters['sortBy'], sortDir: CouponListFilters['sortDir']) {
  const direction = sortDir === 'asc' ? 1 : -1;
  if (sortBy === 'updatedAt') return { updatedAt: direction };
  if (sortBy === 'discountValue') return { discountValue: direction };
  if (sortBy === 'code') return { code: direction };
  if (sortBy === 'usedCount') return { usedCount: direction };
  return { createdAt: direction };
}

export type CouponCreateInput = {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  validUntil?: Date | null;
  status?: CouponStatus;
  appliesToPlans?: string[];
  actorEmail?: string;
};

export type CouponPatchInput = {
  description?: string;
  discountType?: CouponDiscountType;
  discountValue?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  validUntil?: Date | null;
  status?: CouponStatus;
  appliesToPlans?: string[];
  actorEmail?: string;
};

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function normalizeStatus(value: string | undefined) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'active' || status === 'inactive' || status === 'expired') {
    return status as CouponStatus;
  }
  return '';
}

export async function listCoupons(filters: CouponListFilters) {
  const db = await getAdminDb();
  const limit = Math.min(200, Math.max(1, Number(filters.limit || 50)));
  const skip = Math.max(0, Number(filters.skip || 0));
  const sort = buildSortStage(filters.sortBy, filters.sortDir);

  const match: Record<string, unknown> = {};
  const status = normalizeStatus(filters.status);
  if (status) {
    match.status = status;
  }

  const search = String(filters.search || '').trim();
  const searchMatch = search
    ? {
        $or: [
          { code: toSafeRegex(search) },
          { description: toSafeRegex(search) },
          { status: toSafeRegex(search) },
          { discountType: toSafeRegex(search) },
        ],
      }
    : {};

  const rows = await db
    .collection('coupons')
    .aggregate([
      { $match: match },
      {
        $project: {
          _id: 1,
          code: 1,
          description: 1,
          discountType: 1,
          discountValue: 1,
          minOrderAmount: 1,
          maxDiscountAmount: 1,
          usageLimit: 1,
          usedCount: 1,
          validFrom: 1,
          validUntil: 1,
          status: 1,
          appliesToPlans: 1,
          updatedAt: 1,
          createdAt: 1,
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

export async function getCouponById(id: string) {
  const db = await getAdminDb();
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return db.collection('coupons').findOne({ _id: new ObjectId(id) });
}

export async function createCoupon(input: CouponCreateInput) {
  const db = await getAdminDb();
  const now = new Date();
  const code = String(input.code || '').trim().toUpperCase();

  const existing = await db.collection('coupons').findOne({ code });
  if (existing) {
    return { ok: false as const, reason: 'code_exists' as const };
  }

  const doc = {
    code,
    description: String(input.description || '').trim(),
    discountType: input.discountType,
    discountValue: Number(input.discountValue || 0),
    minOrderAmount: Number(input.minOrderAmount || 0),
    maxDiscountAmount:
      typeof input.maxDiscountAmount === 'number' ? Number(input.maxDiscountAmount) : null,
    usageLimit: typeof input.usageLimit === 'number' ? Number(input.usageLimit) : null,
    usedCount: 0,
    validFrom: now,
    validUntil: input.validUntil || null,
    status: input.status || 'active',
    appliesToPlans: Array.isArray(input.appliesToPlans) ? input.appliesToPlans : [],
    createdBy: input.actorEmail || null,
    updatedBy: input.actorEmail || null,
    createdAt: now,
    updatedAt: now,
  };

  const insertResult = await db.collection('coupons').insertOne(doc);
  return { ok: true as const, data: { ...doc, _id: insertResult.insertedId } };
}

export async function updateCouponById(id: string, patch: CouponPatchInput) {
  const db = await getAdminDb();
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const nextPatch: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (typeof patch.description === 'string') nextPatch.description = patch.description;
  if (patch.discountType) nextPatch.discountType = patch.discountType;
  if (typeof patch.discountValue === 'number') nextPatch.discountValue = patch.discountValue;
  if (typeof patch.minOrderAmount === 'number') nextPatch.minOrderAmount = patch.minOrderAmount;
  if ('maxDiscountAmount' in patch) nextPatch.maxDiscountAmount = patch.maxDiscountAmount ?? null;
  if ('usageLimit' in patch) nextPatch.usageLimit = patch.usageLimit ?? null;
  if ('validUntil' in patch) nextPatch.validUntil = patch.validUntil ?? null;
  if (patch.status) nextPatch.status = patch.status;
  if (Array.isArray(patch.appliesToPlans)) nextPatch.appliesToPlans = patch.appliesToPlans;
  if (patch.actorEmail) nextPatch.updatedBy = patch.actorEmail;

  return db.collection('coupons').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: nextPatch },
    { returnDocument: 'after' }
  );
}

export async function deleteCouponById(id: string) {
  const db = await getAdminDb();
  if (!ObjectId.isValid(id)) {
    return { deletedCount: 0 };
  }

  return db.collection('coupons').deleteOne({ _id: new ObjectId(id) });
}
