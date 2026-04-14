import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiSession } from '@/server/api/guards';
import { parseJsonBody } from '@/server/api/request';
import { markNotificationReadStatus } from '@/server/services/notifications';

const patchSchema = z.object({
  read: z.boolean(),
});

type Params = {
  params: Promise<{ notificationId: string }>;
};

export async function PATCH(request: NextRequest, context: Params) {
  const sessionResult = await requireApiSession();
  if ('response' in sessionResult) {
    return sessionResult.response;
  }

  const body = await parseJsonBody(request);
  if (!body.ok) {
    return body.response;
  }

  const parsed = patchSchema.safeParse(body.data);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  }

  const params = await context.params;
  const notificationId = String(params.notificationId || '').trim();
  if (!notificationId) {
    return NextResponse.json({ success: false, error: 'notificationId is required' }, { status: 400 });
  }

  try {
    const found = await markNotificationReadStatus({
      notificationId,
      adminUserId: sessionResult.session.adminUserId,
      read: parsed.data.read,
    });

    if (!found) {
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { notificationId, read: parsed.data.read } });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid notificationId' }, { status: 400 });
  }
}
