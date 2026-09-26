import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const LoginView: React.FC = () => {
  const { loginWithSupabase } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني');
      return;
    }

    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور');
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginWithSupabase(cleanEmail, password);
      if (!result.success) {
        setErrorMsg(result.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
        setIsLoading(false);
      }
    } catch {
      setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-linear-to-b from-[#e7eeff] via-[#f4f7ff] to-[#f9f9ff] flex flex-col justify-center items-center p-4 sm:p-6"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#bec8c8]/30 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
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
              <span>تسجيل دخول رسمي معتمد</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-5">
          {/* Error Message in Red */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border-2 border-red-300 text-red-700 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in shadow-xs">
              <span className="material-symbols-outlined text-xl text-red-600 flex-shrink-0">
                error
              </span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 text-sm">
            {/* Email input */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3.5 top-3 text-[#6f7979] text-xl pointer-events-none">
                  alternate_email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="name@academy.com"
                  className="w-full h-12 pr-11 pl-4 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#6f7979]/70 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-[#bec8c8]/30 text-xs sm:text-sm transition-all text-left dir-ltr"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#111c2d]">
                  كلمة المرور
                </label>
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
                  className="w-full h-12 pr-11 pl-11 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#6f7979]/70 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-[#bec8c8]/30 text-xs sm:text-sm transition-all text-left dir-ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3 text-[#6f7979] hover:text-[#005253] transition-colors p-0.5 cursor-pointer"
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
                  <span>جاري تسجيل الدخول عبر Supabase...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول إلى البوابة</span>
                  <span className="material-symbols-outlined text-lg">login</span>
                </>
              )}
            </button>
          </form>

          {/* Privacy & System Protection Note */}
          <div className="mt-1 p-3 rounded-xl bg-[#e7eeff]/60 border border-[#bec8c8]/20 flex items-start gap-2 text-[11px] text-[#526060] leading-relaxed">
            <span className="material-symbols-outlined text-base text-[#005253] mt-0.5 flex-shrink-0">
              verified_user
            </span>
            <span>
              نظام تسجيل دخول موثّق برمجياً بقاعدة بيانات Supabase: يتم التحقق من دور
              الحساب تلقائياً وتوجيهه إلى واجهته الخاصة (بوابة المعلم، رادار المشرف، أو لوحة
              المدير العام).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
