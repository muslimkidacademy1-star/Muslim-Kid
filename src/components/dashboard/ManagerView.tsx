import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Report } from '../../types';
import { getParentWhatsAppUrl, getReportWhatsAppUrl } from '../../utils/whatsapp';
import { generateStudentReportPdf } from '../../utils/pdfGenerator';

interface ManagerViewProps {
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onAddReport: (student: Student) => void;
  onManageVacation: (student: Student) => void;
}

export const ManagerView: React.FC<ManagerViewProps> = ({
  onAddStudent,
  onEditStudent,
  onAddReport,
  onManageVacation,
}) => {
  const {
    students,
    teachers,
    reports,
    activityLogs,
    totalSubscriptions,
    totalTeacherCosts,
    netProfit,
    profitMargin,
    activeStudentsCount,
    vacationStudentsCount,
    overdueStudentsCount,
    financialMonths,
    getTeacherById,
    getDaysSinceLastReport,
    isOverdue,
    getReportStatusInfo,
    exportToExcel,
    addActivityLog,
    markReportAsSentToParent,
    currentUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPeriod] = useState('هذا الشهر (شعبان - رمضان 1445)');
  const [activeTab, setActiveTab] = useState<'all' | 'dispatch_center' | 'financials' | 'activity_log'>('all');
  const [sentReportSuccessId, setSentReportSuccessId] = useState<string | null>(null);

  // 1. Pending Reports for Dispatch: Reports submitted by teachers that haven't been sent to parents yet
  const pendingDispatchReports = useMemo(() => {
    return reports
      .filter((r) => r.submissionStatus === 'submitted_ready_to_send')
      .map((report) => {
        const student = students.find((s) => s.id === report.studentId);
        const teacher = getTeacherById(report.teacherId);
        return {
          report,
          student,
          teacher,
        };
      })
      .filter((item) => item.student !== undefined);
  }, [reports, students, getTeacherById]);

  // 2. Sent & Completed Reports
  const completedDispatchReports = useMemo(() => {
    return reports
      .filter((r) => r.submissionStatus === 'sent_to_parent' || r.submissionStatus === 'approved')
      .map((report) => {
        const student = students.find((s) => s.id === report.studentId);
        const teacher = getTeacherById(report.teacherId);
        return {
          report,
          student,
          teacher,
        };
      });
  }, [reports, students, getTeacherById]);

  // Filter students for general table
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const search = searchQuery.toLowerCase().trim();
      const teacher = getTeacherById(s.teacherId);
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search) ||
        s.parentPhone.includes(search) ||
        (teacher?.name && teacher.name.toLowerCase().includes(search)) ||
        s.surahProgress.toLowerCase().includes(search);

      const matchesTeacher =
        selectedTeacherId === 'all' || s.teacherId === selectedTeacherId;

      const days = getDaysSinceLastReport(s.lastReportDate);
      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && s.status === 'active' && days <= 25) ||
        (selectedStatus === 'vacation' && s.status === 'vacation') ||
        (selectedStatus === 'warning' && days > 25 && days <= 30 && s.status === 'active') ||
        (selectedStatus === 'overdue' && (days > 30 || isOverdue(s.lastReportDate)) && s.status === 'active');

      return matchesSearch && matchesTeacher && matchesStatus;
    });
  }, [students, searchQuery, selectedTeacherId, selectedStatus, getTeacherById, getDaysSinceLastReport, isOverdue]);

  // Handle PDF Generation
  const handleDownloadPdf = (student: Student, report: Report) => {
    const teacher = getTeacherById(report.teacherId);
    generateStudentReportPdf({
      student,
      teacher,
      report,
      recordedByName: report.submittedByTeacherName || teacher?.name || currentUser.name,
    });
  };

  // Handle Mark as Sent
  const handleMarkAsSent = (reportId: string, studentName: string) => {
    markReportAsSentToParent(reportId);
    setSentReportSuccessId(reportId);
    setTimeout(() => {
      setSentReportSuccessId(null);
    }, 3000);
  };

  const handleExportBudget = () => {
    const headers = ['الشهر', 'إجمالي الاشتراكات المحصلة (ر.س)', 'مصروفات المعلمين (ر.س)', 'صافي الربح (ر.س)', 'هامش الربح'];
    const rows = financialMonths.map((m) => [
      `"${m.monthName}"`,
      m.subscriptions,
      m.teacherCosts,
      m.netProfit,
      `"${Math.round((m.netProfit / m.subscriptions) * 100)}%"`,
    ]);
    rows.push([
      `"الشهر الحالي (شعبان 1445)"`,
      totalSubscriptions,
      totalTeacherCosts,
      netProfit,
      `"${profitMargin}%"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `الميزانية_والأرباح_أكاديمية_المسلم_الصغير_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addActivityLog('تصدير الميزانية المالية', undefined, undefined, 'تم تصدير كشف الميزانية وصافي الأرباح لآخر 6 أشهر بصيغة Excel');
  };

  const avgSubscription = activeStudentsCount > 0 ? Math.round(totalSubscriptions / activeStudentsCount) : 268;
  const coverageRatio = totalTeacherCosts > 0 ? Math.round((totalSubscriptions / totalTeacherCosts) * 100) : 166;

  // Student active vs overdue percentage calculations
  const totalTrackedStudents = Math.max(1, students.length);
  const activePercent = Math.round((activeStudentsCount / totalTrackedStudents) * 100);
  const overduePercent = Math.round((overdueStudentsCount / totalTrackedStudents) * 100);
  const vacationPercent = Math.round((vacationStudentsCount / totalTrackedStudents) * 100);

  return (
    <div className="flex flex-col w-full gap-6 text-right" dir="rtl">
      {/* SUCCESS TOAST ALERT */}
      {sentReportSuccessId && (
        <div className="p-4 rounded-2xl bg-[#005253] text-white flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl text-[#a6eff1]">mark_email_read</span>
            <span className="text-sm font-semibold">
              تم تحديث حالة التقرير بنجاح ونقله إلى سجل التقارير المرسلة والمكتملة لولي الأمر!
            </span>
          </div>
          <button
            onClick={() => setSentReportSuccessId(null)}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* TOP HEADER & EXECUTIVE CONTROLS */}
      <div className="bg-linear-to-r from-[#005253] via-[#004243] to-[#002829] text-white p-6 sm:p-7 rounded-3xl shadow-md border border-[#005253]/30 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-2xl font-bold shadow-inner flex-shrink-0">
            {currentUser.initials || 'د'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[#a6eff1] text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                <span>مركز القيادة والإدارة العامة</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#fde047] text-[#713f12] text-xs font-bold">
                {currentUser.title || 'المدير العام'}
              </span>
              {pendingDispatchReports.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-xs font-black animate-pulse">
                  {pendingDispatchReports.length} تقارير بانتظار الإرسال
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              لوحة تحكم المدير العام - {currentUser.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#e7eeff]/90 mt-1 max-w-xl leading-relaxed">
              مركز الرقابة المالية المتكامل، إرسال تقارير الـ 8 حصص المعتمدة لأولياء الأمور، ومتابعة سجل العمليات الحية
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3.5 py-2 rounded-xl text-white text-xs sm:text-sm font-semibold border border-white/15">
            <span className="material-symbols-outlined text-[#a6eff1] text-lg">calendar_month</span>
            <span>{selectedPeriod}</span>
          </div>

          <button
            onClick={() => exportToExcel(students)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-[#005253] text-xs sm:text-sm font-bold hover:bg-[#a6eff1] transition-all shadow-xs cursor-pointer"
            title="تصدير كافة بيانات الأكاديمية بصيغة Excel"
          >
            <span className="material-symbols-outlined text-lg">file_download</span>
            <span>تصدير بيانات الأكاديمية (Excel)</span>
          </button>

          <button
            onClick={onAddStudent}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00e5ff] text-[#003738] text-xs sm:text-sm font-black hover:bg-[#80f0ff] transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>+ طالب جديد</span>
          </button>
        </div>
      </div>

      {/* EXECUTIVE FINANCIAL KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-[#bec8c8]/25 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-[#005253]/5 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#005253]/10 text-[#005253] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#005253]/10 text-[#005253] text-xs font-bold">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +12.4%
            </span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-[#6f7979] font-bold">إجمالي الاشتراكات المحصلة</span>
            <div className="text-2xl sm:text-3xl font-black text-[#111c2d] tracking-tight">
              {totalSubscriptions.toLocaleString()}{' '}
              <span className="text-sm font-bold text-[#6f7979]">ر.س</span>
            </div>
            <span className="text-xs text-[#005253] font-semibold mt-1">
              مقارنة بالشهر السابق (41,150 ر.س)
            </span>
          </div>
        </div>

        {/* Card 2: Teacher Costs */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-[#bec8c8]/25 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-[#dee8ff]/60 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#dee8ff] text-[#005253] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dee8ff] text-[#005253] text-xs font-bold">
              {teachers.length} معلماً
            </span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-[#6f7979] font-bold">إجمالي مصروفات المعلمين</span>
            <div className="text-2xl sm:text-3xl font-black text-[#111c2d] tracking-tight">
              {totalTeacherCosts.toLocaleString()}{' '}
              <span className="text-sm font-bold text-[#6f7979]">ر.س</span>
            </div>
            <span className="text-xs text-[#6f7979] font-semibold mt-1">
              مستحقات {teachers.length} معلماً ومحفظاً للشهر الحالي
            </span>
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-[#bec8c8]/25 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-[#ffdea9]/40 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#ffdea9]/60 text-[#7d5800] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">query_stats</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffdea9] text-[#271900] text-xs font-bold">
              هامش {profitMargin}%
            </span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-[#6f7979] font-bold">صافي الأرباح التشغيلية</span>
            <div className="text-2xl sm:text-3xl font-black text-[#7d5800] tracking-tight">
              {netProfit.toLocaleString()}{' '}
              <span className="text-sm font-bold text-[#7d5800]">ر.س</span>
            </div>
            <span className="text-xs text-[#7d5800] font-semibold mt-1">
              فائض تشغيلي مرتفع ومؤشر مالي ممتاز
            </span>
          </div>
        </div>

        {/* Card 4: Active Students */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-[#bec8c8]/25 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-[#a6eff1]/30 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#005253]/10 text-[#005253] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">local_library</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dee8ff] text-[#005253] text-xs font-bold">
              {activePercent}% انتظام
            </span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-[#6f7979] font-bold">الطلاب النشطين حالياً</span>
            <div className="text-2xl sm:text-3xl font-black text-[#111c2d] tracking-tight">
              {activeStudentsCount}{' '}
              <span className="text-sm font-bold text-[#6f7979]">طالباً</span>
            </div>
            <span className="text-xs text-[#6f7979] font-semibold mt-1">
              من أصل {students.length} مسجلاً ({vacationStudentsCount} في إجازة، {overdueStudentsCount} يحتاج متابعة)
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: PROMINENT REPORTS DISPATCH CENTER (مركز إرسال تقارير الـ 8 حصص) */}
      <section className="bg-linear-to-br from-white via-[#f4fbfa] to-[#e6f7f6] rounded-3xl p-5 sm:p-6 border-2 border-[#005253]/40 shadow-md flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#bec8c8]/30">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-[#005253] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl">send_and_archive</span>
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-[#003738]">
                  مركز إرسال تقارير الـ 8 حصص (Reports Dispatch Center)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#005253] text-white text-xs font-black">
                  {pendingDispatchReports.length} تقارير بانتظار الإرسال لأولياء الأمور
                </span>
              </div>
              <p className="text-xs text-[#526060] mt-0.5">
                تقارير تم تسليمها واعتمادها من قِبل المعلمين بعد إتمام الطلاب دورات الـ 8 حصص، جاهزة للإرسال الرسمي والتحميل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#005253] bg-white px-3 py-1.5 rounded-xl border border-[#005253]/20 shadow-2xs">
              التقارير المكتملة والمرسلة: {completedDispatchReports.length}
            </span>
          </div>
        </div>

        {/* Pending Reports Cards Grid */}
        {pendingDispatchReports.length === 0 ? (
          <div className="py-8 bg-white/80 rounded-2xl text-center flex flex-col items-center justify-center border border-[#bec8c8]/20">
            <span className="material-symbols-outlined text-4xl text-[#15803d] mb-1">
              verified
            </span>
            <p className="text-sm font-bold text-[#111c2d]">
              رائع جداً! تم إرسال كافة تقارير المعلمين الواردة إلى أولياء الأمور
            </p>
            <p className="text-xs text-[#6f7979] mt-0.5">
              لا توجد تقارير معلقة بانتظار الإرسال في طابور المركز حالياً
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingDispatchReports.map(({ report, student, teacher }) => {
              if (!student) return null;
              const parentWhatsAppUrl = getReportWhatsAppUrl(student.parentPhone, student.name);

              return (
                <div
                  key={`dispatch-${report.id}`}
                  className="bg-white rounded-2xl p-4 border-2 border-emerald-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500"></div>

                  <div>
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#005253] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                          {student.initials}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#111c2d] leading-tight">
                            {student.name}
                          </h4>
                          <span className="text-[11px] text-[#526060] block mt-0.5">
                            المعلم: {report.submittedByTeacherName || teacher?.name || 'غير محدد'} ({teacher?.circleName})
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[10px] font-black border border-[#86efac]">
                        جاهز للإرسال ⭐
                      </span>
                    </div>

                    {/* Report Summary Details */}
                    <div className="bg-[#f0f9ff] rounded-xl p-3 text-xs flex flex-col gap-1.5 border border-[#bae6fd]/50">
                      <div className="flex items-center justify-between text-[#0369a1]">
                        <span className="font-bold">تاريخ التقرير: {report.reportDate}</span>
                        <span className="font-black bg-white px-2 py-0.5 rounded-md shadow-2xs">
                          الدرجة: {report.grade || (report.memorizationScore ? report.memorizationScore + '%' : 'ممتاز')}
                        </span>
                      </div>

                      <div className="text-[#334155] mt-1">
                        <span className="text-[10px] text-gray-500 block">إنجاز الـ 8 حصص:</span>
                        <p className="font-semibold text-xs line-clamp-2 leading-relaxed">
                          {report.memorizationDetails || report.performanceSummary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#bae6fd]/40 text-[11px] text-gray-600">
                        <span>هاتف ولي الأمر:</span>
                        <span className="font-mono font-bold text-[#005253] dir-ltr">
                          {student.parentPhone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Download PDF + Send via WhatsApp + Mark as Sent */}
                  <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      {/* Button 1: تحميل تقرير PDF */}
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(student, report)}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-white border border-[#005253]/30 text-[#005253] hover:bg-[#005253]/10 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="معاينة وتحميل التقرير كملف PDF رسمي مخصص للطباعة"
                      >
                        <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                        <span>تحميل تقرير PDF</span>
                      </button>

                      {/* Button 2: إرسال لولي الأمر (واتساب) */}
                      <a
                        href={parentWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-2.5 rounded-xl bg-[#25D366] hover:bg-[#1eb757] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        title="فتح واتساب بمحادثة جاهزة لتهنئة ولي الأمر وإرفاق التقرير"
                      >
                        <span className="material-symbols-outlined text-base">chat</span>
                        <span>إرسال واتساب</span>
                      </a>
                    </div>

                    {/* Button 3: تم الإرسال لولي الأمر */}
                    <button
                      type="button"
                      onClick={() => handleMarkAsSent(report.id, student.name)}
                      className="w-full py-2 px-3 rounded-xl bg-[#005253] hover:bg-[#003d3e] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>تم الإرسال لولي الأمر (نقل للأرشيف المكتمل)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: CHARTS & FINANCIAL VISUAL COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Revenue vs Teacher Costs Over 6 Months */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-[#bec8c8]/25 flex flex-col justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-6 bg-[#005253] rounded-full"></span>
                <h3 className="text-base sm:text-lg font-bold text-[#111c2d]">
                  مؤشر الإيرادات ومصروفات المعلمين (آخر 6 أشهر)
                </h3>
              </div>
              <p className="text-xs text-[#526060] pr-4 mt-0.5">
                مقارنة بصرية دقيقة بين مدفوعات الطلاب ورواتب الكادر وصافي الأرباح
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportBudget}
                className="px-3 py-1.5 rounded-xl bg-[#f0f3ff] text-[#005253] hover:bg-[#e7eeff] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-[#bec8c8]/20"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>تصدير الميزانية CSV</span>
              </button>
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-5 text-xs text-[#3f4949] flex-wrap pr-4">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#005253]"></span>
              <span className="font-semibold">إجمالي الاشتراكات</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#cfdaf2]"></span>
              <span className="font-semibold">مصروفات المعلمين</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-1 border-b-2 border-dashed border-[#7d5800]"></span>
              <span className="font-semibold">صافي الربح الشهري</span>
            </div>
          </div>

          {/* Responsive SVG Chart */}
          <div className="w-full overflow-x-auto pt-2">
            <div className="min-w-[550px] h-64 flex flex-col justify-between py-2 relative">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 720 220">
                <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="720" y1="20" y2="20" />
                <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="720" y1="70" y2="70" />
                <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="720" y1="120" y2="120" />
                <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="720" y1="170" y2="170" />
                <line className="text-[#bec8c8]/40" stroke="currentColor" x1="0" x2="720" y1="210" y2="210" />

                <text className="text-[#6f7979] text-[11px] font-sans" fill="currentColor" textAnchor="end" x="715" y="24">50k</text>
                <text className="text-[#6f7979] text-[11px] font-sans" fill="currentColor" textAnchor="end" x="715" y="74">37.5k</text>
                <text className="text-[#6f7979] text-[11px] font-sans" fill="currentColor" textAnchor="end" x="715" y="124">25k</text>
                <text className="text-[#6f7979] text-[11px] font-sans" fill="currentColor" textAnchor="end" x="715" y="174">12.5k</text>

                {/* 6 Data Groups */}
                <g transform="translate(60, 0)">
                  <rect className="fill-[#005253] hover:opacity-85 transition-opacity" height="144" rx="4" width="26" x="0" y="66" />
                  <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity" height="96" rx="4" width="26" x="30" y="114" />
                </g>
                <g transform="translate(165, 0)">
                  <rect className="fill-[#005253] hover:opacity-85 transition-opacity" height="154" rx="4" width="26" x="0" y="56" />
                  <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity" height="99" rx="4" width="26" x="30" y="111" />
                </g>
                <g transform="translate(270, 0)">
                  <rect className="fill-[#005253] hover:opacity-85 transition-opacity" height="165" rx="4" width="26" x="0" y="45" />
                  <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity" height="102" rx="4" width="26" x="30" y="108" />
                </g>
                <g transform="translate(375, 0)">
                  <rect className="fill-[#005253] hover:opacity-85 transition-opacity" height="172" rx="4" width="26" x="0" y="38" />
                  <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity" height="104" rx="4" width="26" x="30" y="106" />
                </g>
                <g transform="translate(480, 0)">
                  <rect className="fill-[#005253] hover:opacity-85 transition-opacity" height="174" rx="4" width="26" x="0" y="36" />
                  <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity" height="108" rx="4" width="26" x="30" y="102" />
                </g>
                <g transform="translate(585, 0)">
                  <rect className="fill-[#005253] hover:opacity-85 transition-opacity" height="185" rx="4" width="26" x="0" y="25" />
                  <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity" height="111" rx="4" width="26" x="30" y="99" />
                </g>

                {/* Dotted Profit Trendline */}
                <polyline
                  className="text-[#7d5800]"
                  fill="none"
                  points="88,162 193,155 298,147 403,142 508,143 613,136"
                  stroke="currentColor"
                  strokeDasharray="5 4"
                  strokeWidth="3"
                />

                <circle className="fill-[#7d5800] stroke-white stroke-2" cx="88" cy="162" r="4" />
                <circle className="fill-[#7d5800] stroke-white stroke-2" cx="193" cy="155" r="4" />
                <circle className="fill-[#7d5800] stroke-white stroke-2" cx="298" cy="147" r="4" />
                <circle className="fill-[#7d5800] stroke-white stroke-2" cx="403" cy="142" r="4" />
                <circle className="fill-[#7d5800] stroke-white stroke-2" cx="508" cy="143" r="4" />
                <circle className="fill-[#7d5800] stroke-white stroke-2" cx="613" cy="136" r="5" />

                <text className="text-[#111c2d] font-semibold text-xs" fill="currentColor" textAnchor="middle" x="88" y="230">محرم</text>
                <text className="text-[#111c2d] font-semibold text-xs" fill="currentColor" textAnchor="middle" x="193" y="230">صفر</text>
                <text className="text-[#111c2d] font-semibold text-xs" fill="currentColor" textAnchor="middle" x="298" y="230">ربيع الأول</text>
                <text className="text-[#111c2d] font-semibold text-xs" fill="currentColor" textAnchor="middle" x="403" y="230">ربيع الثاني</text>
                <text className="text-[#111c2d] font-semibold text-xs" fill="currentColor" textAnchor="middle" x="508" y="230">جمادى</text>
                <text className="text-[#005253] font-bold text-xs" fill="currentColor" textAnchor="middle" x="613" y="230">رجب / شعبان</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Chart 2: Students Attendance & Status Ratio Donut/Bars */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-[#bec8c8]/25 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#0284c7] rounded-full"></span>
              <h3 className="text-base sm:text-lg font-bold text-[#111c2d]">
                نسبة الطلاب النشطين والمتأخرين
              </h3>
            </div>
            <p className="text-xs text-[#526060] pr-4 mt-0.5">
              توزيع حالات الطلاب في الحلقات القرآنية
            </p>
          </div>

          {/* Visual Progress Breakdown */}
          <div className="flex flex-col gap-4 py-2">
            {/* Active Regular */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-[#15803d]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#15803d]"></span>
                  <span>نشطين ومنتظمين ({activeStudentsCount} طالباً)</span>
                </span>
                <span className="font-mono">{activePercent}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#15803d] h-full rounded-full transition-all duration-500" style={{ width: `${activePercent}%` }}></div>
              </div>
            </div>

            {/* Warning / Overdue */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-[#ba1a1a]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></span>
                  <span>متأخرين وبحاجة متابعة ({overdueStudentsCount} طالباً)</span>
                </span>
                <span className="font-mono">{overduePercent}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#ba1a1a] h-full rounded-full transition-all duration-500" style={{ width: `${overduePercent}%` }}></div>
              </div>
            </div>

            {/* On Vacation */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-[#7d5800]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ca8a04]"></span>
                  <span>في إجازة رسمية ({vacationStudentsCount} طالباً)</span>
                </span>
                <span className="font-mono">{vacationPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#ca8a04] h-full rounded-full transition-all duration-500" style={{ width: `${vacationPercent}%` }}></div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Summary */}
          <div className="bg-[#f0f3ff] rounded-2xl p-3 border border-[#bec8c8]/20 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#6f7979]">متوسط اشتراك الطالب:</span>
              <span className="font-bold text-[#005253] font-mono">{avgSubscription} ر.س</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6f7979]">نسبة تغطية الإيرادات للمصروفات:</span>
              <span className="font-bold text-[#7d5800] font-mono">{coverageRatio}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: LIVE ACTIVITY LOG (سجل النشاطات الحية) */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#bec8c8]/25 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#bec8c8]/20">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-[#005253]/10 text-[#005253] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">history</span>
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#111c2d]">
                سجل النشاطات والعمليات الحية (Activity Log)
              </h3>
              <p className="text-xs text-[#526060]">
                رصد فوري لجميع الإجراءات: تسليم التقارير، إضافة الطلاب، ملاحظات المشرفين، وتحديث الاشتراكات
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-[#005253] bg-[#f0f3ff] px-3 py-1.5 rounded-xl border border-[#bec8c8]/20">
            {activityLogs.length} عملية موثقة
          </span>
        </div>

        {/* Activity Logs Timeline / List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activityLogs.slice(0, 6).map((log) => {
            const isReport = log.action.includes('تقرير');
            const isStudent = log.action.includes('طالب');
            const isObservation = log.action.includes('مراقبة') || log.action.includes('ملاحظة');
            const isVacation = log.action.includes('إجازة');

            return (
              <div
                key={log.id}
                className="bg-[#f9f9ff] rounded-2xl p-3.5 border border-[#bec8c8]/20 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-2.5 text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isReport
                          ? 'bg-[#dcfce7] text-[#15803d]'
                          : isObservation
                          ? 'bg-[#fef9c3] text-[#854d0e]'
                          : isStudent
                          ? 'bg-[#dee8ff] text-[#005253]'
                          : isVacation
                          ? 'bg-[#ffdea9] text-[#7d5800]'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {log.action}
                    </span>
                    <span className="text-[10px] text-[#6f7979] font-mono dir-ltr">
                      {log.timestamp}
                    </span>
                  </div>

                  <p className="font-bold text-[#111c2d] leading-snug">
                    {log.studentName ? `الطالب: ${log.studentName}` : log.action}
                  </p>
                  <p className="text-[#526060] text-[11px] mt-1 leading-relaxed">
                    {log.details}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#bec8c8]/15 flex items-center justify-between text-[10px] text-gray-500">
                  <span>المنفّذ: <strong className="text-[#111c2d]">{log.userName}</strong></span>
                  <span className="text-[#005253] font-semibold">{log.userRole}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: GENERAL ACADEMY STUDENTS & SUBSCRIPTIONS DIRECTORY */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-[#bec8c8]/25 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#bec8c8]/20">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#111c2d]">
              سجل الاشتراكات الشامل ومتابعة الحلقات الإدارية ({filteredStudents.length} طالباً)
            </h3>
            <p className="text-xs text-[#526060]">
              بيانات الطلاب المالية، تكلفة المعلم، مواعيد الحصص، وأوضاع التقارير الشهرية
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportToExcel(filteredStudents)}
              className="px-3.5 py-2 rounded-xl bg-[#005253] text-white hover:bg-[#186b6d] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>تصدير السجل المفلتر (Excel)</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#f0f3ff] p-3.5 rounded-2xl border border-[#bec8c8]/20">
          {/* Universal Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#6f7979] text-base pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث سريع شامل (اسم الطالب، المعلم، الهاتف، السورة)..."
              className="w-full h-10 pr-9 pl-3 rounded-xl bg-white text-xs text-[#111c2d] border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
            />
          </div>

          {/* Teacher Select */}
          <div>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white text-xs text-[#111c2d] border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 font-semibold"
            >
              <option value="all">كافة المعلمين ({teachers.length})</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.circleName})
                </option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-white text-xs text-[#111c2d] border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 font-semibold"
            >
              <option value="all">كافة الحالات</option>
              <option value="active">سارٍ ومنتظم</option>
              <option value="warning">تحذير (&gt; 25 يوماً)</option>
              <option value="overdue">تقرير متأخر (&gt; 30 يوماً)</option>
              <option value="vacation">في إجازة</option>
            </select>
          </div>
        </div>

        {/* Directory Table (Desktop / Tablet) */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-[#bec8c8]/20">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#005253] text-xs font-bold border-b border-[#bec8c8]/20">
                <th className="py-3 px-3.5">اسم الطالب</th>
                <th className="py-3 px-3.5">المعلم والحلقة</th>
                <th className="py-3 px-3.5 text-center">ولي الأمر</th>
                <th className="py-3 px-3.5 text-left">قيمة الاشتراك</th>
                <th className="py-3 px-3.5 text-left">مصروف المعلم</th>
                <th className="py-3 px-3.5">تاريخ آخر تقرير</th>
                <th className="py-3 px-3.5">دورة 8 حصص</th>
                <th className="py-3 px-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bec8c8]/20">
              {filteredStudents.slice(0, 12).map((student) => {
                const teacher = getTeacherById(student.teacherId);
                const reportInfo = getReportStatusInfo(student.lastReportDate);
                const isRedLate = reportInfo.isOverdue && student.status === 'active';
                const isYellowWarning = reportInfo.isWarning && student.status === 'active';
                const isVacation = student.status === 'vacation';
                const latestReport = reports.find((r) => r.studentId === student.id);
                const isReadyToSend = latestReport?.submissionStatus === 'submitted_ready_to_send';

                return (
                  <tr
                    key={student.id}
                    className={`hover:bg-[#f9f9ff] transition-colors ${
                      isReadyToSend ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    {/* Student Name */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-[#005253] text-white font-bold flex items-center justify-center text-xs">
                          {student.initials}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-[#111c2d]">
                              {student.name}
                            </span>
                            {isReadyToSend && (
                              <span className="px-1.5 py-0.5 rounded-md bg-[#dcfce7] text-[#15803d] text-[10px] font-black border border-[#86efac]">
                                جاهز للإرسال
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#6f7979]">
                            {student.surahProgress}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Teacher */}
                    <td className="py-3 px-3.5 text-xs">
                      <span className="font-bold text-[#111c2d] block">
                        {teacher?.name || 'غير محدد'}
                      </span>
                      <span className="text-[11px] text-[#526060]">
                        {teacher?.circleName}
                      </span>
                    </td>

                    {/* Parent Phone */}
                    <td className="py-3 px-3.5 text-center">
                      <a
                        href={getParentWhatsAppUrl(student.parentPhone, student.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#dcfce7] text-[#15803d] hover:bg-[#16a34a] hover:text-white transition-all text-xs font-semibold"
                        title="مراسلة ولي الأمر عبر واتساب"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span dir="ltr">{student.parentPhone}</span>
                      </a>
                    </td>

                    {/* Financial: Subscription Fee */}
                    <td className="py-3 px-3.5 font-black text-[#005253] text-left text-xs">
                      {student.subscriptionFee} <span className="font-normal text-[10px]">ر.س</span>
                    </td>

                    {/* Financial: Teacher Cost */}
                    <td className="py-3 px-3.5 text-left text-xs font-semibold text-[#3f4949]">
                      {student.teacherCost ?? 120} <span className="font-normal text-[10px]">ر.س</span>
                    </td>

                    {/* Last Report Date & Badge */}
                    <td className="py-3 px-3.5">
                      {isVacation ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#ffdea9] text-[#7d5800] text-[10px] font-bold">
                          إجازة معتمدة
                        </span>
                      ) : isRedLate ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold">
                          متأخر ({reportInfo.days} يوماً)
                        </span>
                      ) : isYellowWarning ? (
                        <span className="px-2 py-0.5 rounded-full bg-[#fef9c3] text-[#854d0e] text-[10px] font-bold">
                          تحذير ({reportInfo.days} يوماً)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[10px] font-bold">
                          منتظم ({reportInfo.days} يوماً)
                        </span>
                      )}
                    </td>

                    {/* Cycle sessions count */}
                    <td className="py-3 px-3.5 text-xs font-mono font-bold text-[#005253]">
                      {student.currentCycleSessionsCount || 0} / 8 حصص
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isReadyToSend && latestReport && (
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(student, latestReport)}
                            className="p-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
                            title="تحميل تقرير PDF"
                          >
                            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                          </button>
                        )}
                        <button
                          onClick={() => onAddReport(student)}
                          className="p-1 rounded-lg text-[#005253] hover:bg-[#005253]/10"
                          title="إضافة تقرير"
                        >
                          <span className="material-symbols-outlined text-base">rate_review</span>
                        </button>
                        <button
                          onClick={() => onManageVacation(student)}
                          className="p-1 rounded-lg text-[#7d5800] hover:bg-[#ffdea9]"
                          title="إدارة الإجازة"
                        >
                          <span className="material-symbols-outlined text-base">event_busy</span>
                        </button>
                        <button
                          onClick={() => onEditStudent(student)}
                          className="p-1 rounded-lg text-[#3f4949] hover:bg-[#dee8ff]"
                          title="تعديل الطالب"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Vertical Cards View (Shown on screens < md) */}
        <div className="md:hidden flex flex-col gap-3">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-[#6f7979] text-xs">
              لا توجد نتائج مطابقة لخيارات البحث
            </div>
          ) : (
            filteredStudents.slice(0, 12).map((student) => {
              const teacher = getTeacherById(student.teacherId);
              const reportInfo = getReportStatusInfo(student.lastReportDate);
              const isRedLate = reportInfo.isOverdue && student.status === 'active';
              const isYellowWarning = reportInfo.isWarning && student.status === 'active';
              const isVacation = student.status === 'vacation';
              const latestReport = reports.find((r) => r.studentId === student.id);
              const isReadyToSend = latestReport?.submissionStatus === 'submitted_ready_to_send';

              return (
                <div
                  key={`manager-mob-${student.id}`}
                  className={`p-4 rounded-2xl border shadow-2xs flex flex-col gap-3 transition-all ${
                    isReadyToSend
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : isRedLate
                      ? 'bg-[#fff5f5] border-[#ffdad6]'
                      : isYellowWarning
                      ? 'bg-[#fefce8] border-[#fde047]'
                      : isVacation
                      ? 'bg-[#fffbeb] border-[#ffdea9]'
                      : 'bg-white border-[#bec8c8]/25'
                  }`}
                >
                  {/* Top: Student Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#005253] text-white font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                        {student.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-[#111c2d]">
                            {student.name}
                          </h4>
                          {isReadyToSend && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#dcfce7] text-[#15803d] text-[10px] font-black border border-[#86efac]">
                              جاهز للإرسال
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#526060] block mt-0.5">
                          {student.surahProgress}
                        </span>
                      </div>
                    </div>

                    {isVacation ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#ffdea9] text-[#7d5800] text-[10px] font-bold">
                        إجازة
                      </span>
                    ) : isRedLate ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold">
                        متأخر ({reportInfo.days} يوماً)
                      </span>
                    ) : isYellowWarning ? (
                      <span className="px-2 py-0.5 rounded-full bg-[#fef9c3] text-[#854d0e] text-[10px] font-bold">
                        تحذير ({reportInfo.days} يوماً)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[10px] font-bold">
                        منتظم
                      </span>
                    )}
                  </div>

                  {/* Financials & Teacher Row */}
                  <div className="grid grid-cols-2 gap-2 bg-[#f0f3ff] p-3 rounded-xl text-xs border border-[#bec8c8]/20">
                    <div>
                      <span className="text-[#6f7979] text-[10px] block">المعلم:</span>
                      <strong className="text-[#111c2d] block truncate">{teacher?.name || 'غير محدد'}</strong>
                      <span className="text-[10px] text-[#005253] block truncate">{teacher?.circleName}</span>
                    </div>

                    <div>
                      <span className="text-[#6f7979] text-[10px] block">دورة 8 حصص:</span>
                      <span className="font-bold text-[#005253] block">
                        {student.currentCycleSessionsCount || 0} / 8 حصص
                      </span>
                      <span className="text-[10px] text-[#6f7979] dir-ltr text-right block">
                        آخر تقرير: {student.lastReportDate}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-[#bec8c8]/20">
                      <span className="text-[#6f7979] text-[10px] block">اشتراك الطالب:</span>
                      <strong className="text-[#005253] font-bold">{student.subscriptionFee} ر.س</strong>
                    </div>

                    <div className="pt-1.5 border-t border-[#bec8c8]/20">
                      <span className="text-[#6f7979] text-[10px] block">مصروف المعلم:</span>
                      <strong className="text-[#3f4949]">{student.teacherCost ?? 120} ر.س</strong>
                    </div>
                  </div>

                  {/* Big Thumb Buttons */}
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

                    {latestReport && (
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(student, latestReport)}
                        className="min-h-[42px] px-3 rounded-xl bg-white border border-[#005253]/30 text-[#005253] hover:bg-[#005253]/10 text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        title="تحميل تقرير PDF"
                      >
                        <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                        <span className="hidden sm:inline">PDF</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onAddReport(student)}
                      className="min-h-[42px] px-3 rounded-xl bg-[#005253] hover:bg-[#186b6d] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                      title="تسجيل تقرير جديد"
                    >
                      <span className="material-symbols-outlined text-base">rate_review</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditStudent(student)}
                      className="min-h-[42px] w-10 rounded-xl bg-white border border-[#bec8c8]/30 hover:bg-[#dee8ff] text-[#3f4949] flex items-center justify-center transition-colors cursor-pointer"
                      title="تعديل بيانات الطالب"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Directory Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[#6f7979]">
          <span>
            عرض {Math.min(12, filteredStudents.length)} من أصل {filteredStudents.length} طالباً مسجلاً
          </span>
          <span className="font-bold text-[#005253]">
            إجمالي الاشتراكات المعروضة: {filteredStudents.reduce((sum, s) => sum + (s.subscriptionFee || 0), 0).toLocaleString()} ر.س
          </span>
        </div>
      </section>
    </div>
  );
};
