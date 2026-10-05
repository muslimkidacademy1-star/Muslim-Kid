import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Teacher } from '../../types';
import {
  getParentWhatsAppUrl,
  getTeacherReminderWhatsAppUrl,
  formatCairoTime,
} from '../../utils/whatsapp';
import { RecordObservationModal } from '../modals/RecordObservationModal';
import { ViewObservationNoteModal } from '../modals/ViewObservationNoteModal';
import { getTodayArabicWeekday } from '../../mock/initialData';

interface EducationalSupervisorViewProps {
  onAddReport?: (student: Student) => void;
  onEditStudent?: (student: Student) => void;
  onManageVacation?: (student: Student) => void;
  onOpenActivityLog?: () => void;
  onAddStudent?: () => void;
}

type SupervisorTab = 'today_observation' | 'teachers' | 'students_radar';
type AuditFilter = 'all' | 'needs_audit' | 'visited_recently';

export const getDaysSinceLastObservation = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

export const EducationalSupervisorView: React.FC<EducationalSupervisorViewProps> = ({
  onAddReport,
}) => {
  const {
    currentUser,
    visibleStudents,
    visibleTeachers,
    getTeacherById,
    getDaysSinceLastReport,
    addActivityLog,
    updateTeacher,
  } = useApp();

  const [activeTab, setActiveTab] = useState<SupervisorTab>('today_observation');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all');

  // Observation Modal state
  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [selectedObservationTeacher, setSelectedObservationTeacher] = useState<Teacher | undefined>(undefined);
  const [selectedObservationStudent, setSelectedObservationStudent] = useState<Student | undefined>(undefined);
  const [selectedSessionTime, setSelectedSessionTime] = useState<string | undefined>(undefined);

  // View Previous Note Modal state
  const [isViewNoteModalOpen, setIsViewNoteModalOpen] = useState(false);
  const [selectedViewNoteStudent, setSelectedViewNoteStudent] = useState<Student | undefined>(undefined);
  const [selectedViewNoteTeacher, setSelectedViewNoteTeacher] = useState<Teacher | undefined>(undefined);

  // Quick Teacher Phone Editing State
  const [editingTeacherPhoneId, setEditingTeacherPhoneId] = useState<string | null>(null);
  const [editingTeacherPhoneValue, setEditingTeacherPhoneValue] = useState<string>('');

  // Quick Action notification toast
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  const todayWeekday = getTodayArabicWeekday();

  // 1. Live Hub: All classes scheduled for today across this supervisor's teachers
  const todayClasses = useMemo(() => {
    return visibleStudents
      .filter((s) => {
        if (s.status === 'vacation') return false;
        if (s.scheduleDays && s.scheduleDays.length > 0) {
          return s.scheduleDays.includes(todayWeekday);
        }
        return false;
      })
      .map((student) => {
        const teacher = getTeacherById(student.teacherId);
        const dayTime = student.daySchedule?.[todayWeekday] || student.sessionTime;
        return {
          student,
          teacher,
          sessionTime: dayTime || '04:00 م',
        };
      });
  }, [visibleStudents, todayWeekday, getTeacherById]);

  // Filtered today's classes by search & teacher
  const filteredTodayClasses = useMemo(() => {
    return todayClasses.filter(({ student, teacher }) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.parentPhone.includes(q) ||
        student.surahProgress.toLowerCase().includes(q) ||
        (teacher && teacher.name.toLowerCase().includes(q)) ||
        (teacher && teacher.circleName.toLowerCase().includes(q));

      const matchesTeacher =
        selectedTeacherFilter === 'all' || student.teacherId === selectedTeacherFilter;

      return matchesSearch && matchesTeacher;
    });
  }, [todayClasses, searchQuery, selectedTeacherFilter]);

  // Target pool of students for the 60-day audit cycle (either single teacher's students or all assigned)
  const auditTargetPool = useMemo(() => {
    if (selectedTeacherFilter === 'all') {
      return visibleStudents.filter((s) => s.status !== 'vacation');
    }
    return visibleStudents.filter(
      (s) => s.teacherId === selectedTeacherFilter && s.status !== 'vacation'
    );
  }, [visibleStudents, selectedTeacherFilter]);

  // Audit Metrics for the 60-day cycle
  const auditMetrics = useMemo(() => {
    const total = auditTargetPool.length;
    let visited = 0;

    auditTargetPool.forEach((s) => {
      const days = getDaysSinceLastObservation(s.lastObservationDate);
      if (days !== null && days <= 60) {
        visited += 1;
      }
    });

    const needs = total - visited;
    const rate = total > 0 ? Math.round((visited / total) * 100) : 0;

    return {
      total,
      visited,
      needs,
      rate,
    };
  }, [auditTargetPool]);

  // Filtered and Sorted students for Students & 60-Day Audit Radar tab
  // Requirements: All students needing audit (🔴) come first, followed by visited (🟢)
  const sortedAndFilteredRadarStudents = useMemo(() => {
    const filtered = visibleStudents.filter((student) => {
      const q = searchQuery.toLowerCase().trim();
      const teacher = getTeacherById(student.teacherId);
      const daysObs = getDaysSinceLastObservation(student.lastObservationDate);

      const matchesSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.parentPhone.includes(q) ||
        student.surahProgress.toLowerCase().includes(q) ||
        (teacher && teacher.name.toLowerCase().includes(q)) ||
        (teacher && teacher.circleName.toLowerCase().includes(q));

      const matchesTeacher =
        selectedTeacherFilter === 'all' || student.teacherId === selectedTeacherFilter;

      // 60-day audit filter
      const matchesAudit =
        auditFilter === 'all' ||
        (auditFilter === 'needs_audit' && (daysObs === null || daysObs > 60)) ||
        (auditFilter === 'visited_recently' && daysObs !== null && daysObs <= 60);

      return matchesSearch && matchesTeacher && matchesAudit;
    });

    // Sort: 🔴 Needs visit first!
    return [...filtered].sort((a, b) => {
      const daysA = getDaysSinceLastObservation(a.lastObservationDate);
      const daysB = getDaysSinceLastObservation(b.lastObservationDate);

      const needsA = daysA === null || daysA > 60;
      const needsB = daysB === null || daysB > 60;

      if (needsA && !needsB) return -1;
      if (!needsA && needsB) return 1;

      if (needsA && needsB) {
        if (daysA === null && daysB !== null) return -1;
        if (daysA !== null && daysB === null) return 1;
        if (daysA !== null && daysB !== null) return daysB - daysA;
        return a.name.localeCompare(b.name, 'ar');
      }

      if (daysA !== null && daysB !== null) {
        return daysB - daysA;
      }
      return 0;
    });
  }, [visibleStudents, searchQuery, selectedTeacherFilter, auditFilter, getTeacherById]);

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return visibleTeachers.filter((teacher) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        teacher.name.toLowerCase().includes(q) ||
        teacher.circleName.toLowerCase().includes(q) ||
        (teacher.phone && teacher.phone.includes(q))
      );
    });
  }, [visibleTeachers, searchQuery]);

  // Open Observation Modal
  const handleOpenObservation = (teacher?: Teacher, student?: Student, time?: string) => {
    setSelectedObservationTeacher(teacher);
    setSelectedObservationStudent(student);
    setSelectedSessionTime(time);
    setIsObservationModalOpen(true);
  };

  // Open View Previous Observation Note Modal
  const handleOpenViewNote = (student: Student, teacher?: Teacher) => {
    setSelectedViewNoteStudent(student);
    setSelectedViewNoteTeacher(teacher || getTeacherById(student.teacherId));
    setIsViewNoteModalOpen(true);
  };

  // Remind Teacher via WhatsApp
  const handleRemindTeacher = (teacher: Teacher, student: Student) => {
    if (!teacher.phone) {
      alert('لا يتوفر رقم هاتف مسجل لهذا المعلم');
      return;
    }

    const whatsappUrl = getTeacherReminderWhatsAppUrl(teacher.phone, student.name, teacher.name);
    window.open(whatsappUrl, '_blank');

    addActivityLog(
      'تذكير المعلم عبر واتساب',
      student.name,
      student.id,
      `قام المشرف ${currentUser.name} بإرسال تذكير عبر واتساب للمعلم ${teacher.name} لرفع تقرير حلقة الطالب ${student.name}`
    );

    setActionAlert(`تم فتح محادثة واتساب لتذكير ${teacher.name} بتقرير الطالب ${student.name}`);
    setTimeout(() => setActionAlert(null), 4000);
  };

  // Helper to open a teacher's students list with 60-day audit cycle
  const handleInspectTeacherAudit = (teacherId: string) => {
    setSelectedTeacherFilter(teacherId);
    setActiveTab('students_radar');
    setAuditFilter('all');
  };

  // Save updated teacher phone directly to Supabase
  const handleSaveTeacherPhone = async (teacherId: string) => {
    const newPhone = editingTeacherPhoneValue.trim();
    if (!newPhone) return;

    await updateTeacher(teacherId, { phone: newPhone });
    setEditingTeacherPhoneId(null);
    setEditingTeacherPhoneValue('');
    setActionAlert('تم تحديث رقم هاتف المعلم بنجاح وحفظه في قاعدة البيانات.');
    setTimeout(() => setActionAlert(null), 3500);
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-5 pb-24 sm:pb-8 pt-1 sm:pt-2" dir="rtl">
      {/* Toast Alert Banner */}
      {actionAlert && (
        <div className="p-3.5 rounded-2xl bg-[#125862] text-white flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <span className="material-symbols-outlined text-xl text-emerald-300">mark_chat_read</span>
            <span>{actionAlert}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header of Supervisor View */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1A7B88] animate-pulse shrink-0"></span>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
            لوحة المتابعة الإشرافية
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 font-medium mr-4">
          متابعة حصص اليوم ورادار دورة الـ 60 يوماً للمعلمين التابعين لك
        </p>
      </div>

      {/* 1. Compact Tabs Bar (inline-flex clustered side-by-side, no stretched wide gaps) */}
      <div className="flex items-center justify-start overflow-x-auto no-scrollbar py-1">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-slate-100 p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs shrink-0">
          {/* Tab 1: حصص اليوم للمراقبة */}
          <button
            onClick={() => setActiveTab('today_observation')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-bold ${
              activeTab === 'today_observation'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span>📌</span>
            <span>حصص اليوم للمراقبة</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeTab === 'today_observation'
                  ? 'bg-[#1A7B88] text-white'
                  : 'bg-white/80 text-gray-700'
              }`}
            >
              {todayClasses.length}
            </span>
          </button>

          {/* Tab 2: المعلمون التابعون لي */}
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-bold ${
              activeTab === 'teachers'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span>👨‍🏫</span>
            <span>المعلمون التابعون لي</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                activeTab === 'teachers'
                  ? 'bg-[#1A7B88] text-white'
                  : 'bg-white/80 text-gray-700'
              }`}
            >
              {visibleTeachers.length}
            </span>
          </button>

          {/* Tab 3: رادار الـ 60 يوماً */}
          <button
            onClick={() => setActiveTab('students_radar')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs sm:text-sm font-bold ${
              activeTab === 'students_radar'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span>👥</span>
            <span>رادار الـ 60 يوماً</span>
            {auditMetrics.needs > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500 text-white shadow-2xs">
                🔴 {auditMetrics.needs}
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  activeTab === 'students_radar'
                    ? 'bg-[#1A7B88] text-white'
                    : 'bg-white/80 text-gray-700'
                }`}
              >
                {visibleStudents.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Fast Search Row with Teacher Selector */}
      <div className="flex items-center gap-2.5 sm:gap-3 w-full">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute right-3.5 top-3 text-gray-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المعلم أو الطالب أو الحلقة أو رقم الهاتف..."
            className="w-full h-11 pr-10 pl-8 rounded-2xl bg-white text-xs sm:text-sm text-gray-900 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 shadow-2xs placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-3 text-gray-400 hover:text-gray-600 text-xs cursor-pointer p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Teacher filter dropdown */}
        {visibleTeachers.length > 0 && (
          <div className="shrink-0">
            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="h-11 px-3 sm:px-4 rounded-2xl bg-white border border-gray-200 text-xs sm:text-sm text-gray-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 shadow-2xs cursor-pointer"
            >
              <option value="all">كل المعلمين ({visibleTeachers.length})</option>
              {visibleTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Content Display by Active Tab */}

      {/* TAB 1: حصص اليوم للمراقبة (Today's Observation Sessions) */}
      {activeTab === 'today_observation' && (
        <div className="w-full">
          {filteredTodayClasses.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-2 w-full">
              <span className="material-symbols-outlined text-4xl text-gray-300">
                event_available
              </span>
              <p className="text-sm font-bold text-gray-800">
                لا توجد حصص مجدولة للمراقبة اليوم ({todayWeekday})
              </p>
              <p className="text-xs text-gray-500">
                يمكنك الانتقال لتبويب <strong>«المعلمون التابعون لي»</strong> أو <strong>«رادار الـ 60 يوماً»</strong>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {filteredTodayClasses.map(({ student, teacher, sessionTime }) => {
                const maxPkg = student.packageSessionsCount || 8;
                const cycleCount = student.currentCycleSessionsCount || 0;
                const formattedTime = formatCairoTime(sessionTime);
                const daysSinceObs = getDaysSinceLastObservation(student.lastObservationDate);
                const isVisitedRecently = daysSinceObs !== null && daysSinceObs <= 60;
                const teacherPhone = teacher?.phone || '';

                return (
                  <div
                    key={`live-${student.id}`}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3.5 w-full"
                  >
                    {/* Header: Teacher Name (NO truncation - full bold) & Student Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-[#EAF5F7] text-[#125862] font-bold flex items-center justify-center text-xs shrink-0 border border-[#1A7B88]/20">
                          {teacher?.initials || 'مع'}
                        </span>
                        <div className="min-w-0">
                          {/* Teacher Name shown fully without text-truncate */}
                          <h4 className="font-bold text-sm text-gray-900 leading-snug whitespace-normal">
                            {teacher?.name || 'معلم غير محدد'}
                          </h4>
                          <span className="text-[11px] text-gray-500 block mt-0.5">
                            {teacher?.circleName || 'حلقة القرآن الكريم'}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20 shrink-0">
                        الطالب: {student.name}
                      </span>
                    </div>

                    {/* Timing & WhatsApp Teacher Button */}
                    <div className="flex flex-col gap-2 text-xs text-gray-600">
                      {/* Session Time & Surah */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-gray-700 font-semibold">
                          <span className="material-symbols-outlined text-sm text-[#1A7B88]">schedule</span>
                          <span>{formattedTime}</span>
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <span className="material-symbols-outlined text-sm text-gray-400">menu_book</span>
                          <span>{student.surahProgress || 'حلقة القرآن'}</span>
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="font-mono text-[11px] text-[#125862] font-bold">
                          {cycleCount}/{maxPkg}
                        </span>
                      </div>

                      {/* Clean Teacher WhatsApp Button: [ واتساب المعلم ] with active green WhatsApp icon */}
                      <div className="flex items-center gap-2">
                        <a
                          href={getParentWhatsAppUrl(
                            teacherPhone,
                            student.name,
                            `السلام عليكم ورحمة الله وبركاته، شيخنا الفاضل ${teacher?.name || ''}، بخصوص حلقة اليوم للطالب ${student.name}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 text-emerald-950 transition-all text-xs font-bold shadow-2xs group cursor-pointer active:scale-98"
                          title={`محادثة واتساب مباشرة مع المعلم (${teacher?.name || ''})`}
                        >
                          <span className="w-4.5 h-4.5 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                            </svg>
                          </span>
                          <span>واتساب المعلم</span>
                        </a>

                        {teacher && (
                          <button
                            onClick={() => {
                              setEditingTeacherPhoneId(teacher.id);
                              setEditingTeacherPhoneValue(teacher.phone || '');
                            }}
                            className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
                            title="تعديل رقم هاتف المعلم في قاعدة البيانات"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 60-Day Audit Status Badge */}
                    {isVisitedRecently ? (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-[11px]">
                        <div className="flex items-center gap-1.5 text-emerald-950 font-bold truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="truncate">
                            تمت الزيارة بتاريخ {student.lastObservationDate} • منذ {daysSinceObs} يوماً
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenViewNote(student, teacher)}
                          className="text-emerald-900 hover:text-emerald-950 font-bold underline cursor-pointer text-[10px] shrink-0 mr-1"
                        >
                          الملاحظة 👁️
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/80 border border-rose-200/80 text-[11px]">
                        <div className="flex items-center gap-1.5 text-rose-950 font-bold truncate">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                          <span className="truncate">
                            {daysSinceObs === null
                              ? 'مستحق للمراقبة - لم يُزَر بعد ⚠️'
                              : `مستحق للمراقبة - لم يُزَر منذ ${daysSinceObs} يوماً ⚠️`}
                          </span>
                        </div>
                        <span className="text-[10px] text-rose-700 font-bold shrink-0">دورة 60 يوم</span>
                      </div>
                    )}

                    {/* Main Action Button */}
                    <button
                      onClick={() => handleOpenObservation(teacher, student, sessionTime)}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      <span>تسجيل ملاحظة مراقبة</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: المعلمون التابعون لي (Assigned Teachers) */}
      {activeTab === 'teachers' && (
        <div className="w-full">
          {filteredTeachers.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-2 w-full">
              <span className="material-symbols-outlined text-4xl text-gray-300">
                person_off
              </span>
              <p className="text-sm font-bold text-gray-800">لا يوجد معلمين مطابقين للبحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {filteredTeachers.map((teacher) => {
                const teacherStudents = visibleStudents.filter((s) => s.teacherId === teacher.id);
                const teacherTodayClasses = todayClasses.filter((c) => c.student.teacherId === teacher.id);

                // Teacher audit coverage
                let tVisited = 0;
                teacherStudents.forEach((s) => {
                  const d = getDaysSinceLastObservation(s.lastObservationDate);
                  if (d !== null && d <= 60) tVisited += 1;
                });
                const tNeeds = teacherStudents.length - tVisited;
                const tCoverageRate =
                  teacherStudents.length > 0 ? Math.round((tVisited / teacherStudents.length) * 100) : 0;

                const isEditingThisPhone = editingTeacherPhoneId === teacher.id;

                return (
                  <div
                    key={`teacher-${teacher.id}`}
                    className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3.5 w-full"
                  >
                    {/* Header: Teacher Name (NO truncation - full bold) */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-[#EAF5F7] text-[#125862] font-bold flex items-center justify-center text-sm shrink-0 border border-[#1A7B88]/20">
                          {teacher.initials || 'مع'}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm sm:text-base text-gray-900 leading-snug whitespace-normal">
                            {teacher.name}
                          </h4>
                          <span className="text-xs text-[#1A7B88] font-semibold block mt-0.5">
                            {teacher.circleName || 'حلقة القرآن الكريم'}
                          </span>
                        </div>
                      </div>

                      {tNeeds > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200 shrink-0">
                          🔴 {tNeeds} مستحق مراقبة
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 shrink-0">
                          🟢 100% مغطى
                        </span>
                      )}
                    </div>

                    {/* 60-Day Audit Mini Progress */}
                    <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-gray-600">تغطية مراقبة الـ 60 يوماً:</span>
                        <span className="font-mono text-[#125862] font-bold">
                          {tVisited} من {teacherStudents.length} طلاب ({tCoverageRate}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            tCoverageRate >= 80 ? 'bg-emerald-500' : tCoverageRate >= 50 ? 'bg-amber-500' : 'bg-[#1A7B88]'
                          }`}
                          style={{ width: `${tCoverageRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-1 border-y border-gray-100">
                      <div className="flex flex-col">
                        <span className="text-[11px] text-gray-500">الطلاب المسجلون</span>
                        <span className="font-bold text-gray-800 font-mono text-sm">
                          {teacherStudents.length} طلاب
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-gray-500">حصص اليوم</span>
                        <span className="font-bold text-[#125862] font-mono text-sm">
                          {teacherTodayClasses.length} حصص
                        </span>
                      </div>
                    </div>

                    {/* Teacher WhatsApp Button & Optional Phone Editor */}
                    <div className="flex flex-col gap-1.5">
                      {isEditingThisPhone ? (
                        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingTeacherPhoneValue}
                            onChange={(e) => setEditingTeacherPhoneValue(e.target.value)}
                            placeholder="مثال: 0583194463 أو 010..."
                            className="flex-1 h-8 px-2 rounded-lg bg-white border border-gray-300 text-xs font-mono"
                          />
                          <button
                            onClick={() => handleSaveTeacherPhone(teacher.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#1A7B88] text-white text-xs font-bold cursor-pointer"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingTeacherPhoneId(null)}
                            className="px-1.5 py-1 text-gray-400 hover:text-gray-700 text-xs cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <a
                            href={getParentWhatsAppUrl(
                              teacher.phone || '',
                              undefined,
                              `السلام عليكم ورحمة الله وبركاته، شيخنا الفاضل ${teacher.name}، نتواصل معكم من الإشراف التعليمي بأكاديمية المسلم الصغير.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 text-emerald-950 transition-all text-xs font-bold shadow-2xs group cursor-pointer active:scale-98"
                            title={`محادثة واتساب مباشرة مع المعلم (${teacher.name})`}
                          >
                            <span className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                              </svg>
                            </span>
                            <span>واتساب المعلم</span>
                          </a>

                          <button
                            onClick={() => {
                              setEditingTeacherPhoneId(teacher.id);
                              setEditingTeacherPhoneValue(teacher.phone || '');
                            }}
                            className="text-[11px] text-gray-400 hover:text-gray-700 underline cursor-pointer"
                            title="تعديل رقم هاتف المعلم"
                          >
                            تعديل الرقم
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-1 flex flex-col gap-2">
                      <button
                        onClick={() => handleInspectTeacherAudit(teacher.id)}
                        className="w-full py-2 px-3 rounded-xl bg-[#EAF5F7] border border-[#1A7B88]/20 text-[#125862] hover:bg-[#d9eff3] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">checklist</span>
                        <span>فحص طلاب الحلقة ورادار الـ 60 يوماً</span>
                      </button>

                      <button
                        onClick={() => handleOpenObservation(teacher)}
                        className="w-full py-2 px-3 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-98"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>تسجيل ملاحظة مراقبة للمعلم</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: رادار الـ 60 يوماً (Students & 60-Day Audit Cycle) */}
      {activeTab === 'students_radar' && (
        <div className="w-full flex flex-col gap-4">
          {/* 60-Day Audit Progress Banner */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#EAF5F7] text-[#125862] flex items-center justify-center text-base font-bold shrink-0 border border-[#1A7B88]/20">
                  <span className="material-symbols-outlined text-xl">verified_user</span>
                </span>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900">
                    رادار المراقبة الميدانية (دورة الـ 60 يوماً)
                    {selectedTeacherFilter !== 'all' && (
                      <span className="text-[#1A7B88] mr-1">
                        • {visibleTeachers.find((t) => t.id === selectedTeacherFilter)?.name}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    تغطية المراقبة خلال شهرين: تم الدخول لـ{' '}
                    <strong className="text-[#125862] font-mono">{auditMetrics.visited}</strong> من{' '}
                    <strong className="text-gray-800 font-mono">{auditMetrics.total}</strong> طالباً • نسبة
                    التغطية <strong className="text-[#125862] font-mono">{auditMetrics.rate}%</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedTeacherFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedTeacherFilter('all')}
                    className="text-[11px] text-gray-500 hover:text-gray-800 underline cursor-pointer"
                  >
                    عرض كل المعلمين
                  </button>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                    auditMetrics.rate >= 80
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      : auditMetrics.rate >= 50
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : 'bg-rose-100 text-rose-900 border border-rose-200'
                  }`}
                >
                  {auditMetrics.rate}% إنجاز التغطية
                </span>
              </div>
            </div>

            {/* Progress bar line */}
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  auditMetrics.rate >= 80
                    ? 'bg-emerald-500'
                    : auditMetrics.rate >= 50
                    ? 'bg-amber-500'
                    : 'bg-[#1A7B88]'
                }`}
                style={{ width: `${auditMetrics.rate}%` }}
              />
            </div>

            {/* Quick Filter Buttons: [الكل] [🔴 المستحقون للزيارة أولاً] [🟢 تمت زيارتهم مؤخراً] */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                onClick={() => setAuditFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  auditFilter === 'all'
                    ? 'bg-[#125862] text-white shadow-xs'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>الكل</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/15">
                  {auditMetrics.total}
                </span>
              </button>

              <button
                onClick={() => setAuditFilter('needs_audit')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  auditFilter === 'needs_audit'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <span>🔴 المستحقون للزيارة</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/15">
                  {auditMetrics.needs}
                </span>
              </button>

              <button
                onClick={() => setAuditFilter('visited_recently')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  auditFilter === 'visited_recently'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <span>🟢 تمت زيارتهم مؤخراً</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/15">
                  {auditMetrics.visited}
                </span>
              </button>
            </div>
          </div>

          {/* Cards Grid: Rendered with Needs Visit (🔴) First! */}
          {sortedAndFilteredRadarStudents.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-2 w-full">
              <span className="material-symbols-outlined text-4xl text-gray-300">
                task_alt
              </span>
              <p className="text-sm font-bold text-gray-800">
                {auditFilter === 'needs_audit'
                  ? 'رائع! لا يوجد طلاب مستحقون لزيارة المراقبة حالياً'
                  : 'لا يوجد طلاب مطابقين للتصفية المحددة'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {sortedAndFilteredRadarStudents.map((student) => {
                const teacher = getTeacherById(student.teacherId);
                const daysReport = getDaysSinceLastReport(student.lastReportDate);
                const isReportOverdue = daysReport > 25;
                const daysObs = getDaysSinceLastObservation(student.lastObservationDate);
                const isVisitedRecently = daysObs !== null && daysObs <= 60;
                const teacherPhone = teacher?.phone || '';

                return (
                  <div
                    key={`student-audit-${student.id}`}
                    className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between gap-3.5 w-full ${
                      !isVisitedRecently
                        ? 'border-rose-200 shadow-xs ring-1 ring-rose-200/60'
                        : 'border-emerald-200 shadow-xs'
                    }`}
                  >
                    {/* Header: Student Name & Teacher Name (NO truncation - full bold) */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 leading-snug whitespace-normal">
                          {student.name}
                        </h4>
                        <span className="text-xs text-gray-600 block mt-0.5 leading-snug whitespace-normal">
                          المعلم: <strong className="text-gray-900 font-semibold">{teacher?.name || 'الشيخ محمد أبو شتا'}</strong> • {teacher?.circleName || 'حلقة النور'}
                        </span>
                      </div>

                      {/* 60-day Status Top Ribbon */}
                      {isVisitedRecently ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 shrink-0">
                          🟢 تمت زيارته
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200 shrink-0 animate-pulse">
                          🔴 مستحق للمراقبة
                        </span>
                      )}
                    </div>

                    {/* Progress details */}
                    <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>مسار الحفظ:</span>
                        <span className="font-semibold text-gray-800 truncate max-w-[170px]">
                          {student.surahProgress || 'حلقة القرآن'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>دورة الحصص:</span>
                        <span className="font-mono text-[#125862] font-bold">
                          {student.currentCycleSessionsCount || 0} من {student.packageSessionsCount || 8} حصص
                        </span>
                      </div>
                    </div>

                    {/* Teacher WhatsApp direct button without dummy phone numbers */}
                    <div className="flex items-center">
                      <a
                        href={getParentWhatsAppUrl(
                          teacherPhone,
                          student.name,
                          `السلام عليكم ورحمة الله وبركاته، شيخنا الفاضل ${teacher?.name || ''}، بخصوص حلقة الطالب ${student.name}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 text-emerald-950 transition-all text-xs font-bold shadow-2xs group cursor-pointer active:scale-98"
                        title={`محادثة واتساب مباشرة مع المعلم (${teacher?.name || ''})`}
                      >
                        <span className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                          </svg>
                        </span>
                        <span>واتساب المعلم</span>
                      </a>
                    </div>

                    {/* 60-Day Audit Status Badge on Card */}
                    {isVisitedRecently ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-950 font-bold truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="truncate">
                            تمت الزيارة بتاريخ {student.lastObservationDate} • منذ {daysObs} يوماً
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenViewNote(student, teacher)}
                          className="text-emerald-900 hover:text-emerald-950 font-bold underline cursor-pointer text-[11px] shrink-0 mr-1 flex items-center gap-0.5"
                        >
                          <span>الملاحظة</span>
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/90 border border-rose-200 text-xs">
                        <div className="flex items-center gap-1.5 text-rose-950 font-bold truncate">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                          <span className="truncate">
                            {daysObs === null
                              ? 'مستحق للمراقبة - لم يُزَر بعد ⚠️'
                              : `مستحق للمراقبة - لم يُزَر منذ ${daysObs} يوماً ⚠️`}
                          </span>
                        </div>
                        <span className="text-[10px] text-rose-700 font-bold font-mono shrink-0">
                          {daysObs !== null ? `${daysObs}/60 يوم` : 'جديد'}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-1 flex flex-col gap-2">
                      {/* Log Observation Button (Resets the 60-day counter to 0 immediately) */}
                      <button
                        onClick={() => handleOpenObservation(teacher, student)}
                        className="w-full py-2 px-3 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-98"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>تسجيل ملاحظة مراقبة وتصفير العداد</span>
                      </button>

                      {/* Reminder Button if report overdue */}
                      {isReportOverdue && teacherPhone && (
                        <button
                          onClick={() => teacher && handleRemindTeacher(teacher, student)}
                          className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm text-emerald-600">send</span>
                          <span>تذكير المعلم بالتقرير عبر واتساب</span>
                        </button>
                      )}

                      {/* Add Report Button */}
                      {onAddReport && (
                        <button
                          onClick={() => onAddReport(student)}
                          className="w-full py-1.5 px-3 rounded-xl bg-[#EAF5F7] border border-[#1A7B88]/20 text-[#125862] hover:bg-[#d9eff3] text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">assignment_add</span>
                          <span>تسجيل تقرير للطالب</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Observation Modal */}
      <RecordObservationModal
        isOpen={isObservationModalOpen}
        onClose={() => {
          setIsObservationModalOpen(false);
          setSelectedObservationTeacher(undefined);
          setSelectedObservationStudent(undefined);
          setSelectedSessionTime(undefined);
        }}
        teacher={selectedObservationTeacher}
        student={selectedObservationStudent}
        sessionTime={selectedSessionTime}
      />

      {/* View Observation Note Modal */}
      <ViewObservationNoteModal
        isOpen={isViewNoteModalOpen}
        onClose={() => {
          setIsViewNoteModalOpen(false);
          setSelectedViewNoteStudent(undefined);
          setSelectedViewNoteTeacher(undefined);
        }}
        student={selectedViewNoteStudent}
        teacher={selectedViewNoteTeacher}
        onNewObservation={() => {
          if (selectedViewNoteStudent) {
            handleOpenObservation(selectedViewNoteTeacher, selectedViewNoteStudent);
          }
        }}
      />
    </div>
  );
};
