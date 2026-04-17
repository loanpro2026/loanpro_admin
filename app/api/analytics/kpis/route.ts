import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { getAnalyticsKpis } from '@/server/services/analytics';

export async function GET(request: NextRequest) {
  try {
    const result = await requireApiPermission('users:read');
    if ('response' in result) {
      return result.response;
    }

    const daysParam = Number(request.nextUrl.searchParams.get('days') || 30);
    const data = await getAnalyticsKpis(daysParam);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load analytics KPIs',
      },
      { status: 500 }
    );
  }
}