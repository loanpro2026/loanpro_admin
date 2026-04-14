import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { getAnalyticsKpis } from '@/server/services/analytics';

export async function GET() {
  const result = await requireApiPermission('users:read');
  if ('response' in result) {
    return result.response;
  }

  const data = await getAnalyticsKpis();
  return NextResponse.json({ success: true, data });
}