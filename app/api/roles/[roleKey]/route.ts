import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteRoleByKey, updateRoleByKey } from '@/server/repositories/roles';
import { requireApiPermission } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { writeAuditLog } from '@/server/services/audit-log';
import { ALL_PERMISSIONS } from '@/lib/rbac/permissions';
import type { Permission } from '@/types/rbac';

const updateRoleSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(240).optional(),
  permissions: z.array(z.string()).refine(
    (values) => values.every((value) => ALL_PERMISSIONS.includes(value as Permission)),
    'Invalid permissions provided'
  ).optional(),
  reason: z.string().min(3).max(240),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ roleKey: string }> }) {
  const result = await requireApiPermission('roles:update');
  if ('response' in result) {
    return result.response;
  }

  const params = await context.params;
  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = updateRoleSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const updatedRole = await updateRoleByKey(params.roleKey, {
    name: parsed.data.name,
    description: parsed.data.description,
    permissions: parsed.data.permissions as Permission[] | undefined,
  });

  if (!updatedRole) {
    return NextResponse.json({ success: false, error: 'Role not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: result.session,
    action: 'roles.update',
    resource: 'roles',
    resourceId: params.roleKey,
    reason: parsed.data.reason,
    after: updatedRole as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ success: true, data: updatedRole });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ roleKey: string }> }) {
  const result = await requireApiPermission('roles:delete');
  if ('response' in result) {
    return result.response;
  }

  const params = await context.params;
  const payloadResult = await request
    .json()
    .then((payload) => payload as { reason?: string })
    .catch(() => ({ reason: '' }));

  const reasonFromBody = String(payloadResult.reason || '').trim();
  const reasonFromQuery = String(request.nextUrl.searchParams.get('reason') || '').trim();
  const reason = reasonFromBody || reasonFromQuery;
  if (!reason || reason.length < 3) {
    return NextResponse.json({ success: false, error: 'A reason is required to delete a role' }, { status: 400 });
  }

  const deleteResult = await deleteRoleByKey(params.roleKey);

  if (!deleteResult.deletedCount) {
    return NextResponse.json({ success: false, error: 'Role not found or cannot be deleted' }, { status: 404 });
  }

  await writeAuditLog({
    actor: result.session,
    action: 'roles.delete',
    resource: 'roles',
    resourceId: params.roleKey,
    reason,
  });

  return NextResponse.json({ success: true });
}
