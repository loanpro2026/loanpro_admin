import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { getAdminProfileByClerkUserId, updateAdminProfileByClerkUserId } from '@/server/repositories/profile';
import { writeAuditLog } from '@/server/services/audit-log';

const profilePatchSchema = z.object({
  displayName: z.string().min(2).max(120).optional(),
  timezone: z.string().min(2).max(80).optional(),
  notificationEmail: z.string().email().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});

export async function GET() {
  const result = await requireApiSession();
  if ('response' in result) {
    return result.response;
  }

  const profile = await getAdminProfileByClerkUserId(result.session.clerkUserId, result.session.email);
  return NextResponse.json({ success: true, data: profile });
}

export async function PATCH(request: NextRequest) {
  const result = await requireApiSession();
  if ('response' in result) {
    return result.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = profilePatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const hasChange =
    typeof parsed.data.displayName === 'string' ||
    typeof parsed.data.timezone === 'string' ||
    typeof parsed.data.notificationEmail === 'string' ||
    typeof parsed.data.emailNotificationsEnabled === 'boolean';

  if (!hasChange) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
  }

  const updated = await updateAdminProfileByClerkUserId(result.session.clerkUserId, {
    displayName: parsed.data.displayName,
    timezone: parsed.data.timezone,
    notificationEmail: parsed.data.notificationEmail,
    emailNotificationsEnabled: parsed.data.emailNotificationsEnabled,
  });

  if (!updated) {
    return NextResponse.json({ success: false, error: 'Admin profile not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: result.session,
    action: 'profile.update',
    resource: 'profile',
    resourceId: result.session.clerkUserId,
    reason: 'Admin updated own profile preferences',
    before: updated.before as Record<string, unknown>,
    after: updated.after as Record<string, unknown>,
    metadata: {
      selfService: true,
    },
  });

  return NextResponse.json({ success: true, data: updated.after });
}