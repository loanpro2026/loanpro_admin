import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { getSystemStatusOverview } from '@/server/services/integrations';

export async function GET() {
  const result = await requireApiPermission('integrations:read');
  if ('response' in result) {
    return result.response;
  }

  const data = await getSystemStatusOverview();
  return NextResponse.json({ success: true, data });
}