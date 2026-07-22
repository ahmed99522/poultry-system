/**
 * إعداد قاعدة البيانات - Turso (libSQL) بدل SQLite المحلية.
 * السبب: Vercel (المنصة المجانية بدون بطاقة) لا توفر قرص تخزين دائم،
 * لذلك نستخدم قاعدة بيانات سحابية متوافقة مع SQLite بنفس الصيغة تمامًا.
 *
 * كل الدوال هنا Async لأن الاتصال يتم عبر HTTP (لا يوجد ملف محلي).
 */
const { createClient } = require('@libsql/client');

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('يجب ضبط TURSO_DATABASE_URL و TURSO_AUTH_TOKEN في متغيرات البيئة');
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * جلب صف واحد فقط (أو undefined إن لم يوجد)
 */
async function get(sql, params = []) {
  const rs = await client.execute({ sql, args: params });
  return rs.rows[0];
}

/**
 * جلب كل الصفوف المطابقة
 */
async function all(sql, params = []) {
  const rs = await client.execute({ sql, args: params });
  return rs.rows;
}

/**
 * تنفيذ أمر تعديل (INSERT/UPDATE/DELETE) وإرجاع معرف آخر صف مُدرَج وعدد الصفوف المتأثرة
 */
async function run(sql, params = []) {
  const rs = await client.execute({ sql, args: params });
  return { lastInsertRowid: Number(rs.lastInsertRowid), changes: rs.rowsAffected };
}

/**
 * تنفيذ عدة أوامر معًا كمعاملة واحدة ذرية (Atomic) - كل الأوامر تنجح أو تفشل معًا
 * statements: مصفوفة من { sql, args }
 */
async function batch(statements) {
  return client.batch(
    statements.map((s) => ({ sql: s.sql, args: s.args || [] })),
    'write'
  );
}

module.exports = { client, get, all, run, batch };
