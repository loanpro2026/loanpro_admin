import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { countActiveSuperAdmins, getTeamMemberById, updateTeamMember } from '@/server/repositories/team';
import { writeAuditLog } from '@/server/services/audit-log';
import { hasPermission } from '@/lib/rbac/permissions';
import { invalidateCacheByPrefix } from '@/server/services/response-cache';

const teamPatchSchema = z.object({
  role: z.enum(['super_admin', 'admin_ops', 'support_agent', 'finance_admin', 'analyst', 'viewer']).optional(),
  status: z.enum(['active', 'inactive', 'deactivated']).optional(),
  reason: z.string().min(3).max(240),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ adminUserId: string }> }) {
  const result = await requireApiSession();
  if ('response' in result) {
    return result.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = teamPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  if (!parsed.data.role && !parsed.data.status) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
  }

  if (parsed.data.role && !hasPermission(result.session.role, 'team:role_assign')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing team:role_assign permission' }, { status: 403 });
  }

  if (parsed.data.status && !hasPermission(result.session.role, 'team:deactivate')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing team:deactivate permission' }, { status: 403 });
  }

  const params = await context.params;
  const existing = await getTeamMemberById(params.adminUserId);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Admin user not found' }, { status: 404 });
  }

  const nextRole = parsed.data.role || existing.role;
  const nextStatus = parsed.data.status || existing.status;
  const currentlyActiveSuperAdmin = existing.role === 'super_admin' && existing.status === 'active';
  const willRemainActiveSuperAdmin = nextRole === 'super_admin' && nextStatus === 'active';

  if (currentlyActiveSuperAdmin && !willRemainActiveSuperAdmin) {
    const activeSuperAdminCount = await countActiveSuperAdmins();
    if (activeSuperAdminCount <= 1) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove or deactivate the last active super admin' },
        { status: 400 }
      );
    }
  }

  const updated = await updateTeamMember(params.adminUserId, {
    role: parsed.data.role,
    status: parsed.data.status,
  });

  if (!updated) {
    return NextResponse.json({ success: false, error: 'Admin user not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: result.session,
    action: 'team.update',
    resource: 'team',
    resourceId: params.adminUserId,
    reason: parsed.data.reason,
    after: updated as unknown as Record<string, unknown>,
  });

  invalidateCacheByPrefix('team:list:');

  return NextResponse.json({ success: true, data: updated });
}
