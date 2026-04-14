import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getEnv } from '@/config/env';
import { getAdminSession } from '@/lib/auth/session';
import { ROLE_PERMISSIONS } from '@/lib/rbac/permissions';
import { hasPermission } from '@/lib/rbac/permissions';
import type { AdminSession } from '@/lib/auth/session';
import type { Permission } from '@/types/rbac';

export function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function getBypassSession(): Promise<AdminSession | null> {
  const env = getEnv();
  if (env.NODE_ENV === 'production') {
    return null;
  }

  const bypassKey = String(env.ADMIN_DEV_BYPASS_KEY || '').trim();
  if (!bypassKey) {
    return null;
  }

  const headerStore = await headers();
  const providedKey = String(headerStore.get('x-admin-dev-bypass-key') || '').trim();
  if (!providedKey || providedKey !== bypassKey) {
    return null;
  }

  return {
    adminUserId: 'dev-bypass-admin',
    clerkUserId: 'dev-bypass-admin',
    email: 'dev-admin@local.loanpro',
    role: 'super_admin',
    permissions: ROLE_PERMISSIONS.super_admin,
  };
}

export async function requireApiSession(): Promise<{ session: AdminSession } | { response: NextResponse }> {
  const bypassSession = await getBypassSession();
  if (bypassSession) {
    return { session: bypassSession };
  }

  const session = await getAdminSession();
  if (!session) {
    return { response: jsonError('Unauthorized', 401) };
  }
  return { session };
}

export async function requireApiPermission(permission: Permission): Promise<{ session: AdminSession } | { response: NextResponse }> {
  const result = await requireApiSession();
  if ('response' in result) {
    return result;
  }

  if (!hasPermission(result.session.role, permission)) {
    return { response: jsonError('Forbidden', 403) };
  }

  return result;
}
