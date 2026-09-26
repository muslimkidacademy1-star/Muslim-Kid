import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface DemoAccount {
  role: UserRole;
  roleTitle: string;
  name: string;
  email: string;
  pass: string;
  badge: string;
  description: string;
  icon: string;
  avatarBg: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'manager',
    roleTitle: 'المدير العام للأكاديمية',
    name: 'د. خالد المنصور',
    email: 'admin@academy.com',
    pass: '123456',
    badge: 'إدارة عامة ومالية',
    description: 'لوحة القيادة الشاملة، متابعة الإيرادات والرواتب، ومركز الترحيل',
    icon: 'admin_panel_settings',
    avatarBg: 'bg-emerald-700 text-white',
  },
  {
    role: 'sub_supervisor',
    roleTitle: 'المشرف التعليمي الفرعي',
    name: 'أ. عبد الرحمن الصالح',
    email: 'supervisor@academy.com',
    pass: '123456',
    badge: 'إشراف ميداني',
    description: 'رادار المتابعة، البث الحي للحلقات، وتقارير معلميه المباشرين',
    icon: 'supervisor_account',
    avatarBg: 'bg-teal-700 text-white',
  },
  {
    role: 'teacher',
    roleTitle: 'معلم حلقة تحفيظ',
    name: 'الشيخ أحمد عبد الله',
    email: 'teacher@academy.com',
    pass: '123456',
    badge: 'بوابة المعلم',
    description: 'حصص اليوم، تسجيل الحضور، ومتابعة حفظ طلاب حلقته فقط',
    icon: 'school',
    avatarBg: 'bg-cyan-800 text-white',
  },
];

export const LoginView: React.FC = () => {
  const { login } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoDrawer, setShowDemoDrawer] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني أو اسم المستخدم أو رقم الهاتف');
      return;
    }

    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور / الرمز السري');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      try {
        login(cleanId, password, rememberMe);
      } catch (err) {
        setErrorMsg('حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى');
        setIsLoading(false);
      }
    }, 250);
  };

  const handleInstantDemoLogin = (acc: DemoAccount) => {
    setIdentifier(acc.email);
    setPassword(acc.pass);
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      login(acc.email, acc.role, rememberMe);
    }, 200);
  };

  const handleFillDemoForm = (acc: DemoAccount) => {
    setIdentifier(acc.email);
    setPassword(acc.pass);
    setErrorMsg(null);
  };

  return (
    <div
      className="min-h-screen bg-linear-to-b from-[#e7eeff] via-[#f4f7ff] to-[#f9f9ff] flex flex-col justify-center items-center p-4 sm:p-6"
      dir="rtl"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#bec8c8]/30 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header / Brand Banner */}
        <div className="bg-linear-to-r from-[#005253] via-[#006062] to-[#186b6d] text-white p-6 sm:p-8 text-center relative overflow-hidden">
          {/* Subtle Decorative Background Ornament */}
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none blur-xl"></div>
          <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-[#a6eff1]/10 pointer-events-none blur-xl"></div>

          <div className="relative z-10 flex flex-col items-center">
            {/* Logo Emblem */}
            <div className="w-18 h-18 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white flex items-center justify-center shadow-lg mb-3">
              <span className="material-symbols-outlined text-4xl text-[#a6eff1]">
                menu_book
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              أكاديمية المسلم الصغير
            </h1>
            <p className="text-xs sm:text-sm text-[#a6eff1] mt-1.5 font-medium max-w-sm leading-relaxed">
              البوابة الإدارية والأكاديمية الموحدة لتحفيظ القرآن الكريم
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold text-white/90">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>تسجيل دخول معتمد للمشرفين والمعلمين والإدارة</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-5">
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-base text-rose-600 flex-shrink-0">
                error
              </span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 text-sm">
            {/* Identifier input */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                البريد الإلكتروني أو اسم المستخدم / رقم الهاتف
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3.5 top-3 text-[#6f7979] text-xl pointer-events-none">
                  alternate_email
                </span>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="admin@academy.com أو 05xxxxxxxx"
                  className="w-full h-12 pr-11 pl-4 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#6f7979]/70 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-[#bec8c8]/30 text-xs sm:text-sm transition-all"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#111c2d]">
                  كلمة المرور / الرمز السري
                </label>
                <span className="text-[11px] text-[#6f7979]">الافتراضي للتجربة: 123456</span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3.5 top-3 text-[#6f7979] text-xl pointer-events-none">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  className="w-full h-12 pr-11 pl-11 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#6f7979]/70 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-[#bec8c8]/30 text-xs sm:text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-[#6f7979] hover:text-[#005253] transition-colors p-0.5"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#3f4949]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#005253] focus:ring-[#005253] accent-[#005253]"
                />
                <span className="font-medium text-[#111c2d]">
                  تذكر تسجيل دخولي على هذا الجهاز
                </span>
              </label>

              <span className="text-[11px] text-[#005253] hover:underline cursor-pointer">
                مساعدة بالدخول؟
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-linear-to-r from-[#005253] to-[#186b6d] text-white font-bold hover:brightness-105 active:scale-99 transition-all shadow-md flex items-center justify-center gap-2 mt-2 cursor-pointer text-sm disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>جاري التحقق والدخول...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول إلى البوابة</span>
                  <span className="material-symbols-outlined text-lg">login</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts Drawer Section */}
          <div className="mt-2 pt-4 border-t border-[#bec8c8]/30 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDemoDrawer(!showDemoDrawer)}
                className="flex items-center gap-2 text-xs font-bold text-[#005253] hover:text-[#003839] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg text-amber-500">
                  key
                </span>
                <span>حسابات تجريبية سريعة (Demo Accounts)</span>
                <span className="material-symbols-outlined text-sm transition-transform duration-200">
                  {showDemoDrawer ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
                دخول فوري بنقرة واحدة
              </span>
            </div>

            {showDemoDrawer && (
              <div className="grid grid-cols-1 gap-2.5 animate-in fade-in duration-200">
                {DEMO_ACCOUNTS.map((acc) => (
                  <div
                    key={acc.role}
                    className="p-3 rounded-2xl bg-[#f9f9ff] hover:bg-[#eef3ff] border border-[#bec8c8]/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${acc.avatarBg}`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {acc.icon}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#111c2d]">
                            {acc.roleTitle}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#005253] border border-[#bec8c8]/30 font-medium">
                            {acc.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6f7979] flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[#005253] dir-ltr text-right">
                            {acc.email}
                          </span>
                          <span>•</span>
                          <span>{acc.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handleFillDemoForm(acc)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-gray-100 text-[#3f4949] text-[11px] font-semibold border border-[#bec8c8]/40 transition-colors"
                        title="نسخ البيانات للنموذج"
                      >
                        تعبئة
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInstantDemoLogin(acc)}
                        className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-[#005253] hover:bg-[#004243] text-white text-[11px] font-bold shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>دخول كـ {acc.badge}</span>
                        <span className="material-symbols-outlined text-xs">
                          arrow_back
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy & System Protection Note */}
          <div className="p-3 rounded-xl bg-[#e7eeff]/60 border border-[#bec8c8]/20 flex items-start gap-2 text-[11px] text-[#526060] leading-relaxed">
            <span className="material-symbols-outlined text-base text-[#005253] mt-0.5 flex-shrink-0">
              verified_user
            </span>
            <span>
              نظام محمي بخصوصية الأدوار: يُوجّه كل حساب مباشرة إلى واجهته المخصصة
              (المعلم لحصصه، المشرف لراداره، والمدير العام للوحة التحكم المالية).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
