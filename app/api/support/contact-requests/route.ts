import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { listContactRequests } from '@/server/repositories/support';

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('contact:read');
  if ('response' in result) {
    return result.response;
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || 'all').trim().toLowerCase();
  const inquiryType = String(searchParams.get('inquiryType') || 'all').trim().toLowerCase();
  const limit = Number(searchParams.get('limit') || '100');

  const requests = await listContactRequests({ search, status, inquiryType, limit });
  return NextResponse.json({ success: true, data: requests });
}
