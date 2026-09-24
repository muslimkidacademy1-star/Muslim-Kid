import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Report } from '../../types';
import { AddReportModal } from '../modals/AddReportModal';
import { QuickAddStudentModal } from '../modals/QuickAddStudentModal';
import { LogSessionModal } from '../modals/LogSessionModal';
import { generateStudentReportPdf } from '../../utils/pdfGenerator';
import { ARABIC_WEEKDAYS, getTodayArabicWeekday } from '../../mock/initialData';

export const TeacherView: React.FC = () => {
  const {
    currentUser,
    visibleStudents,
    getTeacherById,
    getDaysSinceLastReport,
    getReportStatusInfo,
    reports,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'today_and_students' | 'weekly_schedule'>('today_and_students');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [selectedStudentForLog, setSelectedStudentForLog] = useState<Student | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLogSessionModalOpen, setIsLogSessionModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  // The logged-in teacher's details
  const teacherId = currentUser.teacherId || currentUser.assignedTeacherIds?.[0] || 't1';
  const teacherObj = getTeacherById(teacherId);

  // Filter students belonging to this teacher
  const teacherStudents = visibleStudents.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.surahProgress.toLowerCase().includes(q) ||
      s.parentPhone.includes(q);

    return matchesSearch;
  });

  const todayWeekday = getTodayArabicWeekday();

  // Students who have classes today
  const todayStudents = teacherStudents.filter((s) => {
    if (s.status === 'vacation') return false;
    if (s.scheduleDays && s.scheduleDays.length > 0) {
      return s.scheduleDays.includes(todayWeekday);
    }
    // fallback: if not specified, display first 3
    return true;
  });

  const handleOpenSubmitReport = (student: Student) => {
    setSelectedStudentForReport(student);
    setIsReportModalOpen(true);
  };

  const handleOpenLogSession = (student: Student) => {
    setSelectedStudentForLog(student);
    setIsLogSessionModalOpen(true);
  };

  // Check recent report for each student
  const getStudentLatestReport = (studentId: string) => {
    return reports.find((r) => r.studentId === studentId);
  };

  // Download PDF for the student's report
  const handleDownloadPdf = (student: Student, report: Report) => {
    generateStudentReportPdf({
      student,
      teacher: teacherObj,
      report,
      recordedByName: currentUser.name,
    });
  };

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Teacher Welcome Header Banner */}
      <div className="bg-linear-to-r from-[#005253] via-[#004243] to-[#002f30] text-white p-6 sm:p-7 rounded-3xl shadow-md border border-[#005253]/30 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-2xl font-bold shadow-inner">
            {currentUser.initials}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[#a6eff1] text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">local_library</span>
                <span>بوابة المعلم اليومية</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#fef9c3] text-[#854d0e] text-xs font-bold">
                {teacherObj?.circleName || 'حلقة البخاري'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#6ff7f8] text-[#003738] text-xs font-black">
                اليوم: {todayWeekday}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              مرحباً بك، {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#e7eeff]/90 mt-1 max-w-xl leading-relaxed">
              بيئة عملك اليومية المتكاملة لإدارة جدول الحصص، رصد الحضور والتسميع اليومي، وتجميع تقارير الـ 8 حصص التلقائية
            </p>
          </div>
        </div>

        {/* Quick Teacher Stats & Add Student Button */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="text-center px-3 border-l border-white/20">
              <span className="text-2xl font-extrabold text-[#6ff7f8] block">{todayStudents.length}</span>
              <span className="text-[11px] text-[#e7eeff] font-medium">حصص اليوم</span>
            </div>
            <div className="text-center px-3 border-l border-white/20">
              <span className="text-2xl font-extrabold block">{teacherStudents.length}</span>
              <span className="text-[11px] text-[#e7eeff] font-medium">طلاب الحلقة</span>
            </div>
            <div className="text-center px-3">
              <span className="text-2xl font-extrabold text-[#fde047] block">
                {teacherStudents.filter((s) => (s.currentCycleSessionsCount || 0) >= 8).length}
              </span>
              <span className="text-[11px] text-[#e7eeff] font-medium">دورات مكتملة 8/8</span>
            </div>
          </div>

          <button
            onClick={() => setIsAddStudentModalOpen(true)}
            className="px-5 py-3.5 rounded-2xl bg-[#00e5ff] text-[#003738] font-black text-sm hover:bg-[#80f0ff] transition-all shadow-md flex items-center gap-2 cursor-pointer hover:shadow-lg"
          >
            <span className="material-symbols-outlined text-xl">person_add</span>
            <span>+ إضافة طالب جديد للحلقة</span>
          </button>
        </div>
      </div>

      {/* PROMINENT CARD: حصص اليوم (Today's Classes) */}
      <div className="bg-linear-to-br from-[#ffffff] via-[#f4fbfa] to-[#e6f7f6] rounded-3xl p-5 sm:p-6 border-2 border-[#005253]/30 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#bec8c8]/30">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-[#005253] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl">calendar_today</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#003738]">
                  حصص اليوم المقررة ({todayWeekday})
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#005253] text-white text-xs font-bold">
                  {todayStudents.length} حصص مجدولة
                </span>
              </div>
              <p className="text-xs text-[#526060] mt-0.5">
                تسميع مباشر وتوثيق فوري للحفظ والمراجعة مع احتساب عداد دورة الـ 8 حصص تلقائياً
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('today_and_students')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'today_and_students'
                  ? 'bg-[#005253] text-white shadow-xs'
                  : 'bg-white text-[#404848] hover:bg-[#e7eeff]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_agenda</span>
              <span>قائمة الطلاب وحصص اليوم</span>
            </button>
            <button
              onClick={() => setActiveTab('weekly_schedule')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'weekly_schedule'
                  ? 'bg-[#005253] text-white shadow-xs'
                  : 'bg-white text-[#404848] hover:bg-[#e7eeff]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              <span>جدول الحصص الأسبوعي</span>
            </button>
          </div>
        </div>

        {/* Today's Classes List / Cards */}
        {todayStudents.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-[#005253]/40 mb-2">
              event_available
            </span>
            <p className="text-sm font-bold text-[#111c2d]">لا توجد حصص مجدولة في هذا اليوم ({todayWeekday})</p>
            <p className="text-xs text-[#6f7979] mt-1">
              يمكنك الاطلاع على الجدول الأسبوعي أو تسجيل حضور طالب خارج الجدول من قائمة الطلاب أدناه
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4">
            {todayStudents.map((st) => {
              const cycleCount = st.currentCycleSessionsCount || 1;
              const isCompleted = cycleCount >= 8;

              return (
                <div
                  key={`today-${st.id}`}
                  className="bg-white rounded-2xl p-4 border border-[#005253]/20 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#005253] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {st.initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#111c2d] leading-tight">
                          {st.name}
                        </h4>
                        <span className="text-[11px] text-[#526060] block mt-0.5">
                          {st.surahProgress}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                        isCompleted
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          : 'bg-[#e0f2fe] text-[#0369a1]'
                      }`}
                    >
                      {isCompleted ? 'دورة مكتملة (8/8) ⭐' : `الحصة ${cycleCount} من 8`}
                    </span>
                  </div>

                  {/* Timing & Zoom */}
                  <div className="bg-[#f0f9ff] rounded-xl p-2.5 text-xs flex flex-col gap-1.5 border border-[#bae6fd]/50">
                    <div className="flex items-center justify-between text-[#0369a1]">
                      <span className="flex items-center gap-1 font-bold">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>{st.sessionTime || '04:30 م بتوقيت مكة'}</span>
                      </span>
                      {st.meetingUrl ? (
                        <a
                          href={st.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#0284c7] text-white font-bold text-[11px] hover:bg-[#0369a1] transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <span className="material-symbols-outlined text-xs">videocam</span>
                          <span>دخول غرفة الزووم</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-500">حلقة التسميع</span>
                      )}
                    </div>

                    {/* Progress Bar for the 8 sessions */}
                    <div className="mt-1">
                      <div className="flex items-center justify-between text-[10px] text-[#526060] mb-1">
                        <span>إنجاز دورة الـ 8 حصص:</span>
                        <span className="font-bold font-mono">{cycleCount}/8</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isCompleted ? 'bg-amber-500' : 'bg-[#005253]'
                          }`}
                          style={{ width: `${Math.min(100, (cycleCount / 8) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions for Today */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleOpenLogSession(st)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#005253] hover:bg-[#003d3e] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">history_edu</span>
                      <span>تسجيل حضور وإنجاز الحصة</span>
                    </button>

                    {isCompleted && (
                      <button
                        onClick={() => handleOpenSubmitReport(st)}
                        className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                        title="إرسال التقرير النهائي المجمّع للمدير"
                      >
                        <span className="material-symbols-outlined text-base">send</span>
                        <span>إرسال للمدير</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WEEKLY SCHEDULE VIEW (جدول الحصص الأسبوعي) */}
      {activeTab === 'weekly_schedule' && (
        <div className="bg-white rounded-3xl p-6 border border-[#bec8c8]/30 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#bec8c8]/20">
            <div>
              <h3 className="font-bold text-lg text-[#111c2d] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005253]">calendar_month</span>
                <span>جدول المعلم الأسبوعي (توزيع الحصص)</span>
              </h3>
              <p className="text-xs text-[#6f7979] mt-0.5">
                مواعيد الطلاب مقسمة على مدار أيام الأسبوع السبعة بتوقيت مكة المكرمة
              </p>
            </div>
            <span className="text-xs font-bold text-[#005253] bg-[#e7eeff] px-3 py-1.5 rounded-xl">
              إجمالي الطلاب المجدولين: {teacherStudents.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {ARABIC_WEEKDAYS.map((day) => {
              const dayStudents = teacherStudents.filter((s) => s.scheduleDays?.includes(day));
              const isToday = day === todayWeekday;

              return (
                <div
                  key={day}
                  className={`rounded-2xl p-3.5 border flex flex-col gap-2.5 transition-all ${
                    isToday
                      ? 'bg-[#f0f9ff] border-[#0284c7] ring-2 ring-[#0284c7]/20 shadow-xs'
                      : 'bg-[#fafafa] border-[#bec8c8]/20'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#bec8c8]/20">
                    <span className={`font-black text-sm ${isToday ? 'text-[#0284c7]' : 'text-[#111c2d]'}`}>
                      {day}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        isToday ? 'bg-[#0284c7] text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {dayStudents.length}
                    </span>
                  </div>

                  {dayStudents.length === 0 ? (
                    <div className="py-4 text-center text-[11px] text-gray-400">
                      لا توجد حصص
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {dayStudents.map((st) => (
                        <div
                          key={`${day}-${st.id}`}
                          className="bg-white rounded-xl p-2.5 border border-[#bec8c8]/20 shadow-2xs hover:shadow-xs transition-all flex flex-col gap-1.5 text-xs cursor-pointer"
                          onClick={() => handleOpenLogSession(st)}
                        >
                          <div className="font-bold text-[#111c2d] truncate">
                            {st.name}
                          </div>
                          <div className="text-[11px] text-[#005253] font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            <span>{st.sessionTime || '04:30 م'}</span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-500">
                            <span>الدورة: {st.currentCycleSessionsCount || 0}/8</span>
                            {st.meetingUrl && (
                              <span className="text-[#0284c7] font-bold">زووم ✔</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action / Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#bec8c8]/20 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <span className="material-symbols-outlined absolute right-3.5 top-3 text-[#6f7979] text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الطالب أو مسار التسميع أو الهاتف..."
            className="w-full h-11 pr-10 pl-3 rounded-xl bg-[#f0f3ff] text-sm text-[#111c2d] focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddStudentModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#005253] text-white font-bold text-xs hover:bg-[#186b6d] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>طالب جديد للحلقة</span>
          </button>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-[#6f7979]">
            <span className="material-symbols-outlined text-base text-[#005253]">verified</span>
            <span>تسجيل 8 حصص يجهّز التقرير الشهري تلقائياً للإرسال للمدير</span>
          </div>
        </div>
      </div>

      {/* Students Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teacherStudents.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-[#bec8c8]/20 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-5xl text-[#6f7979]/40 mb-2 block">
              group_off
            </span>
            <p className="text-base font-bold text-[#111c2d]">لا يوجد طلاب في هذه الحلقة حالياً</p>
            <p className="text-xs text-[#6f7979] mt-1 mb-4">
              يمكنك إضافة أول طالب لحلقتك الآن بسهولة بالضغط على الزر أدناه
            </p>
            <button
              onClick={() => setIsAddStudentModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-[#005253] text-white font-bold text-xs hover:bg-[#186b6d] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>+ إضافة طالب جديد للحلقة</span>
            </button>
          </div>
        ) : (
          teacherStudents.map((student) => {
            const reportInfo = getReportStatusInfo(student.lastReportDate);
            const isRedOverdue = reportInfo.isOverdue && student.status === 'active';
            const isYellowWarning = reportInfo.isWarning && student.status === 'active';
            const isVacation = student.status === 'vacation';
            const latestRep = getStudentLatestReport(student.id);

            const cycleCount = student.currentCycleSessionsCount || 1;
            const isCycleCompleted = cycleCount >= 8;

            return (
              <div
                key={student.id}
                className={`bg-white rounded-3xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 ${
                  isCycleCompleted
                    ? 'border-amber-400 bg-linear-to-b from-amber-50/40 to-white ring-2 ring-amber-400/30'
                    : isRedOverdue
                    ? 'border-[#ba1a1a]/40 bg-[#fff5f5]'
                    : isYellowWarning
                    ? 'border-[#eab308]/40 bg-[#fefce8]'
                    : isVacation
                    ? 'border-[#ca8a04]/30 bg-[#fffbeb]'
                    : 'border-[#bec8c8]/25'
                }`}
              >
                {/* Student header info */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs ${
                          isCycleCompleted
                            ? 'bg-amber-600 text-white'
                            : isRedOverdue
                            ? 'bg-[#ba1a1a] text-white'
                            : isYellowWarning
                            ? 'bg-[#ca8a04] text-white'
                            : isVacation
                            ? 'bg-[#7d5800] text-white'
                            : 'bg-[#005253] text-white'
                        }`}
                      >
                        {student.initials}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#111c2d] leading-tight">
                          {student.name}
                        </h3>
                        <span className="text-xs text-[#6f7979] block mt-0.5">
                          {student.surahProgress}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isCycleCompleted ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          <span>اكتملت الدورة (8/8) ⭐</span>
                        </span>
                      ) : isVacation ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#ffdea9] text-[#7d5800] text-xs font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">flight_takeoff</span>
                          <span>إجازة</span>
                        </span>
                      ) : isRedOverdue ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30 text-xs font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">error</span>
                          <span>متأخر (&gt; 30 يوماً)</span>
                        </span>
                      ) : isYellowWarning ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#fef9c3] text-[#854d0e] border border-[#fde047] text-xs font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">alarm</span>
                          <span>تحذير (&gt; 25 يوماً)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#86efac] text-xs font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          <span>دورة منتظمة</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 8-Session Cycle Tracker Badge */}
                  <div className="mb-3 p-3 rounded-2xl bg-[#f0fdf4] border border-[#bbf7d0] flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#166534] flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">cycle</span>
                        <span>دورة الـ 8 حصص الحالية</span>
                      </span>
                      <span className="font-black text-sm text-[#166534]">
                        {cycleCount} / 8 حصص
                      </span>
                    </div>

                    {/* Progress dots */}
                    <div className="grid grid-cols-8 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <div
                          key={n}
                          className={`h-2 rounded-full transition-all ${
                            n <= cycleCount
                              ? isCycleCompleted
                                ? 'bg-amber-500'
                                : 'bg-[#16a34a]'
                              : 'bg-gray-200'
                          }`}
                          title={`الحصة ${n}`}
                        />
                      ))}
                    </div>

                    {isCycleCompleted && (
                      <p className="text-[11px] font-bold text-amber-800 mt-0.5">
                        ✨ اكتملت الـ 8 حصص! تم تجهيز التقرير المجمّع تلقائياً للإرسال للمدير.
                      </p>
                    )}
                  </div>

                  {/* Student Schedule Details */}
                  <div className="bg-[#f0f3ff] rounded-2xl p-3 text-xs flex flex-col gap-2">
                    {/* Schedule days */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#6f7979]">أيام الحصص:</span>
                      <span className="font-bold text-[#111c2d]">
                        {student.scheduleDays && student.scheduleDays.length > 0
                          ? student.scheduleDays.join('، ')
                          : 'الأحد، الثلاثاء، الخميس'}
                      </span>
                    </div>

                    {/* Mecca Time & Zoom link */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#6f7979]">التوقيت:</span>
                      <span className="font-bold text-[#005253]">
                        {student.sessionTime || '04:30 م بتوقيت مكة'}
                      </span>
                    </div>

                    {student.meetingUrl && (
                      <div className="flex items-center justify-between pt-1 border-t border-[#bec8c8]/20">
                        <span className="text-[#6f7979]">غرفة التسميع:</span>
                        <a
                          href={student.meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0284c7] font-bold hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">videocam</span>
                          <span>فتح رابط الزووم</span>
                        </a>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-[#bec8c8]/20">
                      <span className="text-[#6f7979]">هاتف ولي الأمر:</span>
                      <span className="font-bold text-[#111c2d] font-mono dir-ltr">
                        {student.parentPhone}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#6f7979]">تاريخ آخر تقرير:</span>
                      <span className="font-bold text-[#111c2d] font-mono dir-ltr">
                        {student.lastReportDate} ({reportInfo.days} يوماً)
                      </span>
                    </div>

                    {/* Latest Report Submission Status */}
                    {latestRep?.submissionStatus === 'submitted_ready_to_send' && (
                      <div className="pt-2 border-t border-[#bec8c8]/20 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[#6f7979]">حالة التقرير:</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#86efac] font-bold text-[11px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            <span>تم التسليم للمدير - بانتظار الإرسال</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(student, latestRep)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-white border border-[#005253]/30 text-[#005253] hover:bg-[#005253]/5 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                          <span>معاينة وتحميل تقرير PDF</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-col gap-2 pt-2">
                  {/* Primary Button: تسجيل حضور وإنجاز الحصة */}
                  <button
                    onClick={() => handleOpenLogSession(student)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[#005253] hover:bg-[#003d3e] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">history_edu</span>
                    <span>تسجيل حضور وإنجاز الحصة ({cycleCount}/8)</span>
                  </button>

                  {/* If cycle completed (8/8) or ready: Prominent "إرسال التقرير النهائي المجمّع للمدير" button */}
                  {isCycleCompleted ? (
                    <button
                      onClick={() => handleOpenSubmitReport(student)}
                      className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer animate-pulse"
                    >
                      <span className="material-symbols-outlined text-xl">send</span>
                      <span>إرسال التقرير النهائي المجمّع للمدير ⭐</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenSubmitReport(student)}
                      className="w-full py-2 px-3 rounded-2xl bg-white border border-[#005253]/30 hover:bg-[#005253]/5 text-[#005253] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">assignment_turned_in</span>
                      <span>تسليم تقرير 8 حصص يدوياً</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Fast Daily Session Log Modal */}
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

      {/* Add / Submit Report Modal with 8-sessions auto aggregation */}
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

      {/* Quick Add Student Modal for Teacher with Schedule Fields */}
      <QuickAddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        teacherId={teacherId}
        circleName={teacherObj?.circleName}
      />
    </div>
  );
};
