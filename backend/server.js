/**
 * نقطة التشغيل المحلي فقط (على جهازك). للنشر على Vercel استخدم api/index.js
 */
const app = require('./app');

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
});
