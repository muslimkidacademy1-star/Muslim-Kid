import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Teacher } from '../../types';
import { getParentWhatsAppUrl, getTeacherReminderWhatsAppUrl } from '../../utils/whatsapp';
import { RecordObservationModal } from '../modals/RecordObservationModal';
import { getTodayArabicWeekday } from '../../mock/initialData';

interface EducationalSupervisorViewProps {
  onAddReport: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onManageVacation: (student: Student) => void;
  onOpenActivityLog?: () => void;
  onAddStudent?: () => void;
}

export const EducationalSupervisorView: React.FC<EducationalSupervisorViewProps> = ({
  onAddReport,
  onEditStudent,
  onManageVacation,
  onOpenActivityLog,
  onAddStudent,
}) => {
  const {
    currentUser,
    visibleStudents,
    visibleTeachers,
    reports,
    getTeacherById,
    getDaysSinceLastReport,
    getReportStatusInfo,
    exportToExcel,
    addActivityLog,
  } = useApp();

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'live_observation' | 'radar' | 'students_list' | 'observation_logs'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [selectedReportStatus, setSelectedReportStatus] = useState<string>('all');
  const [selectedStudentStatus, setSelectedStudentStatus] = useState<string>('all');

  // Observation Modal state
  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [selectedObservationTeacher, setSelectedObservationTeacher] = useState<Teacher | undefined>(undefined);
  const [selectedObservationStudent, setSelectedObservationStudent] = useState<Student | undefined>(undefined);

  // Quick Action notification banner
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
        return {
          student,
          teacher,
          sessionTime: student.sessionTime || '04:30 م بتوقيت مكة',
          meetingUrl: student.meetingUrl,
        };
      });
  }, [visibleStudents, todayWeekday, getTeacherById]);

  // 2. Reports Radar: Students with overdue (>30 days) or warning (>25 days) reports
  const radarAlertStudents = useMemo(() => {
    return visibleStudents
      .filter((s) => {
        if (s.status !== 'active') return false;
        const days = getDaysSinceLastReport(s.lastReportDate);
        return days > 25;
      })
      .map((student) => {
        const teacher = getTeacherById(student.teacherId);
        const days = getDaysSinceLastReport(student.lastReportDate);
        const isUrgent = days > 30;
        return {
          student,
          teacher,
          days,
          isUrgent,
        };
      })
      .sort((a, b) => b.days - a.days);
  }, [visibleStudents, getDaysSinceLastReport, getTeacherById]);

  // 3. Supervisor Metrics (Completely strictly non-financial)
  const totalAssignedTeachers = visibleTeachers.length;
  const totalAssignedStudents = visibleStudents.length;
  const activeStudentsCount = visibleStudents.filter((s) => s.status === 'active').length;
  const pendingAlertsCount = radarAlertStudents.length;

  // Completed reports for this supervisor's students
  const completedReportsCount = useMemo(() => {
    const studentIds = new Set(visibleStudents.map((s) => s.id));
    return reports.filter((r) => studentIds.has(r.studentId)).length;
  }, [reports, visibleStudents]);

  const completionRate = useMemo(() => {
    if (totalAssignedStudents === 0) return 0;
    const regularStudentsCount = visibleStudents.filter(
      (s) => s.status === 'active' && getDaysSinceLastReport(s.lastReportDate) <= 25
    ).length;
    return Math.round((regularStudentsCount / totalAssignedStudents) * 100);
  }, [totalAssignedStudents, visibleStudents, getDaysSinceLastReport]);

  // Send WhatsApp reminder to teacher
  const handleSendTeacherWhatsAppReminder = (teacher: Teacher | undefined, student: Student) => {
    if (!teacher || !teacher.phone) {
      setActionAlert(`لا يتوفر رقم هاتف مسجل للمعلم.`);
      setTimeout(() => setActionAlert(null), 3500);
      return;
    }

    const whatsappUrl = getTeacherReminderWhatsAppUrl(teacher.phone, student.name);
    window.open(whatsappUrl, '_blank');

    addActivityLog(
      'تذكير المعلم عبر واتساب',
      student.name,
      student.id,
      `تم إرسال رسالة تذكير عبر واتساب للشيخ/الأستاذ ${teacher.name} بتسليم تقرير إنجاز 8 حصص للطالب ${student.name}`
    );

    setActionAlert(`تم فتح محادثة واتساب لتذكير ${teacher.name} بتقرير الطالب ${student.name}`);
    setTimeout(() => setActionAlert(null), 4000);
  };

  // Open Observation Modal
  const handleOpenObservation = (teacher?: Teacher, student?: Student) => {
    setSelectedObservationTeacher(teacher);
    setSelectedObservationStudent(student);
    setIsObservationModalOpen(true);
  };

  // Saved observation logs from localStorage
  const storedObservationNotes = useMemo(() => {
    try {
      const data = JSON.parse(localStorage.getItem('mk_observation_notes') || '[]');
      if (Array.isArray(data)) {
        // filter for this supervisor or teachers
        const teacherIds = new Set(visibleTeachers.map((t) => t.id));
        return data.filter((item: any) => teacherIds.has(item.teacherId));
      }
    } catch {
      // fallback
    }
    return [];
  }, [visibleTeachers, isObservationModalOpen]);

  // Filter students list
  const filteredStudents = useMemo(() => {
    return visibleStudents.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const teacher = getTeacherById(s.teacherId);
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.parentPhone.includes(q) ||
        s.surahProgress.toLowerCase().includes(q) ||
        (teacher?.name && teacher.name.toLowerCase().includes(q));

      const matchesTeacher =
        selectedTeacherId === 'all' || s.teacherId === selectedTeacherId;

      const days = getDaysSinceLastReport(s.lastReportDate);
      const matchesReport =
        selectedReportStatus === 'all' ||
        (selectedReportStatus === 'overdue' && days > 30) ||
        (selectedReportStatus === 'warning' && days > 25 && days <= 30) ||
        (selectedReportStatus === 'regular' && days <= 25);

      const matchesStudentStatus =
        selectedStudentStatus === 'all' || s.status === selectedStudentStatus;

      return matchesSearch && matchesTeacher && matchesReport && matchesStudentStatus;
    });
  }, [
    visibleStudents,
    searchQuery,
    selectedTeacherId,
    selectedReportStatus,
    selectedStudentStatus,
    getTeacherById,
    getDaysSinceLastReport,
  ]);

  return (
    <div className="flex flex-col w-full gap-6 text-right" dir="rtl">
      {/* Toast Alert Banner */}
      {actionAlert && (
        <div className="p-4 rounded-2xl bg-[#005253] text-white flex items-center justify-between shadow-lg animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl text-[#a6eff1]">mark_chat_read</span>
            <span className="text-sm font-semibold">{actionAlert}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Supervisor Header Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-r from-[#005253] via-[#004243] to-[#002b2c] text-white p-6 sm:p-7 shadow-md border border-[#005253]/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="flex items-center gap-4 z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-2xl font-bold shadow-inner flex-shrink-0">
            {currentUser.initials || 'م'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[#a6eff1] text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">verified_user</span>
                <span>بوابة المشرف الفرعي (الميداني)</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#fde047] text-[#713f12] text-xs font-bold">
                {currentUser.title || 'مشرف الحلقات'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#6ff7f8] text-[#003738] text-xs font-black">
                اليوم: {todayWeekday}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              مرحباً بك، {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#e7eeff]/90 mt-1 max-w-xl leading-relaxed">
              متابعة ميدانية حية لحلقات المعلمين التابعين لك، رصد حصص اليوم المباشرة، وتسجيل ملاحظات المراقبة ورادار التقارير
            </p>
          </div>
        </div>

        {/* Supervisor Quick Navigation Tabs */}
        <div className="flex items-center gap-2 flex-wrap z-10 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white text-[#005253] shadow-md'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            <span>الرئيسية والمراقبة</span>
          </button>
          <button
            onClick={() => setActiveTab('live_observation')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'live_observation'
                ? 'bg-white text-[#005253] shadow-md'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <span className="material-symbols-outlined text-base">live_tv</span>
            <span>حصص اليوم ({todayClasses.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'radar'
                ? 'bg-white text-[#ba1a1a] shadow-md'
                : 'bg-[#ba1a1a]/80 text-white hover:bg-[#ba1a1a]'
            }`}
          >
            <span className="material-symbols-outlined text-base">radar</span>
            <span>رادار التنبيهات ({pendingAlertsCount})</span>
          </button>
        </div>
      </section>

      {/* 4 KPI METRICS CARDS (Purely Educational & Operational - ZERO FINANCIALS) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Assigned Teachers */}
        <div className="rounded-3xl bg-white shadow-xs border border-[#bec8c8]/25 p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#526060] mb-1 font-bold">
              المعلمون التابعون لإشرافي
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#005253]">{totalAssignedTeachers}</span>
              <span className="text-xs text-[#6f7979]">معلمين بحلقاتهم</span>
            </div>
            <span className="text-[11px] text-[#005253] flex items-center gap-1 mt-1 font-semibold">
              <span className="material-symbols-outlined text-xs">check_circle</span>
              <span>تغطية إشرافية كاملة</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#005253]/10 text-[#005253] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
        </div>

        {/* KPI 2: Assigned Students */}
        <div className="rounded-3xl bg-white shadow-xs border border-[#bec8c8]/25 p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#526060] mb-1 font-bold">
              إجمالي الطلاب التابعين لي
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#0284c7]">{totalAssignedStudents}</span>
              <span className="text-xs text-[#6f7979]">طالباً ({activeStudentsCount} نشط)</span>
            </div>
            <span className="text-[11px] text-[#0284c7] flex items-center gap-1 mt-1 font-semibold">
              <span className="material-symbols-outlined text-xs">school</span>
              <span>حلقات القرآن والتلقين</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#f0f9ff] text-[#0284c7] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">person_pin</span>
          </div>
        </div>

        {/* KPI 3: Completed Reports */}
        <div className="rounded-3xl bg-white shadow-xs border border-[#bec8c8]/25 p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#526060] mb-1 font-bold">
              التقارير المنجزة والمعتمدة
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-[#15803d]">{completedReportsCount}</span>
              <span className="text-xs text-[#6f7979]">تقرير 8 حصص</span>
            </div>
            <span className="text-[11px] text-[#15803d] flex items-center gap-1 mt-1 font-semibold">
              <span className="material-symbols-outlined text-xs">verified</span>
              <span>نسبة الانتظام: {completionRate}%</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#dcfce7] text-[#15803d] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">task_alt</span>
          </div>
        </div>

        {/* KPI 4: Pending Alerts */}
        <div className={`rounded-3xl shadow-xs border p-5 flex items-center justify-between transition-all ${
          pendingAlertsCount > 0
            ? 'bg-[#fff5f5] border-[#ba1a1a]/30'
            : 'bg-white border-[#bec8c8]/25'
        }`}>
          <div className="flex flex-col">
            <span className="text-xs text-[#526060] mb-1 font-bold">
              التنبيهات المعلقة (تأخر تقارير)
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${pendingAlertsCount > 0 ? 'text-[#ba1a1a]' : 'text-[#005253]'}`}>
                {pendingAlertsCount}
              </span>
              <span className="text-xs text-[#6f7979]">طالباً بحاجة لتذكير</span>
            </div>
            <span className={`text-[11px] flex items-center gap-1 mt-1 font-semibold ${
              pendingAlertsCount > 0 ? 'text-[#ba1a1a]' : 'text-[#15803d]'
            }`}>
              <span className="material-symbols-outlined text-xs">
                {pendingAlertsCount > 0 ? 'error' : 'done_all'}
              </span>
              <span>{pendingAlertsCount > 0 ? 'تجاوزوا 25/30 يوماً' : 'لا توجد متأخرات'}</span>
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            pendingAlertsCount > 0 ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#dcfce7] text-[#15803d]'
          }`}>
            <span className="material-symbols-outlined text-2xl">
              {pendingAlertsCount > 0 ? 'alarm_on' : 'verified_user'}
            </span>
          </div>
        </div>
      </section>

      {/* ASSIGNED TEACHERS FILTER STRIP */}
      <section className="bg-white rounded-3xl shadow-xs border border-[#bec8c8]/25 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#005253] text-xl">co_present</span>
            <h3 className="font-bold text-sm sm:text-base text-[#111c2d]">
              المعلمون التابعون لإشرافك ({totalAssignedTeachers} معلمين):
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTeacherId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedTeacherId === 'all'
                  ? 'bg-[#005253] text-white shadow-xs'
                  : 'bg-[#f0f3ff] text-[#526060] hover:bg-[#e7eeff]'
              }`}
            >
              عرض الجميع
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {visibleTeachers.map((teacher) => {
            const isSelected = selectedTeacherId === teacher.id;
            const teacherStudents = visibleStudents.filter((s) => s.teacherId === teacher.id);
            const teacherOverdueStudents = teacherStudents.filter(
              (s) => s.status === 'active' && getDaysSinceLastReport(s.lastReportDate) > 25
            );

            return (
              <div
                key={teacher.id}
                className={`text-right flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                  isSelected
                    ? 'ring-2 ring-[#005253] bg-[#005253]/10 border-[#005253]'
                    : teacherOverdueStudents.length > 0
                    ? 'bg-[#fff5f5] hover:bg-[#ffebee] border-[#ffdad6]'
                    : 'bg-[#f0f3ff] hover:bg-[#e7eeff] border-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedTeacherId(isSelected ? 'all' : teacher.id)}
                  className="flex items-center gap-3 min-w-0 flex-1 text-right cursor-pointer"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs ${
                      teacherOverdueStudents.length > 0 ? 'bg-[#ba1a1a] text-white' : 'bg-[#005253] text-white'
                    }`}
                  >
                    {teacher.initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-[#111c2d] truncate">
                      {teacher.name}
                    </span>
                    <span className="text-[11px] text-[#526060] truncate">
                      {teacherStudents.length} طلاب • {teacher.circleName}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-1.5 flex-shrink-0 mr-2">
                  {/* Button to open quick observation on this teacher */}
                  <button
                    onClick={() => handleOpenObservation(teacher)}
                    title="تسجيل ملاحظة مراقبة ميدانية لهذا المعلم"
                    className="w-8 h-8 rounded-xl bg-white border border-[#bec8c8]/30 hover:bg-[#005253] hover:text-white text-[#005253] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">visibility</span>
                  </button>

                  {/* Overdue alert badge */}
                  {teacherOverdueStudents.length > 0 ? (
                    <span
                      title={`${teacherOverdueStudents.length} طلاب متأخرين`}
                      className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">alarm</span>
                      <span>{teacherOverdueStudents.length}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[10px] font-bold">
                      منتظم
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 1: OBSERVATION LIVE HUB (حصص المراقبة اليومية) */}
      {(activeTab === 'overview' || activeTab === 'live_observation') && (
        <section className="bg-white rounded-3xl shadow-xs border-2 border-[#005253]/25 p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#bec8c8]/25">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-[#005253] text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-2xl">live_tv</span>
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-[#003738]">
                    حصص المراقبة اليومية (Observation Live Hub)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#005253] text-white text-xs font-bold">
                    {todayClasses.length} حصص مقررة اليوم ({todayWeekday})
                  </span>
                </div>
                <p className="text-xs text-[#526060] mt-0.5">
                  جدول حي يجمع حصص اليوم لمعلميك مع إمكانية الدخول المباشر للغرفة وتسجيل تقييم وملاحظة المراقبة الميدانية
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenObservation(visibleTeachers[0])}
              className="px-4 py-2 rounded-xl bg-[#005253] hover:bg-[#186b6d] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-base">rate_review</span>
              <span>+ تسجيل ملاحظة مراقبة عامة</span>
            </button>
          </div>

          {todayClasses.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-[#005253]/40 mb-2">
                event_available
              </span>
              <p className="text-sm font-bold text-[#111c2d]">
                لا توجد حصص مجدولة لهذا اليوم ({todayWeekday}) لمعلميك
              </p>
              <p className="text-xs text-[#6f7979] mt-1">
                يمكنك مراجعة رادار التنبيهات أو قائمة الطلاب لمتابعة الخطط الدراسية
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse">
                  <thead>
                    <tr className="bg-[#f0f3ff] text-[#005253] font-bold text-xs border-b border-[#bec8c8]/30">
                      <th className="py-3 px-3.5 rounded-r-xl">المعلم والحلقة</th>
                      <th className="py-3 px-3.5">اسم الطالب</th>
                      <th className="py-3 px-3.5">مسار الحفظ</th>
                      <th className="py-3 px-3.5">توقيت الحصة (مكة)</th>
                      <th className="py-3 px-3.5">دورة الـ 8 حصص</th>
                      <th className="py-3 px-3.5 text-center rounded-l-xl">إجراءات المراقبة الميدانية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bec8c8]/20">
                    {todayClasses.map(({ student, teacher, sessionTime, meetingUrl }) => {
                      const cycleCount = student.currentCycleSessionsCount || 0;
                      return (
                        <tr
                          key={`today-class-${student.id}`}
                          className="hover:bg-[#f9f9ff] transition-colors"
                        >
                          {/* Teacher & Circle */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#005253] text-white font-bold flex items-center justify-center text-xs">
                                {teacher?.initials || 'م'}
                              </div>
                              <div>
                                <div className="font-bold text-xs sm:text-sm text-[#111c2d]">
                                  {teacher?.name || 'معلم غير محدد'}
                                </div>
                                <div className="text-[11px] text-[#526060]">
                                  {teacher?.circleName}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Student Name */}
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-xs sm:text-sm text-[#111c2d]">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-[#6f7979] font-mono dir-ltr inline-block">
                              {student.parentPhone}
                            </div>
                          </td>

                          {/* Progress */}
                          <td className="py-3 px-3.5 text-xs text-[#3f4949] max-w-[200px] truncate">
                            {student.surahProgress}
                          </td>

                          {/* Mecca Time */}
                          <td className="py-3 px-3.5">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#005253] bg-[#e7eeff] px-2.5 py-1 rounded-lg">
                              <span className="material-symbols-outlined text-xs">schedule</span>
                              <span>{sessionTime}</span>
                            </span>
                          </td>

                          {/* 8-Session Cycle Progress */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black font-mono text-[#005253]">
                                {cycleCount}/8
                              </span>
                              <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden flex">
                                <div
                                  className="bg-[#005253] h-full"
                                  style={{ width: `${Math.min(100, (cycleCount / 8) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Observation Actions */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center justify-center gap-2">
                              {/* Button: دخول الحصة */}
                              {meetingUrl ? (
                                <a
                                  href={meetingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">videocam</span>
                                  <span>دخول الحصة</span>
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-400 text-xs font-medium cursor-not-allowed flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-sm">videocam_off</span>
                                  <span>لا يوجد رابط</span>
                                </button>
                              )}

                              {/* Button: تسجيل ملاحظة مراقبة */}
                              <button
                                onClick={() => handleOpenObservation(teacher, student)}
                                className="px-3 py-1.5 rounded-xl bg-[#005253] hover:bg-[#186b6d] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">rate_review</span>
                                <span>تسجيل ملاحظة مراقبة</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Vertical Cards View (Thumb-Friendly, No Horizontal Overflow) */}
              <div className="md:hidden flex flex-col gap-3.5">
                {todayClasses.map(({ student, teacher, sessionTime, meetingUrl }) => {
                  const cycleCount = student.currentCycleSessionsCount || 0;
                  return (
                    <div
                      key={`mob-today-${student.id}`}
                      className="p-4 rounded-2xl bg-[#f9f9ff] border border-[#bec8c8]/30 shadow-2xs flex flex-col gap-3"
                    >
                      {/* Top Row: Teacher & Mecca Time */}
                      <div className="flex items-center justify-between gap-2 border-b border-[#bec8c8]/20 pb-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#005253] text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                            {teacher?.initials || 'م'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-[#111c2d] block truncate">
                              {teacher?.name || 'معلم غير محدد'}
                            </span>
                            <span className="text-[11px] text-[#526060] block truncate">
                              {teacher?.circleName}
                            </span>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#005253] bg-[#dee8ff] px-2.5 py-1 rounded-xl flex-shrink-0">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          <span>{sessionTime}</span>
                        </span>
                      </div>

                      {/* Student Info & Surah */}
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-[#111c2d]">
                            {student.name}
                          </h4>
                          <span className="text-xs text-[#526060] block mt-0.5">
                            {student.surahProgress}
                          </span>
                        </div>

                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="text-[10px] text-[#6f7979]">دورة الـ 8 حصص</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-black font-mono text-[#005253]">
                              {cycleCount}/8
                            </span>
                            <div className="w-12 bg-gray-200 h-2 rounded-full overflow-hidden flex">
                              <div
                                className="bg-[#005253] h-full"
                                style={{ width: `${Math.min(100, (cycleCount / 8) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Parent Phone */}
                      <div className="flex items-center justify-between text-xs text-[#6f7979] bg-white p-2 rounded-xl border border-[#bec8c8]/20">
                        <span>رقم ولي الأمر:</span>
                        <a
                          href={`https://wa.me/${student.parentPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[#15803d] font-bold dir-ltr flex items-center gap-1 hover:underline"
                        >
                          <span className="material-symbols-outlined text-sm">chat</span>
                          <span>{student.parentPhone}</span>
                        </a>
                      </div>

                      {/* Comfortable Thumb-friendly Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {meetingUrl ? (
                          <a
                            href={meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-11 rounded-xl bg-[#0284c7] active:bg-[#0369a1] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-98"
                          >
                            <span className="material-symbols-outlined text-lg">videocam</span>
                            <span>دخول الحصة</span>
                          </a>
                        ) : (
                          <button
                            disabled
                            className="h-11 rounded-xl bg-gray-100 text-gray-400 text-xs font-medium cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-lg">videocam_off</span>
                            <span>لا يوجد رابط</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenObservation(teacher, student)}
                          className="h-11 rounded-xl bg-[#005253] active:bg-[#186b6d] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-98 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">rate_review</span>
                          <span>تسجيل ملاحظة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* SECTION 2: REPORTS RADAR (رادار متابعة المعلمين والتقارير المتأخرة) */}
      {(activeTab === 'overview' || activeTab === 'radar') && (
        <section className="bg-white rounded-3xl shadow-xs border-2 border-[#ba1a1a]/30 p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#bec8c8]/25">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-[#ba1a1a] text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-2xl">radar</span>
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-[#ba1a1a]">
                    رادار المعلمين والتقارير المتأخرة (Reports Radar)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] font-bold text-xs">
                    {radarAlertStudents.length} طلاب تجاوزوا 25 يوماً
                  </span>
                </div>
                <p className="text-xs text-[#526060] mt-0.5">
                  رصد دقيق للطلاب المتأخرين عن دورة الـ 8 حصص مع زر تذكير مباشر للمعلم عبر واتساب بنص جاهز ومُوجَّه
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#ba1a1a] bg-[#fff5f5] px-3 py-1.5 rounded-xl border border-[#ffdad6]">
                تجاوز 30 يوماً = تنبيه أحمر عاجل
              </span>
            </div>
          </div>

          {radarAlertStudents.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-[#15803d]/40 mb-2">
                task_alt
              </span>
              <p className="text-base font-bold text-[#15803d]">
                رائع جداً! لا يوجد أي تأخير في تسليم تقارير الـ 8 حصص لدى معلميك
              </p>
              <p className="text-xs text-[#6f7979] mt-1">
                جميع الطلاب ملتزمون بجدول الحصص والتقارير الدورية دون أي تجاوز لفترة 25 يوماً
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {radarAlertStudents.map(({ student, teacher, days, isUrgent }) => {
                return (
                  <div
                    key={`radar-${student.id}`}
                    className={`rounded-2xl p-4 border transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                      isUrgent
                        ? 'bg-[#fff5f5] border-[#ba1a1a]/40 ring-1 ring-[#ba1a1a]/20'
                        : 'bg-[#fefce8] border-[#eab308]/40'
                    }`}
                  >
                    <div>
                      {/* Badge & Timing */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                            isUrgent
                              ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30'
                              : 'bg-[#fef9c3] text-[#854d0e] border border-[#fde047]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">
                            {isUrgent ? 'error' : 'alarm'}
                          </span>
                          <span>
                            {isUrgent ? `متأخر (${days} يوماً)` : `تحذير (${days} يوماً)`}
                          </span>
                        </span>

                        <span className="text-[11px] font-bold text-[#526060]">
                          دورة: {student.currentCycleSessionsCount || 0}/8 حصص
                        </span>
                      </div>

                      {/* Student info */}
                      <h4 className="font-bold text-sm text-[#111c2d] mb-0.5">
                        {student.name}
                      </h4>
                      <p className="text-xs text-[#526060] mb-2 truncate">
                        {student.surahProgress}
                      </p>

                      {/* Teacher assigned */}
                      <div className="bg-white/80 rounded-xl p-2.5 border border-black/5 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-[#6f7979] block">المعلم المسؤول:</span>
                          <span className="font-bold text-[#111c2d]">{teacher?.name || 'غير محدد'}</span>
                          <span className="text-[11px] text-[#005253] block">{teacher?.circleName}</span>
                        </div>
                        <div className="text-left font-mono text-[11px] text-gray-500 dir-ltr">
                          {teacher?.phone || 'لا يوجد رقم'}
                        </div>
                      </div>
                    </div>

                    {/* Action: WhatsApp Teacher Reminder Button */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleSendTeacherWhatsAppReminder(teacher, student)}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#1eb757] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        title="إرسال رسالة تذكير فورية للمعلم عبر واتساب"
                      >
                        <span className="material-symbols-outlined text-base">chat</span>
                        <span>تذكير المعلم عبر واتساب</span>
                      </button>

                      <button
                        onClick={() => onAddReport(student)}
                        className="py-2 px-2.5 rounded-xl bg-white border border-[#005253]/30 hover:bg-[#005253]/10 text-[#005253] text-xs font-bold transition-colors cursor-pointer"
                        title="اعتماد التقرير يدوياً"
                      >
                        <span className="material-symbols-outlined text-base">edit_note</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SECTION 3: SUPERVISOR STUDENTS LIST (NON-FINANCIAL STRICT VIEW) */}
      <section className="bg-white rounded-3xl shadow-xs border border-[#bec8c8]/25 p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#bec8c8]/20">
          <div>
            <h3 className="font-bold text-lg text-[#111c2d] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005253]">school</span>
              <span>قائمة طلاب الحلقات المكلف بمتابعتها ({filteredStudents.length} طالباً)</span>
            </h3>
            <p className="text-xs text-[#6f7979] mt-0.5">
              بيانات أكاديمية ومسار التسميع وأيام الحصص (تم استبعاد كافة البيانات المالية لصلاحيات المشرف)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportToExcel(filteredStudents)}
              className="px-3.5 py-2 rounded-xl bg-[#dee8ff] text-[#005253] font-bold text-xs hover:bg-[#d8e3fb] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>تصدير السجل الشامل (Excel)</span>
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#f9f9ff] p-3.5 rounded-2xl border border-[#bec8c8]/20">
          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#6f7979] text-base pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الطالب أو السورة أو الهاتف..."
              className="w-full h-10 pr-9 pl-3 rounded-xl bg-white text-xs text-[#111c2d] border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
            />
          </div>

          {/* Teacher filter */}
          <div>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white text-xs text-[#111c2d] border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
            >
              <option value="all">كافة المعلمين التابعين لي</option>
              {visibleTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.circleName})
                </option>
              ))}
            </select>
          </div>

          {/* Report status */}
          <div>
            <select
              value={selectedReportStatus}
              onChange={(e) => setSelectedReportStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white text-xs text-[#111c2d] border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
            >
              <option value="all">كافة حالات التقارير</option>
              <option value="regular">منتظم (&lt;= 25 يوماً)</option>
              <option value="warning">تحذير (&gt; 25 يوماً)</option>
              <option value="overdue">تأخر عاجل (&gt; 30 يوماً)</option>
            </select>
          </div>

          {/* Student Status */}
          <div>
            <select
              value={selectedStudentStatus}
              onChange={(e) => setSelectedStudentStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white text-xs text-[#111c2d] border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
            >
              <option value="all">كافة حالات الطلاب</option>
              <option value="active">نشط ومستمر</option>
              <option value="vacation">في فترة إجازة</option>
              <option value="expired">منتهي</option>
            </select>
          </div>
        </div>

        {/* Student Cards or Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-[#6f7979]">
              لا توجد نتائج مطابقة لشروط البحث والفلترة المحددة.
            </div>
          ) : (
            filteredStudents.map((student) => {
              const teacher = getTeacherById(student.teacherId);
              const repInfo = getReportStatusInfo(student.lastReportDate);
              const isRed = repInfo.isOverdue && student.status === 'active';
              const isYellow = repInfo.isWarning && student.status === 'active';
              const cycleCount = student.currentCycleSessionsCount || 0;

              return (
                <div
                  key={student.id}
                  className={`bg-white rounded-2xl p-4 border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 ${
                    isRed
                      ? 'border-[#ba1a1a]/40 bg-[#fff5f5]'
                      : isYellow
                      ? 'border-[#eab308]/40 bg-[#fefce8]'
                      : 'border-[#bec8c8]/25'
                  }`}
                >
                  <div>
                    {/* Top Row: Name & Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#005253] text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
                          {student.initials}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#111c2d] leading-tight">
                            {student.name}
                          </h4>
                          <span className="text-[11px] text-[#526060] block mt-0.5">
                            {student.surahProgress}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      {isRed ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold">
                          متأخر ({repInfo.days} يوماً)
                        </span>
                      ) : isYellow ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#fef9c3] text-[#854d0e] text-[10px] font-bold">
                          تحذير ({repInfo.days} يوماً)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[10px] font-bold">
                          دورة منتظمة
                        </span>
                      )}
                    </div>

                    {/* Academic details info card */}
                    <div className="bg-[#f0f3ff] rounded-xl p-2.5 text-xs flex flex-col gap-1.5 border border-[#bec8c8]/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6f7979]">المعلم والحلقة:</span>
                        <span className="font-bold text-[#111c2d]">
                          {teacher?.name || 'غير محدد'} ({teacher?.circleName})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#6f7979]">أيام الحصص:</span>
                        <span className="font-bold text-[#005253]">
                          {student.scheduleDays && student.scheduleDays.length > 0
                            ? student.scheduleDays.join('، ')
                            : 'الأحد، الثلاثاء، الخميس'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#6f7979]">توقيت الحصة:</span>
                        <span className="font-bold text-[#111c2d]">
                          {student.sessionTime || '04:30 م بتوقيت مكة'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#bec8c8]/20">
                        <span className="text-[#6f7979]">إنجاز دورة الـ 8 حصص:</span>
                        <span className="font-black text-[#005253]">
                          {cycleCount} / 8 حصص
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this student */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {/* Direct Contact parent via WhatsApp */}
                    <button
                      type="button"
                      onClick={() => {
                        const url = getParentWhatsAppUrl(student.parentPhone, student.name);
                        if (url) window.open(url, '_blank');
                      }}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-[#25D366] text-[#128C7E] hover:bg-[#25D366]/10 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="مراسلة ولي الأمر عبر واتساب"
                    >
                      <span className="material-symbols-outlined text-sm">chat</span>
                      <span>ولي الأمر</span>
                    </button>

                    {/* Manage vacation */}
                    <button
                      type="button"
                      onClick={() => onManageVacation(student)}
                      className="py-1.5 px-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-colors cursor-pointer"
                      title="إدارة الإجازات"
                    >
                      <span className="material-symbols-outlined text-sm">flight_takeoff</span>
                    </button>

                    {/* Add/Review report */}
                    <button
                      type="button"
                      onClick={() => onAddReport(student)}
                      className="py-1.5 px-3 rounded-xl bg-[#005253] hover:bg-[#186b6d] text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="اعتماد تقرير 8 حصص"
                    >
                      <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                      <span>التقرير</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* SECTION 4: OBSERVATION LOGS ARCHIVE (سجل الملاحظات الميدانية السابقة) */}
      <section className="bg-white rounded-3xl shadow-xs border border-[#bec8c8]/25 p-5 sm:p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#bec8c8]/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#005253]">history_edu</span>
            <h3 className="font-bold text-base text-[#111c2d]">
              سجل تقييمات وزيارات المراقبة الميدانية ({storedObservationNotes.length} زيارة مسجلة)
            </h3>
          </div>
          <button
            onClick={() => handleOpenObservation(visibleTeachers[0])}
            className="text-xs font-bold text-[#005253] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>+ تسجيل زيارة جديدة</span>
          </button>
        </div>

        {storedObservationNotes.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#6f7979]">
            لا توجد ملاحظات مراقبة مسجلة بعد. عند زيارة أي حصة اضغط على "تسجيل ملاحظة مراقبة" لتوثيق أداء المعلم.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {storedObservationNotes.slice(0, 6).map((obs: any) => (
              <div
                key={obs.id}
                className="bg-[#f9f9ff] rounded-2xl p-3.5 border border-[#bec8c8]/20 flex flex-col justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between pb-1 border-b border-[#bec8c8]/20">
                    <span className="font-bold text-[#111c2d]">{obs.teacherName}</span>
                    <span className="flex items-center text-[#f59e0b] font-bold">
                      <span className="material-symbols-outlined text-sm">star</span>
                      <span>{obs.rating}/5</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-[#526060] mt-1">
                    {obs.circleName} {obs.studentName ? `• الطالب: ${obs.studentName}` : ''}
                  </div>
                  <p className="text-xs text-[#111c2d] mt-2 bg-white p-2 rounded-xl border border-black/5 leading-relaxed">
                    "{obs.notes}"
                  </p>
                </div>
                <div className="text-[10px] text-[#6f7979] flex items-center justify-between pt-1">
                  <span>المشرف: {obs.supervisorName}</span>
                  <span className="font-mono dir-ltr">{obs.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Observation Modal */}
      <RecordObservationModal
        isOpen={isObservationModalOpen}
        onClose={() => setIsObservationModalOpen(false)}
        teacher={selectedObservationTeacher}
        student={selectedObservationStudent}
        sessionTime={selectedObservationStudent?.sessionTime}
        meetingUrl={selectedObservationStudent?.meetingUrl}
      />
    </div>
  );
};
