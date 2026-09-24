import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { getParentWhatsAppUrl } from '../../utils/whatsapp';

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
    visibleStudents,
    visibleTeachers,
    reports,
    getTeacherById,
    getDaysSinceLastReport,
    isOverdue,
    getReportStatusInfo,
    exportToExcel,
    addActivityLog,
  } = useApp();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [selectedReportStatus, setSelectedReportStatus] = useState<string>('all');
  const [selectedStudentStatus, setSelectedStudentStatus] = useState<string>('all');

  // Quick WhatsApp or reminder toast
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  const handleSendTeacherReminder = (student: Student) => {
    const teacher = getTeacherById(student.teacherId);
    addActivityLog(
      'إرسال تذكير عاجل للمعلم',
      student.name,
      student.id,
      `تم إرسال إشعار تذكير للشيخ/الأستاذ ${teacher?.name} لتأخر تقرير التسميع للطالب`
    );
    setActionAlert(`تم إرسال تنبيه عاجل إلى ${teacher?.name} بخصوص الطالب ${student.name}`);
    setTimeout(() => setActionAlert(null), 4000);
  };

  const handleContactParent = (student: Student) => {
    const url = getParentWhatsAppUrl(student.parentPhone, student.name);
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Filter logic
  const filteredStudents = useMemo(() => {
    return visibleStudents.filter((s) => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const teacher = getTeacherById(s.teacherId);
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.parentPhone.includes(query) ||
        (s.notes && s.notes.toLowerCase().includes(query)) ||
        (teacher?.name && teacher.name.toLowerCase().includes(query));

      // Teacher filter
      const matchesTeacher =
        selectedTeacherId === 'all' || s.teacherId === selectedTeacherId;

      // Report status filter (دورة الـ 8 حصص: >25 تحذير أصفر، >30 تنبيه أحمر)
      const days = getDaysSinceLastReport(s.lastReportDate);
      let reportStatus = 'regular';
      if (days > 30) reportStatus = 'overdue';
      else if (days > 25) reportStatus = 'warning';

      const matchesReport =
        selectedReportStatus === 'all' ||
        (selectedReportStatus === 'overdue' && days > 30) ||
        (selectedReportStatus === 'warning' && days > 25 && days <= 30) ||
        (selectedReportStatus === 'regular' && days <= 25);

      // Student status filter
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

  const assignedTeachersCount = visibleTeachers.length;
  const assignedStudentsCount = visibleStudents.length;
  const overdueCount = visibleStudents.filter(
    (s) => s.status === 'active' && isOverdue(s.lastReportDate)
  ).length;

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedTeacherId('all');
    setSelectedReportStatus('all');
    setSelectedStudentStatus('all');
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Toast Alert */}
      {actionAlert && (
        <div className="p-4 rounded-xl bg-[#005253] text-white flex items-center justify-between shadow-lg animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-[#a6eff1]">check_circle</span>
            <span className="text-sm font-semibold">{actionAlert}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-white/80 hover:text-white text-sm"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Header Banner & Supervisor Context */}
      <section className="relative overflow-hidden rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 p-5 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute -left-12 -bottom-16 w-56 h-56 rounded-full bg-[#a6eff1]/20 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col gap-2 z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffdea9] text-[#271900] text-xs font-bold">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>فريق الإشراف التعليمي - قطاع البنين (المستوى الأول والثاني)</span>
            </span>
            <span className="text-[#6f7979] text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">history</span>
              <span>آخر تحديث للحفظ: منذ 18 دقيقة</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111c2d]">
            لوحة تحكم المشرف التعليمي: أ. عبد الرحمن الصالح
          </h1>
          <p className="text-sm sm:text-base text-[#3f4949] max-w-3xl leading-relaxed">
            متابعة مسار الحفظ، الحضور والغياب، وتقارير التسميع للحلقات المكلف بها وفق خطة الأكاديمية الفصلية
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto z-10 flex-wrap">
          <button
            onClick={() => exportToExcel(filteredStudents)}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#dee8ff] text-[#005253] hover:bg-[#d8e3fb] transition-colors text-sm font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            <span>تصدير السجل الشامل</span>
          </button>
          <button
            onClick={() => {
              // Open add report for the first overdue student
              const overdueFirst = visibleStudents.find((s) => isOverdue(s.lastReportDate));
              if (overdueFirst) onAddReport(overdueFirst);
            }}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#005253] text-white shadow-sm hover:bg-[#186b6d] transition-colors text-sm font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">fact_check</span>
            <span>اعتماد تقارير اليوم ({overdueCount})</span>
          </button>
        </div>
      </section>

      {/* Assigned Teachers Ribbon */}
      <section className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#005253] text-xl">groups</span>
            <span className="font-bold text-sm sm:text-base text-[#111c2d]">
              المعلمين التابعين لإشرافك ({assignedTeachersCount} معلمين):
            </span>
          </div>
          <span className="text-xs text-[#6f7979]">انقر على المعلم للفلترة السريعة</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {visibleTeachers.map((teacher) => {
            const isSelected = selectedTeacherId === teacher.id;
            const teacherStudents = visibleStudents.filter((s) => s.teacherId === teacher.id);
            const hasOverdue = teacherStudents.some(
              (s) => s.status === 'active' && isOverdue(s.lastReportDate)
            );

            return (
              <button
                key={teacher.id}
                onClick={() => setSelectedTeacherId(isSelected ? 'all' : teacher.id)}
                className={`text-right flex items-center justify-between p-3 rounded-xl transition-all border cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-[#005253] bg-[#005253]/10 border-[#005253]'
                    : hasOverdue
                    ? 'bg-[#ffdad6]/40 hover:bg-[#ffdad6]/60 border-[#ffdad6]'
                    : 'bg-[#f0f3ff] hover:bg-[#e7eeff] border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      hasOverdue ? 'bg-[#ba1a1a] text-white' : 'bg-[#005253] text-white'
                    }`}
                  >
                    {teacher.initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-[#111c2d] truncate">
                      {teacher.name}
                    </span>
                    <span className="text-[11px] text-[#3f4949] truncate">
                      {teacherStudents.length} طالباً • {teacher.circleName}
                    </span>
                  </div>
                </div>

                {hasOverdue ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold flex items-center gap-1 flex-shrink-0">
                    <span className="material-symbols-outlined text-xs">warning</span>
                    <span>تنبيه</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-[#005253]/10 text-[#005253] text-[10px] font-bold flex-shrink-0">
                    نشط
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Educational Oversight Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#3f4949] mb-1 font-medium">
              الطلاب المكلف بمتابعتهم
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#005253]">{assignedStudentsCount}</span>
              <span className="text-xs text-[#6f7979]">طالباً مسجلاً</span>
            </div>
            <span className="text-xs text-[#005253] flex items-center gap-0.5 mt-1 font-semibold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>مكتمل الطاقة الاستيعابية 100%</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#005253]/10 text-[#005253] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">school</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#3f4949] mb-1 font-medium">
              تقارير تم اعتمادها هذا الأسبوع
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#7d5800]">38</span>
              <span className="text-xs text-[#6f7979]">تقرير دوري</span>
            </div>
            <span className="text-xs text-[#7d5800] flex items-center gap-0.5 mt-1 font-semibold">
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>+6 مقارنة بالأسبوع الماضي</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ffdea9]/50 text-[#7d5800] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">rule</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#3f4949] mb-1 font-medium">
              تقارير متأخرة تحتاج متابعة
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#ba1a1a]">{overdueCount}</span>
              <span className="text-xs text-[#6f7979]">تقارير عاجلة</span>
            </div>
            <span className="text-xs text-[#ba1a1a] flex items-center gap-0.5 mt-1 font-semibold">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>تجاوزت مهلة 14 يوماً</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">pending_actions</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#3f4949] mb-1 font-medium">
              نسبة التزام الحلقات
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#005253]">93%</span>
              <span className="text-xs text-[#6f7979]">حضور ومتابعة</span>
            </div>
            <span className="text-xs text-[#005253] flex items-center gap-0.5 mt-1 font-semibold">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>أعلى من المستهدف العام (85%)</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#a6eff1]/40 text-[#005253] flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8" viewBox="0 0 36 36">
              <path
                className="text-[#dee8ff]"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="text-[#005253]"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray="93, 100"
                strokeLinecap="round"
                strokeWidth="3.5"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* High-priority Alert Banner */}
      {overdueCount > 0 && (
        <div className="rounded-2xl bg-[#ffdad6]/70 border border-[#ffdad6] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ba1a1a] text-white flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-xl">notification_important</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm sm:text-base text-[#93000a]">
                تنبيه تعليمي ذو أولوية عالية
              </span>
              <span className="text-xs sm:text-sm text-[#93000a]">
                يوجد طلاب بحاجة إلى رفع تقرير التسميع الدوري قبل نهاية الأسبوع (حلقة الشيخ محمود خليل والأستاذ إبراهيم)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setSelectedReportStatus('overdue')}
              className="px-4 py-2 rounded-xl bg-[#ba1a1a] text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              عرض الطلاب المتعثرين
            </button>
          </div>
        </div>
      )}

      {/* Filter & Controls Toolbar */}
      <section className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute right-3.5 top-3 text-[#6f7979] text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب، رقم ولي الأمر، أو ملاحظات الحفظ..."
            className="w-full h-11 pr-11 pl-4 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#6f7979] text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#005253]/20 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Teacher Select */}
          <div className="relative min-w-[170px]">
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full h-11 pr-3 pl-8 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold appearance-none focus:outline-none cursor-pointer"
            >
              <option value="all">كل المعلمين المكلفين ({assignedTeachersCount})</option>
              {visibleTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute left-2.5 top-3 text-[#6f7979] pointer-events-none text-base">
              expand_more
            </span>
          </div>

          {/* Report Status (8-session cycle) */}
          <div className="relative min-w-[170px]">
            <select
              value={selectedReportStatus}
              onChange={(e) => setSelectedReportStatus(e.target.value)}
              className="w-full h-11 pr-3 pl-8 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold appearance-none focus:outline-none cursor-pointer"
            >
              <option value="all">كل حالات التقارير</option>
              <option value="regular">دورة منتظمة (&le; 25 يوماً)</option>
              <option value="warning">تحذير أصفر (&gt; 25 يوماً)</option>
              <option value="overdue">تنبيه أحمر متأخر (&gt; 30 يوماً)</option>
            </select>
            <span className="material-symbols-outlined absolute left-2.5 top-3 text-[#6f7979] pointer-events-none text-base">
              expand_more
            </span>
          </div>

          {/* Student Status */}
          <div className="relative min-w-[130px]">
            <select
              value={selectedStudentStatus}
              onChange={(e) => setSelectedStudentStatus(e.target.value)}
              className="w-full h-11 pr-3 pl-8 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold appearance-none focus:outline-none cursor-pointer"
            >
              <option value="all">حالة الطالب (الكل)</option>
              <option value="active">منتظم</option>
              <option value="vacation">أجازة</option>
            </select>
            <span className="material-symbols-outlined absolute left-2.5 top-3 text-[#6f7979] pointer-events-none text-base">
              expand_more
            </span>
          </div>

          {/* Reset */}
          <button
            onClick={resetFilters}
            className="h-11 px-3.5 rounded-xl bg-[#e7eeff] text-[#3f4949] hover:bg-[#dee8ff] transition-colors flex items-center justify-center gap-1 text-xs font-bold cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
            <span>إعادة تعيين</span>
          </button>
        </div>
      </section>

      {/* Students Data Table Container */}
      <section className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 overflow-hidden flex flex-col">
        <div className="p-4 bg-[#f0f3ff] flex items-center justify-between flex-wrap gap-3 border-b border-[#bec8c8]/20">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="material-symbols-outlined text-[#005253]">format_list_bulleted</span>
            <span className="font-bold text-sm sm:text-base text-[#111c2d]">
              قائمة طلاب المعلمين المكلفين بمتابعتهم
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#005253]/10 text-[#005253] text-xs font-bold">
              عرض {filteredStudents.length} من {assignedStudentsCount} طالباً
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => exportToExcel(filteredStudents)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-[#005253] hover:bg-[#dee8ff] border border-[#bec8c8]/30 font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
              title="تصدير بيانات الطلاب المعروضة إلى ملف Excel"
            >
              <span className="material-symbols-outlined text-base">file_download</span>
              <span>تصدير كشف Excel</span>
            </button>
            {onAddStudent && (
              <button
                onClick={onAddStudent}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#005253] text-white hover:bg-[#186b6d] font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>+ إضافة طالب</span>
              </button>
            )}
            <div className="flex items-center gap-3 text-xs pr-2 border-r border-[#bec8c8]/30">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></span>
                <span className="text-[#6f7979]">متأخر (&gt;14 يوم)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffc969]"></span>
                <span className="text-[#6f7979]">إجازة</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#005253]"></span>
                <span className="text-[#6f7979]">منتظم</span>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-[#e7eeff] text-[#3f4949] text-xs font-bold border-b border-[#bec8c8]/20">
                <th className="py-3 px-4">اسم الطالب</th>
                <th className="py-3 px-4">اسم المعلم</th>
                <th className="py-3 px-4 text-center">رقم ولي الأمر</th>
                <th className="py-3 px-4 text-left">قيمة الاشتراك</th>
                <th className="py-3 px-4 text-left">مصروف المعلم</th>
                <th className="py-3 px-4">تاريخ الاشتراك</th>
                <th className="py-3 px-4">تاريخ آخر تقرير</th>
                <th className="py-3 px-4 min-w-[180px]">ملاحظات الحفظ</th>
                <th className="py-3 px-4 text-center">إجراءات المتابعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7eeff]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[#6f7979] text-xs">
                    لا يوجد طلاب مطابقون للشروط المحددة.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const teacher = getTeacherById(student.teacherId);
                  const reportInfo = getReportStatusInfo(student.lastReportDate);
                  const isRedLate = reportInfo.isOverdue && student.status === 'active';
                  const isYellowWarning = reportInfo.isWarning && student.status === 'active';
                  const isVacation = student.status === 'vacation';
                  const latestReport = reports.find((r) => r.studentId === student.id);
                  const hasTeacherSubmitted = latestReport?.submissionStatus === 'submitted_ready_to_send';

                  let rowBg = 'bg-[#005253]/5 hover:bg-[#005253]/10 border-r-4 border-r-[#005253]';
                  if (isRedLate) {
                    rowBg = 'bg-[#ffdad6]/40 hover:bg-[#ffdad6]/60 border-r-4 border-r-[#ba1a1a]';
                  } else if (isYellowWarning) {
                    rowBg = 'bg-[#fef9c3]/50 hover:bg-[#fef9c3]/70 border-r-4 border-r-[#ca8a04]';
                  } else if (isVacation) {
                    rowBg = 'bg-[#ffdea9]/30 hover:bg-[#ffdea9]/50 border-r-4 border-r-[#7d5800]';
                  }

                  return (
                    <tr key={student.id} className={`${rowBg} transition-colors`}>
                      {/* Student Name */}
                      <td className="py-3.5 px-4 font-bold text-[#111c2d]">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isRedLate
                                ? 'bg-[#ffdad6] text-[#ba1a1a]'
                                : isYellowWarning
                                ? 'bg-[#fef9c3] text-[#a16207]'
                                : isVacation
                                ? 'bg-[#ffdea9] text-[#7d5800]'
                                : 'bg-[#005253]/20 text-[#005253]'
                            }`}
                          >
                            {student.initials}
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                            <span className="font-bold text-[#111c2d] truncate">{student.name}</span>
                            <button
                              onClick={() => onEditStudent(student)}
                              className="p-1 rounded-md text-[#6f7979] hover:text-[#005253] hover:bg-[#dee8ff] transition-colors cursor-pointer"
                              title={`تعديل بيانات الطالب ${student.name}`}
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>

                            {/* Green badge: (سلّمه المعلم: [اسم المعلم] - جاهز للإرسال لولي الأمر) */}
                            {hasTeacherSubmitted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#86efac] text-[11px] font-bold shadow-2xs">
                                <span className="material-symbols-outlined text-xs">done_all</span>
                                <span>
                                  سلّمه المعلم: {latestReport?.submittedByTeacherName || teacher?.name || 'المعلم'} - جاهز للإرسال لولي الأمر
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Teacher */}
                      <td className="py-3.5 px-4 text-xs text-[#111c2d] font-semibold">
                        {teacher?.name || 'غير محدد'}
                      </td>

                      {/* Parent Phone with WhatsApp direct link */}
                      <td className="py-3.5 px-4 text-center">
                        <a
                          href={getParentWhatsAppUrl(student.parentPhone, student.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#dcfce7] text-[#15803d] hover:bg-[#16a34a] hover:text-white transition-all text-xs font-semibold cursor-pointer shadow-2xs group"
                          title={`تواصل عبر واتساب بخصوص الطالب ${student.name}`}
                        >
                          <span className="material-symbols-outlined text-base text-[#16a34a] group-hover:text-white transition-colors">
                            chat
                          </span>
                          <span dir="ltr">{student.parentPhone}</span>
                        </a>
                      </td>

                      {/* Subscription Fee */}
                      <td className="py-3.5 px-4 text-left font-bold text-[#111c2d]">
                        {student.subscriptionFee} <span className="text-xs font-normal text-[#6f7979]">ر.س</span>
                      </td>

                      {/* Teacher Cost */}
                      <td className="py-3.5 px-4 text-left text-xs font-semibold text-[#005253]">
                        {Math.round((teacher?.monthlySalary || 1500) / Math.max(1, teacher?.studentsCount || 10))} ر.س
                      </td>

                      {/* Subscription Date */}
                      <td className="py-3.5 px-4 text-xs text-[#3f4949]">
                        {student.subscriptionDate}
                      </td>

                      {/* Last Report Date & Status (8-session cycle) */}
                      <td className="py-3.5 px-4">
                        {isVacation ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffdea9] text-[#7d5800] text-xs font-bold w-max">
                              <span className="material-symbols-outlined text-xs">flight_takeoff</span>
                              <span>{student.lastReportDate} (إجازة)</span>
                            </span>
                          </div>
                        ) : isRedLate ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-[#ba1a1a]" dir="ltr">
                              {student.lastReportDate}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[11px] font-bold w-max border border-[#ba1a1a]/30">
                              <span className="material-symbols-outlined text-xs">error</span>
                              <span>{reportInfo.badgeText}</span>
                            </span>
                          </div>
                        ) : isYellowWarning ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-[#a16207]" dir="ltr">
                              {student.lastReportDate}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fef9c3] text-[#854d0e] text-[11px] font-bold w-max border border-[#fde047]">
                              <span className="material-symbols-outlined text-xs">warning</span>
                              <span>{reportInfo.badgeText}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-[#005253]" dir="ltr">
                              {student.lastReportDate}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#005253]/15 text-[#005253] text-[11px] font-bold w-max border border-[#005253]/30">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              <span>{reportInfo.badgeText}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Notes / Progress */}
                      <td className="py-3.5 px-4">
                        {isVacation ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-[#ffdea9] text-[#7d5800] text-[11px] font-bold">
                              {student.vacationType || 'إجازة'}
                            </span>
                            <span className="text-[11px] text-[#6f7979]">
                              العودة المتوقعة: {student.vacationEndDate || 'قريباً'}
                            </span>
                          </div>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs ${
                              isRedLate
                                ? 'bg-[#ffdad6] text-[#93000a] font-semibold'
                                : isYellowWarning
                                ? 'bg-[#fef9c3] text-[#854d0e] font-semibold'
                                : 'bg-[#dee8ff] text-[#3f4949]'
                            }`}
                          >
                            {student.notes || student.surahProgress}
                          </span>
                        )}
                      </td>

                      {/* Action buttons matching Sub-supervisor view */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {isRedLate ? (
                            <>
                              <button
                                onClick={() => handleSendTeacherReminder(student)}
                                className="px-2.5 py-1 rounded-lg bg-[#ba1a1a] text-white hover:opacity-90 text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                                title="تذكير المعلم بمتابعة التقرير"
                              >
                                <span className="material-symbols-outlined text-xs">
                                  notifications_active
                                </span>
                                <span>تذكير المعلم</span>
                              </button>
                              <a
                                href={getParentWhatsAppUrl(student.parentPhone, student.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-[#dcfce7] text-[#15803d] hover:bg-[#16a34a] hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                                title={`تواصل مباشر عبر واتساب مع ولي أمر الطالب ${student.name}`}
                              >
                                <span className="material-symbols-outlined text-xs">
                                  chat
                                </span>
                                <span>واتساب ولي الأمر</span>
                              </a>
                            </>
                          ) : isVacation ? (
                            <button
                              onClick={() => onManageVacation(student)}
                              className="px-3 py-1 rounded-lg bg-[#ffdea9] text-[#7d5800] hover:bg-[#ffc969] text-xs font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-xs">
                                edit_calendar
                              </span>
                              <span>تعديل الإجازة</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onAddReport(student)}
                              className="px-3 py-1 rounded-lg bg-[#a6eff1] text-[#002021] hover:bg-[#8ad3d5] text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-xs">
                                visibility
                              </span>
                              <span>عرض السجل</span>
                            </button>
                          )}
                          <button
                            onClick={() => onEditStudent(student)}
                            className="p-1 rounded-lg text-[#3f4949] hover:bg-[#dee8ff] hover:text-[#005253] transition-colors cursor-pointer"
                            title="تعديل بيانات الطالب"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#bec8c8]/20">
          <span className="text-xs text-[#3f4949]">
            عرض {filteredStudents.length} من إجمالي {assignedStudentsCount} طالباً مسندين إلى إشرافك المباشر
          </span>
          <div className="flex items-center gap-1">
            <span className="px-3 py-1 rounded-lg bg-[#005253] text-white text-xs font-bold">1</span>
          </div>
        </div>
      </section>

      {/* Quick Action Drawer / Footer Cards for Sub-supervisor */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#005253]">
            <span className="material-symbols-outlined">send_and_archive</span>
            <span className="font-bold text-sm sm:text-base">رسائل تذكير تلقائية</span>
          </div>
          <p className="text-xs sm:text-sm text-[#3f4949] leading-relaxed">
            تم ضبط نظام المتابعة لإرسال رسائل واتساب آلية لأولياء أمور الطلاب المتأخرين بعد اعتماد المشرف.
          </p>
          <button
            onClick={() => {
              setActionAlert('تم حفظ إعدادات قوالب التذكير التلقائية بنجاح');
              setTimeout(() => setActionAlert(null), 3000);
            }}
            className="mt-2 text-[#005253] hover:underline text-xs font-bold self-start flex items-center gap-1 cursor-pointer"
          >
            <span>إعداد نصوص التذكير</span>
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
        </div>

        <div className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#7d5800]">
            <span className="material-symbols-outlined">assignment_turned_in</span>
            <span className="font-bold text-sm sm:text-base">تقرير الجودة الأسبوعي</span>
          </div>
          <p className="text-xs sm:text-sm text-[#3f4949] leading-relaxed">
            تم إنجاز 86% من زيارات التقييم الصوتي المقررة لمعلمي الحلقات الأربعة خلال الشهر الحالي.
          </p>
          <button
            onClick={() => {
              setActionAlert('تم تحميل جدول الزيارات الافتراضية');
              setTimeout(() => setActionAlert(null), 3000);
            }}
            className="mt-2 text-[#7d5800] hover:underline text-xs font-bold self-start flex items-center gap-1 cursor-pointer"
          >
            <span>فتح جدول الزيارات الافتراضية</span>
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
        </div>

        <div className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#036c6e]">
            <span className="material-symbols-outlined">contact_support</span>
            <span className="font-bold text-sm sm:text-base">الدعم الإداري والإشرافي</span>
          </div>
          <p className="text-xs sm:text-sm text-[#3f4949] leading-relaxed">
            هل تحتاج لتكليف معلم بديل لحلقة الشيخ محمود خليل لتغطية العجز المؤقت؟
          </p>
          <button
            onClick={() => {
              setActionAlert('تم رفع طلب تكليف المعلم البديل إلى الإدارة العامة للمراجعة');
              setTimeout(() => setActionAlert(null), 3500);
            }}
            className="mt-2 text-[#036c6e] hover:underline text-xs font-bold self-start flex items-center gap-1 cursor-pointer"
          >
            <span>تقديم طلب استبدال للإدارة العليا</span>
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </button>
        </div>
      </section>
    </div>
  );
};
