import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Report } from '../../types';
import { AddReportModal } from '../modals/AddReportModal';
import { QuickAddStudentModal } from '../modals/QuickAddStudentModal';
import { LogSessionModal } from '../modals/LogSessionModal';
import { generateStudentReportPdf } from '../../utils/pdfGenerator';
import { getParentWhatsAppUrl, formatInternationalPhone, formatCairoTime } from '../../utils/whatsapp';
import { getTodayArabicWeekday } from '../../mock/initialData';
import { HorizontalWeeklyScheduleStrip } from './HorizontalWeeklyScheduleStrip';
import { TeacherBottomNav, TeacherTab } from './TeacherBottomNav';

interface StudentCardProps {
  student: Student;
  onLogSession: (student: Student) => void;
  onSubmitReport: (student: Student) => void;
  onDownloadPdf?: (student: Student, report: Report) => void;
  latestReport?: Report;
  displayDay?: string;
}

const StudentCard: React.FC<StudentCardProps> = ({
  student,
  onLogSession,
  onSubmitReport,
  onDownloadPdf,
  latestReport,
  displayDay,
}) => {
  const maxPkg = student.packageSessionsCount || 8;
  const cycleCount = student.currentCycleSessionsCount || 0;
  const isCompleted = cycleCount >= maxPkg;

  // Session time strictly in Cairo Time
  const dayKey = displayDay || getTodayArabicWeekday();
  const rawTime = student.daySchedule?.[dayKey] || student.sessionTime;
  const sessionTimeString = formatCairoTime(rawTime);

  const scheduleDaysString =
    student.scheduleDays && student.scheduleDays.length > 0
      ? student.scheduleDays.join(' و ')
      : 'السبت والإثنين';

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3.5 w-full">
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
              : 'bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20'
          }`}
        >
          {isCompleted ? `دورة مكتملة (${maxPkg}/${maxPkg}) ⭐` : `الحصة ${cycleCount} من ${maxPkg}`}
        </span>
      </div>

      {/* Two Tidy Lines with Calm Gray Icons */}
      <div className="flex flex-col gap-2 text-xs text-gray-600">
        {/* Line 1: Time (بتوقيت القاهرة) & Schedule Days */}
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

        {/* Line 2: WhatsApp Link with international phone order and green active icon */}
        {student.parentPhone ? (
          <div className="flex items-center">
            <a
              href={getParentWhatsAppUrl(student.parentPhone, student.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-950 transition-colors text-xs group"
              title="محادثة واتساب مباشرة مع ولي الأمر"
            >
              <span className="w-4.5 h-4.5 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                </svg>
              </span>
              <span dir="ltr" className="font-mono text-[11px] font-bold tracking-normal inline-block text-left text-emerald-950">
                {formatInternationalPhone(student.parentPhone)}
              </span>
            </a>
          </div>
        ) : null}
      </div>

      {/* Slim progress line in Teal #1A7B88 */}
      <div className="flex flex-col gap-1 pt-1">
        <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
          <span>إنجاز الدورة ({cycleCount} من {maxPkg})</span>
          <span className="font-mono text-[#125862] font-bold">
            {Math.round((cycleCount / maxPkg) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted ? 'bg-amber-500' : 'bg-[#1A7B88]'
            }`}
            style={{ width: `${Math.min(100, (cycleCount / maxPkg) * 100)}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-1 flex flex-col gap-2">
        <button
          onClick={() => onLogSession(student)}
          className="w-full py-2.5 px-4 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
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
            className="w-full py-1.5 px-3 rounded-xl bg-[#EAF5F7] border border-[#1A7B88]/20 text-[#125862] hover:bg-[#d9eff3] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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

  const [activeTab, setActiveTab] = useState<TeacherTab>('today');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);
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
    'حلقة النور';

  // Filter students belonging to this teacher by search term
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

  // Students for currently selected day from the horizontal strip
  const dayFilteredStudents = selectedDayFilter
    ? teacherStudents.filter(
        (s) => s.status !== 'vacation' && s.scheduleDays?.includes(selectedDayFilter)
      )
    : [];

  const handleSelectDay = (day: string) => {
    if (selectedDayFilter === day) {
      setSelectedDayFilter(null);
    } else {
      setSelectedDayFilter(day);
    }
  };

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
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-3.5 sm:gap-4 pb-24 sm:pb-8" dir="rtl">
      {/* 1. Balanced Wide 2-Tab Navigation Bar (50% / 50% split) */}
      <div
        className="w-full grid grid-cols-2 p-1.5 bg-[#EAF5F7] rounded-2xl gap-1.5 border border-[#1A7B88]/20 shadow-xs text-xs sm:text-sm font-bold items-center"
        style={{ height: '59px' }}
      >
        {/* Tab 1: حصص اليوم (50% width) */}
        <button
          onClick={() => {
            setActiveTab('today');
            setSelectedDayFilter(null);
          }}
          className={`w-full h-full py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'today' && !selectedDayFilter
              ? 'bg-white text-[#125862] shadow-xs'
              : 'text-gray-600 hover:text-[#125862]'
          }`}
        >
          <span className="text-sm">📌</span>
          <span className="font-bold truncate">حصص اليوم</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold shrink-0 ${
              activeTab === 'today' && !selectedDayFilter
                ? 'bg-[#1A7B88] text-white'
                : 'bg-white/80 text-gray-700'
            }`}
          >
            {todayStudents.length}
          </span>
        </button>

        {/* Tab 2: قائمة الطلاب (50% width) */}
        <button
          onClick={() => {
            setActiveTab('students');
            setSelectedDayFilter(null);
          }}
          className={`w-full h-full py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'students' && !selectedDayFilter
              ? 'bg-white text-[#125862] shadow-xs'
              : 'text-gray-600 hover:text-[#125862]'
          }`}
        >
          <span className="text-sm">👥</span>
          <span className="font-bold truncate">قائمة الطلاب</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold shrink-0 ${
              activeTab === 'students' && !selectedDayFilter
                ? 'bg-[#1A7B88] text-white'
                : 'bg-white/80 text-gray-700'
            }`}
          >
            {teacherStudents.length}
          </span>
        </button>
      </div>

      {/* 2. Horizontal Scrollable Weekly Schedule Strip (أسفل تبويبات حصص اليوم وقائمة الطلاب) */}
      <HorizontalWeeklyScheduleStrip
        students={teacherStudents}
        selectedDay={selectedDayFilter}
        onSelectDay={handleSelectDay}
      />

      {/* Active Day Filter Notification Banner */}
      {selectedDayFilter && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#EAF5F7] border border-[#1A7B88]/30 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs text-[#125862] font-bold">
            <span className="material-symbols-outlined text-base text-[#1A7B88]">filter_alt</span>
            <span>
              عرض الحصص المجدولة ليوم <strong>({selectedDayFilter})</strong> • {dayFilteredStudents.length} طلاب
            </span>
          </div>

          <button
            onClick={() => setSelectedDayFilter(null)}
            className="text-xs text-[#125862] hover:text-[#1A7B88] font-bold px-2.5 py-1 rounded-xl bg-white border border-[#1A7B88]/20 transition-colors cursor-pointer"
          >
            إلغاء التصفية ✕
          </button>
        </div>
      )}

      {/* 3. Directly Below: Single Compact Row (Search Box + Small Elegant [+ طالب جديد] Button) */}
      <div className="flex items-center gap-2 sm:gap-3 w-full">
        {/* Search Input spanning remaining space */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute right-3 top-2.5 text-gray-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الطالب أو رقم الهاتف..."
            className="w-full h-10 pr-9.5 pl-8 rounded-xl bg-white text-xs sm:text-sm text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 shadow-2xs placeholder:text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs cursor-pointer p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Small & Elegant Add Student Button */}
        <button
          onClick={() => setIsAddStudentModalOpen(true)}
          className="h-10 px-3.5 sm:px-5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-98"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span className="whitespace-nowrap">+ طالب جديد</span>
        </button>
      </div>

      {/* 4. Empty State when Teacher has no students */}
      {teacherStudents.length === 0 && !searchTerm && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-3 w-full">
          <div className="w-16 h-16 rounded-2xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-3xl">menu_book</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">
            أهلاً بك في حلقتك المباركة!
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md leading-relaxed">
            لا يوجد طلاب مضافون في حلقتك بعد. يمكنك البدء بإضافة طلابك وتحديد مواعيد حصصهم عبر الزر أعلاه.
          </p>
          <button
            onClick={() => setIsAddStudentModalOpen(true)}
            className="mt-2 px-5 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            <span>+ إضافة طالب جديد</span>
          </button>
        </div>
      )}

      {/* 5. Main Cards Display Area */}
      {/* Case A: Specific day selected from horizontal strip */}
      {selectedDayFilter && (
        <div className="w-full">
          {dayFilteredStudents.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-2 w-full">
              <span className="material-symbols-outlined text-4xl text-gray-300">
                event_busy
              </span>
              <p className="text-sm font-bold text-gray-800">
                لا توجد حصص مجدولة في يوم ({selectedDayFilter})
              </p>
              <button
                onClick={() => setSelectedDayFilter(null)}
                className="mt-2 px-4 py-2 rounded-xl bg-[#EAF5F7] text-[#125862] hover:bg-[#d9eff3] text-xs font-bold transition-all cursor-pointer border border-[#1A7B88]/20"
              >
                العودة لكافة الحصص
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
              {dayFilteredStudents.map((student) => (
                <StudentCard
                  key={`day-${selectedDayFilter}-${student.id}`}
                  student={student}
                  onLogSession={handleOpenLogSession}
                  onSubmitReport={handleOpenSubmitReport}
                  onDownloadPdf={handleDownloadPdf}
                  latestReport={getStudentLatestReport(student.id)}
                  displayDay={selectedDayFilter}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Case B: Tab 1: حصص اليوم (when no custom day filter is selected) */}
      {!selectedDayFilter && activeTab === 'today' && teacherStudents.length > 0 && (
        <div className="w-full">
          {todayStudents.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-2 w-full">
              <span className="material-symbols-outlined text-4xl text-gray-300">
                event_available
              </span>
              <p className="text-sm font-bold text-gray-800">
                لا توجد حصص مجدولة لهذا اليوم ({todayWeekday})
              </p>
              <p className="text-xs text-gray-500">
                يمكنك النقر على أي يوم من الشريط الأسبوعي أعلاه أو الانتقال لتبويب <strong>«قائمة الطلاب»</strong>
              </p>
              <button
                onClick={() => setActiveTab('students')}
                className="mt-2 px-4 py-2 rounded-xl bg-[#EAF5F7] text-[#125862] hover:bg-[#d9eff3] text-xs font-bold transition-all cursor-pointer border border-[#1A7B88]/20"
              >
                عرض كافة الطلاب ({teacherStudents.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
              {todayStudents.map((student) => (
                <StudentCard
                  key={`today-${student.id}`}
                  student={student}
                  onLogSession={handleOpenLogSession}
                  onSubmitReport={handleOpenSubmitReport}
                  onDownloadPdf={handleDownloadPdf}
                  latestReport={getStudentLatestReport(student.id)}
                  displayDay={todayWeekday}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Case C: Tab 2: قائمة الطلاب (All Students) */}
      {!selectedDayFilter && activeTab === 'students' && teacherStudents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
          {teacherStudents.map((student) => (
            <StudentCard
              key={`all-${student.id}`}
              student={student}
              onLogSession={handleOpenLogSession}
              onSubmitReport={handleOpenSubmitReport}
              onDownloadPdf={handleDownloadPdf}
              latestReport={getStudentLatestReport(student.id)}
              displayDay={todayWeekday}
            />
          ))}
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Fixed for phones) */}
      <TeacherBottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          setSelectedDayFilter(null);
        }}
        todayCount={todayStudents.length}
        studentsCount={teacherStudents.length}
      />

      {/* Fast Daily Session Log Modal with Praise Chips */}
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
