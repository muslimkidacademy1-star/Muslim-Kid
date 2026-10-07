import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Report, Teacher } from '../../types';
import { getReportWhatsAppUrl, getTeacherReminderWhatsAppUrl } from '../../utils/whatsapp';
import { generateStudentReportPdf } from '../../utils/pdfGenerator';
import { ManagerBottomNav, ManagerTab } from './ManagerBottomNav';
import { ManagerQuickStatsChart } from './ManagerQuickStatsChart';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface ManagerViewProps {
  onAddStudent?: () => void;
  onEditStudent?: (student: Student) => void;
  onAddReport?: (student: Student) => void;
  onManageVacation?: (student: Student) => void;
  onNavigateTab?: (tab: 'dashboard' | 'students' | 'teachers' | 'reports' | 'logs') => void;
  onOpenActivityLog?: () => void;
}

// Get Cairo Date Details
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

  const currentMonthName = new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    month: 'long',
    year: 'numeric',
  }).format(now);

  return { weekday, formattedDate, currentMonthName };
}

export const ManagerView: React.FC<ManagerViewProps> = ({
  onNavigateTab,
  onOpenActivityLog,
}) => {
  const {
    students,
    teachers,
    reports,
    totalSubscriptions,
    totalTeacherCosts,
    netProfit,
    profitMargin,
    activeStudentsCount,
    vacationStudentsCount,
    overdueStudentsCount,
    financialMonths,
    getTeacherById,
    exportToExcel,
    addActivityLog,
    markReportAsSentToParent,
    currentUser,
    isSuperAdmin,
    previewRole,
    setPreviewRole,
    fetchFromSupabase,
    logout,
  } = useApp();

  const { weekday: cairoWeekday, formattedDate: cairoFormattedDate, currentMonthName } = useMemo(
    () => getCairoDateDetails(),
    []
  );

  const [sentReportSuccessId, setSentReportSuccessId] = useState<string | null>(null);

  // Reminder Modal State
  const [reminderTarget, setReminderTarget] = useState<{
    teacher: Teacher | undefined;
    student: Student;
    report: Report;
  } | null>(null);

  // Mobile Hub Modals State
  const [isAcademyModalOpen, setIsAcademyModalOpen] = useState(false);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);

  // 1. Pending Reports for Action: Reports submitted by teachers needing director approval / dispatch
  const pendingDispatchReports = useMemo(() => {
    return reports
      .filter(
        (r) =>
          r.submissionStatus === 'submitted_to_director' ||
          r.submissionStatus === 'submitted_ready_to_send' ||
          (!r.submissionStatus && (r as any).status !== 'approved')
      )
      .map((report) => {
        const student = students.find((s) => s.id === report.studentId);
        const teacher = getTeacherById(report.teacherId);
        return {
          report,
          student,
          teacher,
        };
      })
      .filter((item): item is { report: Report; student: Student; teacher: Teacher | undefined } => item.student !== undefined);
  }, [reports, students, getTeacherById]);

  // 2. Sent & Completed Reports
  const completedDispatchReports = useMemo(() => {
    return reports.filter(
      (r) => r.submissionStatus === 'sent_to_parent' || r.submissionStatus === 'approved'
    );
  }, [reports]);

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

  // Handle Mark as Sent (Strict separation from opening WhatsApp)
  const handleMarkAsSent = (reportId: string, studentName: string) => {
    markReportAsSentToParent(reportId);
    setSentReportSuccessId(reportId);
    addActivityLog(
      'اعتماد وإرسال تقرير',
      studentName,
      undefined,
      `تم تأكيد إرسال تقرير الطالب ${studentName} لولي الأمر ونقله للأرشيف المعتمد بواسطة ${currentUser.name}`
    );
    setTimeout(() => {
      setSentReportSuccessId(null);
    }, 3500);
  };

  // Budget CSV Export
  const handleExportBudget = () => {
    const headers = [
      'الشهر',
      'إجمالي الاشتراكات المسجلة (ر.س)',
      'مستحقات المعلمين عن الطلاب (ر.س)',
      'الفارق التقديري (ر.س)',
      'هامش الفارق التقديري',
    ];
    const rows = financialMonths.map((m) => [
      `"${m.monthName}"`,
      m.subscriptions,
      m.teacherCosts,
      m.netProfit,
      `"${Math.round((m.netProfit / (m.subscriptions || 1)) * 100)}%"`,
    ]);
    rows.push([
      `"${currentMonthName}"`,
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

    addActivityLog(
      'تصدير الميزانية المالية',
      undefined,
      undefined,
      'تم تصدير كشف الميزانية والتقديرات المالية بصيغة CSV'
    );
  };

  // Handle Bottom Nav Switch on Mobile
  const handleBottomNavChange = (tab: ManagerTab) => {
    if (tab === 'overview') {
      if (onNavigateTab) onNavigateTab('dashboard');
    } else if (tab === 'reports') {
      if (onNavigateTab) onNavigateTab('reports');
    } else if (tab === 'academy') {
      setIsAcademyModalOpen(true);
    } else if (tab === 'more') {
      setIsMoreModalOpen(true);
    }
  };

  return (
    <div className="flex flex-col w-full gap-5 text-right pb-24 sm:pb-12" dir="rtl">
      {/* SUCCESS TOAST ALERT */}
      {sentReportSuccessId && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1A7B88] text-white flex items-center justify-between shadow-md animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-2xl text-emerald-200">check_circle</span>
            <span className="text-xs sm:text-sm font-semibold">
              تم اعتماد التقرير بنجاح ونقله إلى سجل التقارير المكتملة!
            </span>
          </div>
          <button
            onClick={() => setSentReportSuccessId(null)}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10 cursor-pointer min-h-[36px]"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* TOP HEADER: Clean Apple-inspired Executive Title & Cairo Date */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF5F7] border border-[#1A7B88]/20 flex items-center justify-center text-[#125862] text-xl font-bold shadow-2xs shrink-0">
            {currentUser.initials || 'م'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
                الرئيسية
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5F7] text-[#125862] text-xs font-bold border border-[#1A7B88]/20">
                {currentUser.name}
              </span>
              {pendingDispatchReports.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                  {pendingDispatchReports.length} تقرير يحتاج إجراء
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-sm text-[#1A7B88]">schedule</span>
              <span>{cairoWeekday}، {cairoFormattedDate}</span>
              <span className="text-gray-400">·</span>
              <span>توقيت القاهرة</span>
            </p>
          </div>
        </div>

        {/* Desktop Quick Shortcuts */}
        <div className="hidden sm:flex items-center gap-2">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('reports')}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-[#EAF5F7] border border-gray-200/80 text-[#125862] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">description</span>
              <span>عرض كل التقارير</span>
            </button>
          )}
          <button
            onClick={() => exportToExcel(students)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="تصدير بيانات الأكاديمية بصيغة Excel"
          >
            <span className="material-symbols-outlined text-base">download</span>
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: التقارير التي تحتاج إجراء (First Section) */}
      <section className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200/80 shadow-2xs flex flex-col gap-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#EAF5F7] text-[#125862] flex items-center justify-center shrink-0 border border-[#1A7B88]/20">
              <span className="material-symbols-outlined text-xl">assignment_late</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#1D1D1F]">
                  التقارير التي تحتاج إجراء
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                  {pendingDispatchReports.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                تقارير إنجاز الطلاب المرفوعة من المعلمين بانتظار الاعتماد والإرسال لأولياء الأمور
              </p>
            </div>
          </div>

          {/* Quick link to all reports */}
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-bold text-[#1A7B88] hover:text-[#125862] self-start sm:self-auto flex items-center gap-1 cursor-pointer min-h-[44px] px-2"
            >
              <span>عرض كل التقارير ({reports.length})</span>
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
          )}
        </div>

        {/* Pending Reports List (Vertical Cards - Mobile First) */}
        {pendingDispatchReports.length === 0 ? (
          <div className="py-8 bg-gray-50/70 rounded-xl text-center flex flex-col items-center justify-center border border-gray-100 px-4">
            <span className="material-symbols-outlined text-3xl text-gray-400 mb-1.5">
              task_alt
            </span>
            <p className="text-sm font-bold text-[#1D1D1F]">
              لا توجد تقارير بانتظار الإجراء حالياً
            </p>
            <p className="text-xs text-gray-500 mt-0.5 max-w-sm">
              جميع تقارير إنجاز الطلاب معتمدة ومُرسلة لأولياء الأمور بنجاح.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingDispatchReports.map(({ report, student, teacher }) => {
              const packageSessions = report.cycleSessionsCount || student.packageSessionsCount || 8;
              const parentWhatsAppUrl = getReportWhatsAppUrl(student.parentPhone, student.name);

              return (
                <div
                  key={`pending-${report.id}`}
                  className="bg-white rounded-xl p-3.5 sm:p-4 border border-gray-200/90 shadow-2xs flex flex-col gap-3 hover:border-[#1A7B88]/40 transition-colors"
                >
                  {/* Top Row: Student & Teacher & Package */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#EAF5F7] text-[#125862] font-bold flex items-center justify-center text-sm shrink-0 border border-[#1A7B88]/20">
                        {student.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-[#1D1D1F] truncate">
                            {student.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/60">
                            باقة {packageSessions} حصص
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 block mt-0.5 truncate">
                          المعلم: {report.submittedByTeacherName || teacher?.name || 'غير محدد'}
                          {teacher?.circleName ? ` (${teacher.circleName})` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge in Friendly Arabic */}
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200 shrink-0">
                      بانتظار الاعتماد والإرسال
                    </span>
                  </div>

                  {/* Middle Box: Details & Phone */}
                  <div className="bg-gray-50 rounded-xl p-2.5 sm:p-3 text-xs flex flex-col gap-1.5 border border-gray-100">
                    <div className="flex items-center justify-between text-gray-700 flex-wrap gap-1">
                      <span className="font-medium text-gray-600">
                        تاريخ وصول التقرير: <strong className="font-mono text-gray-900">{report.reportDate}</strong>
                      </span>
                      <span className="font-bold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[#125862]">
                        التقدير: {report.grade || (report.memorizationScore ? `${report.memorizationScore}%` : 'ممتاز')}
                      </span>
                    </div>

                    {(report.memorizationDetails || report.performanceSummary) && (
                      <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed mt-0.5">
                        <strong className="text-gray-700">ملخص الإنجاز:</strong>{' '}
                        {report.memorizationDetails || report.performanceSummary}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-xs">
                      <span className="text-gray-500">هاتف ولي الأمر:</span>
                      <span className="font-mono font-bold text-gray-800 dir-ltr">
                        {student.parentPhone || 'غير مسجل'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Grid: PDF Preview + Send WhatsApp + Mark as Sent + Quick Reminder */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    {/* 1. PDF Preview & Download */}
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(student, report)}
                      className="min-h-[44px] flex-1 py-2 px-3 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-[#125862] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="معاينة وتحميل التقرير بصيغة PDF"
                    >
                      <span className="material-symbols-outlined text-base text-[#1A7B88]">picture_as_pdf</span>
                      <span>معاينة PDF</span>
                    </button>

                    {/* 2. Open WhatsApp for Parent (Does NOT automatically mark as sent) */}
                    <a
                      href={parentWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] flex-1 py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#1eb757] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                      title="فتح محادثة واتساب لإرسال التقرير لولي الأمر"
                    >
                      <span className="material-symbols-outlined text-base">chat</span>
                      <span>إرسال واتساب</span>
                    </a>

                    {/* 3. Confirm Sent to Parent (Strict manual confirmation) */}
                    <button
                      type="button"
                      onClick={() => handleMarkAsSent(report.id, student.name)}
                      className="min-h-[44px] flex-1 py-2 px-3 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="تأكيد اعتماد التقرير ونقله إلى الأرشيف المكتمل"
                    >
                      <span className="material-symbols-outlined text-base">done_all</span>
                      <span>تأكيد الإرسال</span>
                    </button>

                    {/* 4. Quick Teacher Reminder via WhatsApp Modal */}
                    <button
                      type="button"
                      onClick={() => setReminderTarget({ teacher, student, report })}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="إرسال تذكير سريع للمعلم عبر واتساب"
                    >
                      <span className="material-symbols-outlined text-base text-amber-600">notifications_active</span>
                      <span>تذكير المعلم</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: الملخص المالي (Compact & Transparent) */}
      <section className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200/80 shadow-2xs flex flex-col gap-4">
        {/* Financial Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#EAF5F7] text-[#125862] flex items-center justify-center shrink-0 border border-[#1A7B88]/20">
              <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1D1D1F]">
                الملخص المالي
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                مؤشرات الرقابة المالية التقديرية للشهر الحالي ({currentMonthName})
              </p>
            </div>
          </div>

          <button
            onClick={handleExportBudget}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-[#EAF5F7] border border-gray-200 text-[#125862] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            title="تصدير كشف الميزانية المالية بصيغة CSV"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>تصدير الميزانية CSV</span>
          </button>
        </div>

        {/* Financial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Total Registered Subscriptions */}
          <div className="bg-[#F5F5F7]/80 rounded-xl p-4 border border-gray-200/70 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-gray-600">
                إجمالي الاشتراكات المسجلة
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {activeStudentsCount} اشتراك نشط
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#1D1D1F] tracking-tight">
                {totalSubscriptions.toLocaleString()}{' '}
                <span className="text-xs font-bold text-gray-500">ر.س</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                الفترة: <strong>الشهر الحالي</strong> · تمثل رسوم الاشتراكات التعاقدية للطلاب النشطين (قيد مسجل بالنظام وليست مبالغ محصّلة نقدياً مثبتة).
              </p>
            </div>
          </div>

          {/* Card 2: Teacher Costs for Registered Students */}
          <div className="bg-[#F5F5F7]/80 rounded-xl p-4 border border-gray-200/70 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-gray-600">
                مستحقات المعلمين عن الطلاب
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                {teachers.length} معلماً
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#1D1D1F] tracking-tight">
                {totalTeacherCosts.toLocaleString()}{' '}
                <span className="text-xs font-bold text-gray-500">ر.س</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                الفترة: <strong>الشهر الحالي</strong> · تمثل مستحقات الحصص المخصصة للطلاب النشطين (مجموع مصروفات الطلاب). ملاحظة: تختلف عن رواتب المعلمين الثابتة التقديرية (3,950 ر.س/شهرياً) المحددة بملفاتهم.
              </p>
            </div>
          </div>

          {/* Card 3: Estimated Operating Balance */}
          <div className="bg-[#F5F5F7]/80 rounded-xl p-4 border border-gray-200/70 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold text-gray-600">
                الفارق التقديري التشغيلي
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                هامش {profitMargin}%
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#125862] tracking-tight">
                {netProfit.toLocaleString()}{' '}
                <span className="text-xs font-bold text-gray-500">ر.س</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-normal">
                الفترة: <strong>الشهر الحالي</strong> · الفارق الحسابي التقديري بين الاشتراكات المقيدة ومستحقات حصص المعلمين، قبل احتساب أي نفقات تشغيلية إضافية.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: ملخص الأكاديمية (Direct Academy Summary & Navigation) */}
      <section className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200/80 shadow-2xs flex flex-col gap-4">
        {/* Section Header */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
          <span className="w-9 h-9 rounded-xl bg-[#EAF5F7] text-[#125862] flex items-center justify-center shrink-0 border border-[#1A7B88]/20">
            <span className="material-symbols-outlined text-xl">hub</span>
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1D1D1F]">
              ملخص الأكاديمية
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              الأعداد الفعلية المسجلة حالياً في النظام وروابط الوصول السريع
            </p>
          </div>
        </div>

        {/* Summary Metric Cards with Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Card 1: Students */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/70 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#1A7B88]">school</span>
                <span className="font-bold text-xs text-gray-700">الطلاب المسجلون</span>
              </div>
              <span className="text-xl font-bold font-mono text-[#1D1D1F]">
                {students.length}
              </span>
            </div>
            <div className="text-xs text-gray-500 leading-relaxed">
              <span>{activeStudentsCount} نشط ومنتظم</span>
              <span className="mx-1">·</span>
              <span>{vacationStudentsCount} في إجازة</span>
              <span className="mx-1">·</span>
              <span className="text-rose-600 font-bold">{overdueStudentsCount} بحاجة متابعة</span>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('students')}
                className="min-h-[44px] w-full mt-1 py-2 px-3 rounded-lg bg-white border border-gray-200 hover:border-[#1A7B88] text-[#125862] hover:bg-[#EAF5F7] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>الانتقال لشاشة الطلاب</span>
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
            )}
          </div>

          {/* Card 2: Teachers */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/70 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#1A7B88]">badge</span>
                <span className="font-bold text-xs text-gray-700">المعلمون والمحفظون</span>
              </div>
              <span className="text-xl font-bold font-mono text-[#1D1D1F]">
                {teachers.length}
              </span>
            </div>
            <div className="text-xs text-gray-500 leading-relaxed">
              <span>كادر التدريس القرآني المعتمد والمشرف على الحلقات التعليمية</span>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('teachers')}
                className="min-h-[44px] w-full mt-1 py-2 px-3 rounded-lg bg-white border border-gray-200 hover:border-[#1A7B88] text-[#125862] hover:bg-[#EAF5F7] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>الانتقال لشاشة المعلمين</span>
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
            )}
          </div>

          {/* Card 3: Reports */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/70 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-[#1A7B88]">description</span>
                <span className="font-bold text-xs text-gray-700">سجل التقارير</span>
              </div>
              <span className="text-xl font-bold font-mono text-[#1D1D1F]">
                {reports.length}
              </span>
            </div>
            <div className="text-xs text-gray-500 leading-relaxed">
              <span>{completedDispatchReports.length} تقرير معتمد ومرسل</span>
              <span className="mx-1">·</span>
              <span className="text-amber-700 font-bold">{pendingDispatchReports.length} بانتظار الإجراء</span>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="min-h-[44px] w-full mt-1 py-2 px-3 rounded-lg bg-white border border-gray-200 hover:border-[#1A7B88] text-[#125862] hover:bg-[#EAF5F7] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>الانتقال لشاشة التقارير</span>
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4: إحصائيات سريعة ورسم بياني للنمو بواسطة Recharts */}
      <ManagerQuickStatsChart />

      {/* QUICK TEACHER REMINDER MODAL */}
      {reminderTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-gray-200 shadow-xl flex flex-col gap-4 text-right animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <span className="material-symbols-outlined text-xl">notifications_active</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1D1D1F]">
                  إرسال تذكير سريع للمعلم
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  حلقة الطالب: {reminderTarget.student.name}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3.5 text-xs text-gray-700 leading-relaxed border border-gray-200/70">
              <div className="font-bold text-[#125862] mb-1">
                المعلم: {reminderTarget.teacher?.name || 'غير محدد'} ({reminderTarget.teacher?.phone || 'لا يوجد هاتف مسجل'})
              </div>
              <p className="text-gray-600 mt-1">
                سيتم فتح محادثة واتساب جاهزة تتضمن تذكيراً لطيفاً للمعلم برفع تقرير دورة الطالب بارك الله في جهوده.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setReminderTarget(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <a
                href={getTeacherReminderWhatsAppUrl(
                  reminderTarget.teacher?.phone || '',
                  reminderTarget.student.name,
                  reminderTarget.teacher?.name
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setReminderTarget(null)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-[#25D366] hover:bg-[#1eb757] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>فتح واتساب وإرسال التذكير</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE ACADEMY NAVIGATION MODAL */}
      {isAcademyModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
          onClick={() => setIsAcademyModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 border border-gray-200 shadow-2xl flex flex-col gap-4 text-right animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#EAF5F7] text-[#125862] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">school</span>
                </span>
                <h3 className="font-bold text-base text-[#1D1D1F]">الأكاديمية</h3>
              </div>
              <button
                onClick={() => setIsAcademyModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsAcademyModalOpen(false);
                  if (onNavigateTab) onNavigateTab('students');
                }}
                className="min-h-[48px] p-3 rounded-2xl bg-gray-50 hover:bg-[#EAF5F7] text-right flex items-center justify-between border border-gray-200/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl text-[#1A7B88]">school</span>
                  <div>
                    <span className="font-bold text-sm text-[#1D1D1F] block">شاشة الطلاب</span>
                    <span className="text-[11px] text-gray-500">{students.length} طالباً مسجلاً</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-lg">chevron_left</span>
              </button>

              <button
                onClick={() => {
                  setIsAcademyModalOpen(false);
                  if (onNavigateTab) onNavigateTab('teachers');
                }}
                className="min-h-[48px] p-3 rounded-2xl bg-gray-50 hover:bg-[#EAF5F7] text-right flex items-center justify-between border border-gray-200/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-xl text-[#1A7B88]">badge</span>
                  <div>
                    <span className="font-bold text-sm text-[#1D1D1F] block">شاشة المعلمين</span>
                    <span className="text-[11px] text-gray-500">{teachers.length} معلماً ومحفظاً</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-lg">chevron_left</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE MORE NAVIGATION MODAL */}
      {isMoreModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4"
          onClick={() => setIsMoreModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 border border-gray-200 shadow-2xl flex flex-col gap-4 text-right animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#EAF5F7] text-[#125862] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">more_horiz</span>
                </span>
                <h3 className="font-bold text-base text-[#1D1D1F]">المزيد من الخيارات</h3>
              </div>
              <button
                onClick={() => setIsMoreModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-xs font-semibold">
              {/* Activity Log */}
              <button
                onClick={() => {
                  setIsMoreModalOpen(false);
                  if (onOpenActivityLog) onOpenActivityLog();
                }}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-3 text-gray-700 cursor-pointer text-right"
              >
                <span className="material-symbols-outlined text-lg text-[#1A7B88]">history</span>
                <span>سجل العمليات الإدارية</span>
              </button>

              {/* Export Students */}
              <button
                onClick={() => {
                  setIsMoreModalOpen(false);
                  exportToExcel(students);
                }}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-3 text-gray-700 cursor-pointer text-right"
              >
                <span className="material-symbols-outlined text-lg text-emerald-600">table_view</span>
                <span>تصدير بيانات الأكاديمية (Excel)</span>
              </button>

              {/* Export Budget */}
              <button
                onClick={() => {
                  setIsMoreModalOpen(false);
                  handleExportBudget();
                }}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-3 text-gray-700 cursor-pointer text-right"
              >
                <span className="material-symbols-outlined text-lg text-blue-600">payments</span>
                <span>تصدير كشف الميزانية (CSV)</span>
              </button>

              {/* PWA Install */}
              <div className="py-1">
                <PWAInstallButton variant="sidebar" />
              </div>

              {/* Preview Roles for SuperAdmin */}
              {isSuperAdmin && (
                <div className="pt-2 border-t border-gray-100 flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-gray-400 px-3">معاينة الأدوار</span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => {
                        setIsMoreModalOpen(false);
                        setPreviewRole('teacher');
                      }}
                      className={`min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold text-center cursor-pointer ${
                        previewRole === 'teacher'
                          ? 'bg-[#1A7B88] text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      المعلم
                    </button>
                    <button
                      onClick={() => {
                        setIsMoreModalOpen(false);
                        setPreviewRole('sub_supervisor');
                      }}
                      className={`min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold text-center cursor-pointer ${
                        previewRole === 'sub_supervisor'
                          ? 'bg-[#1A7B88] text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      المشرف
                    </button>
                    <button
                      onClick={() => {
                        setIsMoreModalOpen(false);
                        setPreviewRole(null);
                      }}
                      className={`min-h-[38px] px-2 py-1 rounded-lg text-xs font-bold text-center cursor-pointer ${
                        previewRole === null
                          ? 'bg-[#1A7B88] text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      المدير
                    </button>
                  </div>
                </div>
              )}

              {/* Refresh Supabase */}
              <button
                onClick={() => {
                  fetchFromSupabase();
                  setIsMoreModalOpen(false);
                }}
                className="min-h-[44px] px-3.5 py-2.5 rounded-xl hover:bg-gray-50 flex items-center gap-3 text-gray-700 cursor-pointer text-right"
              >
                <span className="material-symbols-outlined text-lg text-gray-400">sync</span>
                <span>تحديث البيانات من السيرفر</span>
              </button>

              {/* Logout */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    setIsMoreModalOpen(false);
                    logout();
                  }}
                  className="min-h-[44px] w-full px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>تسجيل الخروج</span>
                  </div>
                  <span className="text-[10px] text-rose-400">إنهاء الجلسة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION: 4 Unified Sections */}
      <ManagerBottomNav
        activeTab="overview"
        onChangeTab={handleBottomNavChange}
        pendingReportsCount={pendingDispatchReports.length}
      />
    </div>
  );
};
