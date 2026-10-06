import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Teacher } from '../../types';
import {
  getParentWhatsAppUrl,
  getTeacherReminderWhatsAppUrl,
  formatCairoTime,
} from '../../utils/whatsapp';
import { RecordObservationModal, ObservationData } from '../modals/RecordObservationModal';
import { ViewObservationNoteModal } from '../modals/ViewObservationNoteModal';
import { SupervisorBottomNav, SupervisorTab } from './SupervisorBottomNav';

interface EducationalSupervisorViewProps {
  onAddReport?: (student: Student) => void;
  onEditStudent?: (student: Student) => void;
  onManageVacation?: (student: Student) => void;
  onOpenActivityLog?: () => void;
  onAddStudent?: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'students' | 'teachers' | 'reports') => void;
}

type AuditFilter = 'all' | 'needs_audit' | 'visited_recently';

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

// Normalize Arabic day names for reliable schedule comparison
function normalizeDayName(day: string): string {
  return day
    .replace(/^يوم\s+/, '')
    .trim()
    .replace(/إ/g, 'ا')
    .replace(/أ/g, 'ا')
    .replace(/آ/g, 'ا');
}

// Extract time for a specific day from student schedule, respecting per-day independent time
export function getStudentDayTime(student: Student, weekday: string): string {
  if (student.daySchedule) {
    if (student.daySchedule[weekday]) {
      return student.daySchedule[weekday];
    }
    const norm = normalizeDayName(weekday);
    for (const [key, val] of Object.entries(student.daySchedule)) {
      if (normalizeDayName(key) === norm && val) {
        return val;
      }
    }
  }
  return student.sessionTime || '';
}

// Parse session time to minutes for chronological ordering
function parseSessionTimeToMinutes(raw?: string): number {
  if (!raw) return 9999;
  const str = raw.trim();
  const isPM = str.includes('م') || str.toLowerCase().includes('pm');
  const isAM = str.includes('ص') || str.toLowerCase().includes('am');

  const match = str.match(/(\d{1,2})[:.]?(\d{2})?/);
  if (!match) return 9999;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;

  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;

  return hour * 60 + minute;
}

export const getDaysSinceLastObservation = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

export const getNeedsSummaryText = (needs: number): string => {
  if (needs === 0) return 'جميع الطلاب تمت زيارتهم';
  if (needs === 1) return 'طالب واحد مستحق للزيارة';
  if (needs === 2) return 'طالبان مستحقان للزيارة';
  if (needs >= 3 && needs <= 10) return `${needs} طلاب مستحقون للزيارة`;
  return `${needs} طالباً مستحقاً للزيارة`;
};

export const getVisitedSummaryText = (visited: number, total: number): string => {
  if (total === 0) return 'لا يوجد طلاب للمتابعة';
  const studentWord = total === 1 ? 'طالب' : total === 2 ? 'طالبين' : total <= 10 ? 'طلاب' : 'طالباً';
  return `تمت زيارة ${visited} من ${total} ${studentWord}`;
};

