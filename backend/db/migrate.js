/**
 * تطبيق مخطط الجداول على قاعدة بيانات Turso.
 * آمن للتشغيل عدة مرات (كل الأوامر IF NOT EXISTS).
 * يُشغَّل مرة واحدة يدويًا بعد ربط قاعدة البيانات، أو تلقائيًا ضمن أمر البناء.
 */
require('dotenv').config();
const { client } = require('./database');
const statements = require('./schema');

async function migrate() {
  for (const sql of statements) {
    await client.execute(sql);
  }
  console.log('✅ تم إنشاء/تحديث كل الجداول بنجاح على Turso');
}

migrate().catch((err) => {
  console.error('❌ فشل تطبيق المخطط:', err.message);
  process.exit(1);
});
