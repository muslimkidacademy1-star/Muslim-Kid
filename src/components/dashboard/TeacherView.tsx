import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Report } from '../../types';
import { AddReportModal } from '../modals/AddReportModal';
import { QuickAddStudentModal } from '../modals/QuickAddStudentModal';
import { LogSessionModal } from '../modals/LogSessionModal';
import { WeeklyScheduleModal } from './WeeklyScheduleModal';
import { TeacherBottomNav, TeacherTab } from './TeacherBottomNav';
import { generateStudentReportPdf } from '../../utils/pdfGenerator';
import { getParentWhatsAppUrl } from '../../utils/whatsapp';

// Helper to get Cairo date details
function getCairoDateDetails() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    weekday: 'long',
  }).format(now);

  const formattedDate = new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const cairoDateString = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return { weekday, formattedDate, cairoDateString };
}

// Clean session time string (e.g. "04:00 م")
function cleanDisplayTime(rawTime?: string): string {
  if (!rawTime || !rawTime.trim()) return '04:00 م';
  return rawTime
    .replace(/\(?\s*بتوقيت\s+[^)]+\)?/gi, '')
    .replace(/بتوقيت\s+[\u0621-\u064A]+/gi, '')
    .trim();
}

// Format student schedule days and their times concisely (handles different times per day)
function formatStudentScheduleSummary(student: Student): string {
  const scheduleDays = student.scheduleDays || [];
  if (scheduleDays.length === 0) return 'المواعيد: غير محددة';

  const daySchedule = student.daySchedule || {};
  const hasSpecificDays = Object.keys(daySchedule).length > 0;

  if (hasSpecificDays) {
    // Check if times actually differ across scheduled days
    const dayTimes = scheduleDays.map((d) => ({
      day: d,
      time: cleanDisplayTime(daySchedule[d] || student.sessionTime),
    }));

    const uniqueTimes = Array.from(new Set(dayTimes.map((dt) => dt.time)));

    if (uniqueTimes.length > 1) {
      // Different times: show each day with its specific time
      return dayTimes.map((dt) => `${dt.day} (${dt.time})`).join(' · ');
    } else {
      // Same time on all days: group days and show time once
      return `${scheduleDays.join(' و ')} · ${uniqueTimes[0] || cleanDisplayTime(student.sessionTime)}`;
    }
  }

  // Fallback to general session time
  return `${scheduleDays.join(' و ')} · ${cleanDisplayTime(student.sessionTime)}`;
}

// Normalize Arabic day names for reliable schedule comparison
function normalizeDayName(day: string): string {
  return day
    .replace(/^يوم\s+/, '')
    .trim()
    .replace(/إ/g, 'ا')
    .replace(/أ/g, 'ا')
    .replace(/آ/g, 'ا');
}

