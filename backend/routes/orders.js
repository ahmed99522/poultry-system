const express = require('express');
const { z } = require('zod');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateOrderNumber, generateBirdCode } = require('../utils/codeGenerator');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    let orders;
    if (status) {
      orders = await db.all(`
        SELECT o.*, c.name as customer_name, p.name as product_name
        FROM orders o JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id
        WHERE o.status = ? ORDER BY o.id DESC
      `, [status]);
    } else {
      orders = await db.all(`
        SELECT o.*, c.name as customer_name, p.name as product_name
        FROM orders o JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id
        ORDER BY o.id DESC
      `);
    }
    res.json({ orders });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const order = await db.get(`
      SELECT o.*, c.name as customer_name, p.name as product_name, p.price_per_kg
      FROM orders o JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id
      WHERE o.id = ?
    `, [req.params.id]);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

    const birds = await db.all('SELECT * FROM birds WHERE order_id = ? ORDER BY id', [req.params.id]);
    res.json({ order, birds });
  } catch (err) { next(err); }
});

const orderSchema = z.object({
  customerId: z.number().int().positive(),
  productId: z.number().int().positive(),
  requestedQty: z.number().int().positive().max(100000),
  notes: z.string().max(500).optional().nullable(),
});

router.post('/', requireRole('admin', 'distributor'), async (req, res, next) => {
  try {
    const parsed = orderSchema.safeParse({
      customerId: Number(req.body.customerId),
      productId: Number(req.body.productId),
      requestedQty: Number(req.body.requestedQty),
      notes: req.body.notes,
    });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const customer = await db.get('SELECT id FROM customers WHERE id = ?', [parsed.data.customerId]);
    if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
    const product = await db.get('SELECT id FROM products WHERE id = ?', [parsed.data.productId]);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

    const countRow = await db.get('SELECT COUNT(*) as c FROM orders');
    const orderNumber = generateOrderNumber(Number(countRow.c) + 1);

    const info = await db.run(
      `INSERT INTO orders (order_number, customer_id, product_id, requested_qty, distributor_id, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [orderNumber, parsed.data.customerId, parsed.data.productId, parsed.data.requestedQty, req.user.sub, parsed.data.notes || null]
    );

    await logAction({ userId: req.user.sub, action: 'ORDER_CREATED', entity: 'order', entityId: info.lastInsertRowid, ip: req.ip });
    res.status(201).json({ id: info.lastInsertRowid, orderNumber });
  } catch (err) { next(err); }
});

// إغلاق الطلب: يولّد شرائح الطيور الفارغة الجاهزة لتسجيل الأوزان
router.post('/:id/close', requireRole('admin', 'distributor'), async (req, res, next) => {
  try {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (order.status !== 'open') return res.status(409).json({ error: 'لا يمكن إغلاق طلب ليس في حالة مفتوح' });

    const statements = [];
    for (let i = 1; i <= order.requested_qty; i++) {
      const code = generateBirdCode(order.order_number, i);
      statements.push({ sql: `INSERT INTO birds (bird_code, order_id, status) VALUES (?, ?, 'pending')`, args: [code, order.id] });
    }
    statements.push({ sql: `UPDATE orders SET status = 'closed', updated_at = datetime('now') WHERE id = ?`, args: [order.id] });

    await db.batch(statements);

    await logAction({ userId: req.user.sub, action: 'ORDER_CLOSED', entity: 'order', entityId: order.id, ip: req.ip, details: { qty: order.requested_qty } });
    res.json({ message: 'تم إغلاق الطلب وتجهيز الطيور لتسجيل الأوزان', birdsGenerated: order.requested_qty });
  } catch (err) { next(err); }
});

router.post('/:id/cancel', requireRole('admin', 'distributor'), async (req, res, next) => {
  try {
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(409).json({ error: 'لا يمكن إلغاء هذا الطلب في حالته الحالية' });
    }
    await db.run(`UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`, [order.id]);
    await logAction({ userId: req.user.sub, action: 'ORDER_CANCELLED', entity: 'order', entityId: order.id, ip: req.ip });
    res.json({ message: 'تم إلغاء الطلب' });
  } catch (err) { next(err); }
});

module.exports = router;
