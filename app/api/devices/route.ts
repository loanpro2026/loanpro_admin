import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { listDevices } from '@/server/repositories/devices';

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('devices:read');
  if ('response' in result) {
    return result.response;
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || 'all').trim().toLowerCase();
  const limit = Number(searchParams.get('limit') || '100');

  const devices = await listDevices({ search, status, limit });
  return NextResponse.json({ success: true, data: devices });
}
