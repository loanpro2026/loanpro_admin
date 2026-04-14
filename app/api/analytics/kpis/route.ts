import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { getAnalyticsKpis } from '@/server/services/analytics';

export async function GET() {
  try {
    const result = await requireApiPermission('users:read');
    if ('response' in result) {
      return result.response;
    }

    const data = await getAnalyticsKpis();
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