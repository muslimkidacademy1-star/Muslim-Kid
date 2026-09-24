import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { getParentWhatsAppUrl, getReportWhatsAppUrl } from '../../utils/whatsapp';

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
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('هذا الشهر (شعبان - رمضان 1445)');

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const search = searchQuery.toLowerCase().trim();
      const teacher = getTeacherById(s.teacherId);
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search) ||
        s.parentPhone.includes(search) ||
        (teacher?.name && teacher.name.toLowerCase().includes(search));

      const matchesTeacher =
        selectedTeacherId === 'all' || s.teacherId === selectedTeacherId;

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'active' && s.status === 'active' && !isOverdue(s.lastReportDate)) ||
        (selectedStatus === 'vacation' && s.status === 'vacation') ||
        (selectedStatus === 'overdue' && (isOverdue(s.lastReportDate) || getDaysSinceLastReport(s.lastReportDate) > 7));

      return matchesSearch && matchesTeacher && matchesStatus;
    });
  }, [students, searchQuery, selectedTeacherId, selectedStatus, getTeacherById, getDaysSinceLastReport, isOverdue]);

  const handleExportBudget = () => {
    // Generate Budget CSV
    const headers = ['الشهر', 'إجمالي الاشتراكات المحصلة (ر.س)', 'مصروفات المعلمين (ر.س)', 'صافي الربح (ر.س)', 'هامش الربح'];
    const rows = financialMonths.map((m) => [
      `"${m.monthName}"`,
      m.subscriptions,
      m.teacherCosts,
      m.netProfit,
      `"${Math.round((m.netProfit / m.subscriptions) * 100)}%"`,
    ]);
    // Append current month dynamic calculation
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

  // Average subscription
  const avgSubscription = activeStudentsCount > 0 ? Math.round(totalSubscriptions / activeStudentsCount) : 268;
  const coverageRatio = totalTeacherCosts > 0 ? Math.round((totalSubscriptions / totalTeacherCosts) * 100) : 166;

  return (
    <div className="flex flex-col w-full gap-6">
      {/* TOP HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#bec8c8]/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center p-2 rounded-xl bg-[#005253]/10 text-[#005253]">
              <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111c2d] tracking-tight">
              لوحة تحكم الإدارة العامة والمدير
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#3f4949] pr-10">
            المؤشرات المالية، أداء الحلقات القرآنية، والمتابعة الأكاديمية الشاملة
          </p>
        </div>

        {/* Actions & Date Filter */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="inline-flex items-center gap-2 bg-[#f0f3ff] px-3.5 py-2 rounded-xl text-[#3f4949] text-xs sm:text-sm font-semibold border border-[#bec8c8]/20">
            <span className="material-symbols-outlined text-[#005253] text-lg">calendar_month</span>
            <span className="text-[#111c2d]">{selectedPeriod}</span>
            <span className="material-symbols-outlined text-[#6f7979] text-base">expand_more</span>
          </div>

          <button
            onClick={handleExportBudget}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#005253] text-white text-xs sm:text-sm font-bold hover:bg-[#186b6d] transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            <span>تصدير الميزانية</span>
          </button>
        </div>
      </div>

      {/* SUMMARY STAT CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#bec8c8]/20 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-[#005253]/5 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="w-12 h-12 rounded-xl bg-[#005253]/10 text-[#005253] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#005253]/10 text-[#005253] text-xs font-bold">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +12.4%
            </span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-[#6f7979] font-medium">إجمالي الاشتراكات المحصلة</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#111c2d] tracking-tight">
              {totalSubscriptions.toLocaleString()}{' '}
              <span className="text-sm font-normal text-[#6f7979]">ر.س</span>
            </div>
            <span className="text-xs text-[#005253] font-medium mt-1">
              مقارنة بالشهر السابق (41,150 ر.س)
            </span>
          </div>
        </div>

        {/* Card 2: Teacher Costs */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#bec8c8]/20 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-[#dee8ff]/60 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="w-12 h-12 rounded-xl bg-[#dee8ff] text-[#005253] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dee8ff] text-[#005253] text-xs font-bold">
              {teachers.length} معلماً
            </span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-[#6f7979] font-medium">إجمالي مصروفات المعلمين</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#111c2d] tracking-tight">
              {totalTeacherCosts.toLocaleString()}{' '}
              <span className="text-sm font-normal text-[#6f7979]">ر.س</span>
            </div>
            <span className="text-xs text-[#6f7979] font-medium mt-1">
              مستحقات {teachers.length} معلماً ومحفظاً للشهر الحالي
            </span>
          </div>
        </div>

        {/* Card 3: Net Profit */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#bec8c8]/20 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-[#ffdea9]/40 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="w-12 h-12 rounded-xl bg-[#ffdea9]/60 text-[#7d5800] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">query_stats</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffdea9] text-[#271900] text-xs font-bold">
              هامش {profitMargin}%
            </span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-[#6f7979] font-medium">صافي الأرباح التشغيلية</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#7d5800] tracking-tight">
              {netProfit.toLocaleString()}{' '}
              <span className="text-sm font-normal text-[#7d5800]">ر.س</span>
            </div>
            <span className="text-xs text-[#7d5800] font-medium mt-1">
              فائض تشغيلي مرتفع للمرحلة الحالية
            </span>
          </div>
        </div>

        {/* Card 4: Active Students */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#bec8c8]/20 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute -left-6 -top-6 w-24 h-24 bg-[#a6eff1]/30 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="w-12 h-12 rounded-xl bg-[#005253]/10 text-[#005253] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">local_library</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dee8ff] text-[#005253] text-xs font-bold">
              {Math.round((activeStudentsCount / Math.max(1, students.length)) * 100)}% انتظام
            </span>
          </div>
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-[#6f7979] font-medium">الطلاب النشطين حالياً</span>
            <div className="text-2xl sm:text-3xl font-bold text-[#111c2d] tracking-tight">
              {activeStudentsCount}{' '}
              <span className="text-sm font-normal text-[#6f7979]">طالباً</span>
            </div>
            <span className="text-xs text-[#6f7979] font-medium mt-1">
              من أصل {students.length} مسجل ({vacationStudentsCount} في إجازة، {overdueStudentsCount} يحتاج متابعة)
            </span>
          </div>
        </div>
      </div>

      {/* MONTHLY REVENUE VS TEACHER COSTS SECTION (Stitch Visual Chart) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#bec8c8]/20 flex flex-col gap-6">
        {/* Chart Header & Legend */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-6 bg-[#005253] rounded-full"></span>
              <h2 className="text-lg sm:text-xl font-bold text-[#111c2d]">
                مؤشر الإيرادات ومصروفات المعلمين (آخر 6 أشهر)
              </h2>
            </div>
            <span className="text-xs sm:text-sm text-[#3f4949] pr-3">
              تحليل المقارنة بين مداخيل الاشتراكات ورواتب الكادر التعليمي وصافي الأرباح
            </span>
          </div>

          {/* Key Side Summary Chips */}
          <div className="flex flex-wrap items-center gap-2 bg-[#f0f3ff] p-2 rounded-xl border border-[#bec8c8]/20">
            <div className="px-3 py-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#005253] text-base">savings</span>
              <span className="text-xs text-[#6f7979]">متوسط الاشتراك:</span>
              <span className="text-sm font-bold text-[#111c2d]">{avgSubscription} ر.س</span>
            </div>
            <div className="w-px h-5 bg-[#bec8c8]/40"></div>
            <div className="px-3 py-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7d5800] text-base">format_image_left</span>
              <span className="text-xs text-[#6f7979]">نسبة تغطية المصروفات:</span>
              <span className="text-sm font-bold text-[#7d5800]">{coverageRatio}%</span>
            </div>
          </div>
        </div>

        {/* Chart Legend Indicators */}
        <div className="flex items-center gap-6 text-xs text-[#3f4949] flex-wrap pr-3">
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

        {/* VISUAL CHART: Responsive SVG Graph exactly matching Stitch */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[680px] h-72 flex flex-col justify-between py-2 relative">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 720 220">
              {/* Background Grid lines */}
              <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="720" y1="20" y2="20" />
              <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="720" y1="70" y2="70" />
              <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="720" y1="120" y2="120" />
              <line className="text-[#e7eeff]" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="720" y1="170" y2="170" />
              <line className="text-[#bec8c8]/40" stroke="currentColor" x1="0" x2="720" y1="210" y2="210" />

              {/* Value Axis Labels */}
              <text className="text-[#6f7979] text-[11px] font-sans" fill="currentColor" textAnchor="end" x="715" y="24">50k</text>
              <text className="text-[#6f7979] text-[11px] font-sans" fill="currentColor" textAnchor="end" x="715" y="74">37.5k</text>
              <text className="text-[#6f7979] text-[11px] font-sans" fill="currentColor" textAnchor="end" x="715" y="124">25k</text>
              <text className="text-[#6f7979] text-[11px] font-sans" fill="currentColor" textAnchor="end" x="715" y="174">12.5k</text>

              {/* 6 Data Groups matching Stitch */}
              {/* Group 1: محرم (Rev: 36,000 / Cost: 24,000 / Profit: 12,000) */}
              <g transform="translate(60, 0)">
                <rect className="fill-[#005253] hover:opacity-85 transition-opacity cursor-pointer" height="144" rx="4" width="26" x="0" y="66" />
                <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity cursor-pointer" height="96" rx="4" width="26" x="30" y="114" />
              </g>
              {/* Group 2: صفر (Rev: 38,500 / Cost: 24,800 / Profit: 13,700) */}
              <g transform="translate(165, 0)">
                <rect className="fill-[#005253] hover:opacity-85 transition-opacity cursor-pointer" height="154" rx="4" width="26" x="0" y="56" />
                <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity cursor-pointer" height="99" rx="4" width="26" x="30" y="111" />
              </g>
              {/* Group 3: ربيع الأول (Rev: 41,200 / Cost: 25,500 / Profit: 15,700) */}
              <g transform="translate(270, 0)">
                <rect className="fill-[#005253] hover:opacity-85 transition-opacity cursor-pointer" height="165" rx="4" width="26" x="0" y="45" />
                <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity cursor-pointer" height="102" rx="4" width="26" x="30" y="108" />
              </g>
              {/* Group 4: ربيع الثاني (Rev: 42,800 / Cost: 26,000 / Profit: 16,800) */}
              <g transform="translate(375, 0)">
                <rect className="fill-[#005253] hover:opacity-85 transition-opacity cursor-pointer" height="172" rx="4" width="26" x="0" y="38" />
                <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity cursor-pointer" height="104" rx="4" width="26" x="30" y="106" />
              </g>
              {/* Group 5: جمادى (Rev: 43,500 / Cost: 26,900 / Profit: 16,600) */}
              <g transform="translate(480, 0)">
                <rect className="fill-[#005253] hover:opacity-85 transition-opacity cursor-pointer" height="174" rx="4" width="26" x="0" y="36" />
                <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity cursor-pointer" height="108" rx="4" width="26" x="30" y="102" />
              </g>
              {/* Group 6: رجب - شعبان (Rev: 46,250 / Cost: 27,800 / Profit: 18,450) */}
              <g transform="translate(585, 0)">
                <rect className="fill-[#005253] hover:opacity-85 transition-opacity cursor-pointer" height="185" rx="4" width="26" x="0" y="25" />
                <rect className="fill-[#cfdaf2] hover:opacity-85 transition-opacity cursor-pointer" height="111" rx="4" width="26" x="30" y="99" />
              </g>

              {/* Dotted Profit Trendline */}
              <polyline
                className="text-[#7d5800]"
                fill="none"
                points="88,162  193,155  298,147  403,142  508,143  613,136"
                stroke="currentColor"
                strokeDasharray="5 4"
                strokeWidth="3"
              />

              {/* Profit Dots */}
              <circle className="fill-[#7d5800] stroke-white stroke-2" cx="88" cy="162" r="4" />
              <circle className="fill-[#7d5800] stroke-white stroke-2" cx="193" cy="155" r="4" />
              <circle className="fill-[#7d5800] stroke-white stroke-2" cx="298" cy="147" r="4" />
              <circle className="fill-[#7d5800] stroke-white stroke-2" cx="403" cy="142" r="4" />
              <circle className="fill-[#7d5800] stroke-white stroke-2" cx="508" cy="143" r="4" />
              <circle className="fill-[#7d5800] stroke-white stroke-2" cx="613" cy="136" r="5" />

              {/* X-Axis Labels */}
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

      {/* FILTER CONTROLS & TABLE SECTION */}
      <div className="flex flex-col gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#bec8c8]/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[#111c2d]">
              سجل الاشتراكات ومتابعة الحلقات الإدارية
            </h3>
            <p className="text-xs sm:text-sm text-[#3f4949]">
              تفصيل أوضاع الطلاب، تكلفة الحفظ، والتقارير الشهرية المرسلة لأولياء الأمور
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#6f7979] text-lg pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم الطالب، المعلم..."
                className="w-full h-10 pr-9 pl-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#6f7979] text-xs sm:text-sm focus:outline-none"
              />
            </div>

            {/* Teacher Select */}
            <div className="relative">
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="h-10 pr-3 pl-8 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold appearance-none focus:outline-none cursor-pointer"
              >
                <option value="all">جميع المعلمين ({teachers.length})</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute left-2 top-2.5 text-[#6f7979] pointer-events-none text-base">
                expand_more
              </span>
            </div>

            {/* Status Select */}
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-10 pr-3 pl-8 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-semibold appearance-none focus:outline-none cursor-pointer"
              >
                <option value="all">حالة الاشتراك (الكل)</option>
                <option value="active">سارٍ ومنتظم</option>
                <option value="vacation">في إجازة</option>
                <option value="overdue">تقرير متأخر</option>
              </select>
              <span className="material-symbols-outlined absolute left-2 top-2.5 text-[#6f7979] pointer-events-none text-base">
                expand_more
              </span>
            </div>

            <button
              onClick={() => exportToExcel(filteredStudents)}
              className="h-10 px-3 rounded-xl bg-white text-[#005253] border border-[#bec8c8]/30 hover:bg-[#dee8ff] text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="تصدير كشف الطلاب المصفى إلى ملف Excel"
            >
              <span className="material-symbols-outlined text-base">file_download</span>
              <span>تصدير كشف Excel</span>
            </button>

            <button
              onClick={onAddStudent}
              className="h-10 px-3 rounded-xl bg-[#005253] text-white text-xs font-bold hover:bg-[#186b6d] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>طالب جديد</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-[#6f7979] pt-1 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#005253]"></span>
            دورة منتظمة (&le; 25 يوماً)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></span>
            تحذير أصفر (&gt; 25 يوماً)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]"></span>
            تنبيه أحمر متأخر (&gt; 30 يوماً)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffc969]"></span>
            طالب في إجازة معتمدة
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-[#f0f3ff] text-[#6f7979] text-xs font-bold border-b border-[#bec8c8]/20">
                <th className="py-3 px-4">اسم الطالب</th>
                <th className="py-3 px-4">اسم المعلم</th>
                <th className="py-3 px-4 text-center">ولي الأمر الإداري</th>
                <th className="py-3 px-4 text-left">قيمة الاشتراك</th>
                <th className="py-3 px-4 text-left">مصروف المعلم</th>
                <th className="py-3 px-4">تاريخ الاشتراك</th>
                <th className="py-3 px-4">تاريخ آخر تقرير (دورة 8 حصص)</th>
                <th className="py-3 px-4">الملاحظات الإدارية</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3ff]">
              {filteredStudents.slice(0, 10).map((student) => {
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
                    <td className="py-3.5 px-4 font-bold text-[#111c2d]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            isRedLate
                              ? 'bg-[#ffdad6] text-[#ba1a1a]'
                              : isYellowWarning
                              ? 'bg-[#fef9c3] text-[#a16207]'
                              : isVacation
                              ? 'bg-[#ffdea9] text-[#7d5800]'
                              : 'bg-[#005253]/10 text-[#005253]'
                          }`}
                        >
                          {student.initials}
                        </span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{student.name}</span>
                            <button
                              onClick={() => onEditStudent(student)}
                              className="p-0.5 rounded-md text-[#6f7979] hover:text-[#005253] hover:bg-[#dee8ff] transition-colors cursor-pointer"
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
                          <span className="text-[11px] text-[#6f7979]">
                            {student.surahProgress}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs font-semibold text-[#111c2d]">
                      {teacher?.name || 'غير محدد'}
                    </td>

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

                    <td className="py-3.5 px-4 font-bold text-[#005253] text-left">
                      {student.subscriptionFee} <span className="text-xs font-normal">ر.س</span>
                    </td>

                    <td className="py-3.5 px-4 text-left text-xs font-semibold text-[#3f4949]">
                      {student.teacherCost !== undefined
                        ? student.teacherCost
                        : Math.round((teacher?.monthlySalary || 1500) / Math.max(1, teacher?.studentsCount || 10))} ر.س
                    </td>

                    <td className="py-3.5 px-4 text-xs text-[#6f7979]">
                      {student.subscriptionDate}
                    </td>

                    <td className="py-3.5 px-4">
                      {isVacation ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-xs text-[#7d5800] font-semibold">
                            <span className="material-symbols-outlined text-sm">flight_takeoff</span>
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

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isRedLate
                            ? 'bg-[#ffdad6] text-[#ba1a1a] font-semibold'
                            : isYellowWarning
                            ? 'bg-[#fef9c3] text-[#854d0e] font-semibold'
                            : isVacation
                            ? 'bg-[#ffdea9] text-[#7d5800] font-semibold'
                            : 'bg-[#005253]/10 text-[#005253]'
                        }`}
                      >
                        {student.notes}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
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
                          title="تعديل"
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

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-xs text-[#6f7979]">
            عرض {Math.min(10, filteredStudents.length)} من أصل {filteredStudents.length} طالباً مسجلاً
          </span>
          <div className="flex items-center gap-1">
            <span className="w-8 h-8 rounded-lg bg-[#005253] text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
