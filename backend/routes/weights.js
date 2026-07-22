const express = require('express');
const { z } = require('zod');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth, requireRole('admin', 'weigher'));

router.get('/pending', async (req, res, next) => {
  try {
    const { orderId } = req.query;
    let birds;
    if (orderId) {
      birds = await db.all(`
        SELECT b.*, o.order_number, c.name as customer_name, p.name as product_name
        FROM birds b JOIN orders o ON o.id = b.order_id JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id
        WHERE b.status = 'pending' AND b.order_id = ? ORDER BY b.id
      `, [orderId]);
    } else {
      birds = await db.all(`
        SELECT b.*, o.order_number, c.name as customer_name, p.name as product_name
        FROM birds b JOIN orders o ON o.id = b.order_id JOIN customers c ON c.id = o.customer_id JOIN products p ON p.id = o.product_id
        WHERE b.status = 'pending' ORDER BY b.id LIMIT 200
      `);
    }
    res.json({ birds });
  } catch (err) { next(err); }
});

const weightSchema = z.object({
  weightKg: z.number().positive().max(50),
});

router.post('/:birdId', async (req, res, next) => {
  try {
    const parsed = weightSchema.safeParse({ weightKg: Number(req.body.weightKg) });
    if (!parsed.success) return res.status(400).json({ error: 'الوزن غير صحيح' });

    const bird = await db.get('SELECT * FROM birds WHERE id = ?', [req.params.birdId]);
    if (!bird) return res.status(404).json({ error: 'الطائر غير موجود' });
    if (bird.status !== 'pending') return res.status(409).json({ error: 'تم تسجيل وزن هذا الطائر مسبقًا' });

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [bird.order_id]);
    const product = await db.get('SELECT * FROM products WHERE id = ?', [order.product_id]);

    const unitPrice = product.price_per_kg;
    const totalPrice = Math.round(parsed.data.weightKg * unitPrice * 100) / 100;

    await db.run(`
      UPDATE birds SET weight_kg = ?, unit_price = ?, total_price = ?, weighed_by = ?, status = 'weighed', updated_at = datetime('now')
      WHERE id = ?
    `, [parsed.data.weightKg, unitPrice, totalPrice, req.user.sub, bird.id]);

    const remaining = await db.get(`SELECT COUNT(*) as c FROM birds WHERE order_id = ? AND status = 'pending'`, [bird.order_id]);
    if (Number(remaining.c) === 0) {
      await db.run(`UPDATE orders SET status = 'weighed', updated_at = datetime('now') WHERE id = ?`, [bird.order_id]);
    }

    await logAction({ userId: req.user.sub, action: 'BIRD_WEIGHED', entity: 'bird', entityId: bird.id, ip: req.ip, details: { weightKg: parsed.data.weightKg, totalPrice } });

    res.json({ message: 'تم تسجيل الوزن', birdCode: bird.bird_code, totalPrice });
  } catch (err) { next(err); }
});

module.exports = router;
