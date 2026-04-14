import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { getIntegrationsUsage } from '@/server/services/integration-usage';

export async function GET() {
  const result = await requireApiPermission('integrations:read');
  if ('response' in result) {
    return result.response;
  }

  const data = await getIntegrationsUsage();
  return NextResponse.json({ success: true, data });
}