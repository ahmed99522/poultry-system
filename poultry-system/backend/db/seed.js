/**
 * سكربت تهيئة أولية: ينشئ حساب مدير افتراضي إن لم يوجد أي مستخدم.
 * تنبيه أمني: يجب تغيير كلمة المرور فورًا بعد أول تسجيل دخول.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

function seed() {
  const countRow = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (countRow.c > 0) {
    console.log('يوجد مستخدمون بالفعل، تم تخطي التهيئة الأولية.');
    return;
  }

  const defaultPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe@2026';
  const hash = bcrypt.hashSync(defaultPassword, 12);

  db.prepare(`
    INSERT INTO users (full_name, username, password_hash, role, is_active)
    VALUES (?, ?, ?, 'admin', 1)
  `).run('مدير النظام', 'admin', hash);

  db.prepare(`
    INSERT INTO products (name, unit, price_per_kg, is_active)
    VALUES (?, 'kg', ?, 1)
  `).run('دجاج أبيض', 65);

  console.log('تم إنشاء حساب المدير الافتراضي:');
  console.log('  اسم المستخدم: admin');
  console.log(`  كلمة المرور: ${defaultPassword}`);
  console.log('⚠️  الرجاء تغيير كلمة المرور فورًا من داخل النظام بعد أول دخول.');
}

seed();
