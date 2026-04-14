import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCustomRole, listRoles, syncSystemRoles } from '@/server/repositories/roles';
import { requireApiPermission } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { writeAuditLog } from '@/server/services/audit-log';
import { ALL_PERMISSIONS } from '@/lib/rbac/permissions';
import type { Permission } from '@/types/rbac';

const createRoleSchema = z.object({
  key: z.string().min(2).max(64).regex(/^[a-z0-9_:-]+$/),
  name: z.string().min(2).max(80),
  description: z.string().max(240).default(''),
  permissions: z.array(z.string()).refine(
    (values) => values.every((value) => ALL_PERMISSIONS.includes(value as Permission)),
    'Invalid permissions provided'
  ).default([]),
  reason: z.string().min(3).max(240),
});

export async function GET() {
  const result = await requireApiPermission('roles:read');
  if ('response' in result) {
    return result.response;
  }

  await syncSystemRoles();
  const roles = await listRoles();
  return NextResponse.json({ success: true, data: roles });
}

export async function POST(request: NextRequest) {
  const result = await requireApiPermission('roles:create');
  if ('response' in result) {
    return result.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = createRoleSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const role = await createCustomRole({
    key: parsed.data.key,
    name: parsed.data.name,
    description: parsed.data.description,
    permissions: parsed.data.permissions as Permission[],
  });

  await writeAuditLog({
    actor: result.session,
    action: 'roles.create',
    resource: 'roles',
    resourceId: role.key,
    reason: parsed.data.reason,
    after: role as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ success: true, data: role }, { status: 201 });
}
