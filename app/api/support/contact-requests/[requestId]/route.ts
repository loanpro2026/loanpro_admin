import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { hasPermission } from '@/lib/rbac/permissions';
import { getContactRequestByRequestId, updateContactRequestByRequestId } from '@/server/repositories/support';
import { writeAuditLog } from '@/server/services/audit-log';

const patchSchema = z.object({
  status: z.enum(['new', 'called', 'follow-up', 'converted', 'closed']).optional(),
  priority: z.enum(['normal', 'high']).optional(),
  assignedTo: z.string().max(120).optional(),
  note: z.string().max(1200).optional(),
  reason: z.string().min(3).max(240),
});

const allowedContactTransitions: Record<string, string[]> = {
  new: ['called', 'follow-up', 'converted', 'closed'],
  called: ['follow-up', 'converted', 'closed'],
  'follow-up': ['called', 'converted', 'closed'],
  converted: ['closed'],
  closed: [],
};

function normalizeStatus(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
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

  if (parsed.data.assignedTo && !hasPermission(sessionResult.session.role, 'contact:assign')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing contact:assign permission' }, { status: 403 });
  }

  if (parsed.data.status === 'closed' && !hasPermission(sessionResult.session.role, 'contact:close')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing contact:close permission' }, { status: 403 });
  }

  if ((parsed.data.status || parsed.data.priority || parsed.data.note) && !hasPermission(sessionResult.session.role, 'contact:assign')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing contact:assign permission' }, { status: 403 });
  }

  const params = await context.params;
  if (parsed.data.status) {
    const current = await getContactRequestByRequestId(params.requestId);
    if (!current) {
      return NextResponse.json({ success: false, error: 'Contact request not found' }, { status: 404 });
    }

    const from = normalizeStatus((current as Record<string, unknown>).status);
    const to = normalizeStatus(parsed.data.status);
    const allowed = allowedContactTransitions[from] || [];
    if (from !== to && !allowed.includes(to)) {
      return NextResponse.json(
        { success: false, error: `Invalid contact status transition: ${from || 'unknown'} -> ${to}` },
        { status: 400 }
      );
    }
  }

  const updated = await updateContactRequestByRequestId(params.requestId, {
    status: parsed.data.status,
    priority: parsed.data.priority,
    assignedTo: parsed.data.assignedTo,
    note: parsed.data.note,
    noteBy: sessionResult.session.email,
  });

  if (!updated) {
    return NextResponse.json({ success: false, error: 'Contact request not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'contact.update',
    resource: 'contact',
    resourceId: params.requestId,
    reason: parsed.data.reason,
    before: updated.before as Record<string, unknown>,
    after: updated.after as Record<string, unknown>,
    metadata: {
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignedTo: parsed.data.assignedTo,
      noted: Boolean(parsed.data.note),
    },
  });

  return NextResponse.json({ success: true, data: updated.after });
}
