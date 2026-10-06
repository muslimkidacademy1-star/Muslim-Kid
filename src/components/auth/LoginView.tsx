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
      className="min-h-screen bg-[#F5F5F7] flex flex-col justify-center items-center p-4 sm:p-6"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden flex flex-col animate-in fade-in duration-200">
        {/* Header / Brand Banner */}
        <div className="bg-[#125862] text-white p-6 sm:p-7 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            {/* Real Logo Emblem */}
            <img
              src="/logo.jpg"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon.svg';
              }}
              alt="شعار الأكاديمية"
              className="w-16 h-16 rounded-2xl aspect-square object-contain bg-white/10 p-1 shadow-xs border border-white/20 mb-3"
            />

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              أكاديمية المسلم الصغير
            </h1>
            <p className="text-xs sm:text-sm text-[#EAF5F7] mt-1 font-medium max-w-sm leading-relaxed">
              البوابة الإدارية والأكاديمية الموحدة لتحفيظ القرآن الكريم
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-5">
          {/* Error Message in Red */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in shadow-2xs">
              <span className="material-symbols-outlined text-xl text-rose-600 shrink-0">
                error
              </span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 text-sm">
            {/* Email input */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-gray-400 text-lg pointer-events-none">
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
                  className="w-full min-h-[44px] pr-10 pl-4 rounded-xl bg-white text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200 transition-all text-left dir-ltr shadow-2xs"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-800">
                  كلمة المرور
                </label>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-gray-400 text-lg pointer-events-none">
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
                  className="w-full min-h-[44px] pr-10 pl-11 rounded-xl bg-white text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200 transition-all text-left dir-ltr shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="min-h-[44px] min-w-[44px] absolute left-1 top-0 text-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#1A7B88] focus:ring-[#1A7B88] accent-[#1A7B88]"
                />
                <span className="font-medium text-gray-800">
                  تذكر تسجيل دخولي على هذا الجهاز
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold active:scale-98 transition-all shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer text-sm disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>جاري تسجيل الدخول...</span>
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
          <div className="mt-1 p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
            <span className="material-symbols-outlined text-base text-[#1A7B88] mt-0.5 shrink-0">
              shield
            </span>
            <span>
              نظام تسجيل دخول موثّق برمجياً بقاعدة بيانات Supabase: يتم التحقق من دور
              الحساب تلقائياً وتوجيهه إلى واجهته الخاصة.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
