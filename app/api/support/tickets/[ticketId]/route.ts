import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { hasPermission } from '@/lib/rbac/permissions';
import { getSupportTicketByTicketId, updateSupportTicketByTicketId } from '@/server/repositories/support';
import { writeAuditLog } from '@/server/services/audit-log';

const patchSchema = z.object({
  status: z.enum(['open', 'in-progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().max(120).optional(),
  message: z.string().max(3000).optional(),
  reason: z.string().min(3).max(240),
});

const allowedTicketTransitions: Record<string, string[]> = {
  open: ['in-progress', 'resolved', 'closed'],
  'in-progress': ['open', 'resolved', 'closed'],
  resolved: ['in-progress', 'closed'],
  closed: [],
};

function normalizeStatus(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'in_progress' ? 'in-progress' : normalized;
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ ticketId: string }> }) {
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

  if (parsed.data.assignedTo && !hasPermission(sessionResult.session.role, 'support:assign')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing support:assign permission' }, { status: 403 });
  }

  if (parsed.data.message && !hasPermission(sessionResult.session.role, 'support:reply')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing support:reply permission' }, { status: 403 });
  }

  if (parsed.data.status === 'closed' && !hasPermission(sessionResult.session.role, 'support:close')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing support:close permission' }, { status: 403 });
  }

  if ((parsed.data.status || parsed.data.priority) && !hasPermission(sessionResult.session.role, 'support:assign')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing support:assign permission' }, { status: 403 });
  }

  const params = await context.params;
  if (parsed.data.status) {
    const current = await getSupportTicketByTicketId(params.ticketId);
    if (!current) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    const from = normalizeStatus((current as Record<string, unknown>).status);
    const to = normalizeStatus(parsed.data.status);
    const allowed = allowedTicketTransitions[from] || [];
    if (from !== to && !allowed.includes(to)) {
      return NextResponse.json(
        { success: false, error: `Invalid ticket status transition: ${from || 'unknown'} -> ${to}` },
        { status: 400 }
      );
    }
  }

  const updated = await updateSupportTicketByTicketId(params.ticketId, {
    status: parsed.data.status,
    priority: parsed.data.priority,
    assignedTo: parsed.data.assignedTo,
    message: parsed.data.message,
    adminName: sessionResult.session.email,
  });

  if (!updated) {
    return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'support.update',
    resource: 'support',
    resourceId: params.ticketId,
    reason: parsed.data.reason,
    before: updated.before as Record<string, unknown>,
    after: updated.after as Record<string, unknown>,
    metadata: {
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignedTo: parsed.data.assignedTo,
      replied: Boolean(parsed.data.message),
    },
  });

  return NextResponse.json({ success: true, data: updated.after });
}
