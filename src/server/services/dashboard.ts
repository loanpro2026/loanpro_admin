import { getAdminDb } from '@/lib/db/mongo';

const SUCCESS_STATUS_REGEX = /^(captured|completed|success|successful|paid)$/i;

export async function getDashboardKpis() {
  const db = await getAdminDb();

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
    db.collection('users').countDocuments(),
    db.collection('subscriptions').countDocuments({ status: 'active' }),
    db.collection('subscriptions').countDocuments({ status: 'trial' }),
    db.collection('subscriptions').countDocuments({ status: 'cancelled' }),
    db.collection('support_tickets').countDocuments({ status: { $in: ['open', 'in-progress'] } }).catch(() => 0),
    db.collection('contact_requests').countDocuments({ status: { $in: ['new', 'open'] } }).catch(() => 0),
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
