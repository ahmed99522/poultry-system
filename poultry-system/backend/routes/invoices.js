const express = require('express');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateInvoiceNumber } = require('../utils/codeGenerator');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const invoices = db.prepare(`
    SELECT i.*, c.name as customer_name, o.order_number
    FROM invoices i JOIN customers c ON c.id = i.customer_id JOIN orders o ON o.id = i.order_id
    ORDER BY i.id DESC
  `).all();
  res.json({ invoices });
});

router.get('/:id', (req, res) => {
  const invoice = db.prepare(`
    SELECT i.*, c.name as customer_name, c.phone, c.address, o.order_number
    FROM invoices i JOIN customers c ON c.id = i.customer_id JOIN orders o ON o.id = i.order_id
    WHERE i.id = ?
  `).get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });

  const birds = db.prepare(`
    SELECT bird_code, weight_kg, unit_price, total_price FROM birds
    WHERE order_id = ? AND distributed_to_customer_id = ? AND status = 'invoiced'
    ORDER BY id
  `).all(invoice.order_id, invoice.customer_id);

  res.json({ invoice, birds });
});

// توليد فاتورة لعميل معين ضمن طلب معين، بناءً على الطيور الموزّعة له فقط
router.post('/generate/:orderId/:customerId', requireRole('admin', 'distributor'), (req, res) => {
  const orderId = Number(req.params.orderId);
  const customerId = Number(req.params.customerId);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

  const birds = db.prepare(`
    SELECT * FROM birds WHERE order_id = ? AND distributed_to_customer_id = ? AND status = 'distributed'
  `).all(orderId, customerId);

  if (birds.length === 0) {
    return res.status(409).json({ error: 'لا توجد طيور موزّعة لهذا العميل بانتظار الفوترة' });
  }

  const totalBirds = birds.length;
  const totalWeight = Math.round(birds.reduce((s, b) => s + b.weight_kg, 0) * 100) / 100;
  const totalAmount = Math.round(birds.reduce((s, b) => s + b.total_price, 0) * 100) / 100;

  const countRow = db.prepare('SELECT COUNT(*) as c FROM invoices').get();
  const invoiceNumber = generateInvoiceNumber(countRow.c + 1);

  const transaction = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO invoices (invoice_number, order_id, customer_id, total_birds, total_weight, total_amount, issued_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(invoiceNumber, orderId, customerId, totalBirds, totalWeight, totalAmount, req.user.sub);

    const birdIds = birds.map((b) => b.id);
    const placeholders = birdIds.map(() => '?').join(',');
    db.prepare(`UPDATE birds SET status = 'invoiced' WHERE id IN (${placeholders})`).run(...birdIds);

    // إذا لم يتبقَّ أي طائر في حالة أخرى غير مفوتر/ملغى ضمن الطلب، اعتبر الطلب مكتملًا
    const remaining = db.prepare(`
      SELECT COUNT(*) as c FROM birds WHERE order_id = ? AND status NOT IN ('invoiced','cancelled')
    `).get(orderId);
    if (remaining.c === 0) {
      db.prepare(`UPDATE orders SET status = 'completed', updated_at = datetime('now') WHERE id = ?`).run(orderId);
    }

    return info.lastInsertRowid;
  });

  const invoiceId = transaction();

  logAction({ userId: req.user.sub, action: 'INVOICE_GENERATED', entity: 'invoice', entityId: invoiceId, ip: req.ip, details: { totalAmount } });
  res.status(201).json({ id: invoiceId, invoiceNumber, totalBirds, totalWeight, totalAmount });
});

router.patch('/:id/mark-paid', requireRole('admin', 'distributor'), (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  db.prepare(`UPDATE invoices SET status = 'paid' WHERE id = ?`).run(invoice.id);
  logAction({ userId: req.user.sub, action: 'INVOICE_PAID', entity: 'invoice', entityId: invoice.id, ip: req.ip });
  res.json({ message: 'تم تحديث حالة الفاتورة إلى مدفوعة' });
});

module.exports = router;
