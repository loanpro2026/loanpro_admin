import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { listTeamMembers } from '@/server/repositories/team';
import { getCachedResponse, setCachedResponse } from '@/server/services/response-cache';

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('team:read');
  if ('response' in result) {
    return result.response;
  }

  const cacheKey = `team:list:${request.nextUrl.search}`;
  const cached = getCachedResponse<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const role = String(searchParams.get('role') || 'all').trim().toLowerCase() as
    | 'all'
    | 'super_admin'
    | 'admin_ops'
    | 'support_agent'
    | 'finance_admin'
    | 'analyst'
    | 'viewer';
  const status = String(searchParams.get('status') || 'all').trim().toLowerCase() as
    | 'all'
    | 'active'
    | 'inactive'
    | 'deactivated';
  const limit = Number(searchParams.get('limit') || '50');
  const skip = Number(searchParams.get('skip') || '0');
  const sortBy = String(searchParams.get('sortBy') || 'createdAt').trim().toLowerCase() as
    | 'createdAt'
    | 'updatedAt'
    | 'email'
    | 'displayName';
  const sortDir = String(searchParams.get('sortDir') || 'desc').trim().toLowerCase() as 'asc' | 'desc';

  const members = await listTeamMembers({ search, role, status, limit, skip, sortBy, sortDir });
  const payload = {
    success: true,
    data: members.items,
    meta: {
      total: members.total,
      limit,
      skip,
      hasMore: skip + members.items.length < members.total,
      sortBy,
      sortDir,
    },
  };

  setCachedResponse(cacheKey, payload, 15000);
  return NextResponse.json(payload);
}
