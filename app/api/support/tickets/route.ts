import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { listSupportTickets } from '@/server/repositories/support';

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('support:read');
  if ('response' in result) {
    return result.response;
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || 'all').trim().toLowerCase();
  const priority = String(searchParams.get('priority') || 'all').trim().toLowerCase();
  const limit = Number(searchParams.get('limit') || '100');

  const tickets = await listSupportTickets({ search, status, priority, limit });
  return NextResponse.json({ success: true, data: tickets });
}
