const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');

/**
 * Helmet: يضبط رؤوس HTTP الأمنية (CSP, HSTS, X-Frame-Options ... إلخ)
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
});

/**
 * تحديد عدد الطلبات العام لكل IP لمنع هجمات الحرمان من الخدمة (DoS)
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تم تجاوز الحد المسموح من الطلبات، حاول لاحقًا.' },
});

/**
 * تحديد صارم لمحاولات تسجيل الدخول لمنع هجمات Brute Force
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'محاولات تسجيل دخول كثيرة جدًا، حاول بعد 15 دقيقة.' },
});

module.exports = { helmetMiddleware, generalLimiter, authLimiter, hpp };
