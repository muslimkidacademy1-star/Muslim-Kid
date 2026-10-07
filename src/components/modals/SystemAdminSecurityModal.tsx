import React, { useState } from 'react';

interface SystemAdminSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemAdminSecurityModal: React.FC<SystemAdminSecurityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = (text: string, type: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const cliCommands = `# 1. تسجيل الدخول إلى Supabase
npx supabase login

# 2. ربط المشروع
npx supabase link --project-ref pxmewwwnekelycvrrhnt

# 3. ضبط المفاتيح السرية
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<مفتاح_service_role>" SITE_URL="https://your-domain.com"

# 4. نشر وظيفة إنشاء المستخدمين والدعوات
npx supabase functions deploy create-user --no-verify-jwt`;

  const rlsOverview = `-- ملف السياسات جاهز في: supabase/migrations/20261007_rls_security_policies.sql
-- لتطبيق السياسات:
-- 1. افتح لوحة تحكم Supabase > SQL Editor
-- 2. انسخ محتويات الملف أعلاه
-- 3. اضغط RUN لتفعيل حماية الجداول فوراً`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border-t sm:border border-gray-100 flex flex-col max-h-[92vh] z-10 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-2xl">security</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">
                حماية قاعدة البيانات ونشر وظيفة الدعوات
              </h2>
              <p className="text-xs text-[#EAF5F7] mt-0.5 truncate">
                إرشادات RLS و Supabase Edge Function لمسؤول النظام
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 text-[#1D1D1F] text-xs sm:text-sm">
          {/* Card 1: RLS Policies */}
          <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-gray-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-xl">shield</span>
                <h3 className="font-bold text-gray-900 text-sm">
                  1. سياسات حماية قاعدة البيانات (Row Level Security - RLS)
                </h3>
              </div>
              <button
                onClick={() => copyText(rlsOverview, 'rls')}
                className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedType === 'rls' ? 'done' : 'content_copy'}
                </span>
                <span>{copiedType === 'rls' ? 'تم النسخ' : 'نسخ المسار'}</span>
              </button>
            </div>

            <div className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
              <p>
                تم تجهيز ملف الهجرة الكامل في المسار:
                <code className="mx-1 px-1.5 py-0.5 bg-gray-200 rounded font-mono font-bold text-gray-900 dir-ltr inline-block">
                  supabase/migrations/20261007_rls_security_policies.sql
                </code>
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 pr-1">
                <li><strong>حصر الصلاحيات الإدارية:</strong> منع أي مستخدم غير مسؤول النظام من إضافة معلمين أو مشرفين.</li>
                <li><strong>منع الترقية الذاتية:</strong> منع المستخدمين من تعديل أدوارهم أو الارتقاء بصلاحياتهم.</li>
                <li><strong>عزل بيانات المشرف الفرعي:</strong> المشرف الفرعي يرى فقط معلميه وطلابهم المعتمدين.</li>
                <li><strong>فقد الوصول الفوري عند النقل:</strong> بمجرد نقل المعلم لمشرف آخر، يفقد المشرف السابق رؤيته فوراً.</li>
                <li><strong>الوصول الشامل:</strong> احتفاظ المدير العام ومسؤول النظام بالرؤية الشاملة لكافة الأقسام.</li>
              </ul>
            </div>
          </div>

          {/* Card 2: Edge Function Deployment */}
          <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-gray-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1A7B88] text-xl">cloud_sync</span>
                <h3 className="font-bold text-gray-900 text-sm">
                  2. نشر وظيفة الخادم للدعوات (Edge Function: create-user)
                </h3>
              </div>
              <button
                onClick={() => copyText(cliCommands, 'cli')}
                className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedType === 'cli' ? 'done' : 'content_copy'}
                </span>
                <span>{copiedType === 'cli' ? 'تم النسخ' : 'نسخ الأوامر'}</span>
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              كود الوظيفة مكتمل وموجود في المسار:
              <code className="mx-1 px-1.5 py-0.5 bg-gray-200 rounded font-mono font-bold text-gray-900 dir-ltr inline-block">
                supabase/functions/create-user/index.ts
              </code>
              . لنشرها وتفعيل إرسال الدعوات المباشرة بالبريد، قم بتشغيل الأوامر التالية عبر Terminal:
            </p>

            <pre className="p-3 bg-gray-900 text-emerald-400 rounded-xl text-xs font-mono dir-ltr overflow-x-auto whitespace-pre leading-relaxed">
              {cliCommands}
            </pre>

            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-amber-700 shrink-0 mt-0.5">
                lock
              </span>
              <span>
                مفتاح الإدارة <code className="font-mono font-bold">SUPABASE_SERVICE_ROLE_KEY</code> يبقى سرياً ومحفوظاً في خوادم Supabase فقط، ولا يتم تضمينه أبداً في المتصفح.
              </span>
            </div>
          </div>

          {/* Close button */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-6 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
