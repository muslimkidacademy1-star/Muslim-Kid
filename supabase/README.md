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

الملفات المتاحة في `supabase/migrations/`:
1. `supabase/migrations/20261007_rls_security_policies.sql`: حماية جداول النظام الأساسية وحصر الإدارة بمسؤول النظام والمدير.
2. `supabase/migrations/20261010_general_supervisor_team_rls.sql`: تمكين المشرف العام من إدارة الفريق (إضافة معلمين ومشرفين فرعيين وتغيير ارتباط المعلم) مع الحظر الصارم للوصول للماليات أو تعديلها.

لتطبيق السياسات في Supabase:
1. توجه إلى لوحة تحكم Supabase: [https://supabase.com/dashboard/project/pxmewwwnekelycvrrhnt](https://supabase.com/dashboard/project/pxmewwwnekelycvrrhnt)
2. افتح قائمة **SQL Editor**.
3. نفّذ محتويات الملف `supabase/migrations/20261007_rls_security_policies.sql` ثم `supabase/migrations/20261010_general_supervisor_team_rls.sql`.
4. اضغط **RUN**.

#### الضمانات الأمنية التي توفرها السياسات ووظيفة الخادم:
1. **صلاحيات محددة للمشرف العام:** يستطيع إضافة المعلمين والمشرفين الفرعيين فقط، وتغيير ارتباط المعلم بالمشرف الفرعي المناسب.
2. **منع الوصول المالي والتعديل:** يُحظر تماماً على المشرف العام تعديل حقول المصروفات والرواتب (`monthly_expenses`)، وتُعيّن بـ 0 تلقائياً عند إضافة معلم.
3. **منع الترقية أو إنشاء أدوار قيادية:** لا يستطيع المشرف العام إنشاء مدير عام أو مشرف عام أو مسؤول نظام، وتفشل أي محاولة للتجاوز فورياً على مستوى الخادم (403 Forbidden).
4. **عزل بيانات المشرف الفرعي:** كل مشرف فرعي يشاهد ويتابع فقط المعلمين المرتبطين به وطلابهم.
5. **فقد المشرف السابق للوصول فور نقل المعلم:** بمجرد نقل المعلم لمشرف آخر بواسطة مسؤول النظام أو المشرف العام، يفقد المشرف السابق فوراً إمكانية الوصول إلى المعلم أو طلابه أو تقاريره.
6. **وصول شامل للمدير ومسؤول النظام:** احتفاظ الإدارة العامة ومسؤول النظام بالرؤية الكاملة والتقارير الإجمالية للأكاديمية.
