import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiPermission } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { getAdminSettings, updateAdminSettings } from '@/server/repositories/settings';
import { writeAuditLog } from '@/server/services/audit-log';

const settingsPatchSchema = z.object({
  support: z
    .object({
      defaultAssignee: z.string().max(120).optional(),
      slaHours: z.number().int().min(1).max(168).optional(),
    })
    .optional(),
  billing: z
    .object({
      refundApprovalThreshold: z.number().nonnegative().max(10000000).optional(),
      autoReconcile: z.boolean().optional(),
    })
    .optional(),
  security: z
    .object({
      enforceMfa: z.boolean().optional(),
      sessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
    })
    .optional(),
  features: z
    .object({
      enableContactAutoAssign: z.boolean().optional(),
      enableRefundQueueAlerts: z.boolean().optional(),
    })
    .optional(),
  notifications: z
    .object({
      retentionDays: z.number().int().min(1).max(365).optional(),
    })
    .optional(),
  reason: z.string().min(3).max(240),
});

export async function GET() {
  const result = await requireApiPermission('settings:read');
  if ('response' in result) {
    return result.response;
  }

  const settings = await getAdminSettings();
  return NextResponse.json({ success: true, data: settings });
}

export async function PATCH(request: NextRequest) {
  const result = await requireApiPermission('settings:update');
  if ('response' in result) {
    return result.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = settingsPatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const hasChange =
    Boolean(parsed.data.support) ||
    Boolean(parsed.data.billing) ||
    Boolean(parsed.data.security) ||
    Boolean(parsed.data.features) ||
    Boolean(parsed.data.notifications);

  if (!hasChange) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
  }

  const updated = await updateAdminSettings(
    {
      support: parsed.data.support,
      billing: parsed.data.billing,
      security: parsed.data.security,
      features: parsed.data.features,
      notifications: parsed.data.notifications,
    },
    result.session.email
  );

  if (!updated.changed) {
    return NextResponse.json({ success: false, error: 'No effective setting changes detected' }, { status: 400 });
  }

  await writeAuditLog({
    actor: result.session,
    action: 'settings.update',
    resource: 'settings',
    resourceId: 'global',
    reason: parsed.data.reason,
    before: updated.before as unknown as Record<string, unknown>,
    after: updated.after as unknown as Record<string, unknown>,
    metadata: {
      changedSections: Object.keys(parsed.data).filter((key) => key !== 'reason'),
    },
  });

  return NextResponse.json({ success: true, data: updated.after });
}