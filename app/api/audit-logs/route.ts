import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { getAdminDb } from '@/lib/db/mongo';
import type { AuditLogDocument } from '@/types/admin';

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('audit:read');
  if ('response' in result) {
    return result.response;
  }

  const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || '50')));
  const skip = Math.max(0, Number(request.nextUrl.searchParams.get('skip') || '0'));
  const action = String(request.nextUrl.searchParams.get('action') || '').trim();
  const resource = String(request.nextUrl.searchParams.get('resource') || '').trim();
  const actorEmail = String(request.nextUrl.searchParams.get('actorEmail') || '').trim().toLowerCase();
  const dateFromRaw = String(request.nextUrl.searchParams.get('dateFrom') || '').trim();
  const dateToRaw = String(request.nextUrl.searchParams.get('dateTo') || '').trim();

  const filter: Record<string, unknown> = {};
  if (action) filter.action = toSafeRegex(action);
  if (resource) filter.resource = toSafeRegex(resource);
  if (actorEmail) filter['actor.email'] = toSafeRegex(actorEmail);

  const createdAtMatch: Record<string, Date> = {};
  if (dateFromRaw) {
    const dateFrom = new Date(dateFromRaw);
    if (!Number.isNaN(dateFrom.getTime())) {
      createdAtMatch.$gte = dateFrom;
    }
  }
  if (dateToRaw) {
    const dateTo = new Date(dateToRaw);
    if (!Number.isNaN(dateTo.getTime())) {
      createdAtMatch.$lte = dateTo;
    }
  }
  if (Object.keys(createdAtMatch).length) {
    filter.createdAt = createdAtMatch;
  }

  const db = await getAdminDb();
  const total = await db.collection<AuditLogDocument>('admin_audit_logs').countDocuments(filter);
  const rows = await db
    .collection<AuditLogDocument>('admin_audit_logs')
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return NextResponse.json({
    success: true,
    data: rows,
    meta: {
      count: rows.length,
      total,
      limit,
      skip,
      hasMore: skip + rows.length < total,
      filters: { action, resource, actorEmail, dateFrom: dateFromRaw, dateTo: dateToRaw },
    },
  });
}
