import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { getAdminDb } from '@/lib/db/mongo';
import type { AuditLogDocument } from '@/types/admin';

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('audit:read');
  if ('response' in result) {
    return result.response;
  }

  const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || '50')));
  const action = String(request.nextUrl.searchParams.get('action') || '').trim();
  const resource = String(request.nextUrl.searchParams.get('resource') || '').trim();
  const actorEmail = String(request.nextUrl.searchParams.get('actorEmail') || '').trim().toLowerCase();

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (resource) filter.resource = resource;
  if (actorEmail) filter['actor.email'] = actorEmail;

  const db = await getAdminDb();
  const rows = await db
    .collection<AuditLogDocument>('admin_audit_logs')
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return NextResponse.json({
    success: true,
    data: rows,
    meta: {
      count: rows.length,
      limit,
      filters: { action, resource, actorEmail },
    },
  });
}
