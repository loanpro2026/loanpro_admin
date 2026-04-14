import { NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { listTeamMembers } from '@/server/repositories/team';

export async function GET() {
  const result = await requireApiPermission('team:read');
  if ('response' in result) {
    return result.response;
  }

  const members = await listTeamMembers();
  return NextResponse.json({ success: true, data: members });
}
