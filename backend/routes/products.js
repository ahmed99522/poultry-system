const express = require('express');
const { z } = require('zod');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const products = await db.all('SELECT * FROM products ORDER BY name');
    res.json({ products });
  } catch (err) { next(err); }
});

const productSchema = z.object({
  name: z.string().min(2).max(150),
  unit: z.string().min(1).max(20).default('kg'),
  pricePerKg: z.number().positive(),
});

router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = productSchema.safeParse({ ...req.body, pricePerKg: Number(req.body.pricePerKg) });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const info = await db.run(`INSERT INTO products (name, unit, price_per_kg) VALUES (?, ?, ?)`,
      [parsed.data.name, parsed.data.unit, parsed.data.pricePerKg]);

    await logAction({ userId: req.user.sub, action: 'PRODUCT_CREATED', entity: 'product', entityId: info.lastInsertRowid, ip: req.ip });
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = productSchema.safeParse({ ...req.body, pricePerKg: Number(req.body.pricePerKg) });
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const existing = await db.get('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'المنتج غير موجود' });

    await db.run(`UPDATE products SET name = ?, unit = ?, price_per_kg = ?, updated_at = datetime('now') WHERE id = ?`,
      [parsed.data.name, parsed.data.unit, parsed.data.pricePerKg, req.params.id]);

    await logAction({ userId: req.user.sub, action: 'PRODUCT_UPDATED', entity: 'product', entityId: Number(req.params.id), ip: req.ip });
    res.json({ message: 'تم التحديث بنجاح' });
  } catch (err) { next(err); }
});

router.patch('/:id/toggle', requireRole('admin'), async (req, res, next) => {
  try {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    await db.run('UPDATE products SET is_active = ? WHERE id = ?', [product.is_active ? 0 : 1, product.id]);
    res.json({ message: 'تم تحديث الحالة' });
  } catch (err) { next(err); }
});

module.exports = router;
