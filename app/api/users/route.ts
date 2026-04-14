import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';
import { hasPermission } from '@/lib/rbac/permissions';
import { requireApiPermission, requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { createUser, listUsers } from '@/server/repositories/users';
import { writeAuditLog } from '@/server/services/audit-log';
import { getCachedResponse, invalidateCacheByPrefixes, setCachedResponse } from '@/server/services/response-cache';

const createUserSchema = z.object({
  userId: z.string().trim().optional(),
  username: z.string().trim().min(2).max(64).optional(),
  email: z.string().trim().email(),
  fullName: z.string().trim().max(120).optional(),
  accessToken: z.string().trim().max(240).optional(),
  banned: z.boolean().optional(),
  status: z.string().trim().max(32).optional(),
  syncWithClerk: z.boolean().optional(),
  sendPasswordSetup: z.boolean().optional(),
  reason: z.string().trim().min(3).max(240),
});

function splitName(fullName: string) {
  const [firstName, ...rest] = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: firstName || undefined,
    lastName: rest.join(' ') || undefined,
  };
}

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('users:read');
  if ('response' in result) {
    return result.response;
  }

  const cacheKey = `users:list:${request.nextUrl.search}`;
  const cached = getCachedResponse<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || 'all').trim().toLowerCase() as 'all' | 'active' | 'banned';
  const limit = Number(searchParams.get('limit') || '50');
  const skip = Number(searchParams.get('skip') || '0');
  const sortBy = String(searchParams.get('sortBy') || 'createdAt').trim().toLowerCase() as
    | 'createdAt'
    | 'updatedAt'
    | 'email'
    | 'username';
  const sortDir = String(searchParams.get('sortDir') || 'desc').trim().toLowerCase() as 'asc' | 'desc';

  const users = await listUsers({ search, status, limit, skip, sortBy, sortDir });
  const payload = {
    success: true,
    data: users.items,
    meta: {
      total: users.total,
      limit,
      skip,
      hasMore: skip + users.items.length < users.total,
      sortBy,
      sortDir,
    },
  };

  setCachedResponse(cacheKey, payload, 15000);
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  if (!hasPermission(sessionResult.session.role, 'users:create')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing users:create permission' }, { status: 403 });
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = createUserSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const payload = parsed.data;
  const syncWithClerk = payload.syncWithClerk !== false;

  if (!syncWithClerk && !payload.userId) {
    return NextResponse.json({ success: false, error: 'userId is required when syncWithClerk is false' }, { status: 400 });
  }

  if (!payload.username && !syncWithClerk) {
    return NextResponse.json({ success: false, error: 'username is required when syncWithClerk is false' }, { status: 400 });
  }

  let effectiveUserId = String(payload.userId || '').trim();
  let effectiveUsername = String(payload.username || '').trim();
  let clerkInvitationId: string | null = null;
  let createdClerkUserId: string | null = null;

  if (syncWithClerk) {
    try {
      const client = await clerkClient();
      if (effectiveUserId && effectiveUserId.startsWith('user_')) {
        const existing = await client.users.getUser(effectiveUserId);
        effectiveUserId = String(existing.id || '').trim();
        effectiveUsername = String(existing.username || effectiveUsername || '').trim();
      } else {
        const names = splitName(String(payload.fullName || ''));
        const created = await client.users.createUser({
          emailAddress: [String(payload.email).toLowerCase()],
          username: effectiveUsername || undefined,
          firstName: names.firstName,
          lastName: names.lastName,
          skipPasswordChecks: true,
          skipPasswordRequirement: true,
          unsafeMetadata: {
            source: 'admin-panel',
            createdBy: sessionResult.session.clerkUserId,
          },
        } as never);

        effectiveUserId = String(created.id || '').trim();
        createdClerkUserId = effectiveUserId;
        effectiveUsername = String(created.username || effectiveUsername || '').trim();
      }

      if (payload.sendPasswordSetup !== false) {
        try {
          const invitation = await client.invitations.createInvitation({
            emailAddress: String(payload.email).toLowerCase(),
            ignoreExisting: true,
            publicMetadata: { source: 'admin-panel-customer' },
          });
          clerkInvitationId = String(invitation.id || '');
        } catch {
          // Best-effort only; user creation continues even if invite email fails.
        }
      }
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? `Failed to sync Clerk user: ${error.message}` : 'Failed to sync Clerk user',
        },
        { status: 502 }
      );
    }
  }

  if (!effectiveUserId) {
    effectiveUserId = `local_${Date.now()}`;
  }
  if (!effectiveUsername) {
    effectiveUsername = String(payload.email).split('@')[0] || `user_${Date.now()}`;
  }

  const created = await createUser({
    userId: effectiveUserId,
    clerkUserId: syncWithClerk ? effectiveUserId : undefined,
    username: effectiveUsername,
    email: String(payload.email).toLowerCase(),
    fullName: String(payload.fullName || '').trim(),
    accessToken: typeof payload.accessToken === 'string' ? payload.accessToken : null,
    banned: payload.banned,
    status: payload.status,
  });

  if (!created.ok) {
    if (createdClerkUserId) {
      try {
        const client = await clerkClient();
        await client.users.deleteUser(createdClerkUserId);
      } catch {
        // Ignore rollback failure; operator can reconcile manually.
      }
    }

    const error = created.reason === 'conflict_admin_identity'
      ? 'Cannot create a customer using an admin identity'
      : 'User with same userId, username, or email already exists';
    return NextResponse.json({ success: false, error }, { status: 409 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'users.create',
    resource: 'users',
    resourceId: effectiveUserId,
    reason: payload.reason,
    after: {
      userId: effectiveUserId,
      email: String(payload.email).toLowerCase(),
      clerkSynced: syncWithClerk,
      clerkInvitationId,
    },
  });

  invalidateCacheByPrefixes(['users:list:', 'dashboard:', 'subscriptions:list:']);

  return NextResponse.json(
    {
      success: true,
      data: created.data,
      meta: {
        clerkSynced: syncWithClerk,
        clerkInvitationId,
      },
    },
    { status: 201 }
  );
}
