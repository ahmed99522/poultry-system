const express = require('express');
const { z } = require('zod');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim();
    let customers;
    if (search) {
      customers = await db.all(`SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name`, [`%${search}%`, `%${search}%`]);
    } else {
      customers = await db.all('SELECT * FROM customers ORDER BY name');
    }
    res.json({ customers });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
    res.json({ customer });
  } catch (err) { next(err); }
});

const customerSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

router.post('/', requireRole('admin', 'distributor'), async (req, res, next) => {
  try {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const info = await db.run(
      `INSERT INTO customers (name, phone, address, notes, created_by) VALUES (?, ?, ?, ?, ?)`,
      [parsed.data.name, parsed.data.phone || null, parsed.data.address || null, parsed.data.notes || null, req.user.sub]
    );

    await logAction({ userId: req.user.sub, action: 'CUSTOMER_CREATED', entity: 'customer', entityId: info.lastInsertRowid, ip: req.ip });
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('admin', 'distributor'), async (req, res, next) => {
  try {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const existing = await db.get('SELECT id FROM customers WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'العميل غير موجود' });

    await db.run(
      `UPDATE customers SET name = ?, phone = ?, address = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
      [parsed.data.name, parsed.data.phone || null, parsed.data.address || null, parsed.data.notes || null, req.params.id]
    );

    await logAction({ userId: req.user.sub, action: 'CUSTOMER_UPDATED', entity: 'customer', entityId: Number(req.params.id), ip: req.ip });
    res.json({ message: 'تم التحديث بنجاح' });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const usedInOrders = await db.get('SELECT COUNT(*) as c FROM orders WHERE customer_id = ?', [req.params.id]);
    if (Number(usedInOrders.c) > 0) {
      return res.status(409).json({ error: 'لا يمكن حذف عميل مرتبط بطلبات سابقة' });
    }
    await db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    await logAction({ userId: req.user.sub, action: 'CUSTOMER_DELETED', entity: 'customer', entityId: Number(req.params.id), ip: req.ip });
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (err) { next(err); }
});

module.exports = router;
