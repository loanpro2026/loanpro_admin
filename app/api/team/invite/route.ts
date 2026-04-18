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
import { getPendingTeamInviteByEmail, getTeamMemberByEmail } from '@/server/repositories/team';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['super_admin', 'admin', 'admin_ops', 'support_agent', 'finance_admin', 'analyst', 'viewer']),
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

async function sendInviteReminderEmail(params: {
  email: string;
  role: RoleKey;
  redirectUrl: string;
  appUrl: string;
  reason: string;
}) {
  const env = getEnv();
  const brevoKey = String(env.BREVO_API_KEY || '').trim();
  if (!brevoKey) {
    throw new Error('BREVO_API_KEY is not configured for email resend fallback');
  }

  const fromEmail = String(env.ADMIN_FROM_EMAIL || 'admin@loanpro.tech').trim().toLowerCase();
  const roleLabel = String(params.role || 'viewer').replace(/_/g, ' ');
  const signInUrl = `${params.appUrl.replace(/\/$/, '')}/sign-in`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': brevoKey,
    },
    body: JSON.stringify({
      sender: { name: 'LoanPro Admin', email: fromEmail },
      to: [{ email: params.email }],
      subject: 'LoanPro Admin Invite Reminder',
      htmlContent: `
        <p>You have an active invite request for <strong>LoanPro Admin</strong>.</p>
        <p>Assigned role: <strong>${roleLabel}</strong></p>
        <p>Invite note: ${params.reason}</p>
        <p>Please sign in to continue:</p>
        <p><a href="${signInUrl}">${signInUrl}</a></p>
        <p>If prompted, continue with the same email account: <strong>${params.email}</strong>.</p>
      `,
      textContent: `You have an active LoanPro Admin invite request. Assigned role: ${roleLabel}. Invite note: ${params.reason}. Sign in here: ${signInUrl}. Use email: ${params.email}`,
    }),
  });

  if (!response.ok) {
    let details = '';
    try {
      const json = await response.json();
      details = String((json as { message?: string })?.message || '').trim();
    } catch {
      // Ignore parse errors
    }
    throw new Error(details || `Brevo email API failed (${response.status})`);
  }

  return fromEmail;
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
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const redirectUrl = env.ADMIN_INVITE_REDIRECT_URL || `${env.NEXT_PUBLIC_APP_URL}/sign-in`;
  const fromEmail = String(env.ADMIN_FROM_EMAIL || 'admin@loanpro.tech').trim().toLowerCase();

  const existingPendingInvite = await getPendingTeamInviteByEmail(normalizedEmail);
  if (existingPendingInvite) {
    const refreshedInvite = await createTeamInvite({
      email: normalizedEmail,
      role: parsed.data.role as RoleKey,
      invitedBy: result.session.clerkUserId,
    });

    try {
      await sendInviteReminderEmail({
        email: normalizedEmail,
        role: parsed.data.role,
        redirectUrl,
        appUrl,
        reason: parsed.data.reason,
      });
    } catch (emailError) {
      const reason = toErrorMessage(emailError);
      return NextResponse.json(
        {
          success: false,
          error: `Invite exists in storage, but reminder email from ${fromEmail} failed: ${reason}`,
        },
        { status: 502 }
      );
    }

    await writeAuditLog({
      actor: result.session,
      action: 'team.invite_resent',
      resource: 'team',
      resourceId: normalizedEmail,
      reason: parsed.data.reason,
      after: {
        email: refreshedInvite.email,
        role: refreshedInvite.role,
        status: refreshedInvite.status,
        expiresAt: refreshedInvite.expiresAt,
        channel: 'admin-reminder-email',
      },
    });

    invalidateCacheByPrefix('team:list:');

    return NextResponse.json(
      {
        success: true,
        data: {
          email: refreshedInvite.email,
          role: refreshedInvite.role,
          status: refreshedInvite.status,
          expiresAt: refreshedInvite.expiresAt,
          clerkInvitationId: null,
          message: `Existing invite found in storage and reminder email sent from ${fromEmail}.`,
        },
      },
      { status: 201 }
    );
  }

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
            await sendInviteReminderEmail({
              email: normalizedEmail,
              role: parsed.data.role,
              redirectUrl,
              appUrl,
              reason: parsed.data.reason,
            });
            clerkInvitationId = '';
            inviteMessage = 'Invite reminder email sent successfully.';
          } catch (grantError) {
            const grantReason = toErrorMessage(grantError);
            return NextResponse.json(
              {
                success: false,
                error: `Automatic resend failed, and reminder email fallback failed: ${grantReason}`,
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
