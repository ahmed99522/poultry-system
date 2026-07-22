const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/stats', (req, res) => {
  const openOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE status = 'open'`).get().c;
  const pendingWeighing = db.prepare(`SELECT COUNT(*) as c FROM birds WHERE status = 'pending'`).get().c;
  const readyToDistribute = db.prepare(`SELECT COUNT(*) as c FROM birds WHERE status = 'weighed'`).get().c;
  const distributedNotInvoiced = db.prepare(`SELECT COUNT(*) as c FROM birds WHERE status = 'distributed'`).get().c;
  const totalCustomers = db.prepare(`SELECT COUNT(*) as c FROM customers`).get().c;
  const unpaidInvoicesRow = db.prepare(`SELECT COALESCE(SUM(total_amount),0) as s, COUNT(*) as c FROM invoices WHERE status = 'unpaid'`).get();
  const todayRevenueRow = db.prepare(`
    SELECT COALESCE(SUM(total_amount),0) as s FROM invoices WHERE date(created_at) = date('now')
  `).get();

  res.json({
    openOrders,
    pendingWeighing,
    readyToDistribute,
    distributedNotInvoiced,
    totalCustomers,
    unpaidInvoicesCount: unpaidInvoicesRow.c,
    unpaidInvoicesTotal: unpaidInvoicesRow.s,
    todayRevenue: todayRevenueRow.s,
  });
});

module.exports = router;
