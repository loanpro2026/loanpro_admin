import crypto from 'crypto';
import { getEnv } from '@/config/env';
import { getAdminDb } from '@/lib/db/mongo';

export type UsageHealthStatus = 'healthy' | 'degraded' | 'missing';
export type UsageSource = 'live-api' | 'local-aggregate' | 'config-only';

export type IntegrationUsageRecord = {
  key: string;
  label: string;
  unit: string;
  window: string;
  usage: number | null;
  limit: number | null;
  usagePercent: number | null;
  status: UsageHealthStatus;
  source: UsageSource;
  details: string;
  lastSyncedAt: string;
};

export type IntegrationUsageSummary = {
  healthy: number;
  degraded: number;
  missing: number;
  total: number;
};

function toNumberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function usagePercent(usage: number | null, limit: number | null) {
  if (usage === null || limit === null || limit <= 0) {
    return null;
  }
  return Math.round((usage / limit) * 10000) / 100;
}

function statusFromUsage(usage: number | null, limit: number | null, configured: boolean): UsageHealthStatus {
  if (!configured) {
    return 'missing';
  }

  if (usage === null) {
    return 'degraded';
  }

  if (limit === null || limit <= 0) {
    return 'healthy';
  }

  const ratio = usage / limit;
  if (ratio >= 1) {
    return 'degraded';
  }

  if (ratio >= 0.8) {
    return 'degraded';
  }

  return 'healthy';
}

