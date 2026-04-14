import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { hasPermission } from '@/lib/rbac/permissions';
import { updateUserByUserId } from '@/server/repositories/users';
import { writeAuditLog } from '@/server/services/audit-log';

const updateUserSchema = z.object({
  banned: z.boolean().optional(),
  status: z.string().optional(),
  reason: z.string().min(3).max(240),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = updateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  if (typeof parsed.data.banned === 'boolean') {
    if (!hasPermission(sessionResult.session.role, 'users:suspend')) {
      return NextResponse.json({ success: false, error: 'Forbidden: missing users:suspend permission' }, { status: 403 });
    }
  } else if (!hasPermission(sessionResult.session.role, 'users:update')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing users:update permission' }, { status: 403 });
  }

  const params = await context.params;
  const updated = await updateUserByUserId(params.userId, {
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(typeof parsed.data.banned === 'boolean' ? { banned: parsed.data.banned } : {}),
  });

  if (!updated) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'users.update',
    resource: 'users',
    resourceId: params.userId,
    reason: parsed.data.reason,
    after: updated as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ success: true, data: updated });
}
