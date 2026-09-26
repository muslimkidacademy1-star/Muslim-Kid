import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const {
    students,
    teachers,
    reports,
    resetDatabase,
    exportToExcel,
    isSupabaseConnected,
    isSyncing,
    lastSyncTime,
    seedSupabaseData,
    fetchFromSupabase,
  } = useApp();

  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSeed = async () => {
    setSeedResult(null);
    const res = await seedSupabaseData();
    setSeedResult(res);
  };

  const handleManualSync = async () => {
    await fetchFromSupabase();
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-[#111c2d]">إعدادات النظام والبنية التحتية</h1>
        <p className="text-sm text-[#3f4949] mt-1">
          دليل الخيارات التقنية، حالة الاتصال السحابي بقاعدة بيانات Supabase، وتصدير النسخ الاحتياطية
        </p>
      </div>

      {/* Supabase Cloud Database Status & Quick Migration Card */}
      <div className="bg-linear-to-l from-[#005253] to-[#003738] text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-2xl flex-shrink-0">
              <span className="material-symbols-outlined text-3xl text-[#a6eff1]">cloud_sync</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[#a6eff1] text-xs font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping"></span>
                  <span>متصل بسحابة Supabase</span>
                </span>
                <span className="text-xs text-white/70">
                  {lastSyncTime ? `آخر تحديث: ${lastSyncTime}` : 'مزامنة نشطة'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                قاعدة بيانات Supabase السحابية (Realtime Live Sync)
              </h2>
              <p className="text-xs sm:text-sm text-[#e7eeff]/90 mt-1 max-w-xl leading-relaxed">
                يتم حفظ ومزامنة الطلاب، المعلمين، الحصص، والتقارير تلقائياً ولحظياً عبر جميع شاشات الإدارة والمعلمين.
              </p>
              <div className="mt-2 text-[11px] text-[#a6eff1]/90 font-mono bg-black/20 px-3 py-1 rounded-lg inline-block">
                Project URL: https://pxmewwwnekelycvrrhnt.supabase.co
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer disabled:opacity-50"
              title="تحديث البيانات من السحابة الآن"
            >
              <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{isSyncing ? 'جارِ المزامنة...' : 'تحديث البيانات حياً'}</span>
            </button>

            <button
              onClick={handleSeed}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00e5ff] text-[#003738] text-xs sm:text-sm font-black hover:bg-[#80f0ff] transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="رفع البيانات التجريبية إلى جداول Supabase بنقرة واحدة"
            >
              <span className="material-symbols-outlined text-lg">cloud_upload</span>
              <span>مزامنة البيانات التجريبية إلى Supabase</span>
            </button>
          </div>
        </div>

        {/* Seed notification alert */}
        {seedResult && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 relative z-10 ${
              seedResult.success
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                : 'bg-rose-500/20 border border-rose-400/40 text-rose-200'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {seedResult.success ? 'check_circle' : 'error'}
            </span>
            <span>{seedResult.message}</span>
          </div>
        )}
      </div>

      {/* Non-programmer simple explanation guide */}
      <div className="bg-white rounded-2xl p-6 border border-[#bec8c8]/20 shadow-xs flex flex-col gap-5">
        <div className="flex items-center gap-3 text-[#005253]">
          <span className="material-symbols-outlined text-2xl">help_center</span>
          <h2 className="font-bold text-lg text-[#111c2d]">
            دليل مبسط لغير المبرمجين: كيف تعمل قاعدة البيانات السحابية؟
          </h2>
        </div>

        <p className="text-sm text-[#3f4949] leading-relaxed">
          تم ربط نظام الأكاديمية بنجاح بقاعدة بيانات Supabase السحابية (PostgreSQL + Realtime). إليك تفاصيل البنية التحتية المفعلة:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="p-4 rounded-xl border border-[#005253] bg-[#005253]/5 flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#005253] text-white text-[11px] font-bold self-start">
                الحالة: نشط ومفعل
              </span>
              <h3 className="font-bold text-sm text-[#111c2d] mt-1">
                قاعدة بيانات Supabase السحابية
              </h3>
              <p className="text-xs text-[#6f7979] leading-relaxed mt-1">
                تخزين سحابي فوري وآمن (PostgreSQL) يربط المعلمين والإدارة لحظياً دون حاجة لتحديث الصفحة.
              </p>
            </div>
            <div className="pt-2 border-t border-[#005253]/20">
              <span className="text-xs font-bold text-[#005253] block">المزامنة التلقائية:</span>
              <span className="text-xs text-[#3f4949]">
                أي تعديل يجريه المعلم أو المشرف يظهر للطرف الآخر في أجزاء من الثانية.
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-xl border border-[#bec8c8]/30 bg-[#f9f9ff] flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#dee8ff] text-[#005253] text-[11px] font-bold self-start">
                دعم العمل بدون إنترنت
              </span>
              <h3 className="font-bold text-sm text-[#111c2d] mt-1">
                التخزين المؤقت المزدوج (Cache)
              </h3>
              <p className="text-xs text-[#6f7979] leading-relaxed mt-1">
                في حال ضعف الاتصال بشبكة الإنترنت، يواصل النظام عمله بسلاسة ويعتمد على النسخة المخزنة مؤقتاً.
              </p>
            </div>
            <div className="pt-2 border-t border-[#bec8c8]/20">
              <span className="text-xs font-bold text-[#111c2d] block">حماية البيانات:</span>
              <span className="text-xs text-[#3f4949]">
                لا تفقد أي حصة أو تقرير في حال انقطاع الشبكة أثناء التسميع.
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-xl border border-[#bec8c8]/30 bg-[#f9f9ff] flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#ffdea9] text-[#7d5800] text-[11px] font-bold self-start">
                النسخ الاحتياطية
              </span>
              <h3 className="font-bold text-sm text-[#111c2d] mt-1">
                تصدير إكسل بنقرة واحدة
              </h3>
              <p className="text-xs text-[#6f7979] leading-relaxed mt-1">
                إمكانية استخراج كافة بيانات الأكاديمية (الطلاب، المعلمين، الحصص، التقارير) بملف Excel معتمد.
              </p>
            </div>
            <div className="pt-2 border-t border-[#bec8c8]/20">
              <span className="text-xs font-bold text-[#111c2d] block">التكلفة التشغيلية:</span>
              <span className="text-xs text-[#3f4949]">
                <strong>0$ (مجانية بالكامل)</strong> ضمن باقة Supabase السحابية المجانية.
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportToExcel()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#005253] text-white text-xs font-bold hover:bg-[#186b6d] cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>تحميل نسخة احتياطية كاملة (Excel)</span>
            </button>

            <button
              onClick={handleSeed}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#dee8ff] text-[#005253] text-xs font-bold hover:bg-[#c9daff] cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">cloud_sync</span>
              <span>مزامنة البيانات التجريبية إلى Supabase</span>
            </button>
          </div>

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
