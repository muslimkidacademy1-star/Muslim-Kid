import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Report } from '../../types';
import { AddReportModal } from '../modals/AddReportModal';
import { QuickAddStudentModal } from '../modals/QuickAddStudentModal';
import { LogSessionModal } from '../modals/LogSessionModal';
import { generateStudentReportPdf } from '../../utils/pdfGenerator';
import { getParentWhatsAppUrl } from '../../utils/whatsapp';
import { ARABIC_WEEKDAYS, getTodayArabicWeekday } from '../../mock/initialData';

interface StudentCardProps {
  student: Student;
  onLogSession: (student: Student) => void;
  onSubmitReport: (student: Student) => void;
  onDownloadPdf?: (student: Student, report: Report) => void;
  latestReport?: Report;
  todayWeekday: string;
}

const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onLogSession,
  onSubmitReport,
  onDownloadPdf,
  latestReport,
  todayWeekday,
}) => {
  const maxPkg = student.packageSessionsCount || 8;
  const cycleCount = student.currentCycleSessionsCount || 0;
  const isCompleted = cycleCount >= maxPkg;

  // Session time (prioritizing today's specific day time)
  const sessionTimeString = student.daySchedule?.[todayWeekday]
    ? `${student.daySchedule[todayWeekday]} (بتوقيت القاهرة)`
    : student.sessionTime || '04:00 م (بتوقيت القاهرة)';

  const scheduleDaysString =
    student.scheduleDays && student.scheduleDays.length > 0
      ? student.scheduleDays.join(' و ')
      : 'السبت والإثنين';

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3.5">
      {/* Header: Student Name & Cycle Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-gray-900 tracking-tight truncate">
              {student.name}
            </h3>
            {student.status === 'vacation' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                إجازة
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {student.surahProgress || 'حلقة القرآن الكريم'}
          </p>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
            isCompleted
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
          }`}
        >
          {isCompleted ? `دورة مكتملة (${maxPkg}/${maxPkg}) ⭐` : `الحصة ${cycleCount} من ${maxPkg}`}
        </span>
      </div>

      {/* Two Tidy Lines with Calm Gray Icons */}
      <div className="flex flex-col gap-2 text-xs text-gray-600">
        {/* Line 1: Time & Schedule Days */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-gray-700">
            <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
            <span className="font-semibold text-gray-800">{sessionTimeString}</span>
          </span>
          <span className="text-gray-300">•</span>
          <span className="inline-flex items-center gap-1.5 text-gray-500">
            <span className="material-symbols-outlined text-sm text-gray-400">calendar_today</span>
            <span>{scheduleDaysString}</span>
          </span>
        </div>

        {/* Line 2: WhatsApp Link as an elegant pill with green icon */}
        {student.parentPhone ? (
          <div className="flex items-center">
            <a
              href={getParentWhatsAppUrl(student.parentPhone, student.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 hover:bg-emerald-50 border border-gray-200/70 hover:border-emerald-200 text-gray-700 hover:text-emerald-900 transition-colors text-xs font-mono group"
              title="محادثة واتساب مباشرة مع ولي الأمر"
            >
              <span className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[10px] group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[10px]">chat</span>
              </span>
              <span className="dir-ltr text-[11px] font-semibold">{student.parentPhone}</span>
            </a>
          </div>
        ) : null}
      </div>

      {/* Slim, elegant progress line in calm emerald */}
      <div className="flex flex-col gap-1 pt-1">
        <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
          <span>إنجاز الدورة ({cycleCount} من {maxPkg})</span>
          <span className="font-mono text-emerald-800 font-bold">
            {Math.round((cycleCount / maxPkg) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted ? 'bg-amber-500' : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(100, (cycleCount / maxPkg) * 100)}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-1 flex flex-col gap-2">
        <button
          onClick={() => onLogSession(student)}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
        >
          <span className="material-symbols-outlined text-base">history_edu</span>
          <span>تسجيل حضور وإنجاز الحصة</span>
        </button>

        {isCompleted && (
          <button
            onClick={() => onSubmitReport(student)}
            className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-base">send</span>
            <span>إرسال التقرير النهائي المجمّع للمدير ⭐</span>
          </button>
        )}

        {/* Quick PDF download if report submitted */}
        {latestReport?.submissionStatus === 'submitted_ready_to_send' && onDownloadPdf && (
          <button
            type="button"
            onClick={() => onDownloadPdf(student, latestReport)}
            className="w-full py-1.5 px-3 rounded-xl bg-gray-50 border border-gray-200 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">picture_as_pdf</span>
            <span>تحميل تقرير الدورة (PDF)</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const TeacherView: React.FC = () => {
  const {
    currentUser,
    visibleStudents,
    teachers,
    getTeacherById,
    reports,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'today' | 'students' | 'schedule'>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Student | null>(null);
  const [selectedStudentForLog, setSelectedStudentForLog] = useState<Student | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLogSessionModalOpen, setIsLogSessionModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);

  // The logged-in teacher's details
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
    'حلقة القرآن';

  // Filter students belonging to this teacher
  const teacherStudents = visibleStudents.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.surahProgress.toLowerCase().includes(q) ||
      s.parentPhone.includes(q)
    );
  });

  const todayWeekday = getTodayArabicWeekday();

  // Students who have classes today
  const todayStudents = teacherStudents.filter((s) => {
    if (s.status === 'vacation') return false;
    if (s.scheduleDays && s.scheduleDays.length > 0) {
      return s.scheduleDays.includes(todayWeekday);
    }
    return true;
  });

  const completedCyclesCount = teacherStudents.filter(
    (s) => (s.currentCycleSessionsCount || 0) >= (s.packageSessionsCount || 8)
  ).length;

  const handleOpenSubmitReport = (student: Student) => {
    setSelectedStudentForReport(student);
    setIsReportModalOpen(true);
  };

  const handleOpenLogSession = (student: Student) => {
    setSelectedStudentForLog(student);
    setIsLogSessionModalOpen(true);
  };

  const getStudentLatestReport = (studentId: string) => {
    return reports.find((r) => r.studentId === studentId);
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
    <div className="flex flex-col gap-4 sm:gap-5" dir="rtl">
      {/* 1. Compact Quick Stats Bar (موجز علوي مدمج وأنيق) */}
      <div className="bg-white rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-sm sm:text-base font-bold text-gray-900">
            أهلاً {currentUser.name} 👋 • {teacherCircleName}
          </span>

          <span className="text-gray-300 hidden md:inline">•</span>

          {/* Quick stats in a single inline row */}
          <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-100">
              <span>📅</span>
              <span>{todayStudents.length} حصص اليوم</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 text-gray-700 font-medium border border-gray-200/70">
              <span>👥</span>
              <span>{teacherStudents.length} طلاب</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-medium border border-amber-200/70">
              <span>🏆</span>
              <span>{completedCyclesCount} دورات مكتملة</span>
            </span>
          </div>
        </div>

        {/* Compact Add Student Button */}
        <button
          onClick={() => setIsAddStudentModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-98"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span>+ إضافة طالب جديد</span>
        </button>
      </div>

      {/* 2. Segmented Control Tabs (تبويبات التصفح العصرية تشبه تطبيقات الموبايل) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-gray-200/70 rounded-2xl gap-1 shadow-inner text-xs sm:text-sm font-bold w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'today'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>📌</span>
            <span>حصص اليوم</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeTab === 'today'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-gray-300/60 text-gray-700'
              }`}
            >
              {todayStudents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'students'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>👥</span>
            <span>قائمة الطلاب</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeTab === 'students'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-gray-300/60 text-gray-700'
              }`}
            >
              {teacherStudents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'schedule'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>🗓️</span>
            <span>الجدول الأسبوعي</span>
          </button>
        </div>

        {/* Clean search bar when on today or students tab */}
        {activeTab !== 'schedule' && teacherStudents.length > 0 && (
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-gray-400 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم الطالب أو الهاتف..."
              className="w-full h-10 pr-9 pl-7 rounded-xl bg-white text-xs text-gray-900 border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 shadow-2xs placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Empty State when Teacher has no students */}
      {teacherStudents.length === 0 && !searchTerm && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-3xl">menu_book</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            أهلاً بك في حلقتك المباركة!
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md leading-relaxed">
            لا يوجد طلاب مضافون في حلقتك بعد. يمكنك البدء بإضافة طلابك وتحديد مواعيد حصصهم عبر الزر أدناه.
          </p>
          <button
            onClick={() => setIsAddStudentModalOpen(true)}
            className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            <span>+ إضافة طالب جديد</span>
          </button>
        </div>
      )}

      {/* 4. Tab 1: حصص اليوم (Today's Classes) */}
      {activeTab === 'today' && teacherStudents.length > 0 && (
        <div>
          {todayStudents.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-4xl text-gray-300">
                event_available
              </span>
              <p className="text-sm font-bold text-gray-800">
                لا توجد حصص مجدولة لهذا اليوم ({todayWeekday})
              </p>
              <p className="text-xs text-gray-500">
                يمكنك الانتقال لتبويب <strong>«قائمة الطلاب»</strong> لتسجيل حضور أي طالب خارج الجدول الأسبوعي
              </p>
              <button
                onClick={() => setActiveTab('students')}
                className="mt-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-all cursor-pointer"
              >
                عرض كافة الطلاب ({teacherStudents.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              {todayStudents.map((student) => (
                <StudentCard
                  key={`today-${student.id}`}
                  student={student}
                  onLogSession={handleOpenLogSession}
                  onSubmitReport={handleOpenSubmitReport}
                  onDownloadPdf={handleDownloadPdf}
                  latestReport={getStudentLatestReport(student.id)}
                  todayWeekday={todayWeekday}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: قائمة الطلاب (All Students) */}
      {activeTab === 'students' && teacherStudents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {teacherStudents.map((student) => (
            <StudentCard
              key={`all-${student.id}`}
              student={student}
              onLogSession={handleOpenLogSession}
              onSubmitReport={handleOpenSubmitReport}
              onDownloadPdf={handleDownloadPdf}
              latestReport={getStudentLatestReport(student.id)}
              todayWeekday={todayWeekday}
            />
          ))}
        </div>
      )}

      {/* 6. Tab 3: الجدول الأسبوعي (Weekly Schedule) */}
      {activeTab === 'schedule' && teacherStudents.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700">calendar_month</span>
                <span>جدول المعلم الأسبوعي</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                مواعيد الحصص الموزعة على مدار أيام الأسبوع بتوقيت القاهرة
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl w-fit">
              إجمالي الطلاب: {teacherStudents.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {ARABIC_WEEKDAYS.map((day) => {
              const dayStudents = teacherStudents.filter((s) => s.scheduleDays?.includes(day));
              const isToday = day === todayWeekday;

              return (
                <div
                  key={day}
                  className={`rounded-2xl p-3 border flex flex-col gap-2.5 transition-all ${
                    isToday
                      ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-600/10 shadow-xs'
                      : 'bg-[#fafafa] border-gray-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                    <span className={`font-bold text-xs sm:text-sm ${isToday ? 'text-emerald-800' : 'text-gray-800'}`}>
                      {day}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        isToday ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-700'
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
                          className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-2xs hover:shadow-xs transition-all flex flex-col gap-1.5 text-xs cursor-pointer group"
                          onClick={() => handleOpenLogSession(st)}
                        >
                          <div className="font-bold text-gray-900 truncate group-hover:text-emerald-700">
                            {st.name}
                          </div>
                          <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-emerald-600">schedule</span>
                            <span>
                              {st.daySchedule?.[day]
                                ? `${st.daySchedule[day]} (بتوقيت القاهرة)`
                                : st.sessionTime || '04:00 م'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px] text-gray-500">
                            <span>الدورة: {st.currentCycleSessionsCount || 0}/{st.packageSessionsCount || 8}</span>
                            <span className="text-emerald-700 font-bold">تسجيل ✍️</span>
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

      {/* Add / Submit Report Modal with Auto-Aggregation */}
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

      {/* Quick Add Student Modal for Teacher */}
      <QuickAddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
        teacherId={effectiveTeacherId}
        circleName={teacherCircleName}
      />
    </div>
  );
};
