import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac/permissions';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { deleteCouponById, getCouponById, updateCouponById } from '@/server/repositories/coupons';
import { writeAuditLog } from '@/server/services/audit-log';
import { invalidateCacheByPrefix } from '@/server/services/response-cache';

const patchCouponSchema = z.object({
  description: z.string().trim().max(240).optional(),
  discountType: z.enum(['percent', 'fixed']).optional(),
  discountValue: z.number().positive().optional(),
  minOrderAmount: z.number().nonnegative().optional(),
  maxDiscountAmount: z.number().nonnegative().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive', 'expired']).optional(),
  appliesToPlans: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  reason: z.string().trim().min(3).max(240),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ couponId: string }> }) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  if (!hasPermission(sessionResult.session.role, 'coupons:update')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing coupons:update permission' }, { status: 403 });
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = patchCouponSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const params = await context.params;
  const existing = await getCouponById(params.couponId);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });
  }

  if (parsed.data.discountType === 'percent' && typeof parsed.data.discountValue === 'number' && parsed.data.discountValue > 100) {
    return NextResponse.json({ success: false, error: 'Percent discount cannot exceed 100' }, { status: 400 });
  }

  const validUntil = parsed.data.validUntil === undefined
    ? undefined
    : parsed.data.validUntil === null
      ? null
      : new Date(parsed.data.validUntil);

  if (validUntil instanceof Date && Number.isNaN(validUntil.getTime())) {
    return NextResponse.json({ success: false, error: 'Invalid validUntil date' }, { status: 400 });
  }

  const updated = await updateCouponById(params.couponId, {
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

  if (!updated) {
    return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'coupons.update',
    resource: 'coupons',
    resourceId: params.couponId,
    reason: parsed.data.reason,
    before: existing as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });

  invalidateCacheByPrefix('coupons:list:');

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ couponId: string }> }) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  if (!hasPermission(sessionResult.session.role, 'coupons:delete')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing coupons:delete permission' }, { status: 403 });
  }

  const params = await context.params;
  const existing = await getCouponById(params.couponId);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });
  }

  const payloadResult = await request
    .json()
    .then((payload) => payload as { reason?: string })
    .catch(() => ({ reason: '' }));
  const reasonFromBody = String(payloadResult.reason || '').trim();
  const reasonFromQuery = String(request.nextUrl.searchParams.get('reason') || '').trim();
  const reason = reasonFromBody || reasonFromQuery;

  if (!reason || reason.length < 3) {
    return NextResponse.json({ success: false, error: 'A reason is required to delete a coupon' }, { status: 400 });
  }

  const deleted = await deleteCouponById(params.couponId);
  if (!deleted.deletedCount) {
    return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'coupons.delete',
    resource: 'coupons',
    resourceId: params.couponId,
    reason,
    before: existing as unknown as Record<string, unknown>,
  });

  invalidateCacheByPrefix('coupons:list:');

  return NextResponse.json({ success: true });
}
