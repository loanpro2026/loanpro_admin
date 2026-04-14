import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { getDashboardKpis } from '@/server/services/dashboard';

export async function GET() {
  const result = await requireApiPermission('users:read');
  if ('response' in result) {
    return result.response;
  }

  const data = await getDashboardKpis();
  return NextResponse.json({ success: true, data });
}
