import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';
import { getEnv } from '@/config/env';
import { requireApiPermission } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { createTeamInvite } from '@/server/repositories/team';
import { writeAuditLog } from '@/server/services/audit-log';
import type { RoleKey } from '@/types/rbac';
import { invalidateCacheByPrefix } from '@/server/services/response-cache';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['super_admin', 'admin_ops', 'support_agent', 'finance_admin', 'analyst', 'viewer']),
  reason: z.string().min(3).max(240),
});

export async function POST(request: NextRequest) {
  const result = await requireApiPermission('team:invite');
  if ('response' in result) {
    return result.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = inviteSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const invite = await createTeamInvite({
    email: parsed.data.email,
    role: parsed.data.role as RoleKey,
    invitedBy: result.session.clerkUserId,
  });

  let clerkInvitationId: string | null = null;
  try {
    const env = getEnv();
    const redirectUrl = env.ADMIN_INVITE_REDIRECT_URL || `${env.NEXT_PUBLIC_APP_URL}/sign-in`;
    const client = await clerkClient();
    const created = await client.invitations.createInvitation({
      emailAddress: parsed.data.email,
      redirectUrl,
      publicMetadata: {
        adminRole: parsed.data.role,
      },
      ignoreExisting: true,
    });

    clerkInvitationId = String(created.id || '');
  } catch (error) {
    // Keep internal invite row even if Clerk invite call fails so operation can be retried.
    console.error('[team.invite] Clerk invitation creation failed', error);
  }

  await writeAuditLog({
    actor: result.session,
    action: 'team.invite',
    resource: 'team',
    resourceId: invite.email,
    reason: parsed.data.reason,
    after: {
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expiresAt: invite.expiresAt,
      clerkInvitationId,
    },
  });

  invalidateCacheByPrefix('team:list:');

  return NextResponse.json(
    {
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        clerkInvitationId,
      },
    },
    { status: 201 }
  );
}
