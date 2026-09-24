import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { students, teachers, reports, resetDatabase, exportToExcel } = useApp();
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[#111c2d]">إعدادات النظام والبنية التحتية</h1>
        <p className="text-sm text-[#3f4949] mt-1">
          دليل الخيارات التقنية، حالة قاعدة البيانات، وتصدير النسخ الاحتياطية
        </p>
      </div>

      {/* Non-programmer simple explanation guide */}
      <div className="bg-white rounded-2xl p-6 border border-[#bec8c8]/20 shadow-xs flex flex-col gap-5">
        <div className="flex items-center gap-3 text-[#005253]">
          <span className="material-symbols-outlined text-2xl">help_center</span>
          <h2 className="font-bold text-lg text-[#111c2d]">
            دليل مبسط لغير المبرمجين: كيف تعمل قاعدة البيانات والاستضافة؟
          </h2>
        </div>

        <p className="text-sm text-[#3f4949] leading-relaxed">
          بناءً على طلبكم لشرح القرارات التقنية ببساطة، إليكم خريطة واضحة ومختصرة للخيارات المتاحة عند تشغيل الأكاديمية:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option 1 */}
          <div className="p-4 rounded-xl border border-[#005253] bg-[#005253]/5 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#005253] text-white text-[11px] font-bold self-start">
                الخيار الموصى به حالياً
              </span>
              <h3 className="font-bold text-sm text-[#111c2d] mt-1">
                قاعدة بيانات سحابية (Firebase / Firestore)
              </h3>
              <p className="text-xs text-[#6f7979] leading-relaxed mt-1">
                مثالية للأكاديميات: تحديث فوري (Realtime)، أمان بصلاحيات لكل مستخدم، وتدعم آلاف الطلاب دون انقطاع.
              </p>
            </div>
            <div className="pt-2 border-t border-[#005253]/20">
              <span className="text-xs font-bold text-[#005253] block">التكلفة الشهرية:</span>
              <span className="text-xs text-[#3f4949]">
                <strong>0$ (مجانية بالكامل)</strong> للأكاديميات التي تضم أقل من 50,000 قراءة يومياً.
              </span>
            </div>
          </div>

          {/* Option 2 */}
          <div className="p-4 rounded-xl border border-[#bec8c8]/30 bg-[#f9f9ff] flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#dee8ff] text-[#005253] text-[11px] font-bold self-start">
                خيار بديل
              </span>
              <h3 className="font-bold text-sm text-[#111c2d] mt-1">
                قاعدة بيانات علائقية (PostgreSQL / Supabase)
              </h3>
              <p className="text-xs text-[#6f7979] leading-relaxed mt-1">
                جداول مترابطة بقوة، ممتازة للتقارير المحاسبية شديدة التعقيد.
              </p>
            </div>
            <div className="pt-2 border-t border-[#bec8c8]/20">
              <span className="text-xs font-bold text-[#111c2d] block">التكلفة الشهرية:</span>
              <span className="text-xs text-[#3f4949]">
                باقة مجانية حتى 500 ميجابايت، ثم تبدأ من 25$ شهرياً.
              </span>
            </div>
          </div>

          {/* Option 3 */}
          <div className="p-4 rounded-xl border border-[#bec8c8]/30 bg-[#f9f9ff] flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffdea9] text-[#7d5800] text-[11px] font-bold self-start">
                خيار المستودعات
              </span>
              <h3 className="font-bold text-sm text-[#111c2d] mt-1">
                خادم سحابي خاص (Cloud Server)
              </h3>
              <p className="text-xs text-[#6f7979] leading-relaxed mt-1">
                سيرفر خاص بالأكاديمية (مثل DigitalOcean أو AWS)، يحتاج إدارة وصيانة دورية.
              </p>
            </div>
            <div className="pt-2 border-t border-[#bec8c8]/20">
              <span className="text-xs font-bold text-[#111c2d] block">التكلفة الشهرية:</span>
              <span className="text-xs text-[#3f4949]">
                بين 12$ إلى 30$ شهرياً حسب حجم الزوار وسرعة السيرفر.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Database state & stats */}
      <div className="bg-white rounded-2xl p-6 border border-[#bec8c8]/20 shadow-xs flex flex-col gap-4">
        <h2 className="font-bold text-base text-[#111c2d]">حالة قاعدة البيانات الحالية للنظام</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl bg-[#f0f3ff]">
            <span className="text-xs text-[#6f7979] block">عدد الطلاب المخزنين</span>
            <span className="text-2xl font-bold text-[#005253]">{students.length}</span>
          </div>
          <div className="p-4 rounded-xl bg-[#f0f3ff]">
            <span className="text-xs text-[#6f7979] block">عدد المعلمين المعتمدين</span>
            <span className="text-2xl font-bold text-[#005253]">{teachers.length}</span>
          </div>
          <div className="p-4 rounded-xl bg-[#f0f3ff]">
            <span className="text-xs text-[#6f7979] block">إجمالي التقارير المحفوظة</span>
            <span className="text-2xl font-bold text-[#005253]">{reports.length}</span>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-[#bec8c8]/20">
          <button
            onClick={() => exportToExcel()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#005253] text-white text-xs font-bold hover:bg-[#186b6d] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>تحميل نسخة احتياطية كاملة (Excel)</span>
          </button>

          <button
            onClick={resetDatabase}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#ffdad6] text-[#ba1a1a] text-xs font-bold hover:bg-[#ffb4ab] cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
            <span>إعادة تعيين البيانات الأولية</span>
          </button>
        </div>
      </div>
    </div>
  );
};
