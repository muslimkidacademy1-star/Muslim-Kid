import React, { useState, useMemo } from 'react';
import { Student, SessionLog } from '../../types';
import { ARABIC_WEEKDAYS } from '../../mock/initialData';

interface InteractiveTeacherCalendarProps {
  students: Student[];
  sessionLogs: SessionLog[];
  onLogSession: (student: Student) => void;
}

export const InteractiveTeacherCalendar: React.FC<InteractiveTeacherCalendarProps> = ({
  students,
  sessionLogs,
  onLogSession,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayString, setSelectedDayString] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDayString(today.toISOString().split('T')[0]);
  };

  // Month name in Arabic
  const monthName = currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  // Compute days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Map session logs by date YYYY-MM-DD
  const logsByDate = useMemo(() => {
    const map = new Map<string, SessionLog[]>();
    sessionLogs.forEach((log) => {
      if (log.sessionDate) {
        const list = map.get(log.sessionDate) || [];
        list.push(log);
        map.set(log.sessionDate, list);
      }
    });
    return map;
  }, [sessionLogs]);

  // Logs for selected day
  const selectedDayLogs = logsByDate.get(selectedDayString) || [];

  // Weekday name for selected day
  const selectedDateObj = new Date(selectedDayString + 'T00:00:00');
  const selectedWeekdayArabic = ARABIC_WEEKDAYS[selectedDateObj.getDay()];

  // Students scheduled for that weekday
  const scheduledStudentsForSelectedDay = students.filter(
    (s) => s.status !== 'vacation' && s.scheduleDays?.includes(selectedWeekdayArabic)
  );

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-100 shadow-xs flex flex-col gap-4" dir="rtl">
      {/* Calendar Header with Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1A7B88] text-2xl">calendar_month</span>
          <div>
            <h3 className="font-bold text-base text-gray-900 capitalize">
              تقويم الحصص الشهري • {monthName}
            </h3>
            <p className="text-xs text-gray-500">
              انقر على أي يوم لاستعراض ملخص الحصص المنجزة وجدول الطلاب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl bg-[#EAF5F7] text-[#125862] hover:bg-[#d9eff3] text-xs font-bold transition-colors cursor-pointer border border-[#1A7B88]/20"
          >
            اليوم
          </button>
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-lg hover:bg-white text-gray-600 hover:text-[#125862] flex items-center justify-center transition-colors cursor-pointer"
              title="الشهر السابق"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
            <span className="text-xs font-bold text-gray-700 px-2 min-w-[90px] text-center">
              {currentDate.toLocaleDateString('ar-EG', { month: 'short' })} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-lg hover:bg-white text-gray-600 hover:text-[#125862] flex items-center justify-center transition-colors cursor-pointer"
              title="الشهر التالي"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Column Headers (Sun to Sat) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-gray-500">
        {ARABIC_WEEKDAYS.map((day) => (
          <div key={day} className="py-2 bg-gray-50 rounded-xl">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Empty cells before month start */}
        {Array.from({ length: firstDayWeekIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[75px] rounded-xl bg-transparent" />
        ))}

        {/* Days of current month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNumber = i + 1;
          const dayDateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`;
          const isSelected = selectedDayString === dayDateStr;
          const todayStr = new Date().toISOString().split('T')[0];
          const isToday = dayDateStr === todayStr;

          const dayLogs = logsByDate.get(dayDateStr) || [];
          const hasLogs = dayLogs.length > 0;

          // Check if weekday matches any active student
          const cellDateObj = new Date(dayDateStr + 'T00:00:00');
          const cellWeekday = ARABIC_WEEKDAYS[cellDateObj.getDay()];
          const hasScheduledStudents = students.some(
            (s) => s.status !== 'vacation' && s.scheduleDays?.includes(cellWeekday)
          );

          return (
            <button
              key={`day-${dayNumber}`}
              onClick={() => setSelectedDayString(dayDateStr)}
              className={`min-h-[60px] sm:min-h-[75px] p-1.5 sm:p-2 rounded-2xl border text-right flex flex-col justify-between transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#EAF5F7] border-[#1A7B88] ring-2 ring-[#1A7B88]/20 shadow-xs'
                  : isToday
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-white hover:bg-gray-50 border-gray-100'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs sm:text-sm font-bold font-mono ${
                    isSelected
                      ? 'text-[#125862]'
                      : isToday
                      ? 'text-amber-800'
                      : 'text-gray-800'
                  }`}
                >
                  {dayNumber}
                </span>

                {isToday && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-1 rounded-sm hidden sm:inline">
                    اليوم
                  </span>
                )}
              </div>

              {/* Dots and Badges */}
              <div className="flex items-center gap-1 flex-wrap mt-auto">
                {/* Petroleum (#1A7B88) Dot for Logged Sessions */}
                {hasLogs && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#1A7B88] text-white text-[10px] font-mono font-bold shadow-2xs"
                    title={`${dayLogs.length} حصة منجزة ومسجلة`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>{dayLogs.length}</span>
                  </span>
                )}

                {/* Scheduled indicator dot if no logs recorded yet */}
                {!hasLogs && hasScheduledStudents && (
                  <span
                    className="w-2 h-2 rounded-full bg-[#1A7B88]/40 mx-auto"
                    title="حصص مجدولة لهذا اليوم"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Details Drawer / Card */}
      <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-[#F4F9FA] border border-[#1A7B88]/20 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#1A7B88] text-white flex items-center justify-center text-xs">
              <span className="material-symbols-outlined text-base">event_note</span>
            </span>
            <span className="font-bold text-sm text-gray-900">
              ملخص يوم {selectedWeekdayArabic} ({selectedDayString})
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-xl bg-white text-[#125862] font-bold border border-gray-200">
              {selectedDayLogs.length} حصص منجزة
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-white text-gray-700 font-medium border border-gray-200">
              {scheduledStudentsForSelectedDay.length} طلاب بالجدول
            </span>
          </div>
        </div>

        {/* 1. Logged Sessions List */}
        {selectedDayLogs.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#125862]">
              الحصص التي تم تسجيل حضورها وإنجازها في هذا اليوم:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {selectedDayLogs.map((log) => {
                const st = students.find((s) => s.id === log.studentId);
                return (
                  <div
                    key={log.id}
                    className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 truncate">
                        {st?.name || 'طالب بالحلقة'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          log.attendance === 'attended'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {log.attendance === 'attended' ? 'حاضر ✅' : 'غائب/معتذر ⚠️'}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#125862] font-medium">
                      الحصة رقم {log.sessionNumber} • {log.newMemorization || 'تثبيت ومراجعة'}
                    </div>

                    {log.notes && (
                      <div className="text-[10px] text-gray-500 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                        {log.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 py-2">
            لم يتم تسجيل حصص منجزة بعد في هذا التاريخ ({selectedDayString}).
          </div>
        )}

        {/* 2. Scheduled Students for this Day */}
        {scheduledStudentsForSelectedDay.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-200/70">
            <span className="text-xs font-bold text-gray-700">
              الطلاب المجدولون بانتظام في يوم ({selectedWeekdayArabic}):
            </span>
            <div className="flex flex-wrap gap-2">
              {scheduledStudentsForSelectedDay.map((st) => (
                <button
                  key={`sched-${st.id}`}
                  onClick={() => onLogSession(st)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EAF5F7] border border-gray-200 hover:border-[#1A7B88]/40 text-xs text-gray-800 hover:text-[#125862] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="font-bold">{st.name}</span>
                  <span className="text-[11px] text-gray-400">
                    ({st.daySchedule?.[selectedWeekdayArabic] || st.sessionTime || '04:00 م'})
                  </span>
                  <span className="text-[10px] text-[#1A7B88] font-bold mr-1">تسجيل ✍️</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
