import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { getAdminSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/rbac/permissions';
import type { Permission } from '@/types/rbac';

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    const authState = await auth();
    redirect(authState.userId ? '/unauthorized' : '/sign-in');
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAdminSession();
  if (!hasPermission(session.role, permission)) {
    redirect('/unauthorized');
  }
  return session;
}
