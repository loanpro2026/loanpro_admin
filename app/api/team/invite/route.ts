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
import { getTeamMemberByEmail } from '@/server/repositories/team';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['super_admin', 'admin_ops', 'support_agent', 'finance_admin', 'analyst', 'viewer']),
  reason: z.string().min(3).max(240),
});

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeErrors = (error as { errors?: Array<{ message?: string }> }).errors;
    if (Array.isArray(maybeErrors) && maybeErrors.length > 0) {
      const first = maybeErrors[0];
      if (first?.message) return first.message;
    }
  }

  return 'Unknown Clerk invitation error';
}

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

  const normalizedEmail = String(parsed.data.email || '').trim().toLowerCase();
  const existingMember = await getTeamMemberByEmail(normalizedEmail);
  if (existingMember) {
    return NextResponse.json(
      { success: false, error: 'This user is already part of the admin team. Update role/status from Team Management.' },
      { status: 409 }
    );
  }

  const env = getEnv();
  const redirectUrl = env.ADMIN_INVITE_REDIRECT_URL || `${env.NEXT_PUBLIC_APP_URL}/sign-in`;

  let clerkInvitationId = '';
  try {
    const client = await clerkClient();
    const created = await client.invitations.createInvitation({
      emailAddress: normalizedEmail,
      redirectUrl,
      publicMetadata: {
        adminRole: parsed.data.role,
      },
      ignoreExisting: false,
    });

    clerkInvitationId = String(created.id || '').trim();
    if (!clerkInvitationId) {
      throw new Error('Invitation API returned no invitation id');
    }
  } catch (error) {
    const reason = toErrorMessage(error);
    console.error('[team.invite] Clerk invitation creation failed', error);

    await writeAuditLog({
      actor: result.session,
      action: 'team.invite_failed',
      resource: 'team',
      resourceId: normalizedEmail,
      reason: parsed.data.reason,
      after: {
        email: normalizedEmail,
        role: parsed.data.role,
        deliveryError: reason,
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: `Invite email was not sent: ${reason}`,
      },
      { status: 502 }
    );
  }

  const invite = await createTeamInvite({
    email: normalizedEmail,
    role: parsed.data.role as RoleKey,
    invitedBy: result.session.clerkUserId,
  });

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
        message: 'Invitation email sent successfully',
      },
    },
    { status: 201 }
  );
}
