import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { listPayments } from '@/server/repositories/payments';
import { getCachedResponse, setCachedResponse } from '@/server/services/response-cache';

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('payments:read');
  if ('response' in result) {
    return result.response;
  }

  const cacheKey = `payments:list:${request.nextUrl.search}`;
  const cached = getCachedResponse<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || 'all').trim().toLowerCase();
  const limit = Number(searchParams.get('limit') || '100');
  const skip = Number(searchParams.get('skip') || '0');
  const sortBy = String(searchParams.get('sortBy') || 'createdAt').trim().toLowerCase() as
    | 'createdAt'
    | 'updatedAt'
    | 'amount'
    | 'status';
  const sortDir = String(searchParams.get('sortDir') || 'desc').trim().toLowerCase() as 'asc' | 'desc';

  const payments = await listPayments({ search, status, limit, skip, sortBy, sortDir });
  const payload = {
    success: true,
    data: payments.items,
    meta: {
      total: payments.total,
      limit,
      skip,
      hasMore: skip + payments.items.length < payments.total,
      sortBy,
      sortDir,
    },
  };

  setCachedResponse(cacheKey, payload, 15000);
  return NextResponse.json(payload);
}
