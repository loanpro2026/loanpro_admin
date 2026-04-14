import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac/permissions';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { requireApiPermission } from '@/server/api/guards';
import { createManualSubscription, listSubscriptions } from '@/server/repositories/subscriptions';
import { writeAuditLog } from '@/server/services/audit-log';
import { getCachedResponse, invalidateCacheByPrefixes, setCachedResponse } from '@/server/services/response-cache';

const createSubscriptionSchema = z.object({
  userId: z.string().trim().min(1),
  plan: z.enum(['basic', 'pro', 'enterprise', 'trial']),
  billingPeriod: z.enum(['monthly', 'annually']),
  status: z.enum(['active', 'trial', 'cancelled', 'expired', 'superseded', 'active_subscription']).optional(),
  amount: z.number().nonnegative().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  remark: z.string().trim().min(3).max(240),
  reason: z.string().trim().min(3).max(240),
});

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('subscriptions:read');
  if ('response' in result) {
    return result.response;
  }

  const cacheKey = `subscriptions:list:${request.nextUrl.search}`;
  const cached = getCachedResponse<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || '').trim().toLowerCase();
  const plan = String(searchParams.get('plan') || '').trim().toLowerCase();
  const limit = Number(searchParams.get('limit') || '50');
  const skip = Number(searchParams.get('skip') || '0');
  const sortBy = String(searchParams.get('sortBy') || 'createdAt').trim().toLowerCase() as
    | 'createdAt'
    | 'updatedAt'
    | 'amount'
    | 'status'
    | 'plan';
  const sortDir = String(searchParams.get('sortDir') || 'desc').trim().toLowerCase() as 'asc' | 'desc';

  const subscriptions = await listSubscriptions({ search, status, plan, limit, skip, sortBy, sortDir });
  const payload = {
    success: true,
    data: subscriptions.items,
    meta: {
      total: subscriptions.total,
      limit,
      skip,
      hasMore: skip + subscriptions.items.length < subscriptions.total,
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

  if (!hasPermission(sessionResult.session.role, 'subscriptions:create')) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: missing subscriptions:create permission' },
      { status: 403 }
    );
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = createSubscriptionSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const payload = parsed.data;
  const startDate = payload.startDate ? new Date(payload.startDate) : undefined;
  const endDate = payload.endDate ? new Date(payload.endDate) : undefined;
  if (startDate && Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ success: false, error: 'Invalid startDate' }, { status: 400 });
  }
  if (endDate && Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ success: false, error: 'Invalid endDate' }, { status: 400 });
  }

  const created = await createManualSubscription({
    userId: payload.userId,
    plan: payload.plan,
    billingPeriod: payload.billingPeriod,
    status: payload.status,
    amount: payload.amount,
    startDate,
    endDate,
    remark: payload.remark,
  });

  if (!created.ok) {
    const error = created.reason === 'user_not_found' ? 'Selected user does not exist' : 'Invalid user for subscription';
    return NextResponse.json({ success: false, error }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'subscriptions.create',
    resource: 'subscriptions',
    resourceId: String(created.data._id),
    reason: payload.reason,
    after: {
      userId: payload.userId,
      plan: payload.plan,
      billingPeriod: payload.billingPeriod,
      status: payload.status || 'active',
      remark: payload.remark,
      supersededCount: created.data.supersededCount,
    },
  });

  invalidateCacheByPrefixes(['subscriptions:list:', 'users:list:', 'dashboard:']);

  return NextResponse.json({ success: true, data: created.data }, { status: 201 });
}
