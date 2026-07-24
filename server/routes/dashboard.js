const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const auth = require('../middleware/auth');
const { secureFind } = require('../utils/queryHelper');

router.get('/', auth, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const yearStart = new Date(todayStart.getFullYear(), 0, 1);

    const [totalInvoices, statusCounts, revenueData, todaysAssignments, monthlyData] = await Promise.all([
      Invoice.countDocuments(),
      Invoice.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Invoice.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$total' },
            totalBalance: { $sum: '$balance' },
            totalDiscount: { $sum: '$discount' }
          },
        },
      ]),
      Invoice.countDocuments({
        eventDates: { $gte: todayStart, $lte: todayEnd }
      }),
      Invoice.aggregate([
        { $match: { createdAt: { $type: 'date', $gte: yearStart } } },
        { $group: { _id: { $month: "$createdAt" }, revenue: { $sum: "$total" } } }
      ])
    ]);

    const statusMap = {};
    statusCounts.forEach(s => { statusMap[s._id] = s.count; });

    const revenue = revenueData[0] || { totalRevenue: 0, totalBalance: 0, totalDiscount: 0 };
    revenue.totalReceived = revenue.totalRevenue - revenue.totalBalance;

    // 1. Pipeline Invoices (Recent 15)
    const pipelineInvoices = await secureFind(Invoice, {})
      .sort({ createdAt: -1 })
      .limit(15)
      .select('invoiceNo customer.name eventCategoryName total status eventDates createdAt')
      .lean();

    // 2. Schedule (All events for the calendar)
    const upcomingSchedule = await secureFind(Invoice, { 
      $or: [
        { eventDates: { $exists: true, $not: { $size: 0 } } },
        { eventDate: { $exists: true, $ne: '' } }
      ]
    })
      .sort({ 'eventDates': 1 })
      .select('customer.name location eventDate eventDates staffingStatus requiredStaff staffAllocated eventCategoryName')
      .lean();

    // 3. Recent Transactions (Generate a mock ledger feed from recent invoices that have payments)
    const txInvoices = await secureFind(Invoice, {
      'payments.0': { $exists: true }
    }).sort({ updatedAt: -1 }).limit(10).lean();

    const recentPayments = [];
    txInvoices.forEach(inv => {
      if (inv.payments && inv.payments.length > 0) {
        inv.payments.forEach((payment, idx) => {
          recentPayments.push({
            id: `${inv._id}_pay_${idx}`,
            type: 'income',
            amount: payment.amount,
            description: `${inv.customer?.name} - ${payment.type || 'Payment'} (${payment.method})`,
            date: new Date(payment.date || inv.updatedAt).toLocaleDateString(),
            category: inv.eventCategoryName || 'Service'
          });
        });
      }
    });

    // Sort by date descending
    recentPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenueData = months.map((month, idx) => {
      const found = monthlyData.find(m => m._id === idx + 1);
      return { month, revenue: found ? found.revenue : 0 };
    });

    res.json({
      totalInvoices,
      statusMap,
      todaysAssignments,
      totalRevenue: revenue.totalRevenue,
      totalReceived: revenue.totalReceived,
      totalBalance: revenue.totalBalance,
      pipelineInvoices,
      upcomingSchedule,
      recentPayments: recentPayments.slice(0, 10),
      monthlyRevenueData,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