// Convert session time string to minutes for chronological ordering
function parseSessionTimeToMinutes(raw?: string): number {
  if (!raw) return 9999;
  const str = raw.trim();
  const isPM = str.includes('م') || str.toLowerCase().includes('pm');
  const isAM = str.includes('ص') || str.toLowerCase().includes('am');

  const match = str.match(/(\d{1,2})[:.]?(\d{2})?/);
  if (!match) return 9999;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export const TeacherView: React.FC = () => {
  const {
    currentUser,
    visibleStudents,
    teachers,
    getTeacherById,
    reports,
    sessionLogs,
    isSyncing,
    isSuperAdmin,
    previewRole,
    setPreviewRole,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TeacherTab>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);

  // Modals state
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [selectedStudentForLog, setSelectedStudentForLog] = useState<Student | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLogSessionModalOpen, setIsLogSessionModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [feedbackStudentId, setFeedbackStudentId] = useState<string | null>(null);
  const [touchedButtonId, setTouchedButtonId] = useState<string | null>(null);

  const handleWhatsAppFeedback = (studentId: string) => {
    setFeedbackStudentId(studentId);
    setTimeout(() => {
      setFeedbackStudentId((current) => (current === studentId ? null : current));
    }, 1500);
  };

  // Cairo Time Info
  const { weekday: todayWeekday, formattedDate: todayFormattedDate, cairoDateString } = useMemo(
    () => getCairoDateDetails(),
    []
  );

  // Identify teacher record
  const teacherId = currentUser.teacherId || currentUser.assignedTeacherIds?.[0] || currentUser.id;
  const teacherObj =
    getTeacherById(teacherId) ||
    getTeacherById(currentUser.id) ||
    (teachers && teachers.find((t) => t.id === teacherId || t.name === currentUser.name)) ||
    (teachers && teachers.length > 0 ? teachers[0] : undefined);

  const effectiveTeacherId = teacherObj?.id || teacherId;
  const teacherCircleName =
    teacherObj?.circleName ||
    (currentUser.roleLabel ? currentUser.roleLabel.replace(/^معلم\s*-\s*/, '') : '') ||
    'حلقة النور';

  const cleanCircleName = teacherCircleName.replace(/^حلقة\s+/, '');

  // Filter students belonging to this teacher
  const teacherStudents = useMemo(() => {
    return visibleStudents.filter((s) => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.surahProgress.toLowerCase().includes(q) ||
        s.parentPhone.includes(q)
      );
    });
  }, [visibleStudents, searchTerm]);

  // Students who have classes today in Cairo time
  const todayStudents = useMemo(() => {
    const normalizedToday = normalizeDayName(todayWeekday);
    const list = teacherStudents.filter((s) => {
      if (s.status === 'vacation') return false;
      if (s.scheduleDays && s.scheduleDays.length > 0) {
        return s.scheduleDays.some((d) => normalizeDayName(d) === normalizedToday);
      }
      if (s.daySchedule && Object.keys(s.daySchedule).length > 0) {
        return Object.keys(s.daySchedule).some((d) => normalizeDayName(d) === normalizedToday);
      }
      return false;
    });

    // Sort chronologically by session time
    return list.sort((a, b) => {
      const rawA = a.daySchedule?.[todayWeekday] || a.sessionTime;
      const rawB = b.daySchedule?.[todayWeekday] || b.sessionTime;
      return parseSessionTimeToMinutes(rawA) - parseSessionTimeToMinutes(rawB);
    });
  }, [teacherStudents, todayWeekday]);

  // Check today's logged session for a student
  const getTodayLog = (studentId: string) => {
    return sessionLogs.find(
      (l) => l.studentId === studentId && l.sessionDate === cairoDateString
    );
  };

  // Metrics for Today's Sessions Summary
  const todayMetrics = useMemo(() => {
    const total = todayStudents.length;
    let completed = 0;
    todayStudents.forEach((s) => {
      if (sessionLogs.some((l) => l.studentId === s.id && l.sessionDate === cairoDateString)) {
        completed += 1;
      }
    });
    const pending = total - completed;
    return { total, completed, pending };
  }, [todayStudents, sessionLogs, cairoDateString]);

  // Handlers
  const handleOpenLogSession = (student: Student) => {
    setSelectedStudentForLog(student);
    setIsLogSessionModalOpen(true);
  };

  const handleOpenSubmitReport = (student: Student) => {
    setSelectedStudentForReport(student);
    setIsReportModalOpen(true);
  };

  const handleDownloadPdf = (student: Student, report: Report) => {
    generateStudentReportPdf({
      student,
      teacher: teacherObj,
      report,
      recordedByName: currentUser.name,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-3.5 sm:gap-4 pb-28 sm:pb-12 pt-1" dir="rtl">
      {/* 1. Super Admin Role Preview Indicator (Compact Strip without duplicating words) */}
      {isSuperAdmin && previewRole === 'teacher' && (
        <div className="px-3 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-2xs gap-2">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-sm text-amber-600">visibility</span>
            <span>معاينة المعلم · حلقة {cleanCircleName}</span>
          </div>
          <button
            onClick={() => setPreviewRole(null)}
            className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            العودة للمدير
          </button>
        </div>
      )}

      {/* 2. Desktop Tab Switcher (Quiet & Minimal on large screens; hidden on mobile) */}
      <div className="hidden sm:flex items-center justify-between border-b border-gray-100 pb-2.5">
        <div className="inline-flex items-center gap-1.5 bg-[#F4F9FA] p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab('today')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'today'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span className="material-symbols-outlined text-base">calendar_today</span>
            <span>حصص اليوم</span>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'today' ? 'bg-[#1A7B88] text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {todayStudents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'students'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span className="material-symbols-outlined text-base">groups</span>
            <span>طلابي</span>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'students' ? 'bg-[#1A7B88] text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {teacherStudents.length}
            </span>
          </button>
        </div>

        <button
          onClick={() => setIsWeeklyModalOpen(true)}
          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-[#125862] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        >
          <span className="material-symbols-outlined text-base text-[#1A7B88]">calendar_month</span>
          <span>الجدول الأسبوعي</span>
        </button>
      </div>

      {/* VIEW 1: حصص اليوم (Today's Sessions) */}
      {activeTab === 'today' && (
        <div className="flex flex-col gap-3">
          {/* Header & Cairo Timezone Note (Explained ONCE near the date) */}
          <div className="flex items-baseline justify-between flex-wrap gap-1 px-0.5">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              حصص اليوم
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              {todayWeekday}، {todayFormattedDate} · مواعيد الحصص بتوقيت القاهرة
            </p>
          </div>

          {/* 3. Compact Single-Row Summary (Without big cards, percentage pill, or duplicate progress bar) */}
          <div className="flex items-center justify-between flex-wrap gap-2 py-1.5 px-3 rounded-xl bg-white border border-gray-100 shadow-2xs text-xs sm:text-sm font-medium text-gray-700">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1A7B88] shrink-0"></span>
              <span className="font-bold text-gray-900">
                {todayMetrics.total} حصص · {todayMetrics.completed} مسجلة · {todayMetrics.pending} بانتظار التسجيل
              </span>
            </div>

            <button
              onClick={() => setIsWeeklyModalOpen(true)}
              className="sm:hidden min-h-[36px] px-2.5 py-1 rounded-lg text-[#125862] hover:bg-[#EAF5F7] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-[#1A7B88]/20"
            >
              <span className="material-symbols-outlined text-sm text-[#1A7B88]">calendar_month</span>
              <span>الجدول الأسبوعي</span>
            </button>
          </div>

          {/* Sync Loading State */}
          {isSyncing && todayStudents.length === 0 && (
            <div className="p-6 text-center bg-white rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center justify-center gap-2.5">
              <span className="w-7 h-7 rounded-full border-2 border-[#1A7B88] border-t-transparent animate-spin"></span>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                جارٍ مزامنة حصص اليوم من الخادم...
              </p>
            </div>
          )}

          {/* Empty State: No sessions scheduled for today */}
          {!isSyncing && todayStudents.length === 0 && (
            <div className="bg-white rounded-2xl p-6 sm:p-10 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-2xl">event_available</span>
              </div>
              <h3 className="font-bold text-base text-gray-900">
                لا توجد حصص مجدولة لهذا اليوم ({todayWeekday})
              </h3>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                يمكنك الاطلاع على جدول باقي أيام الأسبوع أو استعراض قائمة طلاب حلقتك.
              </p>

              <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
                <button
                  onClick={() => setIsWeeklyModalOpen(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  <span>عرض الجدول الأسبوعي</span>
                </button>
                <button
                  onClick={() => setActiveTab('students')}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  عرض قائمة طلابي ({teacherStudents.length})
                </button>
              </div>
            </div>
          )}

          {/* 4. Compact Session Cards Grid (Earliest to Latest in Cairo Time) */}
          {todayStudents.length > 0 && (
            <div id="teacher-dashboard-student-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayStudents.map((student) => {
                const todayLog = getTodayLog(student.id);
                const isLoggedToday = Boolean(todayLog);
                const dayTime = student.daySchedule?.[todayWeekday] || student.sessionTime;
                const cleanTime = cleanDisplayTime(dayTime);
                const maxPkg = student.packageSessionsCount || 8;
                const cycleCount = Math.min(
                  maxPkg,
                  student.currentCycleSessionsCount || 0
                );
                const isCycleComplete = cycleCount >= maxPkg;
                const latestReport = reports.find((r) => r.studentId === student.id);

                return (
                  <div
                    key={`today-card-${student.id}`}
                    className={`bg-white rounded-2xl p-3.5 sm:p-4 border transition-all flex flex-col justify-between gap-2.5 shadow-xs ${
                      isLoggedToday ? 'border-emerald-200' : 'border-gray-200/80 hover:border-gray-300'
                    }`}
                  >
                    {/* Row 1: Student Name + Time + Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate">
                          {student.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs text-gray-700 font-semibold bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 shrink-0">
                          <span className="material-symbols-outlined text-xs text-[#1A7B88]">schedule</span>
                          <span>{cleanTime}</span>
                        </span>
                      </div>

                      {/* Status Text Badge */}
                      {isLoggedToday ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>
                            {todayLog?.attendance === 'attended'
                              ? 'تم التسجيل'
                              : todayLog?.attendance === 'absent'
                              ? 'تم تسجيل غياب'
                              : 'تم تسجيل عذر'}
                          </span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          بانتظار التسجيل
                        </span>
                      )}
                    </div>

                    {/* Row 2: Surah & Package Progress in a brief single line */}
                    <div className="flex items-center justify-between text-xs text-gray-600 gap-2">
                      <span className="text-gray-500 truncate">
                        {student.surahProgress || 'حلقة القرآن الكريم'}
                      </span>
                      <span className="font-semibold text-gray-800 text-[11px] shrink-0">
                        {cycleCount === 0
                          ? `لم تبدأ الباقة (0 من ${maxPkg})`
                          : isCycleComplete
                          ? `اكتملت الباقة (${maxPkg}/${maxPkg})`
                          : `أُنجزت ${cycleCount} من ${maxPkg} حصص`}
                      </span>
                    </div>

                    {/* Row 3: Action Buttons (Primary button + Prominent Circular WhatsApp button) */}
                    <div className="flex items-center gap-2 pt-0.5">
                      {/* Primary Button */}
                      <button
                        onClick={() => handleOpenLogSession(student)}
                        className={`min-h-[44px] flex-1 px-3 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98 ${
                          isLoggedToday
                            ? 'bg-white hover:bg-gray-50 border border-[#1A7B88]/40 text-[#125862]'
                            : 'bg-[#1A7B88] hover:bg-[#125862] text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {isLoggedToday ? 'edit_note' : 'history_edu'}
                        </span>
                        <span>{isLoggedToday ? 'عرض / تعديل الحصة' : 'تسجيل الحصة'}</span>
                      </button>

                      {/* Prominent Circular WhatsApp Button with Touch and Click Feedback */}
                      {student.parentPhone ? (
                        <a
                          href={getParentWhatsAppUrl(student.parentPhone, student.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleWhatsAppFeedback(student.id)}
                          onTouchStart={() => setTouchedButtonId(student.id)}
                          onTouchEnd={() => setTimeout(() => setTouchedButtonId(null), 180)}
                          onTouchCancel={() => setTouchedButtonId(null)}
                          className={`whatsapp-button group relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 shadow-sm active:scale-95 active:opacity-85 ${
                            touchedButtonId === student.id ? 'scale-95 opacity-85' : ''
                          } ${
                            feedbackStudentId === student.id
                              ? 'bg-emerald-700 ring-4 ring-emerald-300 scale-95 shadow-md'
                              : 'bg-[#25D366] hover:bg-[#20bd5a] hover:shadow-md'
                          }`}
                          title={`محادثة واتساب مع ولي أمر ${student.name}`}
                          aria-label={`واتساب ولي أمر ${student.name}`}
                        >
                          {feedbackStudentId === student.id ? (
                            <span className="material-symbols-outlined text-xl text-white animate-in zoom-in-75 transition-all duration-200">
                              done
                            </span>
                          ) : (
                            <svg
                              className={`w-5.5 h-5.5 fill-current text-white drop-shadow-xs transition-all duration-200 ${
                                touchedButtonId === student.id
                                  ? 'opacity-65 scale-90'
                                  : 'group-active:opacity-65 group-active:scale-90'
                              }`}
                              viewBox="0 0 24 24"
                            >
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                            </svg>
                          )}

                          {/* Visual Click Pulse Wave */}
                          {feedbackStudentId === student.id && (
                            <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-60 pointer-events-none" />
                          )}
                        </a>
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-lg">phone_disabled</span>
                        </div>
                      )}
                    </div>

                    {/* Cycle completed banner & report submission */}
                    {isCycleComplete && (
                      <button
                        onClick={() => handleOpenSubmitReport(student)}
                        className="min-h-[38px] w-full py-1 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">send</span>
                        <span>إرسال التقرير النهائي للمدير</span>
                      </button>
                    )}

                    {/* PDF download if report submitted */}
                    {latestReport?.submissionStatus === 'submitted_ready_to_send' && (
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(student, latestReport)}
                        className="min-h-[38px] w-full py-1 px-3 rounded-xl bg-[#EAF5F7] border border-[#1A7B88]/20 text-[#125862] hover:bg-[#d9eff3] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        <span>تحميل تقرير الدورة (PDF)</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: طلابي (My Students Section) */}
      {activeTab === 'students' && (
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {/* 1. Header of the Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">
                طلابي
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                حلقة {cleanCircleName} · {visibleStudents.length} طلاب · المواعيد بتوقيت القاهرة
              </p>
            </div>

            <button
              onClick={() => setIsAddStudentModalOpen(true)}
              className="min-h-[44px] w-full sm:w-auto px-4 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98 shrink-0"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>+ طالب جديد</span>
            </button>
          </div>

          {/* 2. Search Input */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute right-3.5 top-3 text-gray-400 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم الطالب أو رقم الهاتف"
              className="w-full min-h-[44px] pr-10 pl-9 rounded-xl bg-white text-base text-gray-900 border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 shadow-2xs placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                title="مسح البحث"
                aria-label="مسح البحث"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          {/* 3. Empty State A: No Students in Circle */}
          {visibleStudents.length === 0 && (
            <div className="bg-white rounded-2xl p-8 sm:p-12 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-2xl">group_off</span>
              </div>
              <h3 className="font-bold text-base text-gray-900">
                لا يوجد طلاب مسجلون في حلقتك حتى الآن
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm leading-relaxed">
                ابدأ بإضافة أول طالب إلى الحلقة لتسجيل مواعيد الحصص ومتابعة الحفظ.
              </p>
              <button
                onClick={() => setIsAddStudentModalOpen(true)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98 mt-1"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>+ إضافة طالب جديد</span>
              </button>
            </div>
          )}

          {/* 4. Empty State B: No Search Results */}
          {visibleStudents.length > 0 && teacherStudents.length === 0 && (
            <div className="bg-white rounded-2xl p-8 sm:p-12 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-2xl">search_off</span>
              </div>
              <h3 className="font-bold text-base text-gray-900">
                لا توجد نتائج مطابقة للبحث
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm leading-relaxed">
                لم نتمكن من العثور على أي طالب يطابق «{searchTerm}».
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#EAF5F7] text-[#125862] hover:bg-[#d9eff3] font-bold text-xs sm:text-sm transition-colors cursor-pointer mt-1"
              >
                مسح كلمة البحث
              </button>
            </div>
          )}

          {/* 5. Students Cards Grid */}
          {teacherStudents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {teacherStudents.map((student) => {
                const maxPkg = student.packageSessionsCount || 8;
                const cycleCount = Math.min(
                  maxPkg,
                  student.currentCycleSessionsCount || 0
                );
                const isCycleComplete = cycleCount >= maxPkg;
                const scheduleSummary = formatStudentScheduleSummary(student);
                const latestReport = reports.find((r) => r.studentId === student.id);

                return (
                  <div
                    key={`all-st-${student.id}`}
                    className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3"
                  >
                    {/* Top: Full Student Name (wrapping allowed) + Status / Progress Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                        <h3 className="font-bold text-base text-gray-900 leading-snug whitespace-normal break-words">
                          {student.name}
                        </h3>
                        {student.status === 'vacation' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                            إجازة
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                          isCycleComplete
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20'
                        }`}
                      >
                        {cycleCount} من {maxPkg} حصص
                      </span>
                    </div>

                    {/* Middle: Surah & Schedule as concise text directly inside card (no big inner box) */}
                    <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                      {student.surahProgress && (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <span className="material-symbols-outlined text-sm text-[#1A7B88] shrink-0">
                            menu_book
                          </span>
                          <span className="font-medium text-gray-700 truncate">
                            {student.surahProgress}
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-1.5 text-gray-600">
                        <span className="material-symbols-outlined text-sm text-[#1A7B88] shrink-0 mt-0.5">
                          calendar_today
                        </span>
                        <span className="font-medium leading-relaxed text-gray-700">
                          {scheduleSummary}
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Action Buttons */}
                    <div className="flex items-center gap-2 pt-0.5">
                      {/* Log Session Button */}
                      <button
                        onClick={() => handleOpenLogSession(student)}
                        className="min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
                      >
                        <span className="material-symbols-outlined text-base">history_edu</span>
                        <span>تسجيل الحصة</span>
                      </button>

                      {/* Prominent Circular WhatsApp Button with Touch and Click Feedback */}
                      {student.parentPhone ? (
                        <a
                          href={getParentWhatsAppUrl(student.parentPhone, student.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => handleWhatsAppFeedback(student.id)}
                          onTouchStart={() => setTouchedButtonId(student.id)}
                          onTouchEnd={() => setTimeout(() => setTouchedButtonId(null), 180)}
                          onTouchCancel={() => setTouchedButtonId(null)}
                          className={`whatsapp-button group relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 shadow-sm active:scale-95 active:opacity-85 ${
                            touchedButtonId === student.id ? 'scale-95 opacity-85' : ''
                          } ${
                            feedbackStudentId === student.id
                              ? 'bg-emerald-700 ring-4 ring-emerald-300 scale-95 shadow-md'
                              : 'bg-[#25D366] hover:bg-[#20bd5a] hover:shadow-md'
                          }`}
                          title={`محادثة واتساب مع ولي أمر ${student.name}`}
                          aria-label={`واتساب ولي أمر ${student.name}`}
                        >
                          {feedbackStudentId === student.id ? (
                            <span className="material-symbols-outlined text-xl text-white animate-in zoom-in-75 transition-all duration-200">
                              done
                            </span>
                          ) : (
                            <svg
                              className={`w-5.5 h-5.5 fill-current text-white drop-shadow-xs transition-all duration-200 ${
                                touchedButtonId === student.id
                                  ? 'opacity-65 scale-90'
                                  : 'group-active:opacity-65 group-active:scale-90'
                              }`}
                              viewBox="0 0 24 24"
                            >
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                            </svg>
                          )}

                          {/* Visual Click Pulse Wave */}
                          {feedbackStudentId === student.id && (
                            <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-60 pointer-events-none" />
                          )}
                        </a>
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-lg">phone_disabled</span>
                        </div>
                      )}
                    </div>

                    {/* Cycle completed banner */}
                    {isCycleComplete && (
                      <button
                        onClick={() => handleOpenSubmitReport(student)}
                        className="min-h-[38px] w-full py-1 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">send</span>
                        <span>إرسال التقرير النهائي للمدير</span>
                      </button>
                    )}

                    {/* PDF download */}
                    {latestReport?.submissionStatus === 'submitted_ready_to_send' && (
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(student, latestReport)}
                        className="min-h-[38px] w-full py-1 px-3 rounded-xl bg-[#EAF5F7] border border-[#1A7B88]/20 text-[#125862] hover:bg-[#d9eff3] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        <span>تحميل تقرير الدورة (PDF)</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mobile Bottom Navigation Bar: «اليوم» and «طلابي» */}
      <TeacherBottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
        }}
        todayCount={todayStudents.length}
        studentsCount={teacherStudents.length}
      />

      {/* Weekly Schedule Modal */}
      <WeeklyScheduleModal
        isOpen={isWeeklyModalOpen}
        onClose={() => setIsWeeklyModalOpen(false)}
        students={teacherStudents}
        onLogSession={handleOpenLogSession}
        initialDay={todayWeekday}
      />

      {/* Daily Session Log / Edit Modal */}
      <LogSessionModal
        isOpen={isLogSessionModalOpen}
        student={selectedStudentForLog}
        onClose={() => {
          setIsLogSessionModalOpen(false);
          setSelectedStudentForLog(null);
        }}
        onCompleteCycle={(st) => {
          handleOpenSubmitReport(st);
        }}
      />

      {/* Add / Submit Report Modal */}
      {selectedStudentForReport && (
        <AddReportModal
          isOpen={isReportModalOpen}
          student={selectedStudentForReport}
          onClose={() => {
            setIsReportModalOpen(false);
            setSelectedStudentForReport(null);
          }}
        />
      )}

      {/* Quick Add Student Modal */}
      <QuickAddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        teacherId={effectiveTeacherId}
        circleName={teacherCircleName}
      />
    </div>
  );
};
