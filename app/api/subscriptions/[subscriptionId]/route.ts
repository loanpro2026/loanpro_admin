import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { hasPermission } from '@/lib/rbac/permissions';
import { getSubscriptionById, updateSubscriptionById } from '@/server/repositories/subscriptions';
import { writeAuditLog } from '@/server/services/audit-log';

const patchSchema = z.object({
  status: z.enum(['active', 'trial', 'cancelled', 'expired', 'superseded', 'active_subscription']).optional(),
  endDate: z.string().optional(),
  reason: z.string().min(3).max(240),
});

const allowedSubscriptionTransitions: Record<string, string[]> = {
  trial: ['active', 'cancelled', 'expired'],
  active: ['cancelled', 'expired', 'superseded', 'active_subscription'],
  active_subscription: ['cancelled', 'expired', 'superseded'],
  superseded: ['active', 'active_subscription', 'cancelled', 'expired'],
  cancelled: ['active', 'active_subscription'],
  expired: ['active', 'active_subscription'],
};

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ subscriptionId: string }> }) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  if (!hasPermission(sessionResult.session.role, 'subscriptions:update')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing subscriptions:update permission' }, { status: 403 });
  }

  const params = await context.params;
  const existing = await getSubscriptionById(params.subscriptionId);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
  }

  if (parsed.data.status) {
    const from = normalizeStatus((existing as Record<string, unknown>).status);
    const to = normalizeStatus(parsed.data.status);
    const allowed = allowedSubscriptionTransitions[from] || [];
    if (from !== to && !allowed.includes(to)) {
      return NextResponse.json(
        { success: false, error: `Invalid subscription status transition: ${from || 'unknown'} -> ${to}` },
        { status: 400 }
      );
    }
  }

  if (parsed.data.status === 'cancelled' && !hasPermission(sessionResult.session.role, 'subscriptions:cancel')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing subscriptions:cancel permission' }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.endDate) {
    const parsedDate = new Date(parsed.data.endDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid endDate' }, { status: 400 });
    }
    patch.endDate = parsedDate;
  }

  const updated = await updateSubscriptionById(params.subscriptionId, patch);
  if (!updated) {
    return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'subscriptions.update',
    resource: 'subscriptions',
    resourceId: params.subscriptionId,
    reason: parsed.data.reason,
    before: existing as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ success: true, data: updated });
}
