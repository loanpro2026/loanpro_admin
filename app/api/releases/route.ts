import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiPermission } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { writeAuditLog } from '@/server/services/audit-log';
import { createRelease, listReleases } from '@/server/repositories/releases';
import { getGitHubReleaseFeed } from '@/server/services/releases';

const createReleaseSchema = z.object({
  version: z.string().min(3).max(40),
  title: z.string().min(3).max(120),
  channel: z.enum(['stable', 'beta', 'alpha', 'hotfix']).default('beta'),
  notes: z.string().max(4000).default(''),
  rolloutPercent: z.number().int().min(1).max(100).default(10),
  reason: z.string().min(3).max(240),
});

export async function GET(request: NextRequest) {
  const result = await requireApiPermission('releases:read');
  if ('response' in result) {
    return result.response;
  }

  const { searchParams } = request.nextUrl;
  const search = String(searchParams.get('search') || '').trim();
  const status = String(searchParams.get('status') || 'all').trim().toLowerCase();
  const channel = String(searchParams.get('channel') || 'all').trim().toLowerCase();
  const limit = Number(searchParams.get('limit') || '100');

  const [releases, github] = await Promise.all([
    listReleases({ search, status, channel, limit }),
    getGitHubReleaseFeed(10),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      releases,
      github,
    },
  });
}

export async function POST(request: NextRequest) {
  const result = await requireApiPermission('releases:publish');
  if ('response' in result) {
    return result.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = createReleaseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const created = await createRelease({
    version: parsed.data.version.trim(),
    title: parsed.data.title.trim(),
    channel: parsed.data.channel,
    notes: parsed.data.notes.trim(),
    source: 'manual',
    status: 'draft',
    rolloutPercent: parsed.data.rolloutPercent,
    artifacts: [],
    createdBy: result.session.email,
    updatedBy: result.session.email,
  });

  await writeAuditLog({
    actor: result.session,
    action: 'releases.create',
    resource: 'releases',
    resourceId: String(created?._id || ''),
    reason: parsed.data.reason,
    before: null,
    after: (created || null) as Record<string, unknown> | null,
    metadata: {
      version: parsed.data.version,
      channel: parsed.data.channel,
    },
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
