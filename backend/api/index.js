/**
 * نقطة الدخول لتشغيل التطبيق على Vercel كدالة Serverless واحدة.
 * Vercel يتعرف تلقائيًا على تصدير تطبيق Express ويعامله كمعالج طلبات HTTP.
 */
const app = require('../app');
module.exports = app;
