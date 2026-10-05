import React, { useState } from 'react';
import { Student } from '../../types';
import { getTodayArabicWeekday } from '../../mock/initialData';
import { formatCairoTime, getParentWhatsAppUrl, formatInternationalPhone } from '../../utils/whatsapp';

interface WeeklyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onLogSession: (student: Student) => void;
  initialDay?: string;
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

export const WeeklyScheduleModal: React.FC<WeeklyScheduleModalProps> = ({
  isOpen,
  onClose,
  students,
  onLogSession,
  initialDay,
}) => {
  const todayWeekday = getTodayArabicWeekday();
  const [activeDay, setActiveDay] = useState<string>(initialDay || todayWeekday);

  if (!isOpen) return null;

  // Active students for the selected day
  const dayStudents = students.filter(
    (s) => s.status !== 'vacation' && s.scheduleDays?.includes(activeDay)
  );

  const totalWeeklySessions = students.reduce((acc, s) => {
    if (s.status === 'vacation') return acc;
    return acc + (s.scheduleDays?.length || 0);
  }, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs transition-all duration-200"
      dir="rtl"
    >
      <div className="fixed inset-0 bg-transparent" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] text-right overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Mobile Pull Tab */}
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-[#F4F9FA]">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-xl">calendar_month</span>
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight">
                الجدول الأسبوعي للحلقات
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {totalWeeklySessions} حصص مجدولة موزعة على مدار الأسبوع
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-white transition-colors cursor-pointer"
            aria-label="إغلاق الجدول الأسبوعي"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Day Selector Chips (Scrollable horizontal strip) */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-white overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-2 min-w-max">
            {WEEK_DAYS.map((day) => {
              const count = students.filter(
                (s) => s.status !== 'vacation' && s.scheduleDays?.includes(day)
              ).length;
              const isSelected = activeDay === day;
              const isToday = todayWeekday === day;

              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap active:scale-98 ${
                    isSelected
                      ? 'bg-[#1A7B88] text-white shadow-xs'
                      : 'bg-[#F4F9FA] text-gray-700 hover:bg-[#EAF5F7] border border-gray-200/70'
                  }`}
                >
                  <span>{day}</span>
                  {isToday && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[#1A7B88]/15 text-[#1A7B88]'
                      }`}
                    >
                      اليوم
                    </span>
                  )}
                  <span
                    className={`font-mono text-xs px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Students Content (Scrollable list) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>
              حصص يوم <strong className="text-gray-900 font-bold">({activeDay})</strong>: {dayStudents.length} طلاب
            </span>
            <span className="text-[11px] text-[#125862]">
              التوقيت بتوقيت القاهرة
            </span>
          </div>

          {dayStudents.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-50 border border-gray-100">
              <span className="material-symbols-outlined text-4xl text-gray-300">event_busy</span>
              <p className="text-sm font-bold text-gray-700">
                لا توجد حصص مجدولة في يوم ({activeDay})
              </p>
              <p className="text-xs text-gray-500">
                اختر يوماً آخر من الأيام أعلاه لتصفح جدول الطلاب
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {dayStudents.map((student) => {
                const dayTime = student.daySchedule?.[activeDay] || student.sessionTime;
                const formattedTime = formatCairoTime(dayTime);
                const maxPkg = student.packageSessionsCount || 8;
                const cycleCount = student.currentCycleSessionsCount || 0;

                return (
                  <div
                    key={`sched-${student.id}`}
                    className="p-3.5 sm:p-4 rounded-2xl border border-gray-100 bg-[#FFFFFF] shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base text-gray-900 truncate">
                          {student.name}
                        </h4>
                        <span className="text-[11px] font-semibold text-[#1A7B88] bg-[#EAF5F7] px-2 py-0.5 rounded-full border border-[#1A7B88]/15 shrink-0">
                          {cycleCount} من {maxPkg} حصص
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                          <span className="material-symbols-outlined text-sm text-[#1A7B88]">schedule</span>
                          <span>{formattedTime}</span>
                        </span>
                        <span>•</span>
                        <span className="truncate">{student.surahProgress || 'حلقة القرآن'}</span>
                      </div>
                    </div>

                    {/* Actions: Log Session & WhatsApp */}
                    <div className="flex items-center gap-2 shrink-0">
                      {student.parentPhone && (
                        <a
                          href={getParentWhatsAppUrl(student.parentPhone, student.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="واتساب ولي الأمر"
                        >
                          <span className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                            </svg>
                          </span>
                          <span className="hidden sm:inline">واتساب</span>
                        </a>
                      )}

                      <button
                        onClick={() => {
                          onClose();
                          onLogSession(student);
                        }}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">history_edu</span>
                        <span>تسجيل الحصة</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 bg-[#F4F9FA] flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500 font-medium">
            يوم الحصة الحالي: <strong className="text-[#125862]">{todayWeekday}</strong>
          </span>
          <button
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            العودة لحصص اليوم
          </button>
        </div>
      </div>
    </div>
  );
};