function buildRecord(input: Omit<IntegrationUsageRecord, 'usagePercent' | 'lastSyncedAt'>): IntegrationUsageRecord {
  return {
    ...input,
    usagePercent: usagePercent(input.usage, input.limit),
    lastSyncedAt: new Date().toISOString(),
  };
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getGoogleAccessToken(serviceAccountEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey);
  const assertion = `${unsignedToken}.${base64Url(signature)}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });

  if (!tokenResponse.ok) {
    throw new Error(`Google token request failed (${tokenResponse.status})`);
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  const accessToken = String(tokenPayload.access_token || '').trim();
  if (!accessToken) {
    throw new Error('Google token response missing access_token');
  }

  return accessToken;
}

async function getGoogleAnalyticsUsage() {
  const env = getEnv();
  const propertyId = String(env.GOOGLE_ANALYTICS_PROPERTY_ID || '').trim();
  const serviceAccountEmail = String(env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const privateKey = String(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  const gaEventLimit = toNumberOrNull(env.ADMIN_LIMIT_GA_MONTHLY_EVENTS);

  if (!propertyId || !serviceAccountEmail || !privateKey) {
    return buildRecord({
      key: 'google_analytics',
      label: 'Google Analytics (GA4)',
      unit: 'events',
      window: 'last 30 days',
      usage: null,
      limit: gaEventLimit,
      status: 'missing',
      source: 'live-api',
      details: 'Set GOOGLE_ANALYTICS_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    });
  }

  try {
    const accessToken = await getGoogleAccessToken(serviceAccountEmail, privateKey);
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'eventCount' }, { name: 'activeUsers' }, { name: 'sessions' }],
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return buildRecord({
        key: 'google_analytics',
        label: 'Google Analytics (GA4)',
        unit: 'events',
        window: 'last 30 days',
        usage: null,
        limit: gaEventLimit,
        status: 'degraded',
        source: 'live-api',
        details: `GA report request failed (${response.status})`,
      });
    }

    const payload = (await response.json()) as {
      rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
    };

    const eventCount = toNumberOrNull(payload.rows?.[0]?.metricValues?.[0]?.value);
    const activeUsers = toNumberOrNull(payload.rows?.[0]?.metricValues?.[1]?.value);
    const sessions = toNumberOrNull(payload.rows?.[0]?.metricValues?.[2]?.value);

    return buildRecord({
      key: 'google_analytics',
      label: 'Google Analytics (GA4)',
      unit: 'events',
      window: 'last 30 days',
      usage: eventCount,
      limit: gaEventLimit,
      status: statusFromUsage(eventCount, gaEventLimit, true),
      source: 'live-api',
      details: `Active users ${activeUsers ?? '-'}, sessions ${sessions ?? '-'}`,
    });
  } catch (error) {
    return buildRecord({
      key: 'google_analytics',
      label: 'Google Analytics (GA4)',
      unit: 'events',
      window: 'last 30 days',
      usage: null,
      limit: gaEventLimit,
      status: 'degraded',
      source: 'live-api',
      details: error instanceof Error ? error.message : 'Failed to read GA usage',
    });
  }
}

async function getRazorpayUsage() {
  const env = getEnv();
  const db = await getAdminDb();

  const keyId = String(env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = String(env.RAZORPAY_KEY_SECRET || '').trim();
  const limit = toNumberOrNull(env.ADMIN_LIMIT_RAZORPAY_MONTHLY_TXNS);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyTransactions = await db.collection('payments').countDocuments({ createdAt: { $gte: monthStart } });

  if (!keyId || !keySecret) {
    return buildRecord({
      key: 'razorpay',
      label: 'Razorpay',
      unit: 'transactions',
      window: 'current month',
      usage: monthlyTransactions,
      limit,
      status: 'missing',
      source: 'local-aggregate',
      details: 'Razorpay API keys missing; showing local payment usage only',
    });
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/payments?count=1', {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return buildRecord({
        key: 'razorpay',
        label: 'Razorpay',
        unit: 'transactions',
        window: 'current month',
        usage: monthlyTransactions,
        limit,
        status: 'degraded',
        source: 'local-aggregate',
        details: `Razorpay API check failed (${response.status}); using local transaction usage`,
      });
    }

    return buildRecord({
      key: 'razorpay',
      label: 'Razorpay',
      unit: 'transactions',
      window: 'current month',
      usage: monthlyTransactions,
      limit,
      status: statusFromUsage(monthlyTransactions, limit, true),
      source: 'live-api',
      details: 'Razorpay API reachable; usage computed from local payment records',
    });
  } catch (error) {
    return buildRecord({
      key: 'razorpay',
      label: 'Razorpay',
      unit: 'transactions',
      window: 'current month',
      usage: monthlyTransactions,
      limit,
      status: 'degraded',
      source: 'local-aggregate',
      details: error instanceof Error ? error.message : 'Failed to validate Razorpay API',
    });
  }
}

async function getBrevoUsage() {
  const env = getEnv();
  const apiKey = String(env.BREVO_API_KEY || '').trim();
  const configuredLimit = toNumberOrNull(env.ADMIN_LIMIT_BREVO_MONTHLY_EMAILS);

  if (!apiKey) {
    return buildRecord({
      key: 'brevo',
      label: 'Brevo Email',
      unit: 'emails',
      window: 'provider plan window',
      usage: null,
      limit: configuredLimit,
      status: 'missing',
      source: 'live-api',
      details: 'BREVO_API_KEY is not configured',
    });
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'api-key': apiKey,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return buildRecord({
        key: 'brevo',
        label: 'Brevo Email',
        unit: 'emails',
        window: 'provider plan window',
        usage: null,
        limit: configuredLimit,
        status: 'degraded',
        source: 'live-api',
        details: `Brevo account request failed (${response.status})`,
      });
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const plans = Array.isArray(payload.plan) ? payload.plan : [];
    const emailPlan =
      (plans.find((plan) => String((plan as Record<string, unknown>).type || '').toLowerCase().includes('email')) as Record<string, unknown> | undefined) ||
      (plans[0] as Record<string, unknown> | undefined);

    const liveLimit =
      toNumberOrNull(emailPlan?.credits) ||
      toNumberOrNull(emailPlan?.emailsLimit) ||
      toNumberOrNull((payload as { relay?: { data?: { credits?: number } } }).relay?.data?.credits);

    const liveUsage =
      toNumberOrNull(emailPlan?.creditsUsed) ||
      toNumberOrNull(emailPlan?.used) ||
      toNumberOrNull((payload as { relay?: { data?: { creditsUsed?: number } } }).relay?.data?.creditsUsed);

    const effectiveLimit = liveLimit ?? configuredLimit;

    return buildRecord({
      key: 'brevo',
      label: 'Brevo Email',
      unit: 'emails',
      window: 'provider plan window',
      usage: liveUsage,
      limit: effectiveLimit,
      status: statusFromUsage(liveUsage, effectiveLimit, true),
      source: 'live-api',
      details: liveUsage === null ? 'Brevo connected but usage fields unavailable in account response' : 'Brevo usage loaded from provider API',
    });
  } catch (error) {
    return buildRecord({
      key: 'brevo',
      label: 'Brevo Email',
      unit: 'emails',
      window: 'provider plan window',
      usage: null,
      limit: configuredLimit,
      status: 'degraded',
      source: 'live-api',
      details: error instanceof Error ? error.message : 'Failed to read Brevo usage',
    });
  }
}

async function getSupportQueueUsage() {
  const env = getEnv();
  const db = await getAdminDb();
  const openLimit = toNumberOrNull(env.ADMIN_LIMIT_SUPPORT_OPEN_TICKETS);

  const usage = await db.collection('supporttickets').countDocuments({
    status: { $in: ['open', 'in-progress'] },
  });

  return buildRecord({
    key: 'support_queue',
    label: 'Support Queue',
    unit: 'tickets',
    window: 'current open workload',
    usage,
    limit: openLimit,
    status: statusFromUsage(usage, openLimit, true),
    source: 'local-aggregate',
    details: 'Open support tickets across open/in-progress statuses',
  });
}

async function getContactQueueUsage() {
  const env = getEnv();
  const db = await getAdminDb();
  const openLimit = toNumberOrNull(env.ADMIN_LIMIT_CONTACT_OPEN_REQUESTS);

  const usage = await db.collection('contactrequests').countDocuments({
    status: { $in: ['new', 'follow-up', 'called'] },
  });

  return buildRecord({
    key: 'contact_queue',
    label: 'Contact Requests Queue',
    unit: 'requests',
    window: 'current open workload',
    usage,
    limit: openLimit,
    status: statusFromUsage(usage, openLimit, true),
    source: 'local-aggregate',
    details: 'Open lead/contact requests awaiting closure',
  });
}

export async function getIntegrationsUsage() {
  const data = await Promise.all([
    getGoogleAnalyticsUsage(),
    getRazorpayUsage(),
    getBrevoUsage(),
    getSupportQueueUsage(),
    getContactQueueUsage(),
  ]);

  const summary: IntegrationUsageSummary = data.reduce(
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