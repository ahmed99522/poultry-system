const express = require('express');
const { z } = require('zod');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth, requireRole('admin', 'weigher'));

// قائمة الطيور بانتظار تسجيل الوزن (شاشة سريعة)
router.get('/pending', (req, res) => {
  const { orderId } = req.query;
  let birds;
  if (orderId) {
    birds = db.prepare(`
      SELECT b.*, o.order_number, c.name as customer_name, p.name as product_name
      FROM birds b
      JOIN orders o ON o.id = b.order_id
      JOIN customers c ON c.id = o.customer_id
      JOIN products p ON p.id = o.product_id
      WHERE b.status = 'pending' AND b.order_id = ?
      ORDER BY b.id
    `).all(orderId);
  } else {
    birds = db.prepare(`
      SELECT b.*, o.order_number, c.name as customer_name, p.name as product_name
      FROM birds b
      JOIN orders o ON o.id = b.order_id
      JOIN customers c ON c.id = o.customer_id
      JOIN products p ON p.id = o.product_id
      WHERE b.status = 'pending'
      ORDER BY b.id
      LIMIT 200
    `).all();
  }
  res.json({ birds });
});

const weightSchema = z.object({
  weightKg: z.number().positive().max(50), // حد أعلى منطقي لوزن الطائر بالكيلوجرام
});

// تسجيل وزن طائر واحد - يُستخدم في شاشة الإدخال السريع (Enter بعد كل رقم)
router.post('/:birdId', (req, res) => {
  const parsed = weightSchema.safeParse({ weightKg: Number(req.body.weightKg) });
  if (!parsed.success) return res.status(400).json({ error: 'الوزن غير صحيح' });

  const bird = db.prepare('SELECT * FROM birds WHERE id = ?').get(req.params.birdId);
  if (!bird) return res.status(404).json({ error: 'الطائر غير موجود' });
  if (bird.status !== 'pending') return res.status(409).json({ error: 'تم تسجيل وزن هذا الطائر مسبقًا' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(bird.order_id);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(order.product_id);

  const unitPrice = product.price_per_kg;
  const totalPrice = Math.round(parsed.data.weightKg * unitPrice * 100) / 100;

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE birds SET weight_kg = ?, unit_price = ?, total_price = ?, weighed_by = ?, status = 'weighed', updated_at = datetime('now')
      WHERE id = ?
    `).run(parsed.data.weightKg, unitPrice, totalPrice, req.user.sub, bird.id);

    const remaining = db.prepare(`SELECT COUNT(*) as c FROM birds WHERE order_id = ? AND status = 'pending'`).get(bird.order_id);
    if (remaining.c === 0) {
      db.prepare(`UPDATE orders SET status = 'weighed', updated_at = datetime('now') WHERE id = ?`).run(bird.order_id);
    }
  });
  transaction();

  logAction({ userId: req.user.sub, action: 'BIRD_WEIGHED', entity: 'bird', entityId: bird.id, ip: req.ip, details: { weightKg: parsed.data.weightKg, totalPrice } });

  res.json({ message: 'تم تسجيل الوزن', birdCode: bird.bird_code, totalPrice });
});

module.exports = router;
