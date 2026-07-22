const express = require('express');
const { z } = require('zod');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth, requireRole('admin', 'distributor'));

router.get('/weighed', async (req, res, next) => {
  try {
    const { orderId } = req.query;
    let birds;
    if (orderId) {
      birds = await db.all(`
        SELECT b.*, o.order_number, c.name as customer_name
        FROM birds b JOIN orders o ON o.id = b.order_id JOIN customers c ON c.id = o.customer_id
        WHERE b.status = 'weighed' AND b.order_id = ? ORDER BY b.weight_kg
      `, [orderId]);
    } else {
      birds = await db.all(`
        SELECT b.*, o.order_number, c.name as customer_name
        FROM birds b JOIN orders o ON o.id = b.order_id JOIN customers c ON c.id = o.customer_id
        WHERE b.status = 'weighed' ORDER BY b.weight_kg
      `);
    }
    res.json({ birds });
  } catch (err) { next(err); }
});

const assignSchema = z.object({
  targetCustomerId: z.number().int().positive().optional(),
});

router.post('/:birdId/assign', async (req, res, next) => {
  try {
    const parsed = assignSchema.safeParse({
      targetCustomerId: req.body.targetCustomerId ? Number(req.body.targetCustomerId) : undefined,
    });
    if (!parsed.success) return res.status(400).json({ error: 'بيانات غير صحيحة' });

    const bird = await db.get('SELECT * FROM birds WHERE id = ?', [req.params.birdId]);
    if (!bird) return res.status(404).json({ error: 'الطائر غير موجود' });
    if (bird.status !== 'weighed') return res.status(409).json({ error: 'هذا الطائر ليس جاهزًا للتوزيع' });

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [bird.order_id]);
    let customerId = order.customer_id;

    if (parsed.data.targetCustomerId) {
      const customer = await db.get('SELECT id FROM customers WHERE id = ?', [parsed.data.targetCustomerId]);
      if (!customer) return res.status(404).json({ error: 'العميل المستهدف غير موجود' });
      customerId = parsed.data.targetCustomerId;
    }

    await db.run(`
      UPDATE birds SET status = 'distributed', distributed_to_customer_id = ?, distributed_by = ?,
      distributed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `, [customerId, req.user.sub, bird.id]);

    if (order.status !== 'distributing') {
      await db.run(`UPDATE orders SET status = 'distributing', updated_at = datetime('now') WHERE id = ?`, [order.id]);
    }

    await logAction({ userId: req.user.sub, action: 'BIRD_DISTRIBUTED', entity: 'bird', entityId: bird.id, ip: req.ip, details: { customerId } });
    res.json({ message: 'تم توزيع الطائر بنجاح' });
  } catch (err) { next(err); }
});

module.exports = router;
