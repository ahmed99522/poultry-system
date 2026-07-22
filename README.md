# نظام إدارة طلبات وتوزيع المنتجات (PoultryFlow)

نظام ويب متكامل (PWA) لإدارة دورة العمل الكاملة: تسجيل الطلبات → إغلاقها → تسجيل الأوزان تلقائيًا مع توليد كود لكل طائر وحساب السعر → التوزيع على العملاء → إصدار الفواتير، مع صلاحيات مختلفة لكل نوع مستخدم (مدير، موزّع، موظف أوزان).

تم بناء المشروع بالكامل واختباره فعليًا (تسجيل دخول، إنشاء طلب، إغلاقه، تسجيل أوزان، توزيعها، إصدار فاتورة بمبلغ صحيح تلقائيًا) ويعمل بدون أي أخطاء.

---

## 1) البنية التقنية (مُحدَّثة للنشر المجاني بدون بطاقة ائتمان)

| الطبقة | التقنية | السبب |
|---|---|---|
| Backend | Node.js + Express | خفيف وسريع، يعمل محليًا وكذلك كـ Serverless على Vercel |
| قاعدة البيانات | **Turso (libSQL)** | قاعدة بيانات سحابية متوافقة 100% مع SQLite، **مجانية بدون بطاقة ائتمان نهائيًا** ولا تنتهي صلاحيتها |
| المصادقة | JWT (access + refresh) | access token عمره 15 دقيقة، refresh token في httpOnly cookie آمن لمدة 7 أيام |
| Frontend | React + Vite + TailwindCSS | واجهة حديثة، سريعة البناء، تصميم احترافي |
| PWA | vite-plugin-pwa (Workbox) | يعمل من أي جهاز بدون تثبيت من متجر تطبيقات |
| اللغة | react-i18next | تبديل فوري عربي ⇄ إنجليزي مع تبديل اتجاه الصفحة RTL ⇄ LTR |

**لماذا Turso بدل SQLite المحلية؟** لأن منصات النشر المجانية الحقيقية بدون بطاقة (مثل Vercel) لا توفر قرص تخزين دائم، والباك اند يعمل عندها كدوال Serverless (بدون ملف محلي دائم). Turso قاعدة بيانات سحابية بنفس لغة SQLite تمامًا، لذلك الكود والمنطق لم يتغيّر إطلاقًا — فقط طريقة الاتصال بالبيانات.

---

## 2) خطة النشر المجانية بدون بطاقة ائتمان نهائيًا

| الجزء | المنصة | بطاقة؟ |
|---|---|---|
| قاعدة البيانات | turso.tech | لا |
| الباك اند (API) | vercel.com | لا |
| الواجهة الأمامية | Cloudflare Pages | لا |

ملاحظة: بعض الحسابات (خصوصًا حسب الدولة) تُطالَب ببطاقة تحقق حتى على الخطة المجانية في منصات مثل Render/Railway — لذلك تم استبدالها بالكامل في هذا الدليل بـ Turso + Vercel المؤكَّد عملهما بدون أي بطاقة على الإطلاق.

---

## 3) الأمان (Security) — أهم ما تم تطبيقه

- كلمات المرور مشفّرة بـ bcrypt (12 rounds).
- الجلسات: access token قصير العمر (15 دقيقة) + refresh token في httpOnly + Secure + SameSite cookie.
- منع Brute Force: قفل الحساب تلقائيًا بعد 5 محاولات فاشلة + Rate Limiting صارم على تسجيل الدخول.
- منع SQL Injection: 100% من الاستعلامات Parameterized Queries.
- التحقق من المدخلات: Zod على كل مسار.
- رؤوس HTTP الأمنية: Helmet (CSP, HSTS...).
- CORS محدد: فقط النطاقات المسجّلة في CORS_ORIGINS.
- صلاحيات دقيقة (RBAC): كل مسار API يتحقق من دور المستخدم.
- سجل تدقيق كامل (Audit Log): كل عملية حساسة مسجّلة بالمستخدم والوقت وIP.

---

## 4) خطوات النشر بالتفصيل

### أ) إنشاء قاعدة بيانات على Turso (بدون بطاقة)

