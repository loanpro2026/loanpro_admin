import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { hasPermission } from '@/lib/rbac/permissions';
import { approveDeviceSwitch, revokeDevice } from '@/server/repositories/devices';
import { writeAuditLog } from '@/server/services/audit-log';

const patchSchema = z.object({
  action: z.enum(['revoke', 'approve_switch']),
  deviceId: z.string().min(1),
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
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const params = await context.params;
  if (parsed.data.action === 'revoke' && !hasPermission(sessionResult.session.role, 'devices:revoke')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing devices:revoke permission' }, { status: 403 });
  }

  if (parsed.data.action === 'approve_switch' && !hasPermission(sessionResult.session.role, 'devices:switch_approve')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing devices:switch_approve permission' }, { status: 403 });
  }

  let result: { before: unknown; after: unknown } | null = null;
  if (parsed.data.action === 'revoke') {
    result = await revokeDevice(params.userId, parsed.data.deviceId, parsed.data.reason);
  }

  if (parsed.data.action === 'approve_switch') {
    result = await approveDeviceSwitch(params.userId, parsed.data.deviceId);
  }

  if (!result) {
    return NextResponse.json({ success: false, error: 'User or device not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: `devices.${parsed.data.action}`,
    resource: 'devices',
    resourceId: `${params.userId}:${parsed.data.deviceId}`,
    reason: parsed.data.reason,
    before: result.before as Record<string, unknown>,
    after: result.after as Record<string, unknown>,
    metadata: {
      action: parsed.data.action,
      userId: params.userId,
      deviceId: parsed.data.deviceId,
    },
  });

  return NextResponse.json({ success: true, data: result.after });
}
