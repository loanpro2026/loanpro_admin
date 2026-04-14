import { NextRequest, NextResponse } from 'next/server';
import { getCachedResponse, setCachedResponse } from '@/server/services/response-cache';
import { requireApiSession } from '@/server/api/guards';
import { listNotifications, markAllNotificationsAsRead } from '@/server/services/notifications';

export async function GET(request: NextRequest) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  const { searchParams } = request.nextUrl;
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
  const skip = Math.max(0, Number(searchParams.get('skip') || '0'));
  const unreadOnly = String(searchParams.get('unreadOnly') || '').trim().toLowerCase() === 'true';
  const action = String(searchParams.get('action') || '').trim();
  const resource = String(searchParams.get('resource') || '').trim();

  const cacheKey = `notifications:list:${sessionResult.session.adminUserId}:${request.nextUrl.search}`;
  const cached = getCachedResponse<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const result = await listNotifications({
    adminUserId: sessionResult.session.adminUserId,
    limit,
    skip,
    unreadOnly,
    action,
    resource,
  });

  const payload = {
    success: true,
    data: result.rows,
    meta: {
      total: result.total,
      unreadTotal: result.unreadTotal,
      limit,
      skip,
      hasMore: skip + result.rows.length < result.total,
    },
  };

  setCachedResponse(cacheKey, payload, 10000);
  return NextResponse.json(payload);
}

export async function PATCH() {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  const modified = await markAllNotificationsAsRead(sessionResult.session.adminUserId);
  return NextResponse.json({ success: true, data: { modified } });
}
