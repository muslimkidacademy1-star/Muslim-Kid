# تعليمات نشر وظيفة الخادم وسياسات حماية قاعدة البيانات (Supabase)
## أكاديمية «المسلم الصغير» لتحفيظ القرآن الكريم

تم إعداد ملفات وظيفة الخادم (Supabase Edge Function) وسياسات أمان قاعدة البيانات (Row Level Security - RLS) لحماية حسابات المعلمين والمشرفين وربطهم الإداري بأعلى معايير الأمان.

---

### 1. نشر وظيفة الخادم `create-user`

الوظيفة موجودة في المسار:
`supabase/functions/create-user/index.ts`

#### خطوات النشر عبر Supabase CLI:

1. **تسجيل الدخول إلى Supabase:**
   ```bash
   npx supabase login
   ```

2. **ربط المشروع (Project Link):**
   ```bash
   npx supabase link --project-ref pxmewwwnekelycvrrhnt
   ```

3. **ضبط أسرار الخادم (Secrets):**
   ```bash
   npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY_HERE>" SITE_URL="https://your-domain.com"
   ```
   *ملاحظة: مفتاح `SERVICE_ROLE_KEY` يؤخذ من إعدادات مشروع Supabase: Project Settings > API > service_role (secret).*

4. **نشر وظيفة الخادم:**
   ```bash
   npx supabase functions deploy create-user --no-verify-jwt
   ```
   *(يتم التحقق من جلسة وصلاحيات مسؤول النظام برمجياً وبشكل صارم داخل الكود)*

---

### 2. تطبيق سياسات حماية قاعدة البيانات (RLS)

الملف: `supabase/migrations/20261007_rls_security_policies.sql`

لتطبيق السياسات في Supabase:
1. توجه إلى لوحة تحكم Supabase: [https://supabase.com/dashboard/project/pxmewwwnekelycvrrhnt](https://supabase.com/dashboard/project/pxmewwwnekelycvrrhnt)
2. افتح قائمة **SQL Editor**.
3. انسخ محتويات الملف `supabase/migrations/20261007_rls_security_policies.sql`.
4. اضغط **RUN**.

#### الضمانات الأمنية التي توفرها السياسات:
1. **منع غير مسؤول النظام من إضافة المستخدمين إدارياً:** عمليات الإضافة والتعديل في جداول المشرفين والمعلمين محصورة بمسؤول النظام الفعلي.
2. **منع المستخدم من ترقية نفسه:** السياسات تمنع أي مستخدم من تعديل حقل `role` الخاص به أو اكتساب صلاحيات أعلى.
3. **عزل بيانات المشرف الفرعي:** كل مشرف فرعي يشاهد ويتابع فقط المعلمين المرتبطين به وطلابهم.
4. **فقد المشرف السابق للوصول فور نقل المعلم:** بمجرد نقل المعلم لمشرف آخر بواسطة مسؤول النظام، يفقد المشرف السابق فوراً إمكانية الوصول إلى المعلم أو طلابه أو تقاريره.
5. **وصول شامل للمدير ومسؤول النظام:** احتفاظ الإدارة العامة ومسؤول النظام بالرؤية الكاملة والتقارير الإجمالية للأكاديمية.