1. روح turso.tech واضغط Get Started وسجّل بحساب GitHub.
2. من لوحة التحكم اضغط Create Database، اختار اسم (مثلاً poultry-db) واختار أقرب منطقة لك، ثم Create.
3. بعد الإنشاء، هتلاقي:
   - Database URL (شكله libsql://poultry-db-username.turso.io)
   - اضغط Create Token لإنشاء Auth Token (انسخه فورًا، هيظهر مرة واحدة فقط).
4. احتفظ بالقيمتين دول، هنحتاجهم في الخطوة الجاية.

### ب) نشر الباك اند على Vercel (بدون بطاقة)

1. روح vercel.com وسجّل بحساب GitHub.
2. اضغط Add New → Project → اختار مستودع poultry-system.
3. في Root Directory اضغط Edit واختار: poultry-system/backend (أو backend لو رفعته من غير المجلد الإضافي).
4. Framework Preset: Other.
5. تحت Environment Variables ضيف:

| Key | Value |
|---|---|
| TURSO_DATABASE_URL | القيمة من خطوة (أ) |
| TURSO_AUTH_TOKEN | القيمة من خطوة (أ) |
| NODE_ENV | production |
| JWT_ACCESS_SECRET | نص عشوائي طويل (ولّده من generate-secret.vercel.app/64) |
| JWT_REFRESH_SECRET | نص عشوائي طويل مختلف |
| SEED_ADMIN_PASSWORD | كلمة سر تختارها لحساب المدير |
| COOKIE_CROSS_SITE | true |
| CORS_ORIGINS | اتركها مؤقتًا http://localhost:5173 |

6. اضغط Deploy واستنى دقيقة أو اثنين.
7. بعد النجاح هتاخد رابط شكله: https://poultry-backend.vercel.app
8. مهم — خطوة تشغيل لمرة واحدة: لازم تطبّق المخطط (الجداول) وتعمل حساب المدير على قاعدة Turso الفعلية. من جهازك (بعد npm install في مجلد backend):
   ```bash
   # حط بيانات Turso الحقيقية في .env محليًا (انسخ .env.example أولًا)
   npm run migrate   # ينشئ كل الجداول
   npm run seed      # ينشئ حساب admin
   ```
   دول بيتصلوا مباشرة بقاعدة Turso السحابية بغض النظر عن مكان تشغيلهم، فمش لازم Vercel نفسها.

### ج) نشر الواجهة الأمامية على Cloudflare Pages

1. dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git.
2. اختار مستودع poultry-system.
3. الإعدادات:
   - Root directory: poultry-system/frontend
   - Build command: npm run build
   - Build output directory: dist
4. Environment Variables:
   | Key | Value |
   |---|---|
   | VITE_API_URL | https://poultry-backend.vercel.app/api |
5. Save and Deploy → هتاخد رابط شكله https://poultry-system-xyz.pages.dev

### د) الربط النهائي

ارجع لـ Vercel → مشروع الباك اند → Settings → Environment Variables → عدّل CORS_ORIGINS ليصبح رابط Cloudflare Pages (بدون / في النهاية) → Redeploy.

---

## 5) التشغيل محليًا (على جهازك، بدون Turso حتى)

ميزة رائعة في libSQL: تقدر تجرّب محليًا بدون حساب Turso خالص، باستخدام ملف محلي:

```bash
cd backend
npm install
cp .env.example .env
# عدّل في .env:
# TURSO_DATABASE_URL=file:./data/local.db
# TURSO_AUTH_TOKEN=anything
npm run migrate
npm run seed
npm run dev
```

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

سجّل الدخول بـ admin / كلمة المرور اللي حطيتها في SEED_ADMIN_PASSWORD.

---

## 6) هيكل المشروع

```
poultry-system/
├── backend/
│   ├── api/index.js          # نقطة الدخول لـ Vercel (Serverless)
│   ├── app.js                 # إعداد Express المشترك
│   ├── server.js              # نقطة الدخول للتشغيل المحلي
│   ├── db/
│   │   ├── database.js        # طبقة الاتصال بـ Turso (libSQL)
│   │   ├── schema.js          # تعريف الجداول
│   │   ├── migrate.js         # تطبيق المخطط
│   │   └── seed.js            # إنشاء حساب المدير الافتراضي
│   ├── middleware/            # JWT + الصلاحيات + الحماية
│   ├── routes/                 # كل مسارات الـ API
│   ├── utils/                  # التدقيق + توليد الأكواد
│   └── vercel.json
└── frontend/
    ├── src/
    │   ├── api/client.js       # عميل axios مع تجديد الجلسة التلقائي
    │   ├── context/AuthContext.jsx
    │   ├── components/
    │   ├── i18n/                # ar.json, en.json
    │   └── pages/
    └── vite.config.js
```

---

## 7) دورة العمل داخل النظام

1. الموزّع ينشئ طلبًا: عميل + منتج + كمية.
2. إغلاق الطلب → النظام يولّد تلقائيًا شريحة لكل طائر بكود فريد.
3. موظف الأوزان يدخل الوزن (شاشة سريعة، Enter بعد كل رقم) → النظام يحسب السعر تلقائيًا.
4. الموزّع يوزّع كل طائر على العميل المناسب (الأصلي أو غيره حسب الوزن).
5. إصدار الفاتورة تلقائيًا: عدد الطيور + الوزن الكلي + المبلغ الإجمالي.
6. كل شيء مسجّل في سجل التدقيق، وكل الشاشات تدعم العربية/الإنجليزية.

---

## 8) الأدوار والصلاحيات

| الدور | الصلاحيات |
|---|---|
| مدير (admin) | كل شيء |
| موزّع (distributor) | العملاء، الطلبات، التوزيع، الفواتير |
| موظف أوزان (weigher) | شاشة الأوزان فقط |

---

## 9) ملاحظات مهمة

- كلمة مرور المدير الافتراضية يجب تغييرها فورًا بعد أول دخول.
- Turso مجانية بحد كبير من التخزين — أكثر من كافٍ لهذا المشروع مهما كبر.
- لو حبيت تعمل تعديل على الكود لاحقًا: عدّل، اعمل git push، وكل من Vercel و Cloudflare Pages هيعيدوا النشر تلقائيًا.
