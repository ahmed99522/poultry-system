const express = require('express');
const { z } = require('zod');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY name').all();
  res.json({ products });
});

const productSchema = z.object({
  name: z.string().min(2).max(150),
  unit: z.string().min(1).max(20).default('kg'),
  pricePerKg: z.number().positive(),
});

router.post('/', requireRole('admin'), (req, res) => {
  const parsed = productSchema.safeParse({ ...req.body, pricePerKg: Number(req.body.pricePerKg) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const info = db.prepare(`
    INSERT INTO products (name, unit, price_per_kg) VALUES (?, ?, ?)
  `).run(parsed.data.name, parsed.data.unit, parsed.data.pricePerKg);

  logAction({ userId: req.user.sub, action: 'PRODUCT_CREATED', entity: 'product', entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', requireRole('admin'), (req, res) => {
  const parsed = productSchema.safeParse({ ...req.body, pricePerKg: Number(req.body.pricePerKg) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'المنتج غير موجود' });

  db.prepare(`
    UPDATE products SET name = ?, unit = ?, price_per_kg = ?, updated_at = datetime('now') WHERE id = ?
  `).run(parsed.data.name, parsed.data.unit, parsed.data.pricePerKg, req.params.id);

  logAction({ userId: req.user.sub, action: 'PRODUCT_UPDATED', entity: 'product', entityId: Number(req.params.id), ip: req.ip });
  res.json({ message: 'تم التحديث بنجاح' });
});

router.patch('/:id/toggle', requireRole('admin'), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
  db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(product.is_active ? 0 : 1, product.id);
  res.json({ message: 'تم تحديث الحالة' });
});

module.exports = router;
