import React from 'react';

export type ManagerTab = 'overview' | 'reports' | 'academy' | 'more';

interface ManagerBottomNavProps {
  activeTab: ManagerTab;
  onChangeTab: (tab: ManagerTab) => void;
  pendingReportsCount?: number;
}

export const ManagerBottomNav: React.FC<ManagerBottomNavProps> = ({
  activeTab,
  onChangeTab,
  pendingReportsCount = 0,
}) => {
  return (
    <nav
      className="fixed bottom-0 right-0 left-0 sm:hidden z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] flex items-center justify-center select-none"
      dir="rtl"
      aria-label="شريط تنقل المدير العام"
    >
      <div className="w-full max-w-md grid grid-cols-4 gap-1">
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
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-bold">الرئيسية</span>
        </button>

        {/* Tab 2: التقارير */}
        <button
          onClick={() => onChangeTab('reports')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
          aria-label="التقارير"
        >
          {activeTab === 'reports' && (
            <span className="absolute -top-1.5 w-6 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-2xl ${
                activeTab === 'reports' ? 'text-[#1A7B88]' : 'text-gray-500'
              }`}
            >
              description
            </span>
            {pendingReportsCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-3.5 px-0.5 rounded-full bg-amber-500 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs">
                {pendingReportsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-bold">التقارير</span>
        </button>

        {/* Tab 3: الأكاديمية */}
        <button
          onClick={() => onChangeTab('academy')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'academy'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
          aria-label="الأكاديمية"
        >
          {activeTab === 'academy' && (
            <span className="absolute -top-1.5 w-6 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-2xl ${
                activeTab === 'academy' ? 'text-[#1A7B88]' : 'text-gray-500'
              }`}
            >
              school
            </span>
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-bold">الأكاديمية</span>
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
