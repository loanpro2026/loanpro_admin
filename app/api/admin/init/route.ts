import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/config/env';
import { requireApiSession } from '@/server/api/guards';
import { runAdminInitialization } from '@/server/services/admin-init';

function isAuthorizedBySecret(request: NextRequest) {
  const env = getEnv();
  const expected = String(env.ADMIN_INIT_SECRET || '').trim();
  const provided = String(request.headers.get('x-admin-init-secret') || '').trim();
  return Boolean(expected) && expected === provided;
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireApiSession();

  if ('response' in sessionResult) {
    if (!isAuthorizedBySecret(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  } else if (sessionResult.session.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const result = await runAdminInitialization();
  return NextResponse.json({ success: true, data: result });
}
