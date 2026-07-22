const express = require('express');
const { z } = require('zod');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const search = (req.query.search || '').trim();
  let customers;
  if (search) {
    customers = db.prepare(`
      SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name
    `).all(`%${search}%`, `%${search}%`);
  } else {
    customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
  }
  res.json({ customers });
});

router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
  res.json({ customer });
});

const customerSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

router.post('/', requireRole('admin', 'distributor'), (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const info = db.prepare(`
    INSERT INTO customers (name, phone, address, notes, created_by) VALUES (?, ?, ?, ?, ?)
  `).run(parsed.data.name, parsed.data.phone || null, parsed.data.address || null, parsed.data.notes || null, req.user.sub);

  logAction({ userId: req.user.sub, action: 'CUSTOMER_CREATED', entity: 'customer', entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', requireRole('admin', 'distributor'), (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const existing = db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'العميل غير موجود' });

  db.prepare(`
    UPDATE customers SET name = ?, phone = ?, address = ?, notes = ?, updated_at = datetime('now') WHERE id = ?
  `).run(parsed.data.name, parsed.data.phone || null, parsed.data.address || null, parsed.data.notes || null, req.params.id);

  logAction({ userId: req.user.sub, action: 'CUSTOMER_UPDATED', entity: 'customer', entityId: Number(req.params.id), ip: req.ip });
  res.json({ message: 'تم التحديث بنجاح' });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  const usedInOrders = db.prepare('SELECT COUNT(*) as c FROM orders WHERE customer_id = ?').get(req.params.id);
  if (usedInOrders.c > 0) {
    return res.status(409).json({ error: 'لا يمكن حذف عميل مرتبط بطلبات سابقة' });
  }
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  logAction({ userId: req.user.sub, action: 'CUSTOMER_DELETED', entity: 'customer', entityId: Number(req.params.id), ip: req.ip });
  res.json({ message: 'تم الحذف بنجاح' });
});

module.exports = router;
