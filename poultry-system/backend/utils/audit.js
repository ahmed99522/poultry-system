const db = require('../db/database');

function logAction({ userId, action, entity, entityId, details, ip }) {
  db.prepare(`
    INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId || null, action, entity, entityId || null, details ? JSON.stringify(details) : null, ip || null);
}

module.exports = { logAction };
