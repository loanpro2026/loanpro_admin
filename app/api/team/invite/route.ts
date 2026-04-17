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
import { getTeamMemberByEmail, upsertTeamMemberFromIdentity } from '@/server/repositories/team';

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

function toErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const maybeErrors = (error as { errors?: Array<{ code?: string }> }).errors;
    if (Array.isArray(maybeErrors) && maybeErrors.length > 0) {
      const first = maybeErrors[0];
      if (first?.code) return String(first.code).trim().toLowerCase();
    }
  }
  return '';
}

function extractInvitationId(record: unknown) {
  if (typeof record !== 'object' || record === null) return '';
  const id = (record as { id?: unknown }).id;
  return String(id || '').trim();
}

function extractInvitationRows(response: unknown) {
  if (typeof response !== 'object' || response === null) return [] as unknown[];

  const direct = (response as { data?: unknown }).data;
  if (Array.isArray(direct)) return direct;

  if (Array.isArray(response)) return response;
  return [] as unknown[];
}

async function createClerkInvite(params: {
  email: string;
  role: string;
  redirectUrl: string;
  ignoreExisting: boolean;
}) {
  const client = await clerkClient();
  const created = await client.invitations.createInvitation({
    emailAddress: params.email,
    redirectUrl: params.redirectUrl,
    publicMetadata: {
      adminRole: params.role,
    },
    notify: true,
    ignoreExisting: params.ignoreExisting,
  });

  return String(created.id || '').trim();
}

async function tryGrantExistingClerkUserAccess(params: {
  email: string;
  role: RoleKey;
  invitedBy: string;
}) {
  const client = await clerkClient();
  const response = await client.users.getUserList({
    emailAddress: [params.email],
    limit: 1,
  });

  const rows = Array.isArray((response as { data?: unknown[] })?.data)
    ? ((response as { data?: unknown[] }).data as Array<Record<string, unknown>>)
    : [];
  const user = rows[0];
  if (!user) {
    return null;
  }

  const clerkUserId = String(user.id || '').trim();
  const firstName = String(user.firstName || '').trim();
  const lastName = String(user.lastName || '').trim();
  const username = String(user.username || '').trim();
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || username || params.email;

  if (!clerkUserId) {
    return null;
  }

  const adminUser = await upsertTeamMemberFromIdentity({
    clerkUserId,
    email: params.email,
    displayName,
    role: params.role,
    invitedBy: params.invitedBy,
  });

  return {
    clerkUserId,
    displayName,
    adminUser,
  };
}

async function resendAfterRevokingExistingInvite(email: string, role: string, redirectUrl: string) {
  const client = await clerkClient();
  const listResponse = await client.invitations.getInvitationList({
    query: email,
    status: 'pending',
    limit: 20,
  });

  const rows = extractInvitationRows(listResponse);
  const target = rows.find((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const itemEmail = String((item as { emailAddress?: unknown }).emailAddress || '').trim().toLowerCase();
    return itemEmail === email;
  });

  const invitationId = extractInvitationId(target);
  if (!invitationId) {
    throw new Error('Existing invitation was detected but could not be resolved for resend');
  }

  await client.invitations.revokeInvitation(invitationId);
  return createClerkInvite({ email, role, redirectUrl, ignoreExisting: false });
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
  let inviteMessage = 'Invitation email sent successfully';
  try {
    clerkInvitationId = await createClerkInvite({
      email: normalizedEmail,
      role: parsed.data.role,
      redirectUrl,
      ignoreExisting: false,
    });
    if (!clerkInvitationId) {
      throw new Error('Invitation API returned no invitation id');
    }
  } catch (error) {
    const code = toErrorCode(error);
    const reason = toErrorMessage(error);
    console.error('[team.invite] Clerk invitation creation failed', error);

    if (
      code.includes('already_exists') ||
      code.includes('identifier_exists') ||
      reason.toLowerCase().includes('already invited') ||
      reason.toLowerCase().includes('already exists')
    ) {
      try {
        clerkInvitationId = await resendAfterRevokingExistingInvite(normalizedEmail, parsed.data.role, redirectUrl);
        if (!clerkInvitationId) {
          throw new Error('Resend flow did not return a valid invitation id');
        }
        inviteMessage = 'Existing invite was refreshed and invitation email was resent successfully';
      } catch (resendError) {
        const resendReason = toErrorMessage(resendError);
        const resendCode = toErrorCode(resendError);

        if (resendCode.includes('unprocessable') || resendReason.toLowerCase().includes('unprocessable')) {
          try {
            const granted = await tryGrantExistingClerkUserAccess({
              email: normalizedEmail,
              role: parsed.data.role,
              invitedBy: result.session.clerkUserId,
            });

            if (granted) {
              await writeAuditLog({
                actor: result.session,
                action: 'team.invite_existing_user_granted',
                resource: 'team',
                resourceId: normalizedEmail,
                reason: parsed.data.reason,
                after: {
                  email: normalizedEmail,
                  role: parsed.data.role,
                  clerkUserId: granted.clerkUserId,
                  mode: 'direct-access',
                },
              });

              invalidateCacheByPrefix('team:list:');

              return NextResponse.json(
                {
                  success: true,
                  data: {
                    email: normalizedEmail,
                    role: parsed.data.role,
                    status: 'active',
                    message:
                      'This email already has a Clerk account. Admin access has been granted directly; ask the user to sign in now.',
                  },
                },
                { status: 201 }
              );
            }
          } catch (grantError) {
            const grantReason = toErrorMessage(grantError);
            return NextResponse.json(
              {
                success: false,
                error: `Automatic resend failed and direct access fallback failed: ${grantReason}`,
              },
              { status: 502 }
            );
          }
        }

        return NextResponse.json(
          {
            success: false,
            error: `An invitation already exists for this email, and automatic resend failed: ${resendReason}`,
          },
          { status: 502 }
        );
      }
    }
    else if (
      code.includes('redirect') ||
      reason.toLowerCase().includes('redirect') ||
      reason.toLowerCase().includes('origin')
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invite configuration error: redirect URL is not allowed by Clerk. Add your sign-in URL to Clerk allowed redirect URLs.',
        },
        { status: 500 }
      );
    }

    else {
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
          error: `Invite email was not sent by Clerk: ${reason}`,
        },
        { status: 502 }
      );
    }
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
        message: inviteMessage,
      },
    },
    { status: 201 }
  );
}
