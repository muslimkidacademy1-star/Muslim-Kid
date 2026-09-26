import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { getParentWhatsAppUrl, getReportWhatsAppUrl } from '../../utils/whatsapp';

interface GeneralSupervisorViewProps {
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onAddReport: (student: Student) => void;
  onManageVacation: (student: Student) => void;
}

export const GeneralSupervisorView: React.FC<GeneralSupervisorViewProps> = ({
  onAddStudent,
  onEditStudent,
  onAddReport,
  onManageVacation,
}) => {
  const {
    students,
    teachers,
    reports,
    getTeacherById,
    getDaysSinceLastReport,
    isOverdue,
    getReportStatusInfo,
    exportToExcel,
    activeStudentsCount,
    vacationStudentsCount,
    overdueStudentsCount,
    completedReportsCount,
  } = useApp();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedReportStatus, setSelectedReportStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'latestReport' | 'name' | 'fee'>('latestReport');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter logic
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search
      const search = searchQuery.toLowerCase().trim();
      const teacher = getTeacherById(s.teacherId);
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search) ||
        s.parentPhone.includes(search) ||
        (teacher?.name && teacher.name.toLowerCase().includes(search)) ||
        (s.notes && s.notes.toLowerCase().includes(search));

      // Teacher
      const matchesTeacher =
        selectedTeacher === 'all' || s.teacherId === selectedTeacher;

      // Status
      const matchesStatus =
        selectedStatus === 'all' || s.status === selectedStatus;

      // Report Status (دورة الـ 8 حصص الشهرية: >25 تحذير أصفر، >30 تنبيه أحمر)
      const days = getDaysSinceLastReport(s.lastReportDate);
      let reportCategory = 'regular';
      if (days > 30) reportCategory = 'overdue';
      else if (days > 25) reportCategory = 'warning';

      const matchesReport =
        selectedReportStatus === 'all' || reportCategory === selectedReportStatus;

      return matchesSearch && matchesTeacher && matchesStatus && matchesReport;
    }).sort((a, b) => {
      if (sortBy === 'latestReport') {
        return new Date(b.lastReportDate).getTime() - new Date(a.lastReportDate).getTime();
      }
      if (sortBy === 'fee') {
        return b.subscriptionFee - a.subscriptionFee;
      }
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [
    students,
    searchQuery,
    selectedTeacher,
    selectedStatus,
    selectedReportStatus,
    sortBy,
    getTeacherById,
    getDaysSinceLastReport,
  ]);

  const totalFiltered = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedTeacher('all');
    setSelectedStatus('all');
    setSelectedReportStatus('all');
    setSortBy('latestReport');
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Banner Section: Page Header & Global Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#005253] animate-pulse"></span>
            <span className="text-xs text-[#6f7979] tracking-wider font-semibold">
              الإشراف الأكاديمي العام
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111c2d] leading-tight">
            لوحة تحكم المشرف العام
          </h1>
          <p className="text-sm sm:text-base text-[#3f4949] mt-1">
            متابعة الطلاب، تقارير الحفظ والتسميع، وتوزيع المعلمين بدقة وموثوقية
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start lg:self-center flex-wrap">
          <button
            onClick={() => exportToExcel(filteredStudents)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-[#005253] hover:bg-[#dee8ff] transition-all shadow-xs border border-[#bec8c8]/30 font-semibold text-sm cursor-pointer"
            title="تصدير بيانات الكشف بتنسيق Excel"
          >
            <span className="material-symbols-outlined text-xl">file_download</span>
            <span>تصدير كشف Excel</span>
          </button>
          <button
            onClick={onAddStudent}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#005253] text-white hover:bg-[#186b6d] transition-all shadow-md font-semibold text-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">person_add</span>
            <span>+ إضافة طالب جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Students */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#6f7979] font-medium">إجمالي الطلاب المسجلين</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-[#111c2d]">{students.length}</span>
              <span className="text-xs text-[#6f7979]">طالب وطالبة</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[#005253] font-semibold text-xs">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>+12 هذا الشهر</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#005253]/10 flex items-center justify-center text-[#005253]">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
        </div>

        {/* Metric 2: Completed Reports */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#6f7979] font-medium">التقارير المكتملة</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-[#005253]">{completedReportsCount}</span>
              <span className="text-xs text-[#6f7979]">تقرير دوري</span>
            </div>
            <span className="inline-block mt-1 text-xs text-[#005253] font-semibold">
              معدل الإنجاز {Math.round((completedReportsCount / Math.max(1, students.length)) * 100)}%
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#a6eff1]/40 flex items-center justify-center text-[#005253]">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
        </div>

        {/* Metric 3: Overdue Reports */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#6f7979] font-medium">تقارير متأخرة (&gt;14 يوم)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-[#ba1a1a]">{overdueStudentsCount}</span>
              <span className="text-xs text-[#6f7979]">طالب يحتاج متابعة</span>
            </div>
            <span className="inline-block mt-1 text-xs text-[#ba1a1a] font-semibold">
              تتطلب تنبيه المعلم فوراً
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ffdad6] flex items-center justify-center text-[#ba1a1a]">
            <span className="material-symbols-outlined text-2xl">error</span>
          </div>
        </div>

        {/* Metric 4: On Vacation */}
        <div className="p-5 rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#6f7979] font-medium">في إجازة رسمية</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-[#7d5800]">{vacationStudentsCount}</span>
              <span className="text-xs text-[#6f7979]">حالات معلّقة</span>
            </div>
            <span className="inline-block mt-1 text-xs text-[#7d5800] font-semibold">
              اشتراكات مجمّدة مؤقتاً
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#ffdea9]/50 flex items-center justify-center text-[#7d5800]">
            <span className="material-symbols-outlined text-2xl">event_busy</span>
          </div>
        </div>
      </div>

      {/* Filter Bar Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <span className="material-symbols-outlined absolute right-3.5 top-3 text-[#6f7979] text-xl pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="بحث باسم الطالب، المعلم، أو رقم الهاتف..."
              className="w-full h-11 pr-11 pl-4 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#6f7979] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
            />
          </div>

          {/* Teacher Dropdown */}
          <div className="md:col-span-2 relative">
            <select
              value={selectedTeacher}
              onChange={(e) => {
                setSelectedTeacher(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 px-3 pr-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">المعلم: الكل</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-3 text-[#6f7979] text-lg pointer-events-none">
              school
            </span>
            <span className="material-symbols-outlined absolute left-3 top-3 text-[#6f7979] text-lg pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Subscription Status Dropdown */}
          <div className="md:col-span-2 relative">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 px-3 pr-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">حالة الاشتراك: الكل</option>
              <option value="active">نشط</option>
              <option value="vacation">أجازة</option>
              <option value="expired">منتهي</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-3 text-[#6f7979] text-lg pointer-events-none">
              credit_card
            </span>
            <span className="material-symbols-outlined absolute left-3 top-3 text-[#6f7979] text-lg pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Report Status Dropdown */}
          <div className="md:col-span-2 relative">
            <select
              value={selectedReportStatus}
              onChange={(e) => {
                setSelectedReportStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 px-3 pr-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold focus:outline-none appearance-none cursor-pointer"
            >
              <option value="all">حالة التقرير: الكل</option>
              <option value="regular">منتظم (&le; 25 يوماً)</option>
              <option value="warning">تحذير أصفر (&gt; 25 يوماً)</option>
              <option value="overdue">تنبيه أحمر (&gt; 30 يوماً)</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-3 text-[#6f7979] text-lg pointer-events-none">
              pending_actions
            </span>
            <span className="material-symbols-outlined absolute left-3 top-3 text-[#6f7979] text-lg pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Reset Action */}
          <div className="md:col-span-1 flex justify-end">
            <button
              onClick={resetFilters}
              className="h-11 w-full flex items-center justify-center gap-1 rounded-xl bg-[#dee8ff] text-[#3f4949] hover:bg-[#d8e3fb] hover:text-[#111c2d] transition-colors text-xs font-semibold cursor-pointer"
              title="إعادة تعيين المرشحات"
            >
              <span className="material-symbols-outlined text-lg">restart_alt</span>
              <span>إعادة</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#bec8c8]/20">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[#6f7979] font-medium">تصفية نشطة:</span>
            {selectedTeacher !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#005253]/10 text-[#005253] font-semibold">
                <span>المعلم: {getTeacherById(selectedTeacher)?.name}</span>
                <span
                  className="material-symbols-outlined text-sm cursor-pointer hover:opacity-75"
                  onClick={() => setSelectedTeacher('all')}
                >
                  close
                </span>
              </span>
            )}
            {selectedStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dee8ff] text-[#005253] font-semibold">
                <span>الحالة: {selectedStatus === 'active' ? 'نشط' : selectedStatus === 'vacation' ? 'إجازة' : 'منتهي'}</span>
                <span
                  className="material-symbols-outlined text-sm cursor-pointer hover:opacity-75"
                  onClick={() => setSelectedStatus('all')}
                >
                  close
                </span>
              </span>
            )}
            {selectedReportStatus !== 'all' && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  selectedReportStatus === 'overdue'
                    ? 'bg-[#ffdad6] text-[#ba1a1a]'
                    : selectedReportStatus === 'warning'
                    ? 'bg-[#fef9c3] text-[#854d0e]'
                    : 'bg-[#dcfce7] text-[#15803d]'
                }`}
              >
                <span>
                  التقرير:{' '}
                  {selectedReportStatus === 'overdue'
                    ? 'تنبيه أحمر (> 30 يوماً)'
                    : selectedReportStatus === 'warning'
                    ? 'تحذير أصفر (> 25 يوماً)'
                    : 'منتظم (<= 25 يوماً)'}
                </span>
                <span
                  className="material-symbols-outlined text-sm cursor-pointer hover:opacity-75"
                  onClick={() => setSelectedReportStatus('all')}
                >
                  close
                </span>
              </span>
            )}
            {selectedTeacher === 'all' && selectedStatus === 'all' && selectedReportStatus === 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#005253]/10 text-[#005253] font-semibold">
                <span>جميع المعلمين والحلقات</span>
              </span>
            )}
            <button
              onClick={() => setSortBy(sortBy === 'latestReport' ? 'fee' : 'latestReport')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e7eeff] text-[#3f4949] font-medium hover:bg-[#dee8ff]"
            >
              <span>الترتيب: {sortBy === 'latestReport' ? 'آخر تقرير أولاً' : 'قيمة الاشتراك'}</span>
              <span className="material-symbols-outlined text-xs">swap_vert</span>
            </button>
          </div>

          {/* Visual State Legend for 8-session Monthly Cycle */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#005253]"></span>
              <span className="text-[#3f4949]">منتظم (&le; 25 يوماً)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#eab308]"></span>
              <span className="text-[#854d0e] font-semibold">تحذير أصفر (&gt; 25 يوماً)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ba1a1a]"></span>
              <span className="text-[#ba1a1a] font-semibold">تنبيه أحمر (&gt; 30 يوماً)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#ffc969]"></span>
              <span className="text-[#3f4949]">إجازة رسمية</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table Container */}
      <div className="rounded-2xl bg-white shadow-xs border border-[#bec8c8]/20 overflow-hidden flex flex-col">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#6f7979] text-xs font-bold select-none border-b border-[#bec8c8]/20">
                <th className="py-3.5 px-4">اسم الطالب</th>
                <th className="py-3.5 px-4">اسم المعلم</th>
                <th className="py-3.5 px-4 text-center">رقم ولي الأمر</th>
                <th className="py-3.5 px-4 text-left">قيمة الاشتراك</th>
                <th className="py-3.5 px-4 text-left">مصروفات المعلم</th>
                <th className="py-3.5 px-4">تاريخ الاشتراك</th>
                <th className="py-3.5 px-4">تاريخ آخر تقرير</th>
                <th className="py-3.5 px-4">الملاحظات والإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7eeff] text-sm">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6f7979] text-sm">
                    لا يوجد طلاب يطابقون شروط البحث والتصفية المحددة.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => {
                  const teacher = getTeacherById(student.teacherId);
                  const reportInfo = getReportStatusInfo(student.lastReportDate);
                  const isRedLate = reportInfo.isOverdue && student.status === 'active';
                  const isYellowWarning = reportInfo.isWarning && student.status === 'active';
                  const isVacation = student.status === 'vacation';
                  const latestReport = reports.find((r) => r.studentId === student.id);
                  const hasTeacherSubmitted = latestReport?.submissionStatus === 'submitted_ready_to_send';

                  // Dynamic row coloring based on 8-session cycle:
                  // > 30 days: Red row with red right-border (تنبيه أحمر)
                  // > 25 days: Yellow/Amber row with yellow border (تحذير أصفر)
                  // Vacation: Soft amber row with amber border
                  // <= 25 days regular: Green row with emerald border
                  let rowBg = 'bg-[#005253]/5 hover:bg-[#005253]/10 border-r-4 border-r-[#005253]';
                  if (isRedLate) {
                    rowBg = 'bg-[#ffdad6]/40 hover:bg-[#ffdad6]/60 border-r-4 border-r-[#ba1a1a]';
                  } else if (isYellowWarning) {
                    rowBg = 'bg-[#fef9c3]/50 hover:bg-[#fef9c3]/70 border-r-4 border-r-[#ca8a04]';
                  } else if (isVacation) {
                    rowBg = 'bg-[#ffdea9]/30 hover:bg-[#ffdea9]/50 border-r-4 border-r-[#7d5800]';
                  }

                  return (
                    <tr key={student.id} className={`${rowBg} transition-all duration-200 group`}>
                      {/* Name & Circle */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
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
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[#111c2d] truncate">
                                {student.name}
                              </span>
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
                            <span
                              className={`text-xs font-medium ${
                                isRedLate
                                  ? 'text-[#ba1a1a]'
                                  : isYellowWarning
                                  ? 'text-[#a16207]'
                                  : isVacation
                                  ? 'text-[#7d5800]'
                                  : 'text-[#005253]'
                              }`}
                            >
                              {student.surahProgress || teacher?.circleName || 'حلقة قرآنية'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Teacher */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-[#111c2d]">
                          <span className="material-symbols-outlined text-lg text-[#6f7979]">
                            person
                          </span>
                          <span className="text-xs font-semibold">{teacher?.name || 'غير محدد'}</span>
                        </div>
                      </td>

                      {/* Parent Phone with direct WhatsApp link */}
                      <td className="py-3.5 px-4 text-center">
                        <a
                          href={getParentWhatsAppUrl(student.parentPhone, student.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#dcfce7] text-[#15803d] hover:bg-[#16a34a] hover:text-white transition-all text-xs font-semibold shadow-2xs group"
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
                        {student.subscriptionFee}{' '}
                        <span className="text-xs text-[#6f7979] font-normal">ر.س</span>
                      </td>

                      {/* Teacher Share */}
                      <td className="py-3.5 px-4 text-left font-bold text-[#005253]">
                        {student.teacherCost !== undefined
                          ? student.teacherCost
                          : Math.round((teacher?.monthlySalary || 1500) / Math.max(1, teacher?.studentsCount || 10))}{' '}
                        <span className="text-xs text-[#6f7979] font-normal">ر.س</span>
                      </td>

                      {/* Subscription Date */}
                      <td className="py-3.5 px-4 text-xs text-[#3f4949]">
                        {student.subscriptionDate}
                      </td>

                      {/* Last Report Status - Dynamic Live Logic (8-session cycle) */}
                      <td className="py-3.5 px-4">
                        {isVacation ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ffdea9] text-[#7d5800] text-xs font-bold w-max">
                              <span className="material-symbols-outlined text-xs">flight_takeoff</span>
                              <span>إجازة رسمية</span>
                            </span>
                            <span className="text-[11px] text-[#6f7979]">
                              يعود {student.vacationEndDate || 'قريباً'}
                            </span>
                          </div>
                        ) : isRedLate ? (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => onEditStudent(student)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#ba1a1a] hover:underline cursor-pointer text-right w-max"
                              title="انقر لتعديل تاريخ آخر تقرير أو اعتماده"
                            >
                              <span className="material-symbols-outlined text-sm">event_busy</span>
                              <span dir="ltr">{student.lastReportDate}</span>
                            </button>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[11px] font-bold w-max border border-[#ba1a1a]/30">
                              <span className="material-symbols-outlined text-xs">error</span>
                              <span>{reportInfo.badgeText}</span>
                            </span>
                          </div>
                        ) : isYellowWarning ? (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => onEditStudent(student)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#a16207] hover:underline cursor-pointer text-right w-max"
                              title="انقر لتعديل تاريخ آخر تقرير أو اعتماده"
                            >
                              <span className="material-symbols-outlined text-sm">alarm</span>
                              <span dir="ltr">{student.lastReportDate}</span>
                            </button>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#fef9c3] text-[#854d0e] text-[11px] font-bold w-max border border-[#fde047]">
                              <span className="material-symbols-outlined text-xs">warning</span>
                              <span>{reportInfo.badgeText}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => onEditStudent(student)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#005253] hover:underline cursor-pointer text-right w-max"
                              title="انقر لتعديل تاريخ آخر تقرير"
                            >
                              <span className="material-symbols-outlined text-sm">event_available</span>
                              <span dir="ltr">{student.lastReportDate}</span>
                            </button>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#005253]/15 text-[#005253] text-xs font-bold w-max border border-[#005253]/30">
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              <span>{reportInfo.badgeText}</span>
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Notes & Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium max-w-[200px] truncate ${
                              isRedLate
                                ? 'bg-[#ffdad6] text-[#93000a] font-semibold'
                                : isYellowWarning
                                ? 'bg-[#fef9c3] text-[#854d0e] font-semibold'
                                : isVacation
                                ? 'bg-[#ffdea9]/50 text-[#7d5800] font-semibold'
                                : 'bg-[#dee8ff] text-[#3f4949]'
                            }`}
                            title={student.notes}
                          >
                            {student.notes || 'لا توجد ملاحظات'}
                          </span>

                          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                            {hasTeacherSubmitted && student.parentPhone && (
                              <a
                                href={getReportWhatsAppUrl(student.parentPhone, student.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-[#16a34a] text-white hover:bg-[#15803d] transition-all shadow-xs flex items-center justify-center cursor-pointer"
                                title={`إرسال التقرير لولي أمر الطالب ${student.name} عبر واتساب`}
                              >
                                <span className="material-symbols-outlined text-base">send</span>
                              </a>
                            )}
                            <button
                              onClick={() => onAddReport(student)}
                              className="p-1 rounded-lg hover:bg-[#005253]/10 text-[#005253] transition-colors"
                              title="إضافة تقرير تسميع"
                            >
                              <span className="material-symbols-outlined text-lg">rate_review</span>
                            </button>
                            <button
                              onClick={() => onManageVacation(student)}
                              className="p-1 rounded-lg hover:bg-[#ffdea9] text-[#7d5800] transition-colors"
                              title="إدارة الإجازة"
                            >
                              <span className="material-symbols-outlined text-lg">event_available</span>
                            </button>
                            <button
                              onClick={() => onEditStudent(student)}
                              className="p-1 rounded-lg hover:bg-[#dee8ff] text-[#3f4949] transition-colors"
                              title="تعديل بيانات الطالب"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile-First Vertical Cards View (Shown on mobile screens < md) */}
        <div className="md:hidden flex flex-col divide-y divide-[#bec8c8]/20">
          {paginatedStudents.length === 0 ? (
            <div className="p-8 text-center text-[#6f7979] text-sm">
              لا يوجد طلاب يطابقون شروط البحث والتصفية المحددة.
            </div>
          ) : (
            paginatedStudents.map((student) => {
              const teacher = getTeacherById(student.teacherId);
              const reportInfo = getReportStatusInfo(student.lastReportDate);
              const isRedLate = reportInfo.isOverdue && student.status === 'active';
              const isYellowWarning = reportInfo.isWarning && student.status === 'active';
              const isVacation = student.status === 'vacation';
              const latestReport = reports.find((r) => r.studentId === student.id);
              const hasTeacherSubmitted = latestReport?.submissionStatus === 'submitted_ready_to_send';

              return (
                <div
                  key={`mob-gs-${student.id}`}
                  className={`p-4 flex flex-col gap-3 transition-colors ${
                    isRedLate
                      ? 'bg-[#fff5f5]'
                      : isYellowWarning
                      ? 'bg-[#fefce8]'
                      : isVacation
                      ? 'bg-[#fffbeb]'
                      : 'bg-white'
                  }`}
                >
                  {/* Top Row: Initials, Name, Edit, Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base flex-shrink-0 shadow-xs ${
                          isRedLate
                            ? 'bg-[#ba1a1a] text-white'
                            : isYellowWarning
                            ? 'bg-[#eab308] text-white'
                            : isVacation
                            ? 'bg-[#d97706] text-white'
                            : 'bg-[#005253] text-white'
                        }`}
                      >
                        {student.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-[#111c2d] leading-snug">
                            {student.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => onEditStudent(student)}
                            className="p-1 rounded-md text-[#6f7979] hover:text-[#005253] hover:bg-[#dee8ff] transition-colors"
                            title="تعديل الطالب"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                        </div>
                        <span className="text-xs text-[#526060] block mt-0.5">
                          {student.surahProgress || teacher?.circleName || 'حلقة القرآن الكريم'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isVacation ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#ffdea9] text-[#7d5800] text-[10px] font-bold">
                          إجازة رسمية
                        </span>
                      ) : isRedLate ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold border border-[#ba1a1a]/30">
                          {reportInfo.badgeText}
                        </span>
                      ) : isYellowWarning ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#fef9c3] text-[#854d0e] text-[10px] font-bold border border-[#fde047]">
                          {reportInfo.badgeText}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[10px] font-bold">
                          دورة منتظمة
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Submission Alert Banner if Ready to Send */}
                  {hasTeacherSubmitted && (
                    <div className="p-2.5 rounded-xl bg-[#dcfce7] border border-[#86efac] text-xs text-[#15803d] font-bold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">verified</span>
                        <span>سلّمه المعلم ({teacher?.name}) - جاهز للإرسال</span>
                      </div>
                      {student.parentPhone && (
                        <a
                          href={getReportWhatsAppUrl(student.parentPhone, student.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-[#16a34a] text-white rounded-lg text-[11px] font-bold hover:bg-[#15803d] transition-colors"
                        >
                          إرسال
                        </a>
                      )}
                    </div>
                  )}

                  {/* Academic & Financial Details */}
                  <div className="grid grid-cols-2 gap-2 bg-[#f0f3ff] p-3 rounded-xl text-xs border border-[#bec8c8]/20">
                    <div>
                      <span className="text-[#6f7979] text-[10px] block">المعلم المسند:</span>
                      <strong className="text-[#111c2d] block truncate">{teacher?.name || 'غير محدد'}</strong>
                      <span className="text-[10px] text-[#005253] block truncate">{teacher?.circleName}</span>
                    </div>

                    <div>
                      <span className="text-[#6f7979] text-[10px] block">تاريخ آخر تقرير:</span>
                      <span className="font-mono font-bold text-[#111c2d] block dir-ltr text-right">
                        {student.lastReportDate}
                      </span>
                      <span className="text-[10px] text-[#526060]">
                        دورة 8 حصص ({student.currentCycleSessionsCount || 0}/8)
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-[#bec8c8]/20">
                      <span className="text-[#6f7979] text-[10px] block">الاشتراك الشهري:</span>
                      <strong className="text-[#005253]">{student.subscriptionFee} ر.س</strong>
                    </div>

                    <div className="pt-1.5 border-t border-[#bec8c8]/20">
                      <span className="text-[#6f7979] text-[10px] block">مصروف المعلم:</span>
                      <strong className="text-[#3f4949]">{student.teacherCost ?? 120} ر.س</strong>
                    </div>
                  </div>

                  {/* Thumb-friendly Big Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={getParentWhatsAppUrl(student.parentPhone, student.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#25D366] hover:bg-[#1eb757] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      title="مراسلة ولي الأمر عبر واتساب"
                    >
                      <span className="material-symbols-outlined text-base">chat</span>
                      <span>ولي الأمر</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => onAddReport(student)}
                      className="min-h-[42px] px-3 rounded-xl bg-[#005253] hover:bg-[#186b6d] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                      title="تسجيل تقرير 8 حصص"
                    >
                      <span className="material-symbols-outlined text-base">rate_review</span>
                      <span>+ تقرير 8 حصص</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onManageVacation(student)}
                      className="min-h-[42px] w-10 rounded-xl bg-white border border-[#bec8c8]/30 hover:bg-[#ffdea9]/30 text-[#7d5800] flex items-center justify-center transition-colors cursor-pointer"
                      title="إدارة الإجازات"
                    >
                      <span className="material-symbols-outlined text-base">flight_takeoff</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table Pagination & Footer */}
        <div className="p-4 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#bec8c8]/20">
          <div className="flex items-center gap-4 text-xs sm:text-sm text-[#3f4949]">
            <span>
              عرض{' '}
              <span className="font-bold text-[#111c2d]">
                {totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, totalFiltered)}
              </span>{' '}
              من أصل <span className="font-bold text-[#111c2d]">{totalFiltered}</span> طالب
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#6f7979]">الصفوف بالصفحة:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 rounded-lg bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Pagination Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#6f7979] hover:bg-[#dee8ff] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="الصفحة السابقة"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${
                    currentPage === pageNum
                      ? 'bg-[#005253] text-white shadow-xs'
                      : 'text-[#3f4949] hover:bg-[#dee8ff]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="w-7 text-center text-[#6f7979] font-bold">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-9 h-9 rounded-xl text-[#3f4949] hover:bg-[#dee8ff] font-bold text-sm flex items-center justify-center transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#6f7979] hover:bg-[#dee8ff] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              title="الصفحة التالية"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
