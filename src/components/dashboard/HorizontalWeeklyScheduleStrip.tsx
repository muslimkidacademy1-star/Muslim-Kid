import React, { useRef } from 'react';
import { Student } from '../../types';
import { getTodayArabicWeekday } from '../../mock/initialData';
import { formatCairoTime } from '../../utils/whatsapp';

interface HorizontalWeeklyScheduleStripProps {
  students: Student[];
  selectedDay?: string | null;
  onSelectDay?: (day: string) => void;
  onLogSession?: (student: Student) => void;
}

const WEEK_DAYS = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
] as const;

export const HorizontalWeeklyScheduleStrip: React.FC<HorizontalWeeklyScheduleStripProps> = ({
  students,
  selectedDay,
  onSelectDay,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayWeekday = getTodayArabicWeekday();

  const getDayStudents = (day: string) => {
    return students.filter(
      (s) => s.status !== 'vacation' && s.scheduleDays?.includes(day)
    );
  };

  const totalWeeklySessions = students.reduce((acc, s) => {
    if (s.status === 'vacation') return acc;
    return acc + (s.scheduleDays?.length || 0);
  }, 0);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const offset = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div
      className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs flex flex-col justify-between mx-auto"
      style={{
        height: '158.5px',
        width: '339px',
        maxWidth: '100%',
        paddingBottom: '12px',
        paddingRight: '9px',
        paddingLeft: '12px',
        paddingTop: '7px',
      }}
      dir="rtl"
    >
      {/* Header with Title & Quick Total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center text-xs shrink-0">
            <span className="material-symbols-outlined text-base">calendar_view_week</span>
          </span>
          <span className="text-xs sm:text-sm font-bold text-gray-900">
            الجدول الأسبوعي المنظم
          </span>
          <span className="hidden sm:inline-block text-[11px] text-gray-400 font-normal">
            (اسحب أفقياً لتصفح أيام الأسبوع)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#125862] bg-[#EAF5F7] px-2.5 py-0.5 rounded-full border border-[#1A7B88]/20">
            {totalWeeklySessions} حصص أسبوعياً
          </span>

          {/* Quick scroll arrows for desktop */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => scroll('right')}
              className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-[#EAF5F7] text-gray-600 hover:text-[#125862] flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
              title="تمرير لليمين"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
            <button
              onClick={() => scroll('left')}
              className="w-6 h-6 rounded-lg bg-gray-50 hover:bg-[#EAF5F7] text-gray-600 hover:text-[#125862] flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
              title="تمرير لليسار"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontally Scrollable Day Cards */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none w-full"
      >
        {WEEK_DAYS.map((day) => {
          const dayStudents = getDayStudents(day);
          const isToday = day === todayWeekday;
          const isSelected = selectedDay === day;

          return (
            <button
              key={day}
              onClick={() => onSelectDay && onSelectDay(day)}
              className={`min-w-[130px] sm:min-w-[145px] p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 shrink-0 text-right ${
                isSelected
                  ? 'bg-[#1A7B88] text-white border-[#1A7B88] shadow-sm scale-102 ring-2 ring-[#1A7B88]/30'
                  : isToday
                  ? 'bg-[#EAF5F7] border-[#1A7B88]/40 ring-1 ring-[#1A7B88]/20 hover:bg-[#ddf0f3]'
                  : 'bg-[#fafafa] hover:bg-white border-gray-200/80 hover:border-[#1A7B88]/40 shadow-2xs'
              }`}
            >
              {/* Day Name & Badge */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {day}
                  </span>
                  {isToday && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? 'bg-amber-400 text-amber-950 font-bold'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}
                    >
                      اليوم
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : dayStudents.length > 0
                      ? 'bg-[#1A7B88] text-white'
                      : 'bg-gray-200/80 text-gray-500'
                  }`}
                >
                  {dayStudents.length}
                </span>
              </div>

              {/* Sessions Summary List or Empty State */}
              <div
                className="flex flex-col gap-1 w-full pt-1"
                style={{ borderWidth: 0, borderTop: 'none' }}
              >
                {dayStudents.length === 0 ? (
                  <span className={`text-[10px] py-1 text-center font-medium ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                    لا توجد حصص
                  </span>
                ) : (
                  dayStudents.slice(0, 2).map((st) => (
                    <div
                      key={`${day}-${st.id}`}
                      className="flex items-center justify-between text-[10px] truncate gap-1"
                    >
                      <span className={`font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                        {st.name}
                      </span>
                      <span className={`font-mono shrink-0 text-[9px] ${isSelected ? 'text-white/80' : 'text-[#125862]'}`}>
                        {formatCairoTime(st.daySchedule?.[day] || st.sessionTime).replace(/\s*\(بتوقيت القاهرة\)/, '')}
                      </span>
                    </div>
                  ))
                )}
                {dayStudents.length > 2 && (
                  <span className={`text-[9px] font-medium text-center ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                    + {dayStudents.length - 2} طلاب آخرين
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
