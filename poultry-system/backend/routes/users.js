const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT id, full_name, username, role, is_active, created_at FROM users ORDER BY id DESC
  `).all();
  res.json({ users });
});

const createUserSchema = z.object({
  fullName: z.string().min(2).max(100),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_.]+$/, 'اسم المستخدم يجب أن يحتوي على أحرف وأرقام فقط'),
  password: z.string().min(8).max(200),
  role: z.enum(['admin', 'distributor', 'weigher']),
});

router.post('/', (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(parsed.data.username);
  if (existing) return res.status(409).json({ error: 'اسم المستخدم مستخدم بالفعل' });

  const hash = bcrypt.hashSync(parsed.data.password, 12);
  const info = db.prepare(`
    INSERT INTO users (full_name, username, password_hash, role) VALUES (?, ?, ?, ?)
  `).run(parsed.data.fullName, parsed.data.username, hash, parsed.data.role);

  logAction({ userId: req.user.sub, action: 'USER_CREATED', entity: 'user', entityId: info.lastInsertRowid, ip: req.ip });
  res.status(201).json({ id: info.lastInsertRowid });
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  role: z.enum(['admin', 'distributor', 'weigher']).optional(),
  isActive: z.boolean().optional(),
});

router.patch('/:id', (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'بيانات غير صحيحة' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const fullName = parsed.data.fullName ?? user.full_name;
  const role = parsed.data.role ?? user.role;
  const isActive = parsed.data.isActive === undefined ? user.is_active : (parsed.data.isActive ? 1 : 0);

  db.prepare(`UPDATE users SET full_name = ?, role = ?, is_active = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(fullName, role, isActive, user.id);

  logAction({ userId: req.user.sub, action: 'USER_UPDATED', entity: 'user', entityId: user.id, ip: req.ip, details: parsed.data });
  res.json({ message: 'تم التحديث بنجاح' });
});

router.post('/:id/reset-password', (req, res) => {
  const schema = z.object({ newPassword: z.string().min(8).max(200) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const hash = bcrypt.hashSync(parsed.data.newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  logAction({ userId: req.user.sub, action: 'PASSWORD_RESET_BY_ADMIN', entity: 'user', entityId: user.id, ip: req.ip });
  res.json({ message: 'تم إعادة تعيين كلمة المرور' });
});

module.exports = router;
