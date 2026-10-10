import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Teacher, Supervisor, Report } from '../../types';
import { getParentWhatsAppUrl, getReportWhatsAppUrl } from '../../utils/whatsapp';
import { generateStudentReportPdf } from '../../utils/pdfGenerator';
import { GeneralSupervisorBottomNav, GeneralSupervisorTab } from './GeneralSupervisorBottomNav';
import { ViewObservationNoteModal } from '../modals/ViewObservationNoteModal';
import { StudentDetailsModal } from '../modals/StudentDetailsModal';
import { ObservationData } from '../modals/RecordObservationModal';
import { AddSystemUserModal } from '../modals/AddSystemUserModal';
import { ChangeSupervisorModal } from '../modals/ChangeSupervisorModal';

interface GeneralSupervisorViewProps {
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onAddReport: (student: Student) => void;
  onManageVacation: (student: Student) => void;
  onOpenActivityLog?: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'students' | 'teachers' | 'reports') => void;
  initialTab?: GeneralSupervisorTab;
}

// Helper to format date in Cairo time
function formatCairoDate(dateStr?: string): string {
  if (!dateStr) return 'غير مسجل';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export const GeneralSupervisorView: React.FC<GeneralSupervisorViewProps> = ({
  onAddStudent,
  onEditStudent,
  onAddReport,
  onManageVacation,
  onOpenActivityLog,
  onNavigateTab,
  initialTab = 'overview',
}) => {
  const {
    students,
    teachers,
    supervisors,
    reports,
    currentUser,
    getTeacherById,
    getSupervisorById,
    getDaysSinceLastReport,
    isOverdue,
    getReportStatusInfo,
    exportToExcel,
    activeStudentsCount,
    overdueStudentsCount,
    isSuperAdmin,
    previewRole,
    setPreviewRole,
    fetchFromSupabase,
    logout,
  } = useApp();

  // Active top/mobile tab
  const [activeTab, setActiveTab] = useState<GeneralSupervisorTab>(initialTab);

  // Sub-tab for Team tab ('teachers' | 'supervisors')
  const [teamSubTab, setTeamSubTab] = useState<'teachers' | 'supervisors'>('teachers');

  // Sub-section for More tab ('menu' | 'students' | 'reports')
  const [moreSection, setMoreSection] = useState<'menu' | 'students' | 'reports'>('menu');

  // Modals state
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<Student | null>(null);
  const [selectedTeacherForStudents, setSelectedTeacherForStudents] = useState<Teacher | null>(null);
  const [isObservationsModalOpen, setIsObservationsModalOpen] = useState(false);
  const [selectedObsStudentId, setSelectedObsStudentId] = useState<string | undefined>(undefined);

  // Modals for Team Management
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addUserInitialRole, setAddUserInitialRole] = useState<'teacher' | 'sub_supervisor'>('teacher');
  const [selectedTeacherForChangeSup, setSelectedTeacherForChangeSup] = useState<Teacher | null>(null);

  // Search & Filter in Team tab
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherSupervisorFilter, setTeacherSupervisorFilter] = useState('all');
  const [teacherTrackFilter, setTeacherTrackFilter] = useState('all');
  const [supervisorSearch, setSupervisorSearch] = useState('');

  // Search & Filter in Monitoring tab
  const [obsSearch, setObsSearch] = useState('');
  const [obsTeacherFilter, setObsTeacherFilter] = useState('all');

  // Search & Filter in Students section
  const [studentSearch, setStudentSearch] = useState('');
  const [studentTeacherFilter, setStudentTeacherFilter] = useState('all');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');

  // Search in Reports section
  const [reportSearch, setReportSearch] = useState('');
  const [reportGradeFilter, setReportGradeFilter] = useState('all');

  // Sub-supervisors list
  const subSupervisors = useMemo(() => {
    return supervisors.filter((s) => s.role === 'sub_supervisor');
  }, [supervisors]);

  // Unassigned teachers count
  const unassignedTeachersCount = useMemo(() => {
    return teachers.filter((t) => !t.supervisorId).length;
  }, [teachers]);

  // Filtered sub-supervisors
  const filteredSubSupervisors = useMemo(() => {
    return subSupervisors.filter((s) => {
      const q = supervisorSearch.trim().toLowerCase();
      if (!q) return true;
      const matchName = s.name.toLowerCase().includes(q);
      const matchEmail = (s.email || '').toLowerCase().includes(q);
      const matchDept = (s.department || '').toLowerCase().includes(q);
      const matchTitle = (s.title || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchDept || matchTitle;
    });
  }, [subSupervisors, supervisorSearch]);

  // Stored observation notes (from localStorage + synced student observation dates)
  const storedObservations = useMemo(() => {
    try {
      const rawStored: ObservationData[] = JSON.parse(
        localStorage.getItem('mk_observation_notes') || '[]'
      );
      const list = [...rawStored];

      // Synthesize missing synced observation dates from students
      students.forEach((stud) => {
        if (stud.lastObservationDate) {
          const exists = list.some(
            (o) => o.studentId === stud.id && o.date === stud.lastObservationDate
          );
          if (!exists) {
            const t = getTeacherById(stud.teacherId);
            list.push({
              id: `synced-${stud.id}-${stud.lastObservationDate}`,
              studentId: stud.id,
              studentName: stud.name,
              teacherId: stud.teacherId,
              teacherName: t?.name || 'معلم غير محدد',
              date: stud.lastObservationDate,
              sessionTime: '16:00',
              rating: 4,
              notes: 'زيارة متابعة ميدانية دورية معتمدة للحلقة.',
            });
          }
        }
      });

      // Sort by newest first
      return list.sort((a, b) => {
        const da = new Date(a.date || 0).getTime();
        const db = new Date(b.date || 0).getTime();
        return db - da;
      });
    } catch {
      return [];
    }
  }, [students, getTeacherById]);

  // Coverage statistics for General Supervisor
  const coverageMetrics = useMemo(() => {
    const visitedTeacherIds = new Set<string>();
    let studentsVisitedLast60Days = 0;

    storedObservations.forEach((obs) => {
      if (obs.teacherId) visitedTeacherIds.add(obs.teacherId);
    });

    students.forEach((s) => {
      if (s.lastObservationDate) {
        const diff = Math.floor(
          (Date.now() - new Date(s.lastObservationDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff <= 60) {
          studentsVisitedLast60Days += 1;
        }
      }
    });

    return {
      totalTeachers: teachers.length,
      visitedTeachersCount: visitedTeacherIds.size,
      unvisitedTeachersCount: Math.max(0, teachers.length - visitedTeacherIds.size),
      studentsVisitedLast60Days,
      totalStudents: students.length,
      totalObservations: storedObservations.length,
    };
  }, [storedObservations, teachers, students]);

  // Filtered teachers list (ZERO financial fields)
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const q = teacherSearch.trim().toLowerCase();
      if (q) {
        const matchName = t.name.toLowerCase().includes(q);
        const matchEmail = (t.email || '').toLowerCase().includes(q);
        const matchCircle = t.circleName?.toLowerCase().includes(q);
        const matchTrack = t.track?.toLowerCase().includes(q);
        const matchPhone = t.phone?.includes(q);
        if (!matchName && !matchEmail && !matchCircle && !matchTrack && !matchPhone) return false;
      }

      // Filter by Track (بنين / فتيات / عام)
      if (teacherTrackFilter !== 'all') {
        const tTrack = (t.track || '').toLowerCase();
        if (teacherTrackFilter === 'boys' && !tTrack.includes('بنين')) return false;
        if (
          teacherTrackFilter === 'girls' &&
          !tTrack.includes('فتيات') &&
          !tTrack.includes('بنات')
        )
          return false;
        if (
          teacherTrackFilter === 'general' &&
          !tTrack.includes('عام') &&
          !tTrack.includes('القرآن')
        )
          return false;
      }

      // Filter by Supervisor (All / Specific Supervisor / Unassigned)
      if (teacherSupervisorFilter === 'unassigned') {
        if (t.supervisorId) return false;
      } else if (teacherSupervisorFilter !== 'all') {
        const sup =
          getSupervisorById(t.supervisorId) ||
          supervisors.find((s) => s.assignedTeacherIds?.includes(t.id));
        if (sup?.id !== teacherSupervisorFilter) return false;
      }

      return true;
    });
  }, [
    teachers,
    teacherSearch,
    teacherTrackFilter,
    teacherSupervisorFilter,
    getSupervisorById,
    supervisors,
  ]);

  // Filtered observations
  const filteredObservations = useMemo(() => {
    return storedObservations.filter((obs) => {
      const q = obsSearch.trim().toLowerCase();
      if (q) {
        const matchStudent = obs.studentName?.toLowerCase().includes(q);
        const matchTeacher = obs.teacherName?.toLowerCase().includes(q);
        const matchNotes = obs.notes?.toLowerCase().includes(q);
        if (!matchStudent && !matchTeacher && !matchNotes) return false;
      }

      if (obsTeacherFilter !== 'all') {
        if (obs.teacherId !== obsTeacherFilter) return false;
      }

      return true;
    });
  }, [storedObservations, obsSearch, obsTeacherFilter]);

  // Filtered students (EXCLUSIVELY academic - no financial columns)
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = studentSearch.trim().toLowerCase();
      const teacher = getTeacherById(s.teacherId);
      if (q) {
        const matchName = s.name.toLowerCase().includes(q);
        const matchPhone = s.parentPhone.includes(q);
        const matchTeacher = teacher?.name?.toLowerCase().includes(q);
        const matchSurah = s.surahProgress?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchTeacher && !matchSurah) return false;
      }

      if (studentTeacherFilter !== 'all' && s.teacherId !== studentTeacherFilter) {
        return false;
      }

      const days = getDaysSinceLastReport(s.lastReportDate);
      if (studentStatusFilter === 'active' && s.status !== 'active') return false;
      if (studentStatusFilter === 'vacation' && s.status !== 'vacation') return false;
      if (
        studentStatusFilter === 'overdue' &&
        !(s.status === 'active' && (days > 30 || isOverdue(s.lastReportDate)))
      ) {
        return false;
      }

      return true;
    });
  }, [students, studentSearch, studentTeacherFilter, studentStatusFilter, getTeacherById, getDaysSinceLastReport, isOverdue]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      const student = students.find((s) => s.id === rep.studentId);
      const teacher = getTeacherById(rep.teacherId);
      const q = reportSearch.trim().toLowerCase();

      if (q) {
        const matchStudent = student?.name?.toLowerCase().includes(q);
        const matchTeacher = teacher?.name?.toLowerCase().includes(q);
        const matchSummary = rep.performanceSummary?.toLowerCase().includes(q);
        if (!matchStudent && !matchTeacher && !matchSummary) return false;
      }

      if (reportGradeFilter !== 'all') {
        if (reportGradeFilter === 'excellent' && !rep.grade?.includes('ممتاز')) return false;
        if (reportGradeFilter === 'very_good' && !rep.grade?.includes('جيد')) return false;
      }

      return true;
    });
  }, [reports, students, getTeacherById, reportSearch, reportGradeFilter]);

  // Helper to open student visits history
  const handleOpenStudentVisits = (studentId: string) => {
    setSelectedObsStudentId(studentId);
    setIsObservationsModalOpen(true);
  };

  // Helper to open comprehensive observation visits
  const handleOpenAllObservations = () => {
    setSelectedObsStudentId(undefined);
    setIsObservationsModalOpen(true);
  };

  return (
    <div
      className="w-full max-w-5xl mx-auto flex flex-col gap-4 pb-28 sm:pb-12 pt-1"
      dir="rtl"
    >
      {/* 1. Super Admin Role Preview Indicator (Compact Strip) */}
      {isSuperAdmin && previewRole === 'general_supervisor' && (
        <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-2xs gap-2">
          <div className="flex items-center gap-2 font-bold">
            <span className="material-symbols-outlined text-base text-amber-600">visibility</span>
            <span>معاينة بوابة المشرف العام (الإشراف الأكاديمي)</span>
          </div>
          <button
            onClick={() => setPreviewRole(null)}
            className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
          >
            العودة للمدير
          </button>
        </div>
      )}

      {/* 2. Desktop Tab Switcher (Minimal, Quiet, Single-level desktop navigation) */}
      <div className="hidden sm:flex items-center justify-between border-b border-gray-200/80 pb-2.5">
        <div className="inline-flex items-center gap-1.5 bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <button
            onClick={() => {
              setActiveTab('overview');
              setMoreSection('menu');
            }}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            <span>الرئيسية</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('team');
              setMoreSection('menu');
            }}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'team'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span className="material-symbols-outlined text-base">groups</span>
            <span>الفريق</span>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'team' ? 'bg-[#1A7B88] text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {teachers.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('monitoring');
              setMoreSection('menu');
            }}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'monitoring'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            <span>المتابعة</span>
            {storedObservations.length > 0 && (
              <span
                className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'monitoring' ? 'bg-[#1A7B88] text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {storedObservations.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('more');
              setMoreSection('menu');
            }}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'more'
                ? 'bg-white text-[#125862] shadow-xs'
                : 'text-gray-600 hover:text-[#125862]'
            }`}
          >
            <span className="material-symbols-outlined text-base">more_horiz</span>
            <span>المزيد</span>
          </button>
        </div>

        {/* Quick Context Subtitle */}
        <span className="text-xs text-gray-500 font-medium hidden md:inline-block">
          منظومة الإشراف الأكاديمي العام · أكاديمية المسلم الصغير
        </span>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: الرئيسية (Overview) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Header Strip */}
          <div className="flex items-baseline justify-between flex-wrap gap-1 px-0.5">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">
                الإشراف العام
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                متابعة الحلقات القرآنية والكادر التعليمي والإشرافي
              </p>
            </div>
            <span className="text-xs text-[#125862] bg-[#EAF5F7] px-2.5 py-1 rounded-xl border border-[#1A7B88]/20 font-bold">
              {currentUser.title || 'المشرف العام'}
            </span>
          </div>

          {/* Compact Summary Cards (ملخص مدمج بالأعداد الفعلية المتاحة) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Metric 1: Teachers -> Clicking opens Team tab */}
            <button
              onClick={() => {
                setActiveTab('team');
                setTeamSubTab('teachers');
              }}
              className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-[#1A7B88]/40 hover:shadow-xs transition-all text-right flex flex-col justify-between gap-2 cursor-pointer group active:scale-98"
              title="عرض قائمة المعلمين"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-bold group-hover:text-[#125862] transition-colors">
                  المعلمون
                </span>
                <span className="w-8 h-8 rounded-xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">badge</span>
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 leading-none">
                  {teachers.length}
                </span>
                <span className="text-[11px] text-gray-500 block mt-1 font-medium">
                  حلقات تحفيظ نشطة
                </span>
              </div>
            </button>

            {/* Metric 2: Sub-Supervisors -> Clicking opens Team/Supervisors */}
            <button
              onClick={() => {
                setActiveTab('team');
                setTeamSubTab('supervisors');
              }}
              className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-[#1A7B88]/40 hover:shadow-xs transition-all text-right flex flex-col justify-between gap-2 cursor-pointer group active:scale-98"
              title="عرض فريق الإشراف التعليمي"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-bold group-hover:text-[#125862] transition-colors">
                  المشرفون الفرعيون
                </span>
                <span className="w-8 h-8 rounded-xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">supervisor_account</span>
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 leading-none">
                  {subSupervisors.length}
                </span>
                <span className="text-[11px] text-gray-500 block mt-1 font-medium">
                  فريق الإشراف المباشر
                </span>
              </div>
            </button>

            {/* Metric 3: Students -> Clicking opens Students view */}
            <button
              onClick={() => {
                setActiveTab('more');
                setMoreSection('students');
              }}
              className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-[#1A7B88]/40 hover:shadow-xs transition-all text-right flex flex-col justify-between gap-2 cursor-pointer group active:scale-98"
              title="عرض قائمة الطلاب والمقررات"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-bold group-hover:text-[#125862] transition-colors">
                  الطلاب المسجلون
                </span>
                <span className="w-8 h-8 rounded-xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">school</span>
                </span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 leading-none">
                  {students.length}
                </span>
                <span className="text-[11px] text-gray-500 block mt-1 font-medium">
                  {activeStudentsCount} طالب نشط
                </span>
              </div>
            </button>

            {/* Metric 4: Reports needing attention -> Clicking opens Reports */}
            <button
              onClick={() => {
                setActiveTab('more');
                setMoreSection('reports');
              }}
              className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:border-rose-300 hover:shadow-xs transition-all text-right flex flex-col justify-between gap-2 cursor-pointer group active:scale-98"
              title="متابعة التقارير المتأخرة"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 font-bold group-hover:text-rose-700 transition-colors">
                  تقارير بحاجة متابعة
                </span>
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    overdueStudentsCount > 0
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {overdueStudentsCount > 0 ? 'warning' : 'task_alt'}
                  </span>
                </span>
              </div>
              <div>
                <span
                  className={`text-2xl sm:text-3xl font-bold font-mono leading-none ${
                    overdueStudentsCount > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {overdueStudentsCount}
                </span>
                <span className="text-[11px] text-gray-500 block mt-1 font-medium">
                  {overdueStudentsCount > 0 ? 'تجاوزوا 30 يوماً' : 'سجل التسميع منتظم'}
                </span>
              </div>
            </button>
          </div>

          {/* Direct Entry Points Cards (المداخل الواضحة للأقسام) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            {/* Entry 1: Students Section */}
            <button
              onClick={() => {
                setActiveTab('more');
                setMoreSection('students');
              }}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-[#1A7B88]/40 transition-all text-right flex items-center justify-between gap-3 cursor-pointer group active:scale-98"
            >
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">school</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                    قائمة الطلاب والمقررات
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    استعراض الطلاب والحلقات وسجل التسميع ({students.length} طالب)
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400 group-hover:text-[#1A7B88] transition-colors">
                chevron_left
              </span>
            </button>

            {/* Entry 2: Visits & Observations */}
            <button
              onClick={() => setActiveTab('monitoring')}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-[#1A7B88]/40 transition-all text-right flex items-center justify-between gap-3 cursor-pointer group active:scale-98"
            >
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">visibility</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                    سجل المراقبات الميدانية
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    تقييم أداء المعلمين وتغطية الزيارات ({storedObservations.length} زيارة)
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-700 transition-colors">
                chevron_left
              </span>
            </button>

            {/* Entry 3: Reports */}
            <button
              onClick={() => {
                setActiveTab('more');
                setMoreSection('reports');
              }}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-[#1A7B88]/40 transition-all text-right flex items-center justify-between gap-3 cursor-pointer group active:scale-98"
            >
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                    تقارير دورات الـ 8 حصص
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    إصدار شهادات الـ PDF واعتماد تقارير الحفظ ({reports.length} تقرير)
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400 group-hover:text-amber-700 transition-colors">
                chevron_left
              </span>
            </button>

            {/* Entry 4: Activity Log */}
            <button
              onClick={onOpenActivityLog}
              className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-[#1A7B88]/40 transition-all text-right flex items-center justify-between gap-3 cursor-pointer group active:scale-98"
            >
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-2xl">history</span>
                </span>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                    سجل العمليات الإدارية
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    توثيق فوري لكافة التعديلات والإجازات والتقارير
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-400 group-hover:text-gray-700 transition-colors">
                chevron_left
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: إدارة الفريق (Team Management: Teachers & Sub-Supervisors) */}
      {/* ========================================================================= */}
      {activeTab === 'team' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Header & Main Team Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-0.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-[#1A7B88]">groups</span>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">
                  إدارة الفريق التعليمي والإشرافي
                </h2>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">
                متابعة المعلمين والمشرفين الفرعيين وتوزيع الحلقات الإشرافية بدون صلاحيات مالية
              </p>
            </div>

            {/* Quick Actions: Add Teacher & Add Sub-Supervisor */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => {
                  setAddUserInitialRole('teacher');
                  setIsAddUserOpen(true);
                }}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98 cursor-pointer"
                title="إضافة معلم أو محفظ حلقة جديد وربطه بالمشرف والمسار"
              >
                <span className="material-symbols-outlined text-lg">person_add</span>
                <span>إضافة معلم</span>
              </button>

              <button
                onClick={() => {
                  setAddUserInitialRole('sub_supervisor');
                  setIsAddUserOpen(true);
                }}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#EAF5F7] hover:bg-[#d9eff3] text-[#125862] border border-[#1A7B88]/30 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                title="إضافة مشرف فرعي جديد للإشراف الميداني"
              >
                <span className="material-symbols-outlined text-lg text-[#1A7B88]">
                  supervisor_account
                </span>
                <span>إضافة مشرف فرعي</span>
              </button>
            </div>
          </div>

          {/* Unassigned Teachers Warning Banner (if any) */}
          {unassignedTeachersCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-amber-600 text-lg shrink-0">
                  warning
                </span>
                <span>
                  تنبيه إداري: يوجد {unassignedTeachersCount} معلم غير مرتبط بمشرف فرعي حالياً.
                </span>
              </div>
              <button
                onClick={() => {
                  setTeamSubTab('teachers');
                  setTeacherSupervisorFilter('unassigned');
                }}
                className="self-end sm:self-auto min-h-[32px] px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                تصفية المعلمين غير المرتبطين
              </button>
            </div>
          )}

          {/* Sub-tab Switcher: Teachers vs Sub-Supervisors */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 pb-2">
            <div className="inline-flex items-center bg-gray-100/90 p-1 rounded-xl border border-gray-200/80">
              <button
                onClick={() => setTeamSubTab('teachers')}
                className={`min-h-[36px] px-4 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  teamSubTab === 'teachers'
                    ? 'bg-white text-[#125862] shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">school</span>
                <span>المعلمون</span>
                <span
                  className={`font-mono text-[11px] px-2 py-0.2 rounded-full ${
                    teamSubTab === 'teachers'
                      ? 'bg-[#1A7B88] text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {teachers.length}
                </span>
              </button>

              <button
                onClick={() => setTeamSubTab('supervisors')}
                className={`min-h-[36px] px-4 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  teamSubTab === 'supervisors'
                    ? 'bg-white text-[#125862] shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                <span>المشرفون الفرعيون</span>
                <span
                  className={`font-mono text-[11px] px-2 py-0.2 rounded-full ${
                    teamSubTab === 'supervisors'
                      ? 'bg-[#1A7B88] text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {subSupervisors.length}
                </span>
              </button>
            </div>

            <span className="text-xs text-gray-400 font-medium hidden sm:inline">
              {teamSubTab === 'teachers'
                ? `عرض ${filteredTeachers.length} من أصل ${teachers.length} معلم`
                : `عرض ${filteredSubSupervisors.length} من أصل ${subSupervisors.length} مشرف`}
            </span>
          </div>

          {/* ===================================================================== */}
          {/* SUB-TAB 1: المعلمون (Teachers List with change supervisor action) */}
          {/* ===================================================================== */}
          {teamSubTab === 'teachers' && (
            <div className="flex flex-col gap-3.5">
              {/* Search & Advanced Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* 1. Search by Name / Email / Phone */}
                <div className="sm:col-span-6 relative">
                  <span className="material-symbols-outlined absolute right-3.5 top-3 text-gray-400 text-lg pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="ابحث بالاسم، البريد الإلكتروني، الحلقة، أو الهاتف..."
                    className="w-full min-h-[44px] pr-10 pl-9 rounded-xl bg-white text-xs sm:text-sm text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs"
                  />
                  {teacherSearch && (
                    <button
                      onClick={() => setTeacherSearch('')}
                      className="absolute left-2.5 top-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                      title="مسح البحث"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  )}
                </div>

                {/* 2. Track Filter (بنين / فتيات / عام) */}
                <div className="sm:col-span-3">
                  <select
                    value={teacherTrackFilter}
                    onChange={(e) => setTeacherTrackFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white text-xs sm:text-sm font-semibold text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs cursor-pointer"
                  >
                    <option value="all">جميع المسارات الأكاديمية</option>
                    <option value="boys">مسار البنين</option>
                    <option value="girls">مسار الفتيات</option>
                    <option value="general">مسار عام (القرآن الكريم)</option>
                  </select>
                </div>

                {/* 3. Supervisor Filter (All / Specific / Unassigned) */}
                <div className="sm:col-span-3">
                  <select
                    value={teacherSupervisorFilter}
                    onChange={(e) => setTeacherSupervisorFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white text-xs sm:text-sm font-semibold text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs cursor-pointer"
                  >
                    <option value="all">جميع المشرفين الفرعيين</option>
                    <option value="unassigned">⚠️ المعلمون غير المرتبطين بمشرف ({unassignedTeachersCount})</option>
                    {subSupervisors.map((s) => {
                      const count = teachers.filter((t) => t.supervisorId === s.id).length;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({count} معلمين)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Active Filters Reset Bar (if filtered) */}
              {(teacherSearch || teacherTrackFilter !== 'all' || teacherSupervisorFilter !== 'all') && (
                <div className="flex items-center justify-between px-1 text-xs text-gray-500">
                  <span>
                    تم تطبيق التصفية: إظهار {filteredTeachers.length} من {teachers.length} معلم
                  </span>
                  <button
                    onClick={() => {
                      setTeacherSearch('');
                      setTeacherTrackFilter('all');
                      setTeacherSupervisorFilter('all');
                    }}
                    className="text-[#1A7B88] hover:text-[#125862] font-bold cursor-pointer underline"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              )}

              {/* Teachers Cards Grid (ZERO financial fields) */}
              {filteredTeachers.length === 0 ? (
                <div className="py-12 bg-white rounded-2xl border border-gray-200/80 text-center flex flex-col items-center justify-center p-6 gap-2">
                  <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
                  <p className="text-sm font-bold text-gray-900">لا توجد نتائج مطابقة للمعلمين</p>
                  <p className="text-xs text-gray-500">
                    جرب مسح البحث أو تغيير فلتر المسار أو المشرف المسؤول
                  </p>
                  <button
                    onClick={() => {
                      setTeacherSearch('');
                      setTeacherTrackFilter('all');
                      setTeacherSupervisorFilter('all');
                    }}
                    className="mt-1 min-h-[40px] px-4 py-1.5 rounded-xl bg-[#EAF5F7] text-[#125862] text-xs font-bold hover:bg-[#d9eff3] transition-colors cursor-pointer"
                  >
                    مسح جميع الفلاتر
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredTeachers.map((teacher) => {
                    const supervisor =
                      getSupervisorById(teacher.supervisorId) ||
                      supervisors.find((s) => s.assignedTeacherIds?.includes(teacher.id));

                    const teacherStudents = students.filter((s) => s.teacherId === teacher.id);
                    const overdueInCircle = teacherStudents.filter(
                      (s) => s.status === 'active' && isOverdue(s.lastReportDate)
                    ).length;

                    // Track style badge
                    const trackLabel = teacher.track || 'عام';
                    const isBoys = trackLabel.includes('بنين');
                    const isGirls = trackLabel.includes('فتيات') || trackLabel.includes('بنات');

                    return (
                      <div
                        key={`t-card-${teacher.id}`}
                        className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 text-right"
                      >
                        {/* Top: Name, Initials, Circle, & Track Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-[#1A7B88] text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                              {teacher.initials}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate">
                                {teacher.name}
                              </h3>
                              <span className="text-xs text-[#125862] font-semibold block truncate">
                                {teacher.circleName || 'حلقة القرآن الكريم'}
                              </span>
                            </div>
                          </div>

                          {/* Track Badge */}
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border shrink-0 ${
                              isBoys
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : isGirls
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-[#EAF5F7] text-[#125862] border-[#1A7B88]/20'
                            }`}
                          >
                            {trackLabel}
                          </span>
                        </div>

                        {/* Supervisor Association Badge */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                          <span className="text-gray-500 font-medium">المشرف المسؤول:</span>
                          {supervisor ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20 text-[11px] font-bold">
                              <span className="material-symbols-outlined text-xs">badge</span>
                              <span>{supervisor.name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold">
                              <span className="material-symbols-outlined text-xs text-amber-600">
                                warning
                              </span>
                              <span>غير مسند لمشرف</span>
                            </span>
                          )}
                        </div>

                        {/* Contact info: Email & Phone */}
                        <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 gap-1 bg-[#F5F5F7] p-2.5 rounded-xl border border-gray-200/60">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="material-symbols-outlined text-xs text-gray-400">
                              mail
                            </span>
                            <span className="font-mono text-[11px] text-gray-700 truncate dir-ltr text-left">
                              {teacher.email || 'غير مسجل'}
                            </span>
                          </div>

                          {teacher.phone && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-600 font-mono">
                              <span className="material-symbols-outlined text-xs text-emerald-600">
                                call
                              </span>
                              <span dir="ltr">{teacher.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Academic Metrics: Students & Regularity (NO FINANCIAL DATA) */}
                        <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-[#1A7B88]">
                              school
                            </span>
                            <span className="font-bold text-gray-900">
                              {teacherStudents.length} طلاب مسجلين
                            </span>
                          </div>

                          {overdueInCircle > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                              {overdueInCircle} متأخرين
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              منتظم
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Change Supervisor & View Circle */}
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                          {/* 1. Action: Change Supervisor */}
                          <button
                            onClick={() => setSelectedTeacherForChangeSup(teacher)}
                            className="min-h-[42px] flex-1 px-3 py-2 rounded-xl bg-[#EAF5F7] hover:bg-[#d9eff3] text-[#125862] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#1A7B88]/20 active:scale-98"
                            title="تغيير المشرف الفرعي المسؤول عن هذا المعلم"
                          >
                            <span className="material-symbols-outlined text-base text-[#1A7B88]">
                              swap_horiz
                            </span>
                            <span>تغيير المشرف</span>
                          </button>

                          {/* 2. Action: View Circle Students */}
                          <button
                            onClick={() => setSelectedTeacherForStudents(teacher)}
                            className="min-h-[42px] px-3 py-2 rounded-xl bg-[#F5F5F7] hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-gray-200/60 active:scale-98"
                            title="عرض طلاب حلقة المعلم"
                          >
                            <span className="material-symbols-outlined text-base">groups</span>
                            <span className="hidden sm:inline">الطلاب</span>
                            <span>({teacherStudents.length})</span>
                          </button>

                          {/* 3. Action: WhatsApp Direct Contact */}
                          {teacher.phone && (
                            <a
                              href={`https://wa.me/966${teacher.phone.replace(/^0+/, '').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[42px] min-w-[42px] px-2.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center transition-colors shadow-2xs active:scale-95"
                              title={`مراسلة المعلم ${teacher.name} عبر واتساب`}
                              aria-label={`واتساب المعلم ${teacher.name}`}
                            >
                              <span className="material-symbols-outlined text-lg">chat</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================================================================== */}
          {/* SUB-TAB 2: المشرفون الفرعيون (Sub-Supervisors List) */}
          {/* ===================================================================== */}
          {teamSubTab === 'supervisors' && (
            <div className="flex flex-col gap-3.5">
              {/* Search Bar for Sub-supervisors */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute right-3.5 top-3 text-gray-400 text-lg pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={supervisorSearch}
                    onChange={(e) => setSupervisorSearch(e.target.value)}
                    placeholder="ابحث باسم المشرف الفرعي، البريد، أو القسم..."
                    className="w-full min-h-[44px] pr-10 pl-9 rounded-xl bg-white text-xs sm:text-sm text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs"
                  />
                  {supervisorSearch && (
                    <button
                      onClick={() => setSupervisorSearch('')}
                      className="absolute left-2.5 top-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setAddUserInitialRole('sub_supervisor');
                    setIsAddUserOpen(true);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
                  <span className="hidden sm:inline">إضافة مشرف فرعي</span>
                </button>
              </div>

              {filteredSubSupervisors.length === 0 ? (
                <div className="py-12 bg-white rounded-2xl border border-gray-200/80 text-center flex flex-col items-center justify-center p-6 gap-2">
                  <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
                  <p className="text-sm font-bold text-gray-900">لا توجد نتائج مطابقة للمشرفين الفرعيين</p>
                  <p className="text-xs text-gray-500">جرب مسح البحث أو إضافة مشرف فرعي جديد</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredSubSupervisors.map((sup) => {
                    const assignedTeachersList = teachers.filter(
                      (t) => t.supervisorId === sup.id || sup.assignedTeacherIds?.includes(t.id)
                    );
                    const assignedStudentsCount = students.filter((s) =>
                      assignedTeachersList.some((t) => t.id === s.teacherId)
                    ).length;

                    return (
                      <div
                        key={`sup-${sup.id}`}
                        className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs flex flex-col justify-between gap-3 text-right"
                      >
                        {/* Top: Name, Initials, Department */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-[#1A7B88] text-white font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
                              {sup.initials}
                            </div>
                            <div>
                              <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                                {sup.name}
                              </h3>
                              <span className="text-xs text-gray-500 font-medium block mt-0.5">
                                {sup.title || 'مشرف تعليمي'} · {sup.department || 'الإشراف التربوي'}
                              </span>
                            </div>
                          </div>

                          <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5F7] text-[#125862] text-[11px] font-bold border border-[#1A7B88]/20 shrink-0">
                            مشرف فرعي
                          </span>
                        </div>

                        {/* Email row */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-[#F5F5F7] px-3 py-1.5 rounded-xl border border-gray-200/60">
                          <span className="material-symbols-outlined text-xs text-gray-400">mail</span>
                          <span className="font-mono text-[11px] text-gray-700 truncate dir-ltr text-left">
                            {sup.email || 'غير مسجل'}
                          </span>
                        </div>

                        {/* Assigned Teachers Strip */}
                        <div className="p-3 rounded-xl bg-[#F5F5F7] border border-gray-200/60 flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center justify-between text-gray-700 font-bold">
                            <span>المعلمون التابعون:</span>
                            <span className="font-mono text-[#125862]">
                              {assignedTeachersList.length} معلمين
                            </span>
                          </div>
                          {assignedTeachersList.length > 0 ? (
                            <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                              {assignedTeachersList.map((t) => (
                                <span
                                  key={t.id}
                                  className="px-2 py-0.5 rounded-md bg-white border border-gray-200/80 text-[11px] font-medium text-gray-800"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[11px]">
                              لم يتم إسناد معلمين لهذا المشرف بعد.
                            </span>
                          )}
                        </div>

                        {/* Metrics and Quick Filter Button */}
                        <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-xs text-[#1A7B88]">
                              school
                            </span>
                            <span>إجمالي الطلاب:</span>
                            <span className="font-bold font-mono text-gray-900">
                              {assignedStudentsCount} طالب
                            </span>
                          </div>

                          {assignedTeachersList.length > 0 && (
                            <button
                              onClick={() => {
                                setTeacherSupervisorFilter(sup.id);
                                setTeamSubTab('teachers');
                              }}
                              className="text-[11px] text-[#1A7B88] hover:text-[#125862] font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>عرض المعلمين</span>
                              <span className="material-symbols-outlined text-xs">arrow_back</span>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: المتابعة (Monitoring: Visits Coverage & Observations Log) */}
      {/* ========================================================================= */}
      {activeTab === 'monitoring' && (
        <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">
                المتابعة والزيارات الميدانية
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                متابعة تقييمات المراقبة الميدانية وتغطية زيارات الحلقات
              </p>
            </div>

            <button
              onClick={handleOpenAllObservations}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-98 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">manage_search</span>
              <span>سجل المراقبات الشامل</span>
            </button>
          </div>

          {/* Visits Coverage Summary Strip (مؤشرات التغطية) */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-medium block">
                  المعلمون الذين تمت زيارتهم
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-gray-900 mt-0.5 block">
                  {coverageMetrics.visitedTeachersCount} / {coverageMetrics.totalTeachers}
                </span>
              </div>
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">check_circle</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-medium block">
                  زيارة طلاب خلال آخر 60 يومًا
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-gray-900 mt-0.5 block">
                  {coverageMetrics.studentsVisitedLast60Days} طالب
                </span>
              </div>
              <span className="w-9 h-9 rounded-xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">history</span>
              </span>
            </div>

            <div className="col-span-2 lg:col-span-1 p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-medium block">
                  إجمالي سجلات المراقبة الموثقة
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-gray-900 mt-0.5 block">
                  {coverageMetrics.totalObservations} زيارة
                </span>
              </div>
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">fact_check</span>
              </span>
            </div>
          </div>

          {/* Search & Filter Bar for Observations */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2 relative">
              <span className="material-symbols-outlined absolute right-3.5 top-3 text-gray-400 text-lg pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={obsSearch}
                onChange={(e) => setObsSearch(e.target.value)}
                placeholder="ابحث باسم الطالب، المعلم، أو الملاحظة..."
                className="w-full min-h-[44px] pr-10 pl-3 rounded-xl bg-white text-sm text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs"
              />
              {obsSearch && (
                <button
                  onClick={() => setObsSearch('')}
                  className="absolute left-2.5 top-2 min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            <div>
              <select
                value={obsTeacherFilter}
                onChange={(e) => setObsTeacherFilter(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl bg-white text-xs sm:text-sm font-semibold text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs cursor-pointer"
              >
                <option value="all">جميع المعلمين</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Observations List */}
          {filteredObservations.length === 0 ? (
            <div className="py-12 bg-white rounded-2xl border border-gray-200/80 text-center flex flex-col items-center justify-center p-6 gap-2">
              <span className="material-symbols-outlined text-4xl text-gray-300">visibility_off</span>
              <p className="text-sm font-bold text-gray-900">لا توجد زيارات مراقبة مسجلة حالياً</p>
              <p className="text-xs text-gray-500">
                تسجل المراقبات الميدانية عبر بوابات المشرفين التعليميين لحلقات المعلمين
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredObservations.map((obs) => {
                const formattedDate = formatCairoDate(obs.date);
                const hasStudent = Boolean(obs.studentName && obs.studentId);

                return (
                  <div
                    key={obs.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-10 h-10 rounded-xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-gray-900">
                            {hasStudent ? obs.studentName : 'مراقبة عامة للمعلم'}
                          </h4>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-[#125862] font-semibold">
                            المعلم: {obs.teacherName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            {obs.rating || 'غير مسجل'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                          {obs.notes || 'لا توجد ملاحظات إضافية مسجلة.'}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                          <span>بتوقيت القاهرة: {formattedDate}</span>
                          {obs.supervisorName && (
                            <>
                              <span>•</span>
                              <span>سجّلها: {obs.supervisorName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action: Open Read-only inspection */}
                    <button
                      onClick={() => {
                        if (obs.studentId) {
                          handleOpenStudentVisits(obs.studentId);
                        } else {
                          handleOpenAllObservations();
                        }
                      }}
                      className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-gray-50 hover:bg-[#EAF5F7] text-[#125862] border border-gray-200/70 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                      <span>عرض التفاصيل</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: المزيد (More: Students, Reports, Activity Log, Export, Account) */}
      {/* ========================================================================= */}
      {activeTab === 'more' && (
        <div className="flex flex-col gap-3.5 animate-in fade-in duration-150">
          {/* Sub-section: MENU */}
          {moreSection === 'menu' && (
            <div className="flex flex-col gap-4">
              <div className="px-0.5">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight">
                  شاشات وإجراءات الإشراف العام
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  الوصول السريع لبيانات الطلاب، التقارير، السجلات الإدارية، والتصدير
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Students Screen */}
                <button
                  onClick={() => setMoreSection('students')}
                  className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-[#1A7B88]/40 transition-all text-right flex items-center justify-between gap-3 cursor-pointer group active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-[#EAF5F7] text-[#1A7B88] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">school</span>
                    </span>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                        شاشة الطلاب والمقررات
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        استعراض وتعديل بيانات الطلاب والحلقات ({students.length} طالب)
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-[#1A7B88] transition-colors">
                    chevron_left
                  </span>
                </button>

                {/* 2. Reports Screen */}
                <button
                  onClick={() => setMoreSection('reports')}
                  className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-[#1A7B88]/40 transition-all text-right flex items-center justify-between gap-3 cursor-pointer group active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">verified</span>
                    </span>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                        تقارير دورات الـ 8 حصص
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        إصدار شهادات الـ PDF واعتماد تقارير الحفظ ({reports.length} تقرير)
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-amber-700 transition-colors">
                    chevron_left
                  </span>
                </button>

                {/* 3. Activity Log */}
                <button
                  onClick={onOpenActivityLog}
                  className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-[#1A7B88]/40 transition-all text-right flex items-center justify-between gap-3 cursor-pointer group active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">history</span>
                    </span>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                        سجل العمليات التاريخي (Activity Log)
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        توثيق فوري للإضافات والتعديلات مع أسماء المعدّلين
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-gray-700 transition-colors">
                    chevron_left
                  </span>
                </button>

                {/* 4. Export to Excel (Non-financial) */}
                <button
                  onClick={() => exportToExcel(students)}
                  className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-xs hover:border-[#1A7B88]/40 transition-all text-right flex items-center justify-between gap-3 cursor-pointer group active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl">file_download</span>
                    </span>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-tight">
                        تصدير كشف الأكاديمية (Excel)
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        تصدير الكشف الأكاديمي للطلاب والحلقات (معتمد بدون بيانات مالية)
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-700 transition-colors">
                    download
                  </span>
                </button>
              </div>

              {/* User Account & System Details Card */}
              <div className="mt-2 p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs flex flex-col gap-3 text-right">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1A7B88] text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                      {currentUser.initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{currentUser.name}</h3>
                      <span className="text-xs text-[#125862] font-semibold">
                        {currentUser.title || 'المشرف العام للأكاديمية'} · {currentUser.email}
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200/60">
                    نظام 1446هـ
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={fetchFromSupabase}
                    className="min-h-[44px] flex-1 px-3 py-2 rounded-xl bg-gray-50 hover:bg-[#EAF5F7] text-[#125862] border border-gray-200/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">sync</span>
                    <span>تحديث البيانات من السيرفر</span>
                  </button>

                  <button
                    onClick={logout}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-section: STUDENTS (Detailed Students List without financial data) */}
          {moreSection === 'students' && (
            <div className="flex flex-col gap-3">
              {/* Back to Menu Bar + Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
                <button
                  onClick={() => setMoreSection('menu')}
                  className="min-h-[40px] inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#125862] hover:text-[#1A7B88] cursor-pointer self-start"
                >
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  <span>العودة لقائمة المزيد</span>
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => exportToExcel(filteredStudents)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-gray-200/80 text-gray-700 hover:bg-gray-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="تصدير بيانات الطلاب بصيغة Excel"
                  >
                    <span className="material-symbols-outlined text-base text-[#1A7B88]">
                      file_download
                    </span>
                    <span>تصدير Excel</span>
                  </button>

                  <button
                    onClick={onAddStudent}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
                  >
                    <span className="material-symbols-outlined text-base">person_add</span>
                    <span>+ إضافة طالب جديد</span>
                  </button>
                </div>
              </div>

              {/* Filters for Students */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3.5 top-3 text-gray-400 text-lg pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="ابحث باسم الطالب أو الهاتف..."
                    className="w-full min-h-[44px] pr-10 pl-3 rounded-xl bg-white text-sm text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs"
                  />
                </div>

                <div>
                  <select
                    value={studentTeacherFilter}
                    onChange={(e) => setStudentTeacherFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white text-xs sm:text-sm font-semibold text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs cursor-pointer"
                  >
                    <option value="all">جميع المعلمين والحلقات</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.circleName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white text-xs sm:text-sm font-semibold text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs cursor-pointer"
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="active">نشط ومنتظم</option>
                    <option value="overdue">متأخر بلا تقرير (&gt; 30 يوماً)</option>
                    <option value="vacation">في إجازة رسمية</option>
                  </select>
                </div>
              </div>

              {/* Student Cards List (Completely without financial data) */}
              {filteredStudents.length === 0 ? (
                <div className="py-12 bg-white rounded-2xl border border-gray-200/80 text-center flex flex-col items-center justify-center p-6 gap-2">
                  <span className="material-symbols-outlined text-4xl text-gray-300">school</span>
                  <p className="text-sm font-bold text-gray-900">لا يوجد طلاب يطابقون شروط البحث</p>
                  <p className="text-xs text-gray-500">جرب مسح البحث أو تغيير المعلم المحدد</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredStudents.map((student) => {
                    const teacher = getTeacherById(student.teacherId);
                    const reportInfo = getReportStatusInfo(student.lastReportDate);
                    const isLate = reportInfo.isOverdue && student.status === 'active';
                    const isVacation = student.status === 'vacation';

                    return (
                      <div
                        key={`gs-student-${student.id}`}
                        className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 text-right"
                      >
                        {/* Row 1: Name + Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#EAF5F7] text-[#125862] font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
                              {student.initials}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate">
                                {student.name}
                              </h3>
                              <span className="text-xs text-gray-500 font-medium block truncate">
                                المعلم: {teacher?.name || 'غير محدد'} ({teacher?.circleName})
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          {isVacation ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold shrink-0">
                              إجازة
                            </span>
                          ) : isLate ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold shrink-0">
                              متأخر (&gt; 30 يوماً)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold shrink-0">
                              منتظم
                            </span>
                          )}
                        </div>

                        {/* Row 2: Progress & Schedule (PURELY ACADEMIC) */}
                        <div className="p-2.5 rounded-xl bg-[#F5F5F7] border border-gray-200/60 flex flex-col gap-1 text-xs text-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">مسار الحفظ:</span>
                            <span className="font-bold text-gray-900 truncate max-w-[200px]">
                              {student.surahProgress || 'حلقة القرآن الكريم'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">آخر تقرير:</span>
                            <span className="font-mono text-gray-700" dir="ltr">
                              {student.lastReportDate || 'غير مسجل'}
                            </span>
                          </div>
                        </div>

                        {/* Row 3: Action Buttons (>= 44px) */}
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                          <button
                            onClick={() => setSelectedStudentForDetails(student)}
                            className="min-h-[44px] flex-1 px-3 py-1.5 rounded-xl bg-[#EAF5F7] hover:bg-[#d9eff3] text-[#125862] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                            <span>التفاصيل</span>
                          </button>

                          <button
                            onClick={() => onEditStudent(student)}
                            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs active:scale-98"
                            title="تعديل بيانات الطالب"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                            <span>تعديل</span>
                          </button>

                          {student.parentPhone && (
                            <a
                              href={getParentWhatsAppUrl(student.parentPhone, student.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center transition-colors shadow-2xs active:scale-95"
                              title={`محادثة واتساب مع ولي أمر ${student.name}`}
                              aria-label={`واتساب ولي أمر ${student.name}`}
                            >
                              <span className="material-symbols-outlined text-base">chat</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-section: REPORTS */}
          {moreSection === 'reports' && (
            <div className="flex flex-col gap-3">
              {/* Back to Menu Bar */}
              <div className="flex items-center justify-between gap-2 px-0.5">
                <button
                  onClick={() => setMoreSection('menu')}
                  className="min-h-[40px] inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#125862] hover:text-[#1A7B88] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  <span>العودة لقائمة المزيد</span>
                </button>

                <span className="text-xs text-gray-500 font-medium">
                  إجمالي التقارير: {filteredReports.length}
                </span>
              </div>

              {/* Reports Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3.5 top-3 text-gray-400 text-lg pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    placeholder="ابحث باسم الطالب أو المعلم..."
                    className="w-full min-h-[44px] pr-10 pl-3 rounded-xl bg-white text-sm text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs"
                  />
                </div>

                <div>
                  <select
                    value={reportGradeFilter}
                    onChange={(e) => setReportGradeFilter(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white text-xs sm:text-sm font-semibold text-[#1D1D1F] border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] shadow-2xs cursor-pointer"
                  >
                    <option value="all">جميع التقديرات</option>
                    <option value="excellent">ممتاز</option>
                    <option value="very_good">جيد جداً</option>
                  </select>
                </div>
              </div>

              {/* Reports Cards */}
              {filteredReports.length === 0 ? (
                <div className="py-12 bg-white rounded-2xl border border-gray-200/80 text-center flex flex-col items-center justify-center p-6 gap-2">
                  <span className="material-symbols-outlined text-4xl text-gray-300">verified</span>
                  <p className="text-sm font-bold text-gray-900">لا توجد تقارير مطابقة</p>
                  <p className="text-xs text-gray-500">جرب مسح البحث أو تغيير فلتر التقدير</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {filteredReports.map((report) => {
                    const student = students.find((s) => s.id === report.studentId);
                    const teacher = getTeacherById(report.teacherId);

                    return (
                      <div
                        key={report.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-lg">verified</span>
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-gray-900">
                                {student?.name || 'طالب'}
                              </h4>
                              <span className="text-xs text-gray-500">·</span>
                              <span className="text-xs text-[#125862] font-semibold">
                                المعلم: {teacher?.name || 'غير محدد'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                {report.grade || 'ممتاز'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1 leading-relaxed">
                              {report.memorizationDetails || report.performanceSummary}
                            </p>
                            <span className="text-[11px] text-gray-400 block mt-0.5 font-mono" dir="ltr">
                              {report.reportDate}
                            </span>
                          </div>
                        </div>

                        {/* Actions: Download PDF + WhatsApp */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {student && (
                            <button
                              type="button"
                              onClick={() =>
                                generateStudentReportPdf({
                                  student,
                                  teacher,
                                  report,
                                  recordedByName: currentUser.name,
                                })
                              }
                              className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white border border-gray-200 text-[#125862] hover:bg-[#EAF5F7] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="تحميل وطباعة تقرير الـ 8 حصص PDF"
                            >
                              <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                              <span>تحميل PDF</span>
                            </button>
                          )}

                          {student?.parentPhone && (
                            <a
                              href={getReportWhatsAppUrl(student.parentPhone, student.name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center transition-colors shadow-2xs active:scale-95"
                              title="إرسال التقرير لولي الأمر عبر واتساب"
                            >
                              <span className="material-symbols-outlined text-lg">chat</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Mobile Bottom Navigation: «الرئيسية» · «الفريق» · «المتابعة» · «المزيد» */}
      {/* ========================================================================= */}
      <GeneralSupervisorBottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'more') {
            setMoreSection('menu');
          }
        }}
        overdueCount={overdueStudentsCount}
        teachersCount={teachers.length}
        visitsCount={storedObservations.length}
      />

      {/* ========================================================================= */}
      {/* Modals */}
      {/* ========================================================================= */}
      {/* 1. Observation Details Modal */}
      <ViewObservationNoteModal
        isOpen={isObservationsModalOpen}
        onClose={() => {
          setIsObservationsModalOpen(false);
          setSelectedObsStudentId(undefined);
        }}
        targetStudentId={selectedObsStudentId}
      />

      {/* 2. Student Details Modal */}
      <StudentDetailsModal
        isOpen={selectedStudentForDetails !== null}
        student={selectedStudentForDetails}
        onClose={() => setSelectedStudentForDetails(null)}
        onEditStudent={(s) => {
          setSelectedStudentForDetails(null);
          onEditStudent(s);
        }}
        onAddReport={(s) => {
          setSelectedStudentForDetails(null);
          onAddReport(s);
        }}
        onManageVacation={(s) => {
          setSelectedStudentForDetails(null);
          onManageVacation(s);
        }}
      />

      {/* 3. Modal for viewing teacher's circle students */}
      {selectedTeacherForStudents && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] text-right">
            <div className="px-5 py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div>
                <h3 className="font-bold text-base sm:text-lg">
                  طلاب {selectedTeacherForStudents.name}
                </h3>
                <span className="text-xs text-[#EAF5F7]">
                  {selectedTeacherForStudents.circleName}
                </span>
              </div>
              <button
                onClick={() => setSelectedTeacherForStudents(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/15 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5">
              {students.filter((s) => s.teacherId === selectedTeacherForStudents.id).length ===
              0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  لا يوجد طلاب مسجلون في حلقة هذا المعلم حتى الآن.
                </div>
              ) : (
                students
                  .filter((s) => s.teacherId === selectedTeacherForStudents.id)
                  .map((st) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-xl bg-[#F5F5F7] border border-gray-200/60 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-sm text-gray-900 block">{st.name}</span>
                        <span className="text-xs text-gray-500">
                          {st.surahProgress || 'حلقة القرآن'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTeacherForStudents(null);
                          setSelectedStudentForDetails(st);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[#125862] text-xs font-bold hover:bg-[#EAF5F7] transition-colors cursor-pointer"
                      >
                        عرض
                      </button>
                    </div>
                  ))
              )}
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedTeacherForStudents(null)}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Management Modal: Add Teacher / Sub-Supervisor */}
      <AddSystemUserModal
        isOpen={isAddUserOpen}
        initialRole={addUserInitialRole}
        allowedRoles={['teacher', 'sub_supervisor']}
        onClose={() => setIsAddUserOpen(false)}
        onSuccess={() => fetchFromSupabase()}
      />

      {/* Team Management Modal: Change Supervisor */}
      <ChangeSupervisorModal
        isOpen={Boolean(selectedTeacherForChangeSup)}
        teacher={selectedTeacherForChangeSup}
        onClose={() => setSelectedTeacherForChangeSup(null)}
        onSuccess={() => fetchFromSupabase()}
      />
    </div>
  );
};
