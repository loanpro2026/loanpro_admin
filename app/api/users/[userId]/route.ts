import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { hasPermission } from '@/lib/rbac/permissions';
import { deleteUserByUserId, findUserByUserId, updateUserByUserId } from '@/server/repositories/users';
import { writeAuditLog } from '@/server/services/audit-log';
import { invalidateCacheByPrefixes } from '@/server/services/response-cache';

const updateUserSchema = z.object({
  email: z.string().trim().email().optional(),
  username: z.string().trim().min(2).max(64).optional(),
  fullName: z.string().trim().max(120).optional(),
  accessToken: z.string().trim().max(240).nullable().optional(),
  banned: z.boolean().optional(),
  status: z.string().optional(),
  reason: z.string().min(3).max(240),
});

function splitName(fullName: string) {
  const [firstName, ...rest] = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: firstName || undefined,
    lastName: rest.join(' ') || undefined,
  };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = updateUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  if (
    typeof parsed.data.email !== 'string' &&
    typeof parsed.data.username !== 'string' &&
    typeof parsed.data.fullName !== 'string' &&
    typeof parsed.data.accessToken === 'undefined' &&
    typeof parsed.data.status !== 'string' &&
    typeof parsed.data.banned !== 'boolean'
  ) {
    return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
  }

  if (typeof parsed.data.banned === 'boolean') {
    if (!hasPermission(sessionResult.session.role, 'users:suspend')) {
      return NextResponse.json({ success: false, error: 'Forbidden: missing users:suspend permission' }, { status: 403 });
    }
  } else if (!hasPermission(sessionResult.session.role, 'users:update')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing users:update permission' }, { status: 403 });
  }

  const params = await context.params;
  const before = await findUserByUserId(params.userId);
  if (!before) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const maybeClerkUserId = String((before as { clerkUserId?: unknown; userId?: unknown }).clerkUserId || (before as { userId?: unknown }).userId || '').trim();
  if (maybeClerkUserId.startsWith('user_')) {
    try {
      const client = await clerkClient();

      if (typeof parsed.data.username === 'string' || typeof parsed.data.fullName === 'string') {
        const names = splitName(String(parsed.data.fullName || (before as { fullName?: unknown }).fullName || ''));
        await client.users.updateUser(maybeClerkUserId, {
          ...(typeof parsed.data.username === 'string' ? { username: parsed.data.username.trim() } : {}),
          ...(typeof parsed.data.fullName === 'string' ? { firstName: names.firstName, lastName: names.lastName } : {}),
        });
      }

      if (typeof parsed.data.email === 'string') {
        const clerkUser = await client.users.getUser(maybeClerkUserId);
        const targetEmail = parsed.data.email.trim().toLowerCase();
        const existingEmail = Array.isArray((clerkUser as { emailAddresses?: Array<{ emailAddress?: string; id?: string; verification?: { status?: string } }> }).emailAddresses)
          ? (clerkUser as { emailAddresses?: Array<{ emailAddress?: string; id?: string; verification?: { status?: string } }> }).emailAddresses?.find((item) => String(item.emailAddress || '').trim().toLowerCase() === targetEmail)
          : null;

        if (existingEmail?.id) {
          await client.emailAddresses.updateEmailAddress(existingEmail.id, {
            verified: true,
            primary: true,
          });
        } else {
          await client.emailAddresses.createEmailAddress({
            userId: maybeClerkUserId,
            emailAddress: targetEmail,
            verified: true,
            primary: true,
          });
        }
      }

      if (typeof parsed.data.banned === 'boolean') {
        if (parsed.data.banned) {
          await client.users.banUser(maybeClerkUserId);
        } else {
          await client.users.unbanUser(maybeClerkUserId);
        }
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? `Failed to sync Clerk user: ${error.message}` : 'Failed to sync Clerk user' },
        { status: 502 }
      );
    }
  }

  const updated = await updateUserByUserId(params.userId, {
    ...(parsed.data.email ? { email: parsed.data.email } : {}),
    ...(parsed.data.username ? { username: parsed.data.username } : {}),
    ...(typeof parsed.data.fullName === 'string' ? { fullName: parsed.data.fullName } : {}),
    ...(typeof parsed.data.accessToken !== 'undefined' ? { accessToken: parsed.data.accessToken } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(typeof parsed.data.banned === 'boolean' ? { banned: parsed.data.banned } : {}),
  });

  if (!updated || (updated as { _error?: string })._error === 'duplicate_email') {
    return NextResponse.json({ success: false, error: 'Email already used by another user' }, { status: 409 });
  }

  if ((updated as { _error?: string })._error === 'duplicate_username') {
    return NextResponse.json({ success: false, error: 'Username already used by another user' }, { status: 409 });
  }

  if (!updated) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'users.update',
    resource: 'users',
    resourceId: params.userId,
    reason: parsed.data.reason,
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
  });

  invalidateCacheByPrefixes(['users:list:', 'subscriptions:list:', 'payments:list:', 'dashboard:']);

  return NextResponse.json({ success: true, data: updated });
}

const deleteUserSchema = z.object({
  reason: z.string().trim().min(3).max(240),
});

export async function DELETE(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  if (!hasPermission(sessionResult.session.role, 'users:delete')) {
    return NextResponse.json({ success: false, error: 'Forbidden: missing users:delete permission' }, { status: 403 });
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = deleteUserSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const params = await context.params;
  const before = await findUserByUserId(params.userId);
  if (!before) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const maybeClerkUserId = String((before as { clerkUserId?: unknown; userId?: unknown }).clerkUserId || (before as { userId?: unknown }).userId || '').trim();
  if (maybeClerkUserId.startsWith('user_')) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(maybeClerkUserId);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? `Failed to delete Clerk user: ${error.message}` : 'Failed to delete Clerk user' },
        { status: 502 }
      );
    }
  }

  const removed = await deleteUserByUserId(params.userId);
  if (!removed) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: 'users.delete',
    resource: 'users',
    resourceId: params.userId,
    reason: parsed.data.reason,
    before: before as unknown as Record<string, unknown>,
    after: null,
  });

  invalidateCacheByPrefixes(['users:list:', 'subscriptions:list:', 'payments:list:', 'dashboard:']);

  return NextResponse.json({ success: true, data: { userId: params.userId, deleted: true } });
}
