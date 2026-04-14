import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { listUsers } from '@/server/repositories/users';

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('users:read');
  if ('response' in result) {
    return result.response;
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || 'all').trim().toLowerCase() as 'all' | 'active' | 'banned';
  const limit = Number(searchParams.get('limit') || '50');

  const users = await listUsers({ search, status, limit });
  return NextResponse.json({ success: true, data: users });
}
