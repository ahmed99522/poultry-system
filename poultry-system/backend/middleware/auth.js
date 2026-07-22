const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('يجب ضبط JWT_ACCESS_SECRET و JWT_REFRESH_SECRET في ملف .env قبل التشغيل');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, tokenVersion: user.token_version || 0 }, REFRESH_SECRET, {
    expiresIn: '7d',
  });
}

/**
 * التحقق من صحة الـ Access Token المرسل في هيدر Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول للوصول لهذا المورد' });
  }
  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة غير صالحة أو منتهية، الرجاء تسجيل الدخول مجددًا' });
  }
}

/**
 * التحقق من أن المستخدم يملك أحد الأدوار المسموح بها لهذا المسار
 * مثال: requireRole('admin', 'distributor')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'لا تملك الصلاحية الكافية لتنفيذ هذا الإجراء' });
    }
    next();
  };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  requireAuth,
  requireRole,
  ACCESS_SECRET,
  REFRESH_SECRET,
};