export const EducationalSupervisorView: React.FC<EducationalSupervisorViewProps> = ({
  onOpenActivityLog,
  onNavigateTab,
}) => {
  const {
    currentUser,
    visibleStudents,
    visibleTeachers,
    getTeacherById,
    addActivityLog,
    updateTeacher,
    isSuperAdmin,
    previewRole,
    setPreviewRole,
    isSupabaseConnected,
    isSyncing,
    fetchFromSupabase,
    logout,
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
  const [selectedExistingObservation, setSelectedExistingObservation] = useState<ObservationData | undefined>(undefined);

  // Observations Modal state (Single Student History or Comprehensive Log)
  const [isObservationsModalOpen, setIsObservationsModalOpen] = useState(false);
  const [observationsModalStudentId, setObservationsModalStudentId] = useState<string | undefined>(undefined);
  const [observationsModalStudent, setObservationsModalStudent] = useState<Student | undefined>(undefined);
  const [observationsModalTeacher, setObservationsModalTeacher] = useState<Teacher | undefined>(undefined);

  // Quick Teacher Phone Editing State
  const [editingTeacherPhoneId, setEditingTeacherPhoneId] = useState<string | null>(null);
  const [editingTeacherPhoneValue, setEditingTeacherPhoneValue] = useState<string>('');

  // Quick Action notification toast
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  // Cairo Date
  const { weekday: todayWeekday, formattedDate: todayFormattedDate } = useMemo(
    () => getCairoDateDetails(),
    []
  );

  // Network / Fetch error state for resilient error differentiation
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleRefreshData = async () => {
    try {
      setFetchError(null);
      await fetchFromSupabase();
    } catch (err) {
      setFetchError('تعذر تحديث جداول الحصص، يرجى المحاولة مرة أخرى.');
    }
  };

  const isDataLoading = isSyncing && visibleStudents.length === 0;
  const isDataError = (!isSupabaseConnected && visibleStudents.length === 0) || Boolean(fetchError);

  // 1. Live Hub: All classes scheduled for today across this supervisor's teachers (Chronologically sorted)
  const todayClasses = useMemo(() => {
    const normalizedToday = normalizeDayName(todayWeekday);
    const supervisorTeacherIds = new Set(visibleTeachers.map((t) => t.id));

    const list = visibleStudents
      .filter((s) => {
        if (s.status === 'vacation') return false;
        // Restrict to teachers assigned to this supervisor when visibleTeachers are present
        if (supervisorTeacherIds.size > 0 && !supervisorTeacherIds.has(s.teacherId)) {
          return false;
        }
        if (s.scheduleDays && s.scheduleDays.length > 0) {
          return s.scheduleDays.some((d) => normalizeDayName(d) === normalizedToday);
        }
        if (s.daySchedule && Object.keys(s.daySchedule).length > 0) {
          return Object.keys(s.daySchedule).some((d) => normalizeDayName(d) === normalizedToday);
        }
        return false;
      })
      .map((student) => {
        const teacher = getTeacherById(student.teacherId);
        const dayTime = getStudentDayTime(student, todayWeekday);
        return {
          student,
          teacher,
          sessionTime: dayTime || student.sessionTime || '04:00 م',
        };
      });

    // Chronologically sort by session time
    return list.sort((a, b) => {
      return parseSessionTimeToMinutes(a.sessionTime) - parseSessionTimeToMinutes(b.sessionTime);
    });
  }, [visibleStudents, visibleTeachers, todayWeekday, getTeacherById]);

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

  // Today metrics synchronized with current filter & search
  const filteredTodayMetrics = useMemo(() => {
    const total = filteredTodayClasses.length;
    let visited = 0;
    filteredTodayClasses.forEach(({ student }) => {
      const days = getDaysSinceLastObservation(student.lastObservationDate);
      if (days !== null && days <= 60) {
        visited += 1;
      }
    });
    const needs = total - visited;
    return { total, visited, needs };
  }, [filteredTodayClasses]);

  // Target pool of students for the 60-day audit cycle
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

  // Filtered and Sorted students for 60-Day Audit Radar tab
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

      const isVisited = daysObs !== null && daysObs <= 60;
      let matchesAuditFilter = true;
      if (auditFilter === 'needs_audit') {
        matchesAuditFilter = !isVisited;
      } else if (auditFilter === 'visited_recently') {
        matchesAuditFilter = isVisited;
      }

      return matchesSearch && matchesTeacher && matchesAuditFilter;
    });

    return filtered.sort((a, b) => {
      const daysA = getDaysSinceLastObservation(a.lastObservationDate);
      const daysB = getDaysSinceLastObservation(b.lastObservationDate);

      const isVisitedA = daysA !== null && daysA <= 60;
      const isVisitedB = daysB !== null && daysB <= 60;

      if (!isVisitedA && isVisitedB) return -1;
      if (isVisitedA && !isVisitedB) return 1;

      return (daysB ?? 999) - (daysA ?? 999);
    });
  }, [visibleStudents, searchQuery, selectedTeacherFilter, auditFilter, getTeacherById]);

  // Filtered Teachers
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

  // Handlers
  const handleOpenObservation = (
    teacher?: Teacher,
    student?: Student,
    time?: string,
    existing?: ObservationData
  ) => {
    setSelectedObservationTeacher(teacher);
    setSelectedObservationStudent(student);
    setSelectedSessionTime(time);
    setSelectedExistingObservation(existing);
    setIsObservationModalOpen(true);
  };

  const handleOpenStudentVisitsHistory = (studentId: string, student?: Student, teacher?: Teacher) => {
    setObservationsModalStudentId(studentId);
    setObservationsModalStudent(student || visibleStudents.find((s) => s.id === studentId));
    setObservationsModalTeacher(teacher || (student ? getTeacherById(student.teacherId) : undefined));
    setIsObservationsModalOpen(true);
  };

  const handleOpenComprehensiveObservations = () => {
    setObservationsModalStudentId(undefined);
    setObservationsModalStudent(undefined);
    setObservationsModalTeacher(undefined);
    setIsObservationsModalOpen(true);
  };

  const handleOpenViewNote = (student: Student, teacher?: Teacher) => {
    handleOpenStudentVisitsHistory(student.id, student, teacher);
  };

  const handleInspectTeacherAudit = (teacherId: string) => {
    setSelectedTeacherFilter(teacherId);
    setActiveTab('students_radar');
    setAuditFilter('all');
  };

  const handleSaveTeacherPhone = async (teacherId: string) => {
    const newPhone = editingTeacherPhoneValue.trim();
    if (!newPhone) return;

    await updateTeacher(teacherId, { phone: newPhone });
    setEditingTeacherPhoneId(null);
    setEditingTeacherPhoneValue('');
    setActionAlert('تم تحديث رقم هاتف المعلم بنجاح.');
    setTimeout(() => setActionAlert(null), 3500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-3.5 sm:gap-4 pb-36 sm:pb-16 pt-1 font-sans bg-[#F5F5F7]" dir="rtl">
      {/* 1. Super Admin Role Preview Indicator */}
      {isSuperAdmin && previewRole === 'sub_supervisor' && (
        <div className="px-3.5 py-2 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-2xs gap-2">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-sm text-amber-600">visibility</span>
            <span>معاينة المشرف التعليمي ({currentUser.name})</span>
          </div>
          <button
            onClick={() => setPreviewRole(null)}
            className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            العودة للمدير
          </button>
        </div>
      )}

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

      {/* Syncing Indicator */}
      {isSyncing && (
        <div className="p-2.5 rounded-xl bg-[#EAF5F7] border border-[#1A7B88]/20 text-[#125862] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-[#1A7B88] border-t-transparent animate-spin" />
            <span>جارٍ مزامنة البيانات وتحديث الحصص...</span>
          </div>
        </div>
      )}

      {/* 2. Desktop Tab Switcher (Quiet & Minimal on large screens; hidden on mobile) */}
      <div className="hidden sm:flex items-center justify-between border-b border-gray-100 pb-2.5">
        <div className="inline-flex items-center gap-1.5 bg-[#F4F9FA] p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab('today_observation')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'today_observation'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span className="material-symbols-outlined text-base">calendar_today</span>
            <span>حصص اليوم</span>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'today_observation'
                  ? 'bg-[#1A7B88] text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {todayClasses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('teachers')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'teachers'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span className="material-symbols-outlined text-base">badge</span>
            <span>معلموني</span>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'teachers'
                  ? 'bg-[#1A7B88] text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {visibleTeachers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('students_radar')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'students_radar'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span className="material-symbols-outlined text-base">verified_user</span>
            <span>المتابعة (60 يوماً)</span>
            {auditMetrics.needs > 0 ? (
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                {auditMetrics.needs}
              </span>
            ) : (
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'students_radar'
                    ? 'bg-[#1A7B88] text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {auditMetrics.total}
              </span>
            )}
          </button>
        </div>

        {/* Refresh data button */}
        <button
          onClick={() => fetchFromSupabase()}
          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-[#125862] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          title="تحديث البيانات"
        >
          <span className="material-symbols-outlined text-base text-[#1A7B88]">sync</span>
          <span>تحديث</span>
        </button>
      </div>

      {/* TAB 1: حصص اليوم (Today's Scheduled Sessions) */}
      {activeTab === 'today_observation' && (
        <div className="flex flex-col gap-3 pb-8">
          {/* Header & Cairo Timezone Note for Today's Sessions */}
          <div className="flex items-baseline justify-between flex-wrap gap-1 px-0.5">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              المتابعة اليومية
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              {todayWeekday}، {todayFormattedDate} · مواعيد الحصص بتوقيت القاهرة
            </p>
          </div>

          {/* Differentiate Error & Loading States from Empty Data */}
          {isDataError ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 border border-rose-200 shadow-xs text-center flex flex-col items-center justify-center gap-3 w-full mb-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-2xl">cloud_off</span>
              </div>
              <h3 className="font-bold text-base text-gray-900">
                تعذر تحميل جداول الحصص في الوقت الحالي
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-sm leading-relaxed">
                حدث خطأ أثناء جلب بيانات الجداول من الخادم. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.
              </p>
              <button
                type="button"
                onClick={handleRefreshData}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98 mt-2 mb-1"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>إعادة المحاولة</span>
              </button>
            </div>
          ) : isDataLoading ? (
            <div className="bg-white rounded-2xl p-8 sm:p-12 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-3 w-full mb-8">
              <div className="w-10 h-10 border-3 border-[#1A7B88] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-gray-800">جاري تحميل جداول الحصص اليومية...</p>
            </div>
          ) : (
            <>
              {/* Compact Single-Row Summary Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 py-2.5 px-3 sm:px-4 rounded-xl bg-white border border-gray-100 shadow-2xs text-xs sm:text-sm font-medium text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {searchQuery.trim() || selectedTeacherFilter !== 'all'
                      ? 'حصص اليوم المطابقة:'
                      : 'حصص اليوم المجدولة:'}
                  </span>
                  <span className="font-bold text-[#125862] font-mono text-sm sm:text-base">
                    {filteredTodayMetrics.total}
                    {(searchQuery.trim() || selectedTeacherFilter !== 'all') && (
                      <span className="text-xs text-gray-400 font-sans mr-1 font-normal">
                        (من إجمالي {todayClasses.length})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>
                      تمت زيارة الطالب خلال آخر 60 يومًا:{' '}
                      <strong className="font-mono font-bold text-emerald-950">{filteredTodayMetrics.visited}</strong>
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-800 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span>
                      مستحق للمتابعة:{' '}
                      <strong className="font-mono font-bold text-amber-950">{filteredTodayMetrics.needs}</strong>
                    </span>
                  </span>
                </div>
              </div>

              {/* Search & Teacher Filter Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full">
                {/* Search Input */}
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute right-3.5 top-3 text-gray-400 text-lg pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن معلم أو طالب"
                    className="w-full min-h-[44px] pr-10 pl-8 rounded-xl bg-white text-base text-gray-900 border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 shadow-2xs placeholder:text-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-2.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                      aria-label="مسح البحث"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Teacher Filter Dropdown (Default: كل معلموني) */}
                {visibleTeachers.length > 0 && (
                  <div className="w-full sm:w-auto shrink-0">
                    <select
                      value={selectedTeacherFilter}
                      onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                      className="w-full sm:w-auto min-h-[44px] px-3 sm:px-4 rounded-xl bg-white border border-gray-200 text-xs sm:text-sm text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 shadow-2xs cursor-pointer"
                      aria-label="فلتر المعلم"
                    >
                      <option value="all">كل معلموني ({visibleTeachers.length})</option>
                      {visibleTeachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Classes Cards List or Empty States */}
              {filteredTodayClasses.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 sm:p-10 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-3 w-full mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center shadow-2xs">
                    <span className="material-symbols-outlined text-2xl">
                      {searchQuery.trim() ? 'search_off' : 'event_busy'}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-gray-900">
                    {searchQuery.trim()
                      ? 'لا توجد نتائج مطابقة'
                      : selectedTeacherFilter !== 'all'
                      ? 'لا توجد حصص مجدولة اليوم لهذا المعلم'
                      : 'لا توجد حصص مجدولة اليوم لمعلميك'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 max-w-sm leading-relaxed">
                    {searchQuery.trim()
                      ? 'لم نتمكن من العثور على أي حصة تطابق نص البحث والفلتر المحدد.'
                      : selectedTeacherFilter !== 'all'
                      ? `المعلم المحدد ليس لديه أي حصص مجدولة لهذا اليوم (${todayWeekday}).`
                      : `لا توجد أي حلقات قرآنية مجدولة اليوم (${todayWeekday}) في جداول المعلمين التابعين لإشرافك.`}
                  </p>

                  {/* Filter Action Buttons */}
                  {searchQuery.trim() || selectedTeacherFilter !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedTeacherFilter('all');
                      }}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#EAF5F7] text-[#125862] hover:bg-[#d9eff3] font-bold text-xs sm:text-sm transition-colors cursor-pointer mt-2 mb-1 flex items-center gap-1.5 active:scale-98"
                    >
                      <span className="material-symbols-outlined text-base">filter_alt_off</span>
                      <span>مسح الفلاتر</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('teachers')}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98 mt-2 mb-1"
                    >
                      <span className="material-symbols-outlined text-base">badge</span>
                      <span>عرض قائمة معلموني</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full pb-4">
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
                        className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3"
                      >
                        {/* Card Header: Student Name & Package Progress */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base text-gray-900 leading-snug whitespace-normal break-words">
                              {student.name}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
                              معلم: {teacher?.name || 'معلم غير محدد'} · {teacher?.circleName || 'حلقة القرآن'}
                            </p>
                          </div>

                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20 shrink-0 font-mono">
                            {cycleCount} من {maxPkg} حصص
                          </span>
                        </div>

                        {/* Timing & Surah */}
                        <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <span className="material-symbols-outlined text-sm text-[#1A7B88] shrink-0">
                              schedule
                            </span>
                            <span className="font-semibold">{formattedTime}</span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-500 truncate">{student.surahProgress || 'حلقة القرآن الكريم'}</span>
                          </div>

                          {/* 60-Day Audit Status Badge - Clarified to avoid confusion with today's session */}
                          {isVisitedRecently ? (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-[11px]">
                              <div className="flex items-center gap-1.5 text-emerald-950 font-bold truncate">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                                <span className="truncate">
                                  تمت زيارة الطالب خلال آخر 60 يومًا (منذ {daysSinceObs === 0 ? 'اليوم' : daysSinceObs === 1 ? 'يوم' : daysSinceObs === 2 ? 'يومين' : `${daysSinceObs} يوماً`})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenViewNote(student, teacher)}
                                className="text-emerald-900 hover:text-emerald-950 font-bold underline cursor-pointer text-[10px] shrink-0 mr-1 flex items-center gap-0.5"
                              >
                                <span className="material-symbols-outlined text-xs">visibility</span>
                                <span>عرض الملاحظة</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/80 border border-rose-200/80 text-[11px]">
                              <div className="flex items-center gap-1.5 text-rose-950 font-bold truncate">
                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                                <span className="truncate">
                                  {daysSinceObs === null
                                    ? 'مستحق للمتابعة · لم يُزَر بعد'
                                    : `مستحق للمتابعة · لم يُزَر منذ ${daysSinceObs} يوماً`}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-0.5">
                          {/* Record Observation Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenObservation(teacher, student, formattedTime)}
                            className="min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                            <span>تسجيل مراقبة للحصة</span>
                          </button>

                          {/* WhatsApp Teacher Link */}
                          {teacherPhone && (
                            <a
                              href={getParentWhatsAppUrl(
                                teacherPhone,
                                student.name,
                                `السلام عليكم ورحمة الله وبركاته، شيخنا الفاضل ${teacher?.name || ''}، بخصوص حلقة اليوم للطالب ${student.name}.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 text-emerald-900 transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs"
                              title={`محادثة واتساب مع المعلم (${teacher?.name || ''})`}
                              aria-label={`واتساب المعلم ${teacher?.name || ''}`}
                            >
                              <svg className="w-5 h-5 fill-current text-[#25D366]" viewBox="0 0 24 24">
                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.073.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB 2: معلموني (Assigned Teachers) */}
      {activeTab === 'teachers' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2 px-0.5">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              المعلمون التابعون لإشرافك ({visibleTeachers.length})
            </h2>
          </div>

          {filteredTeachers.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-xs text-center flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-4xl text-gray-300">person_off</span>
              <p className="text-sm font-bold text-gray-800">لا يوجد معلمين مطابقين للبحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTeachers.map((teacher) => {
                const teacherStudents = visibleStudents.filter((s) => s.teacherId === teacher.id);
                const hasStudents = teacherStudents.length > 0;
                let tVisited = 0;
                teacherStudents.forEach((s) => {
                  const d = getDaysSinceLastObservation(s.lastObservationDate);
                  if (d !== null && d <= 60) tVisited += 1;
                });
                const tNeeds = hasStudents ? teacherStudents.length - tVisited : 0;
                const tCoverageRate = hasStudents
                  ? Math.round((tVisited / teacherStudents.length) * 100)
                  : 0;

                const isEditingThisPhone = editingTeacherPhoneId === teacher.id;

                return (
                  <div
                    key={`teacher-${teacher.id}`}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-[#EAF5F7] text-[#125862] font-bold flex items-center justify-center text-sm shrink-0 border border-[#1A7B88]/20">
                          {teacher.initials || 'مع'}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-bold text-base text-gray-900 leading-snug whitespace-normal break-words">
                            {teacher.name}
                          </h4>
                          <span className="text-xs text-[#1A7B88] font-semibold block mt-0.5">
                            {teacher.circleName || 'حلقة القرآن الكريم'}
                          </span>
                        </div>
                      </div>

                      {!hasStudents ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 shrink-0">
                          لا يوجد طلاب
                        </span>
                      ) : tNeeds > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shrink-0 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>{tNeeds} مستحق</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>مغطى بالكامل</span>
                        </span>
                      )}
                    </div>

                    {/* Coverage Status: Accurate coverage line and progress bar */}
                    {!hasStudents ? (
                      <div className="text-xs text-gray-500 font-medium py-1">
                        لا يوجد طلاب للمتابعة
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 py-0.5">
                        <div className="flex items-center justify-between text-xs text-gray-700 font-medium">
                          <span>
                            تمت متابعة <strong className="font-mono text-[#125862] font-bold">{tVisited}</strong> من{' '}
                            <strong className="font-mono font-bold text-gray-900">{teacherStudents.length}</strong> ·{' '}
                            مستحقون <strong className={`font-mono font-bold ${tNeeds > 0 ? 'text-rose-700' : 'text-gray-600'}`}>{tNeeds}</strong>
                          </span>
                          <span className="font-mono font-bold text-[#125862] text-[11px]">
                            {tCoverageRate}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              tCoverageRate >= 80 ? 'bg-emerald-500' : tCoverageRate >= 50 ? 'bg-amber-500' : 'bg-[#1A7B88]'
                            }`}
                            style={{ width: `${tCoverageRate}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Phone Edit / Info in a Small Line */}
                    <div className="flex items-center justify-between text-xs py-1 border-t border-gray-100 text-gray-600">
                      <span className="text-gray-500 text-[11px]">الهاتف:</span>
                      {isEditingThisPhone ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingTeacherPhoneValue}
                            onChange={(e) => setEditingTeacherPhoneValue(e.target.value)}
                            className="h-8 px-2 rounded-lg bg-white border border-gray-300 text-xs font-mono"
                          />
                          <button
                            onClick={() => handleSaveTeacherPhone(teacher.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#1A7B88] text-white text-xs font-bold cursor-pointer"
                          >
                            حفظ
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {teacher.phone ? (
                            <a
                              href={getTeacherReminderWhatsAppUrl(teacher.phone, teacher.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[#125862] hover:underline"
                              title="مراسلة المعلم عبر واتساب"
                            >
                              <span className="font-mono font-bold text-gray-800" dir="ltr">{teacher.phone}</span>
                              <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-[10px] shadow-2xs">
                                <span className="material-symbols-outlined text-xs">chat</span>
                              </span>
                            </a>
                          ) : (
                            <span className="font-mono text-gray-400">—</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeacherPhoneId(teacher.id);
                              setEditingTeacherPhoneValue(teacher.phone || '');
                            }}
                            className="text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
                            title="تعديل الهاتف"
                          >
                            <span className="material-symbols-outlined text-xs">edit</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions: Shortened buttons with full min-h-[44px] */}
                    <div className="pt-0.5 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleInspectTeacherAudit(teacher.id)}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-[#EAF5F7] border border-[#1A7B88]/20 text-[#125862] hover:bg-[#d9eff3] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">checklist</span>
                        <span>متابعة الطلاب</span>
                      </button>

                      <button
                        onClick={() => handleOpenObservation(teacher)}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer active:scale-98"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>مراقبة المعلم</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: المتابعة (iOS-Inspired Clean Follow-Up Tab) */}
      {activeTab === 'students_radar' && (
        <div className="flex flex-col gap-3 font-sans" dir="rtl">
          {/* 1. Screen Header */}
          <div className="flex flex-col gap-1 px-0.5">
            <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
              المتابعة
            </h2>
            <p className="text-xs sm:text-sm text-[#62626A] font-normal">
              زيارات الطلاب خلال آخر ٦٠ يومًا
            </p>

            {/* Standalone Teacher Filter Line if active */}
            {selectedTeacherFilter !== 'all' && (
              <div className="mt-1.5 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-[#E5E5EA] text-xs text-[#1D1D1F]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-base text-[#1A7B88]">person</span>
                  <span className="text-[#62626A]">المعلم:</span>
                  <span className="font-bold truncate">
                    {visibleTeachers.find((t) => t.id === selectedTeacherFilter)?.name || 'غير محدد'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTeacherFilter('all')}
                  className="text-[#1A7B88] hover:text-[#125862] font-bold text-xs shrink-0 cursor-pointer flex items-center gap-1 hover:underline"
                >
                  <span>عرض كل المعلمين</span>
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Compact iOS-Style Coverage Summary */}
          <div className="bg-white rounded-2xl p-4 border border-[#E5E5EA] shadow-none flex flex-col gap-2.5">
            {auditMetrics.total === 0 ? (
              <div className="text-center py-2">
                <p className="text-sm font-medium text-[#62626A]">لا يوجد طلاب للمتابعة</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                  <span className="font-bold text-[#1D1D1F]">
                    {getVisitedSummaryText(auditMetrics.visited, auditMetrics.total)}
                  </span>
                  <span className="font-medium text-[#62626A]">
                    {getNeedsSummaryText(auditMetrics.needs)}
                  </span>
                </div>

                {/* Single Thin Progress Bar without percentage duplication */}
                <div className="w-full bg-[#E5E5EA] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1A7B88] rounded-full transition-all duration-300"
                    style={{ width: `${auditMetrics.rate}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {/* 3. Search Bar and iOS Segmented Control */}
          <div className="flex flex-col gap-2.5">
            {/* Clean iOS Search Input */}
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو المعلم أو السورة..."
                className="w-full bg-[#E5E5EA]/60 hover:bg-[#E5E5EA]/80 focus:bg-white pr-9 pl-9 py-2 rounded-xl text-xs sm:text-sm text-[#1D1D1F] placeholder-[#8E8E93] border border-transparent focus:border-[#1A7B88]/40 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  title="مسح البحث"
                >
                  <span className="material-symbols-outlined text-base">cancel</span>
                </button>
              )}
            </div>

            {/* iOS Segmented Control with Smooth Sliding Indicator */}
            <div className="relative p-1 rounded-xl bg-[#E5E5EA]/75 flex items-center select-none overflow-hidden" dir="rtl">
              {/* Sliding Active Pill Background */}
              <div
                className="absolute top-1 bottom-1 rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.06)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{
                  width: 'calc((100% - 8px) / 3)',
                  right:
                    auditFilter === 'all'
                      ? '4px'
                      : auditFilter === 'needs_audit'
                      ? 'calc(4px + (100% - 8px) / 3)'
                      : 'calc(4px + (100% - 8px) * 2 / 3)',
                }}
              />

              <button
                type="button"
                onClick={() => setAuditFilter('all')}
                className={`relative z-10 flex-1 min-h-[34px] py-1.5 px-2 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 ${
                  auditFilter === 'all'
                    ? 'text-[#1D1D1F]'
                    : 'text-[#62626A] hover:text-[#1D1D1F]'
                }`}
              >
                <span>الكل</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full transition-colors duration-200 ${
                    auditFilter === 'all' ? 'bg-gray-100 text-[#1D1D1F]' : 'text-[#8E8E93]'
                  }`}
                >
                  {auditMetrics.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAuditFilter('needs_audit')}
                className={`relative z-10 flex-1 min-h-[34px] py-1.5 px-2 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 ${
                  auditFilter === 'needs_audit'
                    ? 'text-[#1D1D1F]'
                    : 'text-[#62626A] hover:text-[#1D1D1F]'
                }`}
              >
                <span>مستحقون</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full transition-colors duration-200 ${
                    auditFilter === 'needs_audit' ? 'bg-rose-50 text-rose-700' : 'text-[#8E8E93]'
                  }`}
                >
                  {auditMetrics.needs}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAuditFilter('visited_recently')}
                className={`relative z-10 flex-1 min-h-[34px] py-1.5 px-2 rounded-lg text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 ${
                  auditFilter === 'visited_recently'
                    ? 'text-[#1D1D1F]'
                    : 'text-[#62626A] hover:text-[#1D1D1F]'
                }`}
              >
                <span>تمت زيارتهم</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full transition-colors duration-200 ${
                    auditFilter === 'visited_recently' ? 'bg-emerald-50 text-emerald-700' : 'text-[#8E8E93]'
                  }`}
                >
                  {auditMetrics.visited}
                </span>
              </button>
            </div>
          </div>

          {/* 4. Content Area: Loading, Error, Empty or Student Cards */}
          {isSyncing && visibleStudents.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-[#E5E5EA] text-center flex flex-col items-center justify-center gap-3">
              <span className="w-7 h-7 rounded-full border-2 border-[#1A7B88] border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-[#62626A]">جارٍ تحميل وتحديث بيانات المتابعة...</p>
            </div>
          ) : !isSupabaseConnected && visibleStudents.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-red-100 text-center flex flex-col items-center justify-center gap-3">
              <span className="material-symbols-outlined text-3xl text-red-500">cloud_off</span>
              <div>
                <p className="text-sm font-bold text-[#1D1D1F]">تعذر تحميل بيانات الطلاب في الوقت الحالي</p>
                <p className="text-xs text-[#62626A] mt-1">يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.</p>
              </div>
              <button
                onClick={() => fetchFromSupabase()}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#1A7B88] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#125862] transition-colors"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>إعادة المحاولة</span>
              </button>
            </div>
          ) : sortedAndFilteredRadarStudents.length === 0 ? (
            <div
              key={`empty-${auditFilter}`}
              className="bg-white rounded-2xl p-8 border border-[#E5E5EA] text-center flex flex-col items-center justify-center gap-2 animate-in fade-in duration-200"
            >
              <span className="material-symbols-outlined text-3xl text-gray-300">
                {auditMetrics.total === 0 ? 'group_off' : 'search_off'}
              </span>
              <p className="text-sm font-bold text-[#1D1D1F]">
                {auditMetrics.total === 0
                  ? 'لا يوجد طلاب للمتابعة'
                  : 'لا يوجد طلاب مطابقين للفلتر أو البحث المحدد'}
              </p>
              {(selectedTeacherFilter !== 'all' || searchQuery || auditFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedTeacherFilter('all');
                    setSearchQuery('');
                    setAuditFilter('all');
                  }}
                  className="text-xs text-[#1A7B88] font-bold hover:underline mt-1 cursor-pointer"
                >
                  إعادة ضبط الفلاتر والبحث
                </button>
              )}
            </div>
          ) : (
            <div
              key={`radar-list-${auditFilter}-${selectedTeacherFilter}`}
              className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden divide-y divide-[#E5E5EA] shadow-none animate-in fade-in duration-200"
            >
              {sortedAndFilteredRadarStudents.map((student) => {
                const teacher = getTeacherById(student.teacherId);
                const daysObs = getDaysSinceLastObservation(student.lastObservationDate);
                const isVisited = daysObs !== null && daysObs <= 60;
                const hasValidObservationNote =
                  student.lastObservationNote &&
                  student.lastObservationNote !== 'طالب جديد بالحلقة' &&
                  student.lastObservationNote !== 'طالب جديد - تم تسجيله بنجاح';

                const rawProgress = student.surahProgress?.trim() || '';
                const hasRealSurahProgress =
                  rawProgress !== '' &&
                  rawProgress !== 'طالب جديد بالحلقة' &&
                  rawProgress !== 'طالب جديد' &&
                  rawProgress !== 'طالب جديد - تم تسجيله بنجاح' &&
                  rawProgress !== 'حلقة القرآن';

                return (
                  <div
                    key={`radar-${student.id}`}
                    className="p-3 sm:p-3.5 hover:bg-gray-50/60 transition-colors flex flex-col gap-2"
                  >
                    {/* Top Row: Student Name + Visit Status Pill */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base text-[#1D1D1F] leading-snug break-words">
                          {student.name}
                        </h3>
                        <p className="text-xs text-[#62626A] font-normal mt-0.5 leading-snug break-words">
                          المعلم: <span className="font-medium text-[#1D1D1F]">{teacher?.name || 'غير محدد'}</span>
                          {teacher?.circleName && <span> · {teacher.circleName}</span>}
                        </p>
                      </div>

                      {/* Clean Linear Status Pill without emojis */}
                      {isVisited ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/50 shrink-0 font-mono">
                          <span className="material-symbols-outlined text-xs text-emerald-600">check_circle</span>
                          <span>تمت ({daysObs} يوماً)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200/50 shrink-0 font-mono">
                          <span className="material-symbols-outlined text-xs text-rose-600">schedule</span>
                          <span>مستحق للزيارة</span>
                        </span>
                      )}
                    </div>

                    {/* Second Row: Quran Progress (Only if genuine) and Last Visit Date */}
                    <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                      {hasRealSurahProgress ? (
                        <div className="flex items-center gap-1.5 text-[#62626A]">
                          <span className="material-symbols-outlined text-sm text-[#1A7B88]">menu_book</span>
                          <span>مسار الحفظ: <strong className="text-[#1D1D1F] font-medium">{rawProgress}</strong></span>
                        </div>
                      ) : (
                        <div />
                      )}

                      <div className="font-mono text-[11px]">
                        {student.lastObservationDate ? (
                          <span className="text-[#62626A]">
                            آخر زيارة: <strong className="text-[#1D1D1F] font-bold">{student.lastObservationDate}</strong>
                          </span>
                        ) : (
                          <span className="text-rose-700 font-medium">
                            لم تتم زيارته بعد
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Last Observation Note Preview (if available) */}
                    {hasValidObservationNote && (
                      <div className="bg-[#F5F5F7] px-3 py-1.5 rounded-xl text-[11px] text-[#1D1D1F] leading-relaxed">
                        <span className="text-[#62626A] font-medium">آخر ملاحظة: </span>
                        {student.lastObservationNote}
                      </div>
                    )}

                    {/* Action Buttons: Min 44px Touch Target */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenObservation(teacher, student)}
                        className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] active:bg-[#0E474F] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">visibility</span>
                        <span>تسجيل مراقبة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenStudentVisitsHistory(student.id, student, teacher)}
                        className="min-h-[44px] px-3.5 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        title={`سجل زيارات الطالب ${student.name}`}
                      >
                        <span className="material-symbols-outlined text-base text-[#1A7B88]">history</span>
                        <span>سجل الزيارات</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: المزيد (More Hub) */}
      {activeTab === 'more' && (
        <div className="flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex flex-col gap-4">
            {/* User Profile Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-[#1A7B88] text-white font-bold flex items-center justify-center text-base shadow-xs shrink-0">
                {currentUser.initials}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base text-gray-900 truncate">{currentUser.name}</h3>
                <p className="text-xs text-[#1A7B88] font-semibold mt-0.5">
                  {currentUser.title || 'مشرف تعليمي ميداني'} · {visibleTeachers.length} معلمين تحت الإشراف
                </p>
              </div>
            </div>

            {/* Hub Actions Grid */}
            <div className="grid grid-cols-1 gap-2.5">
              {/* Students Screen */}
              <button
                onClick={() => {
                  if (onNavigateTab) onNavigateTab('students');
                }}
                className="min-h-[50px] p-3 rounded-xl bg-[#F4F9FA] hover:bg-[#EAF5F7] border border-gray-200/70 text-right flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white text-[#1A7B88] flex items-center justify-center border border-gray-200 shadow-2xs shrink-0">
                    <span className="material-symbols-outlined text-xl">school</span>
                  </span>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">شاشة الطلاب</h4>
                    <p className="text-[11px] text-gray-500">
                      عرض وإدارة جميع طلاب الحلقات التابعة لك ({visibleStudents.length} طالباً)
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-lg">arrow_back_ios</span>
              </button>

              {/* Reports Screen */}
              <button
                onClick={() => {
                  if (onNavigateTab) onNavigateTab('reports');
                }}
                className="min-h-[50px] p-3 rounded-xl bg-[#F4F9FA] hover:bg-[#EAF5F7] border border-gray-200/70 text-right flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white text-[#1A7B88] flex items-center justify-center border border-gray-200 shadow-2xs shrink-0">
                    <span className="material-symbols-outlined text-xl">monitoring</span>
                  </span>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">شاشة التقارير</h4>
                    <p className="text-[11px] text-gray-500">متابعة تقارير الدورات المكتملة وتنزيل ملفات PDF</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-lg">arrow_back_ios</span>
              </button>

              {/* Observations Log (سجل المراقبات الميدانية) */}
              <button
                onClick={handleOpenComprehensiveObservations}
                className="min-h-[50px] p-3 rounded-xl bg-[#F4F9FA] hover:bg-[#EAF5F7] border border-gray-200/70 text-right flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white text-[#1A7B88] flex items-center justify-center border border-gray-200 shadow-2xs shrink-0">
                    <span className="material-symbols-outlined text-xl">reviews</span>
                  </span>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">سجل المراقبات</h4>
                    <p className="text-[11px] text-gray-500">
                      استعراض كافة الزيارات الميدانية وتقييمات الحصص لمعلميك
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-lg">arrow_back_ios</span>
              </button>

              {/* Activity Logs (سجل العمليات والأنشطة الإداري) */}
              <button
                onClick={() => {
                  if (onOpenActivityLog) onOpenActivityLog();
                }}
                className="min-h-[50px] p-3 rounded-xl bg-[#F4F9FA] hover:bg-[#EAF5F7] border border-gray-200/70 text-right flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-white text-[#1A7B88] flex items-center justify-center border border-gray-200 shadow-2xs shrink-0">
                    <span className="material-symbols-outlined text-xl">history</span>
                  </span>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">سجل العمليات والأنشطة</h4>
                    <p className="text-[11px] text-gray-500">استعراض كافة الحركات والزيارات الإشرافية المسجلة</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-lg">arrow_back_ios</span>
              </button>
            </div>

            {/* Account & Logout */}
            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <button
                onClick={() => logout()}
                className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">logout</span>
                  <span>تسجيل الخروج من البوابة</span>
                </div>
                <span className="text-[10px] text-rose-400 font-normal">إنهاء الجلسة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar: «اليوم» · «معلموني» · «المتابعة» · «المزيد» */}
      <SupervisorBottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
        }}
        todayCount={todayClasses.length}
        teachersCount={visibleTeachers.length}
        needsAuditCount={auditMetrics.needs}
      />

      {/* Record Observation Modal */}
      <RecordObservationModal
        isOpen={isObservationModalOpen}
        onClose={() => {
          setIsObservationModalOpen(false);
          setSelectedExistingObservation(undefined);
        }}
        teacher={selectedObservationTeacher}
        student={selectedObservationStudent}
        sessionTime={selectedSessionTime}
        existingObservation={selectedExistingObservation}
      />

      {/* View Observation Note & Visits History Modal */}
      <ViewObservationNoteModal
        isOpen={isObservationsModalOpen}
        onClose={() => {
          setIsObservationsModalOpen(false);
          setObservationsModalStudentId(undefined);
          setObservationsModalStudent(undefined);
          setObservationsModalTeacher(undefined);
        }}
        targetStudentId={observationsModalStudentId}
        student={observationsModalStudent}
        teacher={observationsModalTeacher}
        onNewObservation={(t, s) => {
          handleOpenObservation(t, s);
        }}
      />
    </div>
  );
};
