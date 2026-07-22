const express = require('express');
const { z } = require('zod');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth, requireRole('admin', 'distributor'));

// قائمة الطيور الموزونة (جاهزة للتوزيع) مصنّفة حسب الطلب
router.get('/weighed', (req, res) => {
  const { orderId } = req.query;
  let birds;
  if (orderId) {
    birds = db.prepare(`
      SELECT b.*, o.order_number, c.name as customer_name
      FROM birds b JOIN orders o ON o.id = b.order_id JOIN customers c ON c.id = o.customer_id
      WHERE b.status = 'weighed' AND b.order_id = ? ORDER BY b.weight_kg
    `).all(orderId);
  } else {
    birds = db.prepare(`
      SELECT b.*, o.order_number, c.name as customer_name
      FROM birds b JOIN orders o ON o.id = b.order_id JOIN customers c ON c.id = o.customer_id
      WHERE b.status = 'weighed' ORDER BY b.weight_kg
    `).all();
  }
  res.json({ birds });
});

const assignSchema = z.object({
  targetCustomerId: z.number().int().positive().optional(),
});

// توزيع طائر على العميل الأصلي لطلبه، أو على عميل آخر إن كان وزنه أنسب له
router.post('/:birdId/assign', (req, res) => {
  const parsed = assignSchema.safeParse({
    targetCustomerId: req.body.targetCustomerId ? Number(req.body.targetCustomerId) : undefined,
  });
  if (!parsed.success) return res.status(400).json({ error: 'بيانات غير صحيحة' });

  const bird = db.prepare('SELECT * FROM birds WHERE id = ?').get(req.params.birdId);
  if (!bird) return res.status(404).json({ error: 'الطائر غير موجود' });
  if (bird.status !== 'weighed') return res.status(409).json({ error: 'هذا الطائر ليس جاهزًا للتوزيع' });

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(bird.order_id);
  let customerId = order.customer_id;

  if (parsed.data.targetCustomerId) {
    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(parsed.data.targetCustomerId);
    if (!customer) return res.status(404).json({ error: 'العميل المستهدف غير موجود' });
    customerId = parsed.data.targetCustomerId;
  }

  db.prepare(`
    UPDATE birds SET status = 'distributed', distributed_to_customer_id = ?, distributed_by = ?,
    distributed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
  `).run(customerId, req.user.sub, bird.id);

  // تحديث حالة الطلب إلى "قيد التوزيع" إذا لم يكن كذلك
  if (order.status !== 'distributing') {
    db.prepare(`UPDATE orders SET status = 'distributing', updated_at = datetime('now') WHERE id = ?`).run(order.id);
  }

  logAction({ userId: req.user.sub, action: 'BIRD_DISTRIBUTED', entity: 'bird', entityId: bird.id, ip: req.ip, details: { customerId } });
  res.json({ message: 'تم توزيع الطائر بنجاح' });
});

module.exports = router;
