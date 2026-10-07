import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useApp } from '../../context/AppContext';

interface SetPasswordViewProps {
  onComplete?: () => void;
}

export const SetPasswordView: React.FC<SetPasswordViewProps> = ({ onComplete }) => {
  const { onPasswordUpdatedSuccessfully } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve current authenticated session user (invited or recovery)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setEmail(user.email);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setErrorMsg('يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Update user password in Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrorMsg(error.message || 'فشل تحديث كلمة المرور. قد يكون الرابط قد انتهت صلاحيته.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('تم تعيين كلمة المرور بنجاح! جاري توجيهك إلى بوابتك المعتمدة...');

      // 2. Trigger role resolution and navigation in AppContext
      const userEmail = data.user?.email || email;
      setTimeout(async () => {
        await onPasswordUpdatedSuccessfully(userEmail);
        if (onComplete) onComplete();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ كلمة المرور');
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
              تفعيل حساب الدخول وتعيين كلمة المرور
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-5">
          {/* Instructions note */}
          <div className="p-3.5 rounded-xl bg-[#EAF5F7] border border-[#1A7B88]/20 text-[#125862] text-xs sm:text-sm leading-relaxed flex items-start gap-2.5">
            <span className="material-symbols-outlined text-xl text-[#1A7B88] shrink-0 mt-0.5">
              verified_user
            </span>
            <div>
              <p className="font-bold">مرحباً بك في المنظومة الأكاديمية!</p>
              <p className="mt-0.5 text-xs text-gray-700">
                يرجى تعيين كلمة مرور شخصية خاصة بك لتأكيد تفعيل الحساب والدخول إلى بوابتك مباشرة.
              </p>
            </div>
          </div>

          {/* Success message */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in shadow-2xs">
              <span className="material-symbols-outlined text-xl text-emerald-600 shrink-0">
                check_circle
              </span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in shadow-2xs">
              <span className="material-symbols-outlined text-xl text-rose-600 shrink-0">
                error
              </span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
            {/* Email (Read-Only) */}
            {email && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  البريد الإلكتروني المعتمد للدخول
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-gray-400 text-lg pointer-events-none">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    readOnly
                    value={email}
                    className="w-full min-h-[44px] pr-10 pl-4 rounded-xl bg-gray-50 text-base text-gray-600 border border-gray-200 text-left dir-ltr shadow-2xs cursor-not-allowed select-all"
                  />
                </div>
              </div>
            )}

            {/* Password input */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-gray-400 text-lg pointer-events-none">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
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
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <span className="text-[11px] text-gray-500 mt-1 block">
                يجب ألا تقل عن 6 خانات
              </span>
            </div>

            {/* Confirm Password input */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3.5 top-3.5 text-gray-400 text-lg pointer-events-none">
                  lock_reset
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  className="w-full min-h-[44px] pr-10 pl-11 rounded-xl bg-white text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200 transition-all text-left dir-ltr shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="min-h-[44px] min-w-[44px] absolute left-1 top-0 text-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center cursor-pointer"
                  title={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || Boolean(successMsg)}
              className="w-full min-h-[44px] rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold active:scale-98 transition-all shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer text-sm disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>جاري حفظ كلمة المرور...</span>
                </>
              ) : (
                <>
                  <span>حفظ كلمة المرور والدخول للبوابة</span>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
