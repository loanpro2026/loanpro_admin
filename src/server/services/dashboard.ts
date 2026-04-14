import { getAdminDb, getSupportDb } from '@/lib/db/mongo';
import { countOpenContactRequests, countOpenSupportTickets } from '@/server/repositories/support-collections';

const SUCCESS_STATUS_REGEX = /^(captured|completed|success|successful|paid)$/i;

function normalizeString(value: unknown) {
  return String(value || '').trim().toLowerCase();
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

export async function getDashboardKpis() {
  const db = await getAdminDb();
  const supportDb = await getSupportDb();
  const customerUserFilter = await getCustomerUserFilter();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeSubscriptions,
    trialSubscriptions,
    cancelledSubscriptions,
    openTickets,
    openContactRequests,
    totalRevenueRows,
    monthlyRevenueRows,
  ] = await Promise.all([
    db.collection('users').countDocuments(customerUserFilter),
    db.collection('subscriptions').countDocuments({ status: 'active' }),
    db.collection('subscriptions').countDocuments({ status: 'trial' }),
    db.collection('subscriptions').countDocuments({ status: 'cancelled' }),
    countOpenSupportTickets(supportDb).catch(() => 0),
    countOpenContactRequests(supportDb).catch(() => 0),
    db.collection('payments').aggregate([
      { $match: { status: { $regex: SUCCESS_STATUS_REGEX } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).toArray(),
    db.collection('payments').aggregate([
      { $match: { status: { $regex: SUCCESS_STATUS_REGEX }, createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).toArray(),
  ]);

  return {
    totalUsers,
    activeSubscriptions,
    trialSubscriptions,
    cancelledSubscriptions,
    openTickets,
    openContactRequests,
    totalRevenue: Number(totalRevenueRows[0]?.total || 0),
    monthlyRevenue: Number(monthlyRevenueRows[0]?.total || 0),
    serverTime: new Date().toISOString(),
  };
}
