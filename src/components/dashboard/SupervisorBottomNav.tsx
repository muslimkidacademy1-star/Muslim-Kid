import React from 'react';

export type SupervisorTab = 'today_observation' | 'teachers' | 'students_radar' | 'more';

interface SupervisorBottomNavProps {
  activeTab: SupervisorTab;
  onChangeTab: (tab: SupervisorTab) => void;
  todayCount: number;
  teachersCount: number;
  needsAuditCount: number;
}

export const SupervisorBottomNav: React.FC<SupervisorBottomNavProps> = ({
  activeTab,
  onChangeTab,
  todayCount,
  teachersCount,
  needsAuditCount,
}) => {
  return (
    <nav
      className="fixed bottom-0 right-0 left-0 sm:hidden z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] flex items-center justify-center"
      dir="rtl"
      aria-label="شريط تنقل الموبايل للمشرف"
    >
      <div className="w-full max-w-sm grid grid-cols-4 gap-1">
        {/* Tab 1: اليوم */}
        <button
          onClick={() => onChangeTab('today_observation')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'today_observation'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
          aria-label="اليوم"
        >
          {activeTab === 'today_observation' && (
            <span className="absolute -top-1.5 w-6 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-2xl ${
                activeTab === 'today_observation' ? 'text-[#1A7B88]' : 'text-gray-500'
              }`}
            >
              calendar_today
            </span>
            {todayCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-3.5 px-0.5 rounded-full bg-[#1A7B88] text-white text-[9px] font-mono font-bold flex items-center justify-center">
                {todayCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-bold">اليوم</span>
        </button>

        {/* Tab 2: معلموني */}
        <button
          onClick={() => onChangeTab('teachers')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
          aria-label="معلموني"
        >
          {activeTab === 'teachers' && (
            <span className="absolute -top-1.5 w-6 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-2xl ${
                activeTab === 'teachers' ? 'text-[#1A7B88]' : 'text-gray-500'
              }`}
            >
              badge
            </span>
            {teachersCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-3.5 px-0.5 rounded-full bg-gray-500 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                {teachersCount}
              </span>
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight font-bold">معلموني</span>
        </button>

        {/* Tab 3: المتابعة */}
        <button
          onClick={() => onChangeTab('students_radar')}
          className={`relative min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'students_radar'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
          aria-label="المتابعة ورادار الـ60 يوما"
        >
          {activeTab === 'students_radar' && (
            <span className="absolute -top-1.5 w-6 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span
              className={`material-symbols-outlined text-2xl ${
                activeTab === 'students_radar' ? 'text-[#1A7B88]' : 'text-gray-500'
              }`}
            >
              verified_user
            </span>
            {needsAuditCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                {needsAuditCount}
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
          aria-label="المزيد من الشاشات"
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
