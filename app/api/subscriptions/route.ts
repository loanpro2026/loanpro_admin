import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { listSubscriptions } from '@/server/repositories/subscriptions';

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('subscriptions:read');
  if ('response' in result) {
    return result.response;
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || '').trim().toLowerCase();
  const plan = String(searchParams.get('plan') || '').trim().toLowerCase();
  const limit = Number(searchParams.get('limit') || '50');

  const subscriptions = await listSubscriptions({ search, status, plan, limit });
  return NextResponse.json({ success: true, data: subscriptions });
}
