const express = require('express');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateInvoiceNumber } = require('../utils/codeGenerator');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const invoices = await db.all(`
      SELECT i.*, c.name as customer_name, o.order_number
      FROM invoices i JOIN customers c ON c.id = i.customer_id JOIN orders o ON o.id = i.order_id
      ORDER BY i.id DESC
    `);
    res.json({ invoices });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await db.get(`
      SELECT i.*, c.name as customer_name, c.phone, c.address, o.order_number
      FROM invoices i JOIN customers c ON c.id = i.customer_id JOIN orders o ON o.id = i.order_id
      WHERE i.id = ?
    `, [req.params.id]);
    if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

    const birds = await db.all(`
      SELECT bird_code, weight_kg, unit_price, total_price FROM birds
      WHERE order_id = ? AND distributed_to_customer_id = ? AND status = 'invoiced'
      ORDER BY id
    `, [invoice.order_id, invoice.customer_id]);

    res.json({ invoice, birds });
  } catch (err) { next(err); }
});

router.post('/generate/:orderId/:customerId', requireRole('admin', 'distributor'), async (req, res, next) => {
  try {
    const orderId = Number(req.params.orderId);
    const customerId = Number(req.params.customerId);

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

    const birds = await db.all(`
      SELECT * FROM birds WHERE order_id = ? AND distributed_to_customer_id = ? AND status = 'distributed'
    `, [orderId, customerId]);

    if (birds.length === 0) {
      return res.status(409).json({ error: 'لا توجد طيور موزّعة لهذا العميل بانتظار الفوترة' });
    }

    const totalBirds = birds.length;
    const totalWeight = Math.round(birds.reduce((s, b) => s + Number(b.weight_kg), 0) * 100) / 100;
    const totalAmount = Math.round(birds.reduce((s, b) => s + Number(b.total_price), 0) * 100) / 100;

    const countRow = await db.get('SELECT COUNT(*) as c FROM invoices');
    const invoiceNumber = generateInvoiceNumber(Number(countRow.c) + 1);

    const birdIds = birds.map((b) => b.id);
    const placeholders = birdIds.map(() => '?').join(',');

    const statements = [
      {
        sql: `INSERT INTO invoices (invoice_number, order_id, customer_id, total_birds, total_weight, total_amount, issued_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [invoiceNumber, orderId, customerId, totalBirds, totalWeight, totalAmount, req.user.sub],
      },
      {
        sql: `UPDATE birds SET status = 'invoiced' WHERE id IN (${placeholders})`,
        args: birdIds,
      },
    ];

    const results = await db.batch(statements);
    const invoiceId = Number(results[0].lastInsertRowid);

    const remaining = await db.get(`
      SELECT COUNT(*) as c FROM birds WHERE order_id = ? AND status NOT IN ('invoiced','cancelled')
    `, [orderId]);
    if (Number(remaining.c) === 0) {
      await db.run(`UPDATE orders SET status = 'completed', updated_at = datetime('now') WHERE id = ?`, [orderId]);
    }

    await logAction({ userId: req.user.sub, action: 'INVOICE_GENERATED', entity: 'invoice', entityId: invoiceId, ip: req.ip, details: { totalAmount } });
    res.status(201).json({ id: invoiceId, invoiceNumber, totalBirds, totalWeight, totalAmount });
  } catch (err) { next(err); }
});

router.patch('/:id/mark-paid', requireRole('admin', 'distributor'), async (req, res, next) => {
  try {
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    await db.run(`UPDATE invoices SET status = 'paid' WHERE id = ?`, [invoice.id]);
    await logAction({ userId: req.user.sub, action: 'INVOICE_PAID', entity: 'invoice', entityId: invoice.id, ip: req.ip });
    res.json({ message: 'تم تحديث حالة الفاتورة إلى مدفوعة' });
  } catch (err) { next(err); }
});

module.exports = router;
