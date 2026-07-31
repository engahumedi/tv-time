# إعداد تسجيل الدخول + المزامنة + إخفاء المفاتيح (Supabase)

هذا الدليل لمن يريد **تشغيل نسخته الخاصة** من ShowTrack. يفعّل عبر **Supabase**
(الخطة المجانية تكفي):

1. **تسجيل الدخول** بالبريد وكلمة المرور (واختياريًا Google)
2. **المزامنة السحابية** — المكتبة وسجل المشاهدة والأفلام والقوائم تنتقل بين الأجهزة
3. **إخفاء مفاتيح TMDB/OMDb** خلف وسيط (Edge Function) فلا تصل المتصفح أبدًا
4. **الطبقة الاجتماعية** — ملفات عامة/خاصة، متابعة، تفاعلات، تنبيهات

> بدون Supabase يظل التطبيق يعمل **محليًا بالكامل** (بدون حساب وبدون أي رفع للبيانات).

---

## الجزء ١ — إنشاء مشروع Supabase

1. سجّل في <https://supabase.com> ثم **New project**.
   - اختر اسمًا، وكلمة مرور لقاعدة البيانات، ومنطقة قريبة.
2. افتح **Project Settings → API** وانسخ:
   - **Project URL** (مثل `https://abcd1234.supabase.co`)
   - مفتاح **anon public**

هاتان القيمتان **آمنتان** للظهور العلني — الحماية الحقيقية عبر سياسات RLS.

> ⚠️ مفتاح **service_role** في نفس الصفحة **ليس** آمنًا: يتجاوز كل سياسات RLS.
> لا تضعه في الكود ولا في المتصفح — مكانه أسرار GitHub Actions فقط (الجزء ٥).

---

## الجزء ٢ — إنشاء الجداول

1. في Supabase افتح **SQL Editor → New query**.
2. الصق كامل محتوى [`supabase/schema.sql`](supabase/schema.sql) واضغط **Run**.

الملف **idempotent** (آمن تشغيله أكثر من مرة). يُنشئ:

- **بياناتك:** `shows` · `watches` · `movies` · `lists`
- **الاجتماعي:** `profiles` · `follows` · `blocks` · `episode_reactions` ·
  `activity_likes` · `activity_comments`
- **مرجع التقييمات:** `imdb_ratings` · `tmdb_imdb`

مع تفعيل RLS بحيث لا يرى أي مستخدم إلا بياناته (أو بيانات من سمح له بمتابعته).

---

## الجزء ٣ — نشر وسيط المفاتيح (Edge Function)

الوسيط يخفي مفاتيح TMDB/OMDb في السيرفر، ويقدّم أيضًا نقطة تقييمات IMDb المجمّعة.

**من اللوحة:**
1. Supabase → **Edge Functions → Deploy a new function**
2. الاسم: `api`
3. الصق محتوى [`supabase/functions/api/index.ts`](supabase/functions/api/index.ts)
4. أطفئ **Verify JWT** (ليعمل البحث قبل تسجيل الدخول)

**أو عبر الطرفية:**
```bash
npm i -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy api --no-verify-jwt
```

ثم أضف **أسرار الدالة** (هنا تُخزَّن المفاتيح بأمان):
```bash
supabase secrets set TMDB_API_KEY=<مفتاح TMDB>
supabase secrets set OMDB_API_KEY=<مفتاح OMDb>
```

احصل على المفاتيح من:
[TMDB](https://www.themoviedb.org/settings/api) و[OMDb](https://www.omdbapi.com/apikey.aspx).

---

## الجزء ٤ — ربط الموقع بمشروعك

أضف قيمتَي Supabase إلى المستودع كـ **GitHub Secrets**:

1. GitHub → المستودع → **Settings → Secrets and variables → Actions**
2. **New repository secret** ×2:
   - `VITE_SUPABASE_URL` = الـ Project URL
   - `VITE_SUPABASE_ANON_KEY` = مفتاح anon public

يقرأهما سير عمل النشر ([`deploy-pages.yml`](.github/workflows/deploy-pages.yml))
عند البناء. ادفع أي تغيير لتشغيل النشر.

---

## الجزء ٥ — تقييمات IMDb (اختياري لكن مُستحسن)

تُعرض تقييمات IMDb على الأغلفة من نسخة محلية من
[ملف IMDb الرسمي اليومي](https://datasets.imdbws.com/) — تغطية كاملة وبلا حد طلبات.

1. أضف سرًّا ثالثًا: `SUPABASE_SERVICE_ROLE_KEY` = مفتاح **service_role**
   (من Project Settings → API). يُستخدم للكتابة في جداول المرجع فقط.
2. شغّل سير العمل **Refresh IMDb ratings** يدويًا مرة واحدة من تبويب **Actions**
   لتعبئة البيانات (يستغرق ~دقيقة لـ ٦٠٠ ألف عمل).

بعدها يعمل تلقائيًا **يوميًا**، ويسخّن أيضًا جدول الربط `tmdb_imdb` مسبقًا
لتظهر التقييمات فورًا.

---

## ملاحظات

- **تأكيد البريد:** افتراضيًا يرسل Supabase رابط تأكيد. لتجربة أسرع أطفئه من
  **Authentication → Providers → Email → Confirm email**.
- **Google (اختياري):** فعّل مزوّد Google في Supabase، وأضف
  `https://<PROJECT_REF>.supabase.co/auth/v1/callback` كـ redirect في Google Cloud.
- **التطوير محليًا:** انسخ `.env.example` إلى `.env` واملأ القيم.
- **تدوير المفاتيح:** إذا انكشف مفتاح TMDB/OMDb في أي وقت، أعِد توليده من لوحة
  المزوّد وحدّث أسرار الدالة (الجزء ٣) — لا حاجة لأي تغيير في الكود.
