import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { hasPermission } from '@/lib/rbac/permissions';
import { getReleaseById, updateReleaseById } from '@/server/repositories/releases';
import { writeAuditLog } from '@/server/services/audit-log';

const patchSchema = z.object({
  action: z.enum(['publish', 'promote', 'rollback']),
  reason: z.string().min(3).max(240),
  rolloutPercent: z.number().int().min(1).max(100).optional(),
  targetChannel: z.enum(['stable', 'beta', 'alpha', 'hotfix']).optional(),
  note: z.string().max(800).optional(),
});

function canRunAction(role: Parameters<typeof hasPermission>[0], action: z.infer<typeof patchSchema>['action']) {
  if (action === 'publish') {
    return hasPermission(role, 'releases:publish');
  }
  if (action === 'promote') {
    return hasPermission(role, 'releases:promote');
  }
  return hasPermission(role, 'releases:rollback');
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ releaseId: string }> }) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const payload = body.data;
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  if (!canRunAction(sessionResult.session.role, parsed.data.action)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const params = await context.params;
  const existing = await getReleaseById(params.releaseId);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Release not found' }, { status: 404 });
  }

  const now = new Date();
  const patch: Record<string, unknown> = {
    updatedBy: sessionResult.session.email,
  };

  if (parsed.data.note) {
    patch.notes = [String(existing.notes || ''), parsed.data.note.trim()].filter(Boolean).join('\n\n');
  }

  if (typeof parsed.data.rolloutPercent === 'number') {
    patch.rolloutPercent = parsed.data.rolloutPercent;
  }

  if (parsed.data.action === 'publish') {
    if (existing.status !== 'draft' && existing.status !== 'rolled_back') {
      return NextResponse.json(
        { success: false, error: 'Only draft or rolled_back releases can be published' },
        { status: 400 }
      );
    }
    patch.status = 'published';
    patch.publishedAt = now;
  }

  if (parsed.data.action === 'promote') {
    if (existing.status !== 'published') {
      return NextResponse.json({ success: false, error: 'Only published releases can be promoted' }, { status: 400 });
    }
    patch.status = 'promoted';
    patch.promotedAt = now;
    patch.channel = parsed.data.targetChannel || 'stable';
  }

  if (parsed.data.action === 'rollback') {
    if (existing.status !== 'published' && existing.status !== 'promoted') {
      return NextResponse.json(
        { success: false, error: 'Only published or promoted releases can be rolled back' },
        { status: 400 }
      );
    }
    patch.status = 'rolled_back';
    patch.rolledBackAt = now;
  }

  const updated = await updateReleaseById(params.releaseId, patch);
  if (!updated) {
    return NextResponse.json({ success: false, error: 'Release not found' }, { status: 404 });
  }

  await writeAuditLog({
    actor: sessionResult.session,
    action: `releases.${parsed.data.action}`,
    resource: 'releases',
    resourceId: params.releaseId,
    reason: parsed.data.reason,
    before: existing as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    metadata: {
      action: parsed.data.action,
      targetChannel: parsed.data.targetChannel,
      rolloutPercent: parsed.data.rolloutPercent,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
