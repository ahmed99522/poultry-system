const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const db = require('../db/database');
const { signAccessToken, signRefreshToken, REFRESH_SECRET, requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const { logAction } = require('../utils/audit');

const router = express.Router();

const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(200),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

router.post('/login', authLimiter, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
  }
  const { username, password } = parsed.data;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  // رسالة خطأ موحدة سواء كان المستخدم غير موجود أو كلمة المرور خاطئة (لمنع Username Enumeration)
  const genericError = () => res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });

  if (!user) return genericError();

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(423).json({ error: 'الحساب مقفل مؤقتًا بسبب محاولات دخول فاشلة متكررة، حاول لاحقًا' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'هذا الحساب معطّل، تواصل مع مدير النظام' });
  }

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) {
    const attempts = user.failed_login_attempts + 1;
    let lockedUntil = null;
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
    }
    db.prepare('UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?')
      .run(attempts, lockedUntil, user.id);
    logAction({ userId: user.id, action: 'LOGIN_FAILED', entity: 'user', entityId: user.id, ip: req.ip });
    return genericError();
  }

  db.prepare('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });

  logAction({ userId: user.id, action: 'LOGIN_SUCCESS', entity: 'user', entityId: user.id, ip: req.ip });

  res.json({
    accessToken,
    user: { id: user.id, fullName: user.full_name, username: user.username, role: user.role },
  });
});

router.post('/refresh', (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'لا يوجد جلسة نشطة' });
  try {
    const payload = jwt.verify(token, REFRESH_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user || !user.is_active) return res.status(401).json({ error: 'جلسة غير صالحة' });
    const accessToken = signAccessToken(user);
    res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.json({ message: 'تم تسجيل الخروج' });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, full_name, username, role FROM users WHERE id = ?').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json({ user: { id: user.id, fullName: user.full_name, username: user.username, role: user.role } });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8).max(200),
});

router.post('/change-password', requireAuth, (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'بيانات غير صحيحة (كلمة المرور الجديدة 8 أحرف على الأقل)' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const match = bcrypt.compareSync(parsed.data.currentPassword, user.password_hash);
  if (!match) return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });

  const newHash = bcrypt.hashSync(parsed.data.newPassword, 12);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newHash, user.id);
  logAction({ userId: user.id, action: 'PASSWORD_CHANGED', entity: 'user', entityId: user.id, ip: req.ip });

  res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
});

module.exports = router;
