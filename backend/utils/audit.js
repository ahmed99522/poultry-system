const db = require('../db/database');

async function logAction({ userId, action, entity, entityId, details, ip }) {
  try {
    await db.run(
      `INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId || null, action, entity, entityId || null, details ? JSON.stringify(details) : null, ip || null]
    );
  } catch (err) {
    // لا نوقف الطلب الأساسي إذا فشل تسجيل التدقيق فقط
    console.error('audit log error:', err.message);
  }
}

module.exports = { logAction };
