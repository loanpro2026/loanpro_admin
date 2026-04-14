import { getAdminDb } from '@/lib/db/mongo';

const SUCCESS_STATUS_REGEX = /^(captured|completed|success|successful|paid)$/i;

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
  generatedAt: string;
};

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

export async function getAnalyticsKpis(): Promise<AnalyticsKpis> {
  const db = await getAdminDb();
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

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
  ] = await Promise.all([
    db.collection('users').countDocuments(),
    db.collection('users').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    db.collection('users').countDocuments({
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
    db.collection('supporttickets').aggregate([
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
    generatedAt: now.toISOString(),
  };
}