const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/stats', async (req, res, next) => {
  try {
    const openOrders = Number((await db.get(`SELECT COUNT(*) as c FROM orders WHERE status = 'open'`)).c);
    const pendingWeighing = Number((await db.get(`SELECT COUNT(*) as c FROM birds WHERE status = 'pending'`)).c);
    const readyToDistribute = Number((await db.get(`SELECT COUNT(*) as c FROM birds WHERE status = 'weighed'`)).c);
    const distributedNotInvoiced = Number((await db.get(`SELECT COUNT(*) as c FROM birds WHERE status = 'distributed'`)).c);
    const totalCustomers = Number((await db.get(`SELECT COUNT(*) as c FROM customers`)).c);
    const unpaidInvoicesRow = await db.get(`SELECT COALESCE(SUM(total_amount),0) as s, COUNT(*) as c FROM invoices WHERE status = 'unpaid'`);
    const todayRevenueRow = await db.get(`SELECT COALESCE(SUM(total_amount),0) as s FROM invoices WHERE date(created_at) = date('now')`);

    res.json({
      openOrders,
      pendingWeighing,
      readyToDistribute,
      distributedNotInvoiced,
      totalCustomers,
      unpaidInvoicesCount: Number(unpaidInvoicesRow.c),
      unpaidInvoicesTotal: Number(unpaidInvoicesRow.s),
      todayRevenue: Number(todayRevenueRow.s),
    });
  } catch (err) { next(err); }
});

module.exports = router;
