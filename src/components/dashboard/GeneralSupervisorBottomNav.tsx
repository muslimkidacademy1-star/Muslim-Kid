import React from 'react';

export type GeneralSupervisorTab = 'overview' | 'team' | 'monitoring' | 'more';

interface GeneralSupervisorBottomNavProps {
  activeTab: GeneralSupervisorTab;
  onChangeTab: (tab: GeneralSupervisorTab) => void;
  overdueCount?: number;
  teachersCount?: number;
  visitsCount?: number;
}

export const GeneralSupervisorBottomNav: React.FC<GeneralSupervisorBottomNavProps> = ({
  activeTab,
  onChangeTab,
  overdueCount = 0,
  teachersCount = 0,
  visitsCount = 0,
}) => {
  return (
    <nav
      className="fixed bottom-0 right-0 left-0 sm:hidden z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] flex items-center justify-center"
      dir="rtl"
      aria-label="شريط تنقل الموبايل للمشرف العام"
    >
      <div className="w-full max-w-sm grid grid-cols-4 gap-1">
        {/* Tab 1: الرئيسية */}
        <button
          onClick={() => onChangeTab('overview')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
          aria-label="الرئيسية"
        >
          {activeTab === 'overview' && (
            <span className="absolute -top-1.5 w-6 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-2xl ${
                activeTab === 'overview' ? 'text-[#1A7B88]' : 'text-gray-500'
              }`}
            >
              dashboard
            </span>
            {overdueCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                {overdueCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-bold">الرئيسية</span>
        </button>

        {/* Tab 2: الفريق */}
        <button
          onClick={() => onChangeTab('team')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'team'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
          aria-label="الفريق"
        >
          {activeTab === 'team' && (
            <span className="absolute -top-1.5 w-6 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-2xl ${
                activeTab === 'team' ? 'text-[#1A7B88]' : 'text-gray-500'
              }`}
            >
              groups
            </span>
            {teachersCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-3.5 px-0.5 rounded-full bg-[#1A7B88] text-white text-[9px] font-mono font-bold flex items-center justify-center">
                {teachersCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-bold">الفريق</span>
        </button>

        {/* Tab 3: المتابعة */}
        <button
          onClick={() => onChangeTab('monitoring')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'monitoring'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
          aria-label="المتابعة"
        >
          {activeTab === 'monitoring' && (
            <span className="absolute -top-1.5 w-6 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-2xl ${
                activeTab === 'monitoring' ? 'text-[#1A7B88]' : 'text-gray-500'
              }`}
            >
              visibility
            </span>
            {visitsCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-3.5 px-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                {visitsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-bold">المتابعة</span>
        </button>

        {/* Tab 4: المزيد */}
        <button
          onClick={() => onChangeTab('more')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'more'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
          aria-label="المزيد"
        >
          {activeTab === 'more' && (
            <span className="absolute -top-1.5 w-6 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-2xl ${
                activeTab === 'more' ? 'text-[#1A7B88]' : 'text-gray-500'
              }`}
            >
              more_horiz
            </span>
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-bold">المزيد</span>
        </button>
      </div>
    </nav>
  );
};
