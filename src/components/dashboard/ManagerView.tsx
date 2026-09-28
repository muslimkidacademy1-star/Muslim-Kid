import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Report } from '../../types';
import { getParentWhatsAppUrl, getReportWhatsAppUrl } from '../../utils/whatsapp';
import { generateStudentReportPdf } from '../../utils/pdfGenerator';

interface ManagerViewProps {
  onAddStudent?: () => void;
  onEditStudent?: (student: Student) => void;
  onAddReport?: (student: Student) => void;
  onManageVacation?: (student: Student) => void;
}

export const ManagerView: React.FC<ManagerViewProps> = () => {
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

  const [selectedPeriod] = useState('هذا الشهر (شعبان - رمضان 1445)');
  const [sentReportSuccessId, setSentReportSuccessId] = useState<string | null>(null);

  // 1. Pending Reports for Dispatch: Reports submitted by teachers (status: submitted_to_director / submitted_ready_to_send)
  const pendingDispatchReports = useMemo(() => {
    return reports
      .filter((r) => r.submissionStatus === 'submitted_to_director' || r.submissionStatus === 'submitted_ready_to_send')
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

  const avgSubscription = activeStudentsCount > 0 ? Math.round(totalSubscriptions / activeStudentsCount) : 0;
  const coverageRatio = totalTeacherCosts > 0 ? Math.round((totalSubscriptions / totalTeacherCosts) * 100) : 0;

  // Student active vs overdue percentage calculations
  const totalTrackedStudents = students.length;
  const activePercent = totalTrackedStudents > 0 ? Math.round((activeStudentsCount / totalTrackedStudents) * 100) : 0;
  const overduePercent = totalTrackedStudents > 0 ? Math.round((overdueStudentsCount / totalTrackedStudents) * 100) : 0;
  const vacationPercent = totalTrackedStudents > 0 ? Math.round((vacationStudentsCount / totalTrackedStudents) * 100) : 0;

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
              <span className="material-symbols-outlined text-xs">account_balance_wallet</span>
              {activeStudentsCount > 0 ? `${activeStudentsCount} اشتراك نشط` : '0 اشتراكات'}
            </span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-[#6f7979] font-bold">إجمالي الاشتراكات المحصلة</span>
            <div className="text-2xl sm:text-3xl font-black text-[#111c2d] tracking-tight">
              {totalSubscriptions.toLocaleString()}{' '}
              <span className="text-sm font-bold text-[#6f7979]">ر.س</span>
            </div>
            <span className="text-xs text-[#005253] font-semibold mt-1">
              {totalSubscriptions > 0
                ? `مجموع رسوم الاشتراكات للطلاب المنتظمين (${activeStudentsCount} طالباً)`
                : 'لا توجد اشتراكات مسجلة بعد'}
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
              {teachers.length > 0
                ? `مستحقات ${teachers.length} معلماً ومحفظاً للشهر الحالي`
                : 'لا يوجد معلمون مسجلون بعد'}
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
              {totalSubscriptions > 0 || totalTeacherCosts > 0
                ? netProfit >= 0
                  ? 'الفائض التشغيلي بعد سداد رواتب الكادر'
                  : 'عجز تشغيلي يحتاج زيادة الاشتراكات'
                : 'لا توجد عمليات مالية مسجلة بعد'}
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
              {students.length > 0 ? `${activePercent}% انتظام` : '0%'}
            </span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-[#6f7979] font-bold">الطلاب النشطين حالياً</span>
            <div className="text-2xl sm:text-3xl font-black text-[#111c2d] tracking-tight">
              {activeStudentsCount}{' '}
              <span className="text-sm font-bold text-[#6f7979]">طالباً</span>
            </div>
            <span className="text-xs text-[#6f7979] font-semibold mt-1">
              {students.length > 0
                ? `من أصل ${students.length} مسجلاً (${vacationStudentsCount} في إجازة، ${overdueStudentsCount} يحتاج متابعة)`
                : 'لم يتم تسجيل أي طلاب في النظام بعد'}
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
            <span className="material-symbols-outlined text-4xl text-[#005253]/30 mb-1">
              inbox
            </span>
            <p className="text-sm font-bold text-[#111c2d]">
              لا توجد تقارير واردة حالياً
            </p>
            <p className="text-xs text-[#6f7979] mt-0.5">
              ستظهر هنا تقارير دورة الـ 8 حصص المعتمدة من قِبل المعلمين (الحالة: submitted_to_director) فور رفعها لمراجعتها وإرسالها لأولياء الأمور
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

          {/* Responsive Live Financial Chart */}
          {totalSubscriptions === 0 && totalTeacherCosts === 0 ? (
            <div className="w-full h-56 rounded-2xl bg-[#f0f3ff]/60 border-2 border-dashed border-[#bec8c8]/30 flex flex-col items-center justify-center text-center p-6 gap-2">
              <span className="material-symbols-outlined text-4xl text-[#005253]/40">
                analytics
              </span>
              <h4 className="text-sm font-bold text-[#111c2d]">
                لا توجد بيانات مالية مسجلة بعد
              </h4>
              <p className="text-xs text-[#6f7979] max-w-sm">
                سيتم بناء الرسم البياني والمؤشرات تلقائياً فور تسجيل أول اشتراك فعلي أو اعتماد رواتب المعلمين.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto pt-2">
              <div className="min-w-[450px] h-56 flex flex-col justify-between py-2 relative">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 200">
                  <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="600" y1="20" y2="20" />
                  <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="600" y1="80" y2="80" />
                  <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="600" y1="140" y2="140" />
                  <line className="text-[#bec8c8]/40" stroke="currentColor" x1="0" x2="600" y1="175" y2="175" />

                  {/* Single live period representation */}
                  <g transform="translate(230, 0)">
                    {/* Subscriptions Bar */}
                    <rect
                      className="fill-[#005253] hover:opacity-85 transition-opacity"
                      height={Math.min(130, Math.max(10, (totalSubscriptions / (Math.max(totalSubscriptions, totalTeacherCosts) || 1)) * 130))}
                      rx="6"
                      width="35"
                      x="0"
                      y={175 - Math.min(130, Math.max(10, (totalSubscriptions / (Math.max(totalSubscriptions, totalTeacherCosts) || 1)) * 130))}
                    />
                    {/* Costs Bar */}
                    <rect
                      className="fill-[#cfdaf2] hover:opacity-85 transition-opacity"
                      height={Math.min(130, Math.max(10, (totalTeacherCosts / (Math.max(totalSubscriptions, totalTeacherCosts) || 1)) * 130))}
                      rx="6"
                      width="35"
                      x="45"
                      y={175 - Math.min(130, Math.max(10, (totalTeacherCosts / (Math.max(totalSubscriptions, totalTeacherCosts) || 1)) * 130))}
                    />
                  </g>

                  <text className="text-[#005253] font-bold text-xs" fill="currentColor" textAnchor="middle" x="270" y="195">
                    الفترة الحالية الفعلية
                  </text>
                </svg>
              </div>
            </div>
          )}
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

    </div>
  );
};
