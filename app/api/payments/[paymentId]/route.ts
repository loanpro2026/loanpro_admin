import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { hasPermission } from '@/lib/rbac/permissions';
import { getPaymentById, updatePaymentById } from '@/server/repositories/payments';
import { writeAuditLog } from '@/server/services/audit-log';

const patchSchema = z.object({
  action: z.enum(['refund_request', 'refund_approve', 'reconcile']),
  status: z.string().optional(),
  refundStatus: z.enum(['pending_review', 'processing', 'refunded', 'rejected']).optional(),
  refundAmount: z.number().nonnegative().optional(),
  refundPaymentId: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
  reason: z.string().min(3).max(240),
});

function normalizeText(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ paymentId: string }> }) {
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

  if (parsed.data.action === 'refund_request' && !hasPermission(sessionResult.session.role, 'payments:refund_request')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing payments:refund_request permission' }, { status: 403 });
  }
  if (parsed.data.action === 'refund_approve' && !hasPermission(sessionResult.session.role, 'payments:refund_approve')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing payments:refund_approve permission' }, { status: 403 });
  }
  if (parsed.data.action === 'reconcile' && !hasPermission(sessionResult.session.role, 'payments:reconcile')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing payments:reconcile permission' }, { status: 403 });
  }

  const params = await context.params;
  const existing = await getPaymentById(params.paymentId);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
  }

  const currentRefundStatus = normalizeText((existing as Record<string, unknown>).refundStatus);
  const hasReconciledAt = Boolean((existing as Record<string, unknown>).reconciledAt);

  if (parsed.data.action === 'refund_request' && (currentRefundStatus === 'refunded' || currentRefundStatus === 'rejected')) {
    return NextResponse.json(
      { success: false, error: `Cannot create refund request when refund status is ${currentRefundStatus}` },
      { status: 400 }
    );
  }

  if (parsed.data.action === 'refund_approve' && currentRefundStatus !== 'pending_review' && currentRefundStatus !== 'processing') {
    return NextResponse.json(
      { success: false, error: 'Refund approval requires refund status pending_review or processing' },
      { status: 400 }
    );
  }

  if (parsed.data.action === 'reconcile' && hasReconciledAt) {
    return NextResponse.json({ success: false, error: 'Payment is already reconciled' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  const now = new Date();

  if (parsed.data.action === 'refund_request') {
    patch.refundStatus = parsed.data.refundStatus || 'pending_review';
    patch.refundRequestedAt = now;
    if (parsed.data.note) patch.refundRequestNote = parsed.data.note;
  }

  if (parsed.data.action === 'refund_approve') {
    patch.refundStatus = parsed.data.refundStatus || 'refunded';
    patch.refundProcessedAt = now;
    if (typeof parsed.data.refundAmount === 'number') {
      patch.refundAmount = parsed.data.refundAmount;
    }
    if (parsed.data.refundPaymentId) {
      patch.refundPaymentId = parsed.data.refundPaymentId;
    }
    if (parsed.data.note) {
      patch.refundNote = parsed.data.note;
    }
  }

  if (parsed.data.action === 'reconcile') {
    patch.reconciledAt = now;
    patch.reconciledBy = sessionResult.session.email;
    if (parsed.data.status) {
      patch.status = parsed.data.status;
    }
    if (parsed.data.note) {
      patch.reconcileNote = parsed.data.note;
    }
  }

  const updated = await updatePaymentById(params.paymentId, patch);
  if (!updated) {
    return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: `payments.${parsed.data.action}`,
    resource: 'payments',
    resourceId: params.paymentId,
    reason: parsed.data.reason,
    before: existing as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    metadata: {
      action: parsed.data.action,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
