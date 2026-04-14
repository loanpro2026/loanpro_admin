import { getEnv } from '@/config/env';
import { getAdminDb, getSupportDb } from '@/lib/db/mongo';
import { countOpenContactRequests, countOpenSupportTickets } from '@/server/repositories/support-collections';

export type IntegrationStatus = 'healthy' | 'degraded' | 'missing';

export type IntegrationHealth = {
  key: string;
  label: string;
  status: IntegrationStatus;
  details: string;
  checkedAt: string;
};

export type IntegrationHealthSummary = {
  healthy: number;
  degraded: number;
  missing: number;
  total: number;
};

function buildResult(key: string, label: string, status: IntegrationStatus, details: string): IntegrationHealth {
  return {
    key,
    label,
    status,
    details,
    checkedAt: new Date().toISOString(),
  };
}

async function checkMongoHealth() {
  try {
    const db = await getAdminDb();
    await db.command({ ping: 1 });
    return buildResult('mongodb', 'MongoDB', 'healthy', 'Database ping successful');
  } catch (error) {
    return buildResult(
      'mongodb',
      'MongoDB',
      'degraded',
      error instanceof Error ? error.message : 'Database ping failed'
    );
  }
}

async function checkCloudRun(baseUrl: string, token: string) {
  if (!baseUrl) {
    return buildResult('cloud_run', 'Cloud Run Backend', 'missing', 'CLOUD_RUN_BASE_URL is not configured');
  }

  const normalized = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const healthUrl = `${normalized}/health`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (response.ok) {
      return buildResult('cloud_run', 'Cloud Run Backend', 'healthy', `Health endpoint reachable (${response.status})`);
    }

    return buildResult(
      'cloud_run',
      'Cloud Run Backend',
      'degraded',
      `Health endpoint returned ${response.status}`
    );
  } catch (error) {
    return buildResult(
      'cloud_run',
      'Cloud Run Backend',
      'degraded',
      error instanceof Error ? error.message : 'Cloud Run health check failed'
    );
  }
}

export async function getIntegrationsHealth() {
  const env = getEnv();

  const staticChecks: IntegrationHealth[] = [
    buildResult(
      'clerk',
      'Clerk Authentication',
      env.CLERK_SECRET_KEY && env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'healthy' : 'missing',
      env.CLERK_SECRET_KEY && env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Publishable and secret keys configured' : 'Missing Clerk keys'
    ),
    buildResult(
      'brevo',
      'Brevo Email',
      env.BREVO_API_KEY ? 'healthy' : 'missing',
      env.BREVO_API_KEY ? 'API key configured' : 'BREVO_API_KEY is not configured'
    ),
    buildResult(
      'mailbox',
      'Gmail IMAP Mailbox',
      env.ADMIN_MAILBOX_IMAP_USER && env.ADMIN_MAILBOX_IMAP_PASSWORD ? 'healthy' : 'missing',
      env.ADMIN_MAILBOX_IMAP_USER && env.ADMIN_MAILBOX_IMAP_PASSWORD
        ? `IMAP host ${env.ADMIN_MAILBOX_IMAP_HOST}:${env.ADMIN_MAILBOX_IMAP_PORT}`
        : 'Mailbox credentials are not configured'
    ),
    buildResult(
      'razorpay',
      'Razorpay',
      env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET ? 'healthy' : 'missing',
      env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET ? 'Key ID/secret configured' : 'Razorpay keys missing'
    ),
    buildResult(
      'ga',
      'Google Analytics',
      env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? 'healthy' : 'missing',
      env.NEXT_PUBLIC_GA_MEASUREMENT_ID
        ? `Measurement ID ${env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`
        : 'NEXT_PUBLIC_GA_MEASUREMENT_ID is not configured'
    ),
  ];

  const dynamicChecks = await Promise.all([
    checkMongoHealth(),
    checkCloudRun(String(env.CLOUD_RUN_BASE_URL || '').trim(), String(env.CLOUD_RUN_API_TOKEN || '').trim()),
  ]);

  const data = [...dynamicChecks, ...staticChecks];
  const summary: IntegrationHealthSummary = data.reduce(
    (acc, item) => {
      acc[item.status] += 1;
      acc.total += 1;
      return acc;
    },
    { healthy: 0, degraded: 0, missing: 0, total: 0 }
  );

  return {
    data,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

export async function getSystemStatusOverview() {
  const [integrationHealth, supportSummary] = await Promise.all([
    getIntegrationsHealth(),
    (async () => {
      const supportDb = await getSupportDb();
      const adminDb = await getAdminDb();
      const [openTickets, openContacts, pendingRefunds] = await Promise.all([
        countOpenSupportTickets(supportDb).catch(() => 0),
        countOpenContactRequests(supportDb).catch(() => 0),
        adminDb.collection('payments').countDocuments({ refundStatus: { $in: ['requested', 'pending'] } }).catch(() => 0),
      ]);

      return {
        openTickets,
        openContacts,
        pendingRefunds,
      };
    })(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    summary: integrationHealth.summary,
    queues: supportSummary,
    integrations: integrationHealth.data,
  };
}