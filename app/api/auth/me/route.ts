import { NextResponse } from 'next/server';
import { requireApiSession } from '@/server/api/guards';

export async function GET() {
  const result = await requireApiSession();
  if ('response' in result) {
    return result.response;
  }

  return NextResponse.json({
    success: true,
    data: {
      adminUserId: result.session.adminUserId,
      clerkUserId: result.session.clerkUserId,
      email: result.session.email,
      role: result.session.role,
      permissions: result.session.permissions,
    },
  });
}
