import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, requireApiSession } from '@/server/api/guards';
import { hasPermission } from '@/lib/rbac/permissions';
import { parseJsonBody } from '@/server/api/request';
import { createCoupon, listCoupons } from '@/server/repositories/coupons';
import { writeAuditLog } from '@/server/services/audit-log';
import { getCachedResponse, invalidateCacheByPrefix, setCachedResponse } from '@/server/services/response-cache';

const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().trim().max(240).optional(),
  discountType: z.enum(['percent', 'fixed']),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().nonnegative().optional(),
  maxDiscountAmount: z.number().nonnegative().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  validUntil: z.string().optional(),
  status: z.enum(['active', 'inactive', 'expired']).optional(),
  appliesToPlans: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  reason: z.string().trim().min(3).max(240),
});

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('coupons:read');
  if ('response' in result) {
    return result.response;
  }

  const cacheKey = `coupons:list:${request.nextUrl.search}`;
  const cached = getCachedResponse<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || '').trim().toLowerCase();
  const limit = Number(searchParams.get('limit') || '50');
  const skip = Number(searchParams.get('skip') || '0');
  const sortBy = String(searchParams.get('sortBy') || 'createdAt').trim().toLowerCase() as
    | 'createdAt'
    | 'updatedAt'
    | 'discountValue'
    | 'code'
    | 'usedCount';
  const sortDir = String(searchParams.get('sortDir') || 'desc').trim().toLowerCase() as 'asc' | 'desc';

  const coupons = await listCoupons({ search, status, limit, skip, sortBy, sortDir });
  const payload = {
    success: true,
    data: coupons.items,
    meta: {
      total: coupons.total,
      limit,
      skip,
      hasMore: skip + coupons.items.length < coupons.total,
      sortBy,
      sortDir,
    },
  };

  setCachedResponse(cacheKey, payload, 15000);
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  if (!hasPermission(sessionResult.session.role, 'coupons:create')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing coupons:create permission' }, { status: 403 });
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = createCouponSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  if (parsed.data.discountType === 'percent' && parsed.data.discountValue > 100) {
    return NextResponse.json({ success: false, error: 'Percent discount cannot exceed 100' }, { status: 400 });
  }

  const validUntil = parsed.data.validUntil ? new Date(parsed.data.validUntil) : null;
  if (validUntil && Number.isNaN(validUntil.getTime())) {
    return NextResponse.json({ success: false, error: 'Invalid validUntil date' }, { status: 400 });
  }

  const created = await createCoupon({
    code: parsed.data.code,
    description: parsed.data.description,
    discountType: parsed.data.discountType,
    discountValue: parsed.data.discountValue,
    minOrderAmount: parsed.data.minOrderAmount,
    maxDiscountAmount: parsed.data.maxDiscountAmount,
    usageLimit: parsed.data.usageLimit,
    validUntil,
    status: parsed.data.status,
    appliesToPlans: parsed.data.appliesToPlans,
    actorEmail: sessionResult.session.email,
  });

  if (!created.ok) {
    return NextResponse.json({ success: false, error: 'Coupon code already exists' }, { status: 409 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'coupons.create',
    resource: 'coupons',
    resourceId: String(created.data._id),
    reason: parsed.data.reason,
    after: created.data as unknown as Record<string, unknown>,
  });

  invalidateCacheByPrefix('coupons:list:');

  return NextResponse.json({ success: true, data: created.data }, { status: 201 });
}
