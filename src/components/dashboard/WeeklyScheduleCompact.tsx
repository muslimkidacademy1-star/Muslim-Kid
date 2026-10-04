import React, { useState } from 'react';
import { Student } from '../../types';
import { formatCairoTime, formatInternationalPhone, getParentWhatsAppUrl } from '../../utils/whatsapp';
import { getTodayArabicWeekday } from '../../mock/initialData';

interface WeeklyScheduleCompactProps {
  students: Student[];
  onLogSession: (student: Student) => void;
}

// Arabic week starting from Saturday to Friday
const WEEK_DAYS = [
  'السبت',
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
] as const;

export const WeeklyScheduleCompact: React.FC<WeeklyScheduleCompactProps> = ({
  students,
  onLogSession,
}) => {
  const todayWeekday = getTodayArabicWeekday();
  const [selectedDay, setSelectedDay] = useState<string>(todayWeekday);
  const [viewMode, setViewMode] = useState<'day_carousel' | 'all_days'>('day_carousel');

  // Filter students by day
  const getStudentsForDay = (day: string) => {
    return students.filter(
      (s) => s.status !== 'vacation' && s.scheduleDays?.includes(day)
    );
  };

  const currentDayStudents = getStudentsForDay(selectedDay);

  // Switch to next/previous day
  const handlePrevDay = () => {
    const currentIndex = WEEK_DAYS.indexOf(selectedDay as any);
    const nextIndex = (currentIndex - 1 + WEEK_DAYS.length) % WEEK_DAYS.length;
    setSelectedDay(WEEK_DAYS[nextIndex]);
  };

  const handleNextDay = () => {
    const currentIndex = WEEK_DAYS.indexOf(selectedDay as any);
    const nextIndex = (currentIndex + 1) % WEEK_DAYS.length;
    setSelectedDay(WEEK_DAYS[nextIndex]);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-xs flex flex-col gap-4 sm:gap-5 w-full" dir="rtl">
      {/* 1. Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shadow-xs shrink-0">
            <span className="material-symbols-outlined text-xl">calendar_month</span>
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-gray-900">
              الجدول الأسبوعي المدمج
            </h3>
            <p className="text-xs text-gray-500">
              تصفح مرن لأيام الأسبوع مع مواعيد الحصص بتوقيت القاهرة
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Today Jump */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setSelectedDay(todayWeekday)}
            className="px-3 py-1.5 rounded-xl bg-[#EAF5F7] text-[#125862] hover:bg-[#d9eff3] text-xs font-bold transition-all cursor-pointer border border-[#1A7B88]/20 flex items-center gap-1 shadow-2xs"
          >
            <span>📅</span>
            <span>اليوم ({todayWeekday})</span>
          </button>

          <button
            onClick={() => setViewMode(v => v === 'day_carousel' ? 'all_days' : 'day_carousel')}
            className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium transition-all cursor-pointer border border-gray-200"
          >
            {viewMode === 'day_carousel' ? 'عرض كافة الأيام' : 'عرض اليوم المختار'}
          </button>
        </div>
      </div>

      {/* 2. Horizontal Days Carousel Cards (كروت أيام الأسبوع المرتبة أفقياً) */}
      <div className="flex items-center gap-2 w-full">
        {/* Previous Day Arrow */}
        <button
          onClick={handlePrevDay}
          className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-[#EAF5F7] text-gray-600 hover:text-[#125862] border border-gray-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
          title="اليوم السابق"
        >
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>

        {/* Horizontal Scrollable Day Cards Row */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-none">
          {WEEK_DAYS.map((day) => {
            const count = getStudentsForDay(day).length;
            const isSelected = selectedDay === day;
            const isToday = day === todayWeekday;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-1 min-w-[75px] sm:min-w-[90px] py-2.5 px-2 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-[#1A7B88] text-white border-[#1A7B88] shadow-sm scale-102'
                    : isToday
                    ? 'bg-[#EAF5F7] text-[#125862] border-[#1A7B88]/40 hover:bg-[#dff0f3]'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200/90'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold tracking-tight">
                    {day}
                  </span>
                  {isToday && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-amber-300' : 'bg-[#1A7B88]'
                      }`}
                      title="اليوم الحالي"
                    />
                  )}
                </div>

                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : count > 0
                      ? 'bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {count} {count === 1 ? 'حصة' : 'حصص'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Next Day Arrow */}
        <button
          onClick={handleNextDay}
          className="w-8 h-8 rounded-xl bg-gray-50 hover:bg-[#EAF5F7] text-gray-600 hover:text-[#125862] border border-gray-200 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-2xs"
          title="اليوم التالي"
        >
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>
      </div>

      {/* 3. Details Area: Either Single Selected Day View or Full Week Grid */}
      {viewMode === 'day_carousel' ? (
        <div className="flex flex-col gap-3.5">
          {/* Day Status Banner */}
          <div className="flex items-center justify-between p-3.5 bg-[#F4F9FA] rounded-2xl border border-gray-200/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">
                حصص يوم {selectedDay}
              </span>
              {selectedDay === todayWeekday && (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  اليوم
                </span>
              )}
            </div>

            <span className="text-xs font-bold text-[#125862] bg-white px-3 py-1 rounded-xl border border-gray-200">
              {currentDayStudents.length} طلاب مسجلون
            </span>
          </div>

          {/* Students Grid for the selected day */}
          {currentDayStudents.length === 0 ? (
            <div className="p-8 bg-gray-50/60 rounded-3xl border border-dashed border-gray-200 text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-3xl text-gray-300">
                event_busy
              </span>
              <p className="text-xs sm:text-sm font-bold text-gray-700">
                لا توجد حصص مجدولة في يوم ({selectedDay})
              </p>
              <p className="text-xs text-gray-400">
                يمكنك التبديل بين أيام الأسبوع من الشريط الأفقي أعلاه
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentDayStudents.map((st) => {
                const sessionTime = formatCairoTime(st.daySchedule?.[selectedDay] || st.sessionTime);
                const maxPkg = st.packageSessionsCount || 8;
                const cycleCount = st.currentCycleSessionsCount || 0;

                return (
                  <div
                    key={`${selectedDay}-${st.id}`}
                    className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                  >
                    {/* Top Row: Name & Progress */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 truncate group-hover:text-[#1A7B88] transition-colors">
                          {st.name}
                        </h4>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {st.surahProgress || 'حلقة القرآن الكريم'}
                        </p>
                      </div>

                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20 shrink-0">
                        {cycleCount}/{maxPkg}
                      </span>
                    </div>

                    {/* Time (بتوقيت القاهرة) & Phone / WhatsApp */}
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <span className="material-symbols-outlined text-sm text-[#1A7B88]">schedule</span>
                        <span className="font-semibold text-gray-900">{sessionTime}</span>
                      </div>

                      {st.parentPhone && (
                        <div className="flex items-center">
                          <a
                            href={getParentWhatsAppUrl(st.parentPhone, st.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 text-xs transition-colors"
                            title="محادثة واتساب"
                          >
                            <span className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                              </svg>
                            </span>
                            <span dir="ltr" className="font-mono text-[11px] font-bold">
                              {formatInternationalPhone(st.parentPhone)}
                            </span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => onLogSession(st)}
                      className="w-full py-2 px-3 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm">history_edu</span>
                      <span>تسجيل حضور وإنجاز الحصة</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Full Week Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {WEEK_DAYS.map((day) => {
            const dayStudents = getStudentsForDay(day);
            const isToday = day === todayWeekday;

            return (
              <div
                key={`all-${day}`}
                className={`rounded-2xl p-3 border flex flex-col gap-2 transition-all ${
                  isToday
                    ? 'bg-[#EAF5F7]/80 border-[#1A7B88]/40 ring-1 ring-[#1A7B88]/20'
                    : 'bg-gray-50/70 border-gray-200/80'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-200">
                  <span className={`text-xs font-bold ${isToday ? 'text-[#125862]' : 'text-gray-800'}`}>
                    {day}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isToday ? 'bg-[#1A7B88] text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {dayStudents.length}
                  </span>
                </div>

                {dayStudents.length === 0 ? (
                  <span className="text-[11px] text-gray-400 py-3 text-center">لا توجد حصص</span>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {dayStudents.map((st) => (
                      <div
                        key={`grid-${day}-${st.id}`}
                        onClick={() => onLogSession(st)}
                        className="p-2 bg-white rounded-xl border border-gray-100 shadow-2xs hover:border-[#1A7B88]/40 transition-colors cursor-pointer flex flex-col gap-1 text-[11px]"
                      >
                        <span className="font-bold text-gray-900 truncate">{st.name}</span>
                        <span className="text-gray-500 font-mono text-[10px]">
                          {formatCairoTime(st.daySchedule?.[day] || st.sessionTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
