import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/server/api/guards';
import { getAdminDb } from '@/lib/db/mongo';
import type { AuditLogDocument } from '@/types/admin';

function toSafeRegex(search: string) {
  return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('audit:export');
  if ('response' in result) {
    return result.response;
  }

  const limit = Math.min(1000, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || '500')));
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
  const rows = await db
    .collection<AuditLogDocument>('admin_audit_logs')
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const header = ['createdAt', 'actorEmail', 'actorRole', 'action', 'resource', 'resourceId', 'reason'];
  const lines = [header.join(',')];

  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.createdAt ? new Date(row.createdAt).toISOString() : ''),
        csvEscape(row.actor?.email || ''),
        csvEscape(row.actor?.role || ''),
        csvEscape(row.action || ''),
        csvEscape(row.resource || ''),
        csvEscape(row.resourceId || ''),
        csvEscape(row.reason || ''),
      ].join(',')
    );
  }

  const csv = lines.join('\n');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-logs-${timestamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
