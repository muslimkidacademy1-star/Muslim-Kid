import React from 'react';

export type TeacherTab = 'today' | 'students' | 'schedule';

interface TeacherBottomNavProps {
  activeTab: TeacherTab;
  onChangeTab: (tab: TeacherTab) => void;
  todayCount: number;
  studentsCount: number;
}

export const TeacherBottomNav: React.FC<TeacherBottomNavProps> = ({
  activeTab,
  onChangeTab,
  todayCount,
  studentsCount,
}) => {
  return (
    <nav
      className="fixed bottom-0 right-0 left-0 sm:hidden z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-2 flex items-center justify-center"
      dir="rtl"
      aria-label="شريط تنقل الموبايل للمعلم"
    >
      <div className="w-full max-w-xs grid grid-cols-2 gap-3">
        {/* Tab 1: الرئيسية (حصص اليوم) */}
        <button
          onClick={() => onChangeTab('today')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'today'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
        >
          {activeTab === 'today' && (
            <span className="absolute -top-2 w-8 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span className={`material-symbols-outlined text-2xl ${activeTab === 'today' ? 'text-[#1A7B88]' : 'text-gray-500'}`}>
              home
            </span>
            {todayCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[17px] h-4 px-1 rounded-full bg-[#1A7B88] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                {todayCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-0.5 tracking-tight">الرئيسية</span>
        </button>

        {/* Tab 2: طلابي (قائمة الطلاب) */}
        <button
          onClick={() => onChangeTab('students')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-[#EAF5F7] text-[#125862] font-bold shadow-2xs'
              : 'text-gray-500 hover:text-gray-800 font-medium'
          }`}
        >
          {activeTab === 'students' && (
            <span className="absolute -top-2 w-8 h-1 bg-[#1A7B88] rounded-full" />
          )}
          <div className="relative flex items-center justify-center">
            <span className={`material-symbols-outlined text-2xl ${activeTab === 'students' ? 'text-[#1A7B88]' : 'text-gray-500'}`}>
              groups
            </span>
            {studentsCount > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[17px] h-4 px-1 rounded-full bg-[#1A7B88] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                {studentsCount}
              </span>
            )}
          </div>
          <span className="text-xs mt-0.5 tracking-tight">طلابي</span>
        </button>
      </div>
    </nav>
  );
};
