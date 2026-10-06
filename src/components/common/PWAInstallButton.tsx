import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstalled, isIOS, install, isInstallable } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guidePlatform, setGuidePlatform] = useState<'ios' | 'other'>('ios');

  const handleInstallClick = async () => {
    if (isInstallable) {
      const result = await install();
      if (result === 'accepted') return;
      if (result === 'dismissed') return;
    }

    // If on iOS or no deferredPrompt yet, show friendly guidance
    if (isIOS) {
      setGuidePlatform('ios');
    } else {
      setGuidePlatform('other');
    }
    setShowGuideModal(true);
  };

  // Render button according to variant
  const renderButton = () => {
    // If already running inside installed standalone PWA, show badge or nothing
    if (isInstalled) {
      if (variant === 'sidebar') {
        return (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1.5 justify-center">
            <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
            <span>التطبيق مثبت على جهازك</span>
          </div>
        );
      }
      return null;
    }

    if (variant === 'sidebar') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white active:scale-98 transition-all text-xs font-bold shadow-xs cursor-pointer min-h-[44px] ${className}`}
          title="تثبيت التطبيق على هاتفك"
        >
          <span className="material-symbols-outlined text-base">install_mobile</span>
          <span>تثبيت التطبيق على هاتفك</span>
        </button>
      );
    }

    if (variant === 'banner') {
      return (
        <div className="bg-[#125862] text-white p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 shadow-xs border border-[#1A7B88]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white flex-shrink-0">
              <span className="material-symbols-outlined text-xl">install_mobile</span>
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">تثبيت أكاديمية المسلم الصغير</h4>
              <p className="text-[11px] text-[#EAF5F7]">
                ثبت التطبيق على هاتفك لسهولة الوصول والمتابعة الدورية السريعة
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 rounded-xl bg-white text-[#125862] font-bold text-xs hover:bg-[#EAF5F7] transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-xs min-h-[36px]"
          >
            <span>تثبيت</span>
            <span className="material-symbols-outlined text-sm">download</span>
          </button>
        </div>
      );
    }

    // Default 'header' variant
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white active:scale-95 transition-all text-xs font-bold shadow-2xs cursor-pointer border border-[#1A7B88]/40 min-h-[36px] ${className}`}
        title="تثبيت تطبيق أكاديمية المسلم الصغير كبرنامج على هاتفك"
      >
        <span className="material-symbols-outlined text-sm sm:text-base">
          install_mobile
        </span>
        <span className="hidden sm:inline">تثبيت التطبيق</span>
        <span className="sm:hidden">تثبيت</span>
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      {/* Instructional Guide Modal for iOS Safari / Manual Installation */}
      {showGuideModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-gray-200/80 overflow-hidden flex flex-col text-right animate-in zoom-in-95 duration-200"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="bg-[#125862] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">install_mobile</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm">تثبيت التطبيق على هاتفك</h3>
                  <span className="text-[11px] text-[#EAF5F7]">أكاديمية المسلم الصغير</span>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/15 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4 text-xs text-[#1D1D1F]">
              {guidePlatform === 'ios' ? (
                <>
                  <p className="text-gray-600 leading-relaxed">
                    لتثبيت التطبيق على جهاز <strong>iPhone أو iPad</strong> من متصفح <strong>Safari</strong>:
                  </p>

                  <div className="flex flex-col gap-2.5 bg-[#EAF5F7] p-3.5 rounded-xl border border-[#1A7B88]/20">
                    {/* Step 1 */}
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#1A7B88] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                        1
                      </span>
                      <p className="leading-snug">
                        اضغط على أيقونة <strong>المشاركة</strong>{' '}
                        <span className="inline-block px-1.5 py-0.5 rounded bg-white border border-[#1A7B88]/20 font-mono text-[11px]">
                          Share
                        </span>{' '}
                        الموجودة أسفل شاشة المتصفح.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#1A7B88] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                        2
                      </span>
                      <p className="leading-snug">
                        مرر القائمة للأسفل، ثم اضغط على خيار{' '}
                        <strong className="text-[#125862]">«إضافة إلى الشاشة الرئيسية»</strong>{' '}
                        (Add to Home Screen).
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#1A7B88] text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                        3
                      </span>
                      <p className="leading-snug">
                        اضغط على <strong>«إضافة»</strong> (Add) في الزاوية العلوية لتثبيت أيقونة الأكاديمية على هاتفك.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-600 leading-relaxed">
                    لتثبيت التطبيق على جهاز <strong>Android أو الكمبيوتر</strong>:
                  </p>

                  <div className="flex flex-col gap-2.5 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                        1
                      </span>
                      <p className="leading-snug">
                        اضغط على زر القائمة <strong>(⋮)</strong> في متصفحك (Chrome أو Edge).
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                        2
                      </span>
                      <p className="leading-snug">
                        اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                        3
                      </span>
                      <p className="leading-snug">
                        سيظهر التطبيق كبرنامج مستقل على شاشة هاتفك مع إمكانية التشغيل السريع بدون متصفح.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Benefits */}
              <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <span className="material-symbols-outlined text-base text-[#1A7B88]">bolt</span>
                <span>تشغيل فوري، شاشة كاملة مثل التطبيقات الأصلية، وتوفير استهلاك البيانات.</span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#1A7B88] text-white font-bold text-xs hover:bg-[#125862] transition-colors cursor-pointer shadow-xs min-h-[44px]"
              >
                فهمت، حسناً
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
