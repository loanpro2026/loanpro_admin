import crypto from 'crypto';
import { getEnv } from '@/config/env';
import { getAdminDb, getSupportDb } from '@/lib/db/mongo';
import { getSupportTicketsCollection } from '@/server/repositories/support-collections';

const SUCCESS_STATUS_REGEX = /^(captured|completed|success|successful|paid)$/i;

type AnalyticsSource = 'live-api' | 'config-missing' | 'error';

export type AnalyticsKpis = {
  totalUsers: number;
  newUsers30d: number;
  activeUsers30d: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  conversionRate: number;
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyRefundedAmount: number;
  supportClosureRate: number;
  paymentsByStatus: Array<{ status: string; count: number }>;
  activePlanMix: Array<{ plan: string; count: number }>;
  googleAnalytics: {
    source: AnalyticsSource;
    configured: boolean;
    eventCount30d: number | null;
    activeUsers30d: number | null;
    sessions30d: number | null;
    message: string;
  };
  generatedAt: string;
};

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeString(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function toNumberOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

async function getGoogleAnalyticsSnapshot() {
  const env = getEnv();
  const propertyId = String(env.GOOGLE_ANALYTICS_PROPERTY_ID || '').trim().replace(/^properties\//i, '');
  const serviceAccountEmail = String(env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const privateKeyRaw = String(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').trim();
  const privateKeyUnquoted =
    privateKeyRaw.startsWith('"') && privateKeyRaw.endsWith('"')
      ? privateKeyRaw.slice(1, -1)
      : privateKeyRaw;
  const privateKey = privateKeyUnquoted.replace(/\\n/g, '\n').trim();

  if (!propertyId || !serviceAccountEmail || !privateKey) {
    return {
      source: 'config-missing' as const,
      configured: false,
      eventCount30d: null,
      activeUsers30d: null,
      sessions30d: null,
      message: 'Set GOOGLE_ANALYTICS_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    };
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
      const errorBody = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      const errorMessage = String(errorBody?.error?.message || '').trim();
      return {
        source: 'error' as const,
        configured: true,
        eventCount30d: null,
        activeUsers30d: null,
        sessions30d: null,
        message: errorMessage
          ? `GA report request failed (${response.status}): ${errorMessage}`
          : `GA report request failed (${response.status})`,
      };
    }

    const payload = (await response.json()) as {
      rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
    };

    return {
      source: 'live-api' as const,
      configured: true,
      eventCount30d: toNumberOrNull(payload.rows?.[0]?.metricValues?.[0]?.value),
      activeUsers30d: toNumberOrNull(payload.rows?.[0]?.metricValues?.[1]?.value),
      sessions30d: toNumberOrNull(payload.rows?.[0]?.metricValues?.[2]?.value),
      message: 'Google Analytics data loaded',
    };
  } catch (error) {
    return {
      source: 'error' as const,
      configured: true,
      eventCount30d: null,
      activeUsers30d: null,
      sessions30d: null,
      message: error instanceof Error ? error.message : 'Failed to load Google Analytics data',
    };
  }
}

async function getCustomerUserFilter() {
  const db = await getAdminDb();
  const adminRows = await db
    .collection('admin_users')
    .find({})
    .project({ clerkUserId: 1, email: 1 })
    .toArray();

  const adminUserIds = Array.from(
    new Set(
      adminRows
        .map((row) => normalizeString((row as { clerkUserId?: unknown }).clerkUserId))
        .filter(Boolean)
    )
  );
  const adminEmails = Array.from(
    new Set(
      adminRows
        .map((row) => normalizeString((row as { email?: unknown }).email))
        .filter(Boolean)
    )
  );

  if (!adminUserIds.length && !adminEmails.length) {
    return {};
  }

  return {
    $nor: [
      ...(adminUserIds.length ? [{ $expr: { $in: [{ $toLower: { $ifNull: ['$userId', ''] } }, adminUserIds] } }] : []),
      ...(adminEmails.length ? [{ $expr: { $in: [{ $toLower: { $ifNull: ['$email', ''] } }, adminEmails] } }] : []),
    ],
  };
}

export async function getAnalyticsKpis(): Promise<AnalyticsKpis> {
  const db = await getAdminDb();
  const supportDb = await getSupportDb();
  const supportTicketsCollection = await getSupportTicketsCollection(supportDb);
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const customerUserFilter = await getCustomerUserFilter();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    newUsers30d,
    activeUsers30d,
    activeSubscriptions,
    trialSubscriptions,
    totalRevenueRows,
    monthlyRevenueRows,
    monthlyRefundRows,
    supportWindowRows,
    paymentsByStatusRows,
    activePlanMixRows,
    googleAnalytics,
  ] = await Promise.all([
    db.collection('users').countDocuments(customerUserFilter),
    db.collection('users').countDocuments({ ...customerUserFilter, createdAt: { $gte: thirtyDaysAgo } }),
    db.collection('users').countDocuments({
      ...customerUserFilter,
      $or: [{ lastLogin: { $gte: thirtyDaysAgo } }, { updatedAt: { $gte: thirtyDaysAgo } }],
    }),
    db.collection('subscriptions').countDocuments({ status: { $in: ['active', 'active_subscription'] } }),
    db.collection('subscriptions').countDocuments({ status: 'trial' }),
    db.collection('payments').aggregate([
      { $match: { status: { $regex: SUCCESS_STATUS_REGEX } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).toArray(),
    db.collection('payments').aggregate([
      { $match: { status: { $regex: SUCCESS_STATUS_REGEX }, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]).toArray(),
    db.collection('payments').aggregate([
      {
        $match: {
          refundStatus: { $regex: /^refunded$/i },
          updatedAt: { $gte: monthStart },
        },
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$refundAmount', 0] } } } },
    ]).toArray(),
    supportTicketsCollection.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          closed: {
            $sum: {
              $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0],
            },
          },
        },
      },
    ]).toArray(),
    db.collection('payments').aggregate([
      {
        $group: {
          _id: {
            $toLower: {
              $ifNull: ['$status', 'unknown'],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]).toArray(),
    db.collection('subscriptions').aggregate([
      { $match: { status: { $in: ['active', 'active_subscription'] } } },
      {
        $group: {
          _id: { $ifNull: ['$plan', 'Unknown'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]).toArray(),
    getGoogleAnalyticsSnapshot(),
  ]);

  const supportTotal = Number(supportWindowRows[0]?.total || 0);
  const supportClosed = Number(supportWindowRows[0]?.closed || 0);
  const conversionRate = totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0;
  const supportClosureRate = supportTotal > 0 ? (supportClosed / supportTotal) * 100 : 0;

  return {
    totalUsers,
    newUsers30d,
    activeUsers30d,
    activeSubscriptions,
    trialSubscriptions,
    conversionRate: roundToTwo(conversionRate),
    totalRevenue: Number(totalRevenueRows[0]?.total || 0),
    monthlyRevenue: Number(monthlyRevenueRows[0]?.total || 0),
    monthlyRefundedAmount: Number(monthlyRefundRows[0]?.total || 0),
    supportClosureRate: roundToTwo(supportClosureRate),
    paymentsByStatus: paymentsByStatusRows.map((row) => ({
      status: String(row._id || 'unknown'),
      count: Number(row.count || 0),
    })),
    activePlanMix: activePlanMixRows.map((row) => ({
      plan: String(row._id || 'Unknown'),
      count: Number(row.count || 0),
    })),
    googleAnalytics,
    generatedAt: now.toISOString(),
  };
}