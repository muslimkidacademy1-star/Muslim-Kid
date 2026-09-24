import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AddTeacherModal } from '../modals/AddTeacherModal';
import { Teacher, Student } from '../../types';
import { getParentWhatsAppUrl } from '../../utils/whatsapp';

export const TeachersListView: React.FC = () => {
  const {
    visibleTeachers,
    students,
    supervisors,
    currentUser,
    getSupervisorById,
    isOverdue,
    exportTeachersToExcel,
  } = useApp();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupervisorFilter, setSelectedSupervisorFilter] = useState<string>('all');
  const [overdueFilter, setOverdueFilter] = useState<'all' | 'has_overdue' | 'regular'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modal state
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [selectedTeacherForStudents, setSelectedTeacherForStudents] = useState<Teacher | null>(null);

  // Compute metrics per teacher
  const teacherStats = useMemo(() => {
    const map = new Map<string, { totalStudents: number; overdueCount: number; activeStudents: number; vacationStudents: number }>();

    visibleTeachers.forEach((teacher) => {
      const teacherStudents = students.filter((s) => s.teacherId === teacher.id);
      const overdueCount = teacherStudents.filter(
        (s) => s.status === 'active' && isOverdue(s.lastReportDate)
      ).length;
      const activeStudents = teacherStudents.filter((s) => s.status === 'active').length;
      const vacationStudents = teacherStudents.filter((s) => s.status === 'vacation').length;

      map.set(teacher.id, {
        totalStudents: teacherStudents.length,
        overdueCount,
        activeStudents,
        vacationStudents,
      });
    });

    return map;
  }, [visibleTeachers, students, isOverdue]);

  // Overall Manager / System KPIs
  const managerStats = useMemo(() => {
    const totalTeachersCount = visibleTeachers.length;
    const totalSalaries = visibleTeachers.reduce((acc, t) => acc + (t.monthlySalary || 0), 0);
    const totalStudentsInSystem = visibleTeachers.reduce((acc, t) => {
      const stats = teacherStats.get(t.id);
      return acc + (stats?.totalStudents || 0);
    }, 0);
    const avgStudentsPerTeacher =
      totalTeachersCount > 0
        ? (totalStudentsInSystem / totalTeachersCount).toFixed(1)
        : '0';

    const teachersWithOverdueCount = visibleTeachers.filter((t) => {
      const stats = teacherStats.get(t.id);
      return (stats?.overdueCount || 0) > 0;
    }).length;

    return {
      totalSalaries,
      avgStudentsPerTeacher,
      totalTeachersCount,
      totalStudentsInSystem,
      teachersWithOverdueCount,
    };
  }, [visibleTeachers, teacherStats]);

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return visibleTeachers.filter((t) => {
      // 1. Name and Circle search
      const q = searchTerm.trim().toLowerCase();
      if (q) {
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesCircle = t.circleName.toLowerCase().includes(q);
        const matchesTrack = t.track.toLowerCase().includes(q);
        const matchesPhone = t.phone.includes(q);
        if (!matchesName && !matchesCircle && !matchesTrack && !matchesPhone) {
          return false;
        }
      }

      // 2. Supervisor filter (for General Supervisor & Manager)
      if (selectedSupervisorFilter !== 'all') {
        if (t.supervisorId !== selectedSupervisorFilter) {
          return false;
        }
      }

      // 3. Overdue filter
      if (overdueFilter !== 'all') {
        const stats = teacherStats.get(t.id);
        const hasOverdue = (stats?.overdueCount || 0) > 0;
        if (overdueFilter === 'has_overdue' && !hasOverdue) return false;
        if (overdueFilter === 'regular' && hasOverdue) return false;
      }

      return true;
    });
  }, [visibleTeachers, searchTerm, selectedSupervisorFilter, overdueFilter, teacherStats]);

  // Filtered students for teacher modal
  const studentsOfSelectedTeacher: Student[] = useMemo(() => {
    if (!selectedTeacherForStudents) return [];
    return students.filter((s) => s.teacherId === selectedTeacherForStudents.id);
  }, [selectedTeacherForStudents, students]);

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      {/* Top Banner / Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#bec8c8]/20 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#005253]"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111c2d]">
              شاشة معلمي الحلقات القرآنية
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#f0f3ff] text-[#005253] text-xs font-bold border border-[#005253]/20">
              {filteredTeachers.length} معلم
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#3f4949] mt-1">
            {currentUser.role === 'sub_supervisor'
              ? 'المعلمون التابعون لإشرافك التعليمي المباشر وحلقاتهم'
              : 'متابعة أداء المعلمين، الحلقات، توزيع المشرفين، والتنبيهات الدورية'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => exportTeachersToExcel(filteredTeachers)}
            className="h-10 px-4 rounded-xl border border-[#bec8c8]/40 bg-white text-[#005253] text-xs font-bold hover:bg-[#f0f3ff] transition-all flex items-center gap-1.5 shadow-xs"
            title="تصدير كشف المعلمين الحالي بصيغة Excel"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => setIsAddTeacherOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#005253] text-white text-xs font-bold hover:bg-[#003e3f] active:scale-98 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>+ إضافة معلم جديد</span>
          </button>
        </div>
      </div>

      {/* Manager Specific KPI Cards (كارت إحصائي للمدير) */}
      {currentUser.role === 'manager' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Teachers Salary Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#bec8c8]/20 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#6f7979] block">
                إجمالي مصروفات المعلمين
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl font-black text-[#005253]">
                  {managerStats.totalSalaries.toLocaleString('ar-SA')}
                </span>
                <span className="text-xs font-semibold text-[#6f7979]">ر.س / شهر</span>
              </div>
              <span className="text-[11px] text-[#005253] font-medium mt-1 block">
                مستحقات {managerStats.totalTeachersCount} معلماً نشطاً
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#005253]/10 text-[#005253] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
          </div>

          {/* Average Students Per Teacher Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#bec8c8]/20 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#6f7979] block">
                متوسط عدد الطلاب لكل معلم
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl font-black text-[#111c2d]">
                  {managerStats.avgStudentsPerTeacher}
                </span>
                <span className="text-xs font-semibold text-[#6f7979]">طالب / معلم</span>
              </div>
              <span className="text-[11px] text-[#3f4949] font-medium mt-1 block">
                إجمالي {managerStats.totalStudentsInSystem} طالباً بالحلقات
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#dee8ff] text-[#005253] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">groups</span>
            </div>
          </div>

          {/* Total Teachers Count Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#bec8c8]/20 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#6f7979] block">
                إجمالي المعلمين المسجلين
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="text-2xl font-black text-[#111c2d]">
                  {managerStats.totalTeachersCount}
                </span>
                <span className="text-xs font-semibold text-[#6f7979]">معلماً ومحفظاً</span>
              </div>
              <span className="text-[11px] text-green-700 font-semibold mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                جميع المعلمين معتمدون وموزعون
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#a6eff1]/30 text-[#005253] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">badge</span>
            </div>
          </div>

          {/* Overdue Alerts Card */}
          <div
            className={`rounded-2xl p-5 border shadow-xs flex items-center justify-between transition-all ${
              managerStats.teachersWithOverdueCount > 0
                ? 'bg-[#fff0f0] border-red-200'
                : 'bg-white border-[#bec8c8]/20'
            }`}
          >
            <div>
              <span
                className={`text-xs font-semibold block ${
                  managerStats.teachersWithOverdueCount > 0 ? 'text-red-700' : 'text-[#6f7979]'
                }`}
              >
                معلمون لديهم تنبيهات متأخرة
              </span>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span
                  className={`text-2xl font-black ${
                    managerStats.teachersWithOverdueCount > 0 ? 'text-[#ba1a1a]' : 'text-green-700'
                  }`}
                >
                  {managerStats.teachersWithOverdueCount}
                </span>
                <span className="text-xs font-semibold text-[#6f7979]">معلم بحاجة لمتابعة</span>
              </div>
              <span
                className={`text-[11px] font-semibold mt-1 block ${
                  managerStats.teachersWithOverdueCount > 0 ? 'text-red-600' : 'text-green-700'
                }`}
              >
                {managerStats.teachersWithOverdueCount > 0
                  ? '⚠️ طلاب تجاوزوا 14 يوماً بلا تقرير'
                  : '✓ جميع التقارير الدورية منتظمة'}
              </span>
            </div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                managerStats.teachersWithOverdueCount > 0
                  ? 'bg-red-100 text-[#ba1a1a]'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">
                {managerStats.teachersWithOverdueCount > 0 ? 'warning' : 'verified'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Non-Manager Stats Banner (for General Supervisor & Sub Supervisor) */}
      {currentUser.role !== 'manager' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-[#bec8c8]/20 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#005253]/10 text-[#005253] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">badge</span>
            </div>
            <div>
              <span className="text-xs text-[#6f7979] block">
                {currentUser.role === 'sub_supervisor' ? 'المعلمون تحت إشرافي' : 'إجمالي المعلمين'}
              </span>
              <span className="text-xl font-bold text-[#111c2d]">
                {managerStats.totalTeachersCount} معلم
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[#bec8c8]/20 shadow-xs flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#dee8ff] text-[#005253] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">school</span>
            </div>
            <div>
              <span className="text-xs text-[#6f7979] block">
                إجمالي الطلاب بالحلقات
              </span>
              <span className="text-xl font-bold text-[#111c2d]">
                {managerStats.totalStudentsInSystem} طالب
              </span>
            </div>
          </div>

          <div
            className={`rounded-2xl p-4 border shadow-xs flex items-center gap-3 ${
              managerStats.teachersWithOverdueCount > 0
                ? 'bg-[#fff0f0] border-red-200'
                : 'bg-white border-[#bec8c8]/20'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                managerStats.teachersWithOverdueCount > 0
                  ? 'bg-red-100 text-[#ba1a1a]'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">
                {managerStats.teachersWithOverdueCount > 0 ? 'priority_high' : 'check_circle'}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#6f7979] block">
                المعلمون ذوو التقارير المتأخرة
              </span>
              <span
                className={`text-xl font-bold ${
                  managerStats.teachersWithOverdueCount > 0 ? 'text-[#ba1a1a]' : 'text-green-700'
                }`}
              >
                {managerStats.teachersWithOverdueCount} معلم
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-[#bec8c8]/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#6f7979] text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم المعلم، الحلقة، أو رقم الهاتف..."
            className="w-full h-10 pr-9 pl-4 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#6f7979] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 font-medium"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-2.5 text-[#6f7979] hover:text-[#111c2d]"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Supervisor filter (shown for general_supervisor & manager) */}
          {currentUser.role !== 'sub_supervisor' ? (
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-[#6f7979] font-medium whitespace-nowrap">
                المشرف:
              </label>
              <select
                value={selectedSupervisorFilter}
                onChange={(e) => setSelectedSupervisorFilter(e.target.value)}
                className="h-10 px-3 rounded-xl bg-[#f0f3ff] border border-[#bec8c8]/20 text-[#111c2d] text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">كافة المشرفين</option>
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.title})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-[#dee8ff] text-[#005253] text-xs font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">shield_person</span>
              <span>إشرافك المباشر: {currentUser.name}</span>
            </div>
          )}

          {/* Overdue filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-[#6f7979] font-medium whitespace-nowrap">
              التنبيهات:
            </label>
            <select
              value={overdueFilter}
              onChange={(e) => setOverdueFilter(e.target.value as any)}
              className="h-10 px-3 rounded-xl bg-[#f0f3ff] border border-[#bec8c8]/20 text-[#111c2d] text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">الكل</option>
              <option value="has_overdue">⚠️ متأخرون (&gt; 14 يوم)</option>
              <option value="regular">✓ منتظمون فقط</option>
            </select>
          </div>

          {/* View mode toggle (Table / Cards) */}
          <div className="flex items-center bg-[#f0f3ff] p-0.5 rounded-xl border border-[#bec8c8]/20">
            <button
              onClick={() => setViewMode('table')}
              className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-[#005253] shadow-xs'
                  : 'text-[#6f7979] hover:text-[#111c2d]'
              }`}
              title="عرض الجدول الرئيسي"
            >
              <span className="material-symbols-outlined text-base">table_rows</span>
              <span className="hidden sm:inline">جدول</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-[#005253] shadow-xs'
                  : 'text-[#6f7979] hover:text-[#111c2d]'
              }`}
              title="عرض البطاقات"
            >
              <span className="material-symbols-outlined text-base">grid_view</span>
              <span className="hidden sm:inline">بطاقات</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Teachers Table / Content */}
      {filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#bec8c8]/20">
          <div className="w-16 h-16 rounded-full bg-[#f0f3ff] text-[#6f7979] flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-3xl">search_off</span>
          </div>
          <h3 className="text-base font-bold text-[#111c2d]">لا توجد نتائج مطابقة للبحث</h3>
          <p className="text-xs text-[#6f7979] mt-1">
            يرجى تجربة تغيير معايير البحث أو تصفية المشرفين والتنبيهات
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedSupervisorFilter('all');
              setOverdueFilter('all');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-[#005253] text-white text-xs font-bold hover:bg-[#003e3f]"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Primary Table View */
        <div className="bg-white rounded-2xl border border-[#bec8c8]/20 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#f0f3ff] border-b border-[#bec8c8]/30 text-xs font-bold text-[#3f4949]">
                  <th className="py-4 px-4 text-center w-14">م</th>
                  <th className="py-4 px-4 min-w-[220px]">اسم المعلم والحلقة</th>
                  <th className="py-4 px-4 min-w-[180px]">المشرف التابع له</th>
                  <th className="py-4 px-4 text-center min-w-[140px]">عدد الطلاب التابعين</th>
                  <th className="py-4 px-4 text-center min-w-[180px]">
                    الطلاب الذين تجاوز تقريرهم 14 يوماً
                  </th>
                  {currentUser.role === 'manager' && (
                    <th className="py-4 px-4 text-left min-w-[150px]">
                      المصروفات الشهرية
                    </th>
                  )}
                  <th className="py-4 px-4 text-center min-w-[140px]">الإجراءات والتواصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bec8c8]/15 text-sm">
                {filteredTeachers.map((teacher, index) => {
                  const supervisor = getSupervisorById(teacher.supervisorId);
                  const stats = teacherStats.get(teacher.id) || {
                    totalStudents: 0,
                    overdueCount: 0,
                    activeStudents: 0,
                    vacationStudents: 0,
                  };

                  const hasOverdue = stats.overdueCount > 0;

                  return (
                    <tr
                      key={teacher.id}
                      className={`hover:bg-[#f9f9ff] transition-colors ${
                        hasOverdue ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="py-4 px-4 text-center text-xs text-[#6f7979] font-medium">
                        {index + 1}
                      </td>

                      {/* Teacher Name & Circle */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#005253] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                            {teacher.initials}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[#111c2d] hover:text-[#005253] transition-colors">
                              {teacher.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-[#005253] font-semibold">
                                {teacher.circleName}
                              </span>
                              <span className="text-[#bec8c8]">•</span>
                              <span className="text-[11px] text-[#6f7979] truncate max-w-[180px]">
                                {teacher.track}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Supervisor */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-[#111c2d]">
                            {supervisor?.name || 'غير محدد'}
                          </span>
                          <span className="text-[11px] text-[#6f7979]">
                            {supervisor?.title || 'إشراف أكاديمي'}
                          </span>
                        </div>
                      </td>

                      {/* Dynamic Students Count */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => setSelectedTeacherForStudents(teacher)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#dee8ff] text-[#005253] hover:bg-[#c9daff] font-bold text-xs transition-colors cursor-pointer"
                          title="عرض قائمة طلاب هذا المعلم"
                        >
                          <span className="text-sm font-black">{stats.totalStudents}</span>
                          <span>طالب</span>
                          <span className="material-symbols-outlined text-sm">visibility</span>
                        </button>
                        <div className="text-[10px] text-[#6f7979] mt-1">
                          ({stats.activeStudents} نشط • {stats.vacationStudents} إجازة)
                        </div>
                      </td>

                      {/* Overdue Count with Red Alert if > 0 */}
                      <td className="py-4 px-4 text-center">
                        {hasOverdue ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fff0f0] border border-red-300 text-[#ba1a1a] font-bold text-xs shadow-xs animate-pulse">
                            <span className="material-symbols-outlined text-base">warning</span>
                            <span>{stats.overdueCount} طلاب متأخرون</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-green-50 text-green-700 text-xs font-semibold">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>منتظم (0 متأخر)</span>
                          </div>
                        )}
                        {hasOverdue && (
                          <div className="text-[10px] text-[#ba1a1a] mt-0.5 font-medium">
                            تجاوزوا 14 يوماً بلا تقرير
                          </div>
                        )}
                      </td>

                      {/* Monthly Salary (Visible to Manager Only!) */}
                      {currentUser.role === 'manager' && (
                        <td className="py-4 px-4 text-left">
                          <div className="flex flex-col items-end">
                            <span className="font-black text-[#005253] text-sm">
                              {teacher.monthlySalary.toLocaleString('ar-SA')}{' '}
                              <span className="text-xs text-[#6f7979] font-normal">ر.س</span>
                            </span>
                            <span className="text-[10px] text-[#6f7979]">مستحقات شهرية</span>
                          </div>
                        </td>
                      )}

                      {/* Actions & WhatsApp Contact */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={`https://wa.me/966${teacher.phone.replace(/^0+/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 flex items-center justify-center transition-colors shadow-xs"
                            title={`مراسلة المعلم عبر واتساب (${teacher.phone})`}
                          >
                            <span className="material-symbols-outlined text-lg">chat</span>
                          </a>

                          <button
                            onClick={() => setSelectedTeacherForStudents(teacher)}
                            className="w-9 h-9 rounded-xl bg-[#f0f3ff] hover:bg-[#dee8ff] text-[#005253] flex items-center justify-center transition-colors"
                            title="تفاصيل الحلقة والطلاب"
                          >
                            <span className="material-symbols-outlined text-lg">school</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Alternate Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher) => {
            const supervisor = getSupervisorById(teacher.supervisorId);
            const stats = teacherStats.get(teacher.id) || {
              totalStudents: 0,
              overdueCount: 0,
              activeStudents: 0,
              vacationStudents: 0,
            };
            const hasOverdue = stats.overdueCount > 0;

            return (
              <div
                key={teacher.id}
                className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between gap-4 transition-all ${
                  hasOverdue ? 'border-red-200 bg-red-50/10' : 'border-[#bec8c8]/20'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#005253] text-white flex items-center justify-center font-bold text-base shadow-xs">
                      {teacher.initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#111c2d]">{teacher.name}</h3>
                      <span className="text-xs text-[#005253] font-semibold block">
                        {teacher.circleName}
                      </span>
                      <span className="text-[11px] text-[#6f7979]">{teacher.track}</span>
                    </div>
                  </div>
                  {hasOverdue ? (
                    <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      <span>تأخير</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                      منتظم
                    </span>
                  )}
                </div>

                {/* Supervisor row */}
                <div className="p-2.5 bg-[#f0f3ff] rounded-xl text-xs flex items-center justify-between">
                  <span className="text-[#6f7979]">المشرف المسؤول:</span>
                  <span className="font-bold text-[#111c2d]">
                    {supervisor?.name || 'غير محدد'}
                  </span>
                </div>

                {/* Students breakdown */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-[#f0f3ff] rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[#6f7979] block text-[11px]">الطلاب</span>
                    <span className="font-bold text-[#111c2d] text-sm">
                      {stats.totalStudents}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6f7979] block text-[11px]">نشط</span>
                    <span className="font-bold text-[#005253] text-sm">
                      {stats.activeStudents}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`block text-[11px] ${
                        hasOverdue ? 'text-red-700 font-bold' : 'text-[#6f7979]'
                      }`}
                    >
                      متأخر (&gt;14يوم)
                    </span>
                    <span
                      className={`text-sm font-black ${
                        hasOverdue ? 'text-[#ba1a1a]' : 'text-green-700'
                      }`}
                    >
                      {stats.overdueCount}
                    </span>
                  </div>
                </div>

                {/* Manager Monthly Salary */}
                {currentUser.role === 'manager' && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#bec8c8]/20">
                    <span className="text-[#6f7979]">المصروفات الشهرية:</span>
                    <span className="font-bold text-[#005253] text-sm">
                      {teacher.monthlySalary.toLocaleString('ar-SA')} ر.س
                    </span>
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#bec8c8]/20">
                  <button
                    onClick={() => setSelectedTeacherForStudents(teacher)}
                    className="text-xs text-[#005253] font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">school</span>
                    <span>استعراض الطلاب ({stats.totalStudents})</span>
                  </button>

                  <a
                    href={`https://wa.me/966${teacher.phone.replace(/^0+/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-green-700 font-bold hover:underline"
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    <span>واتساب</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Teacher Modal */}
      <AddTeacherModal
        isOpen={isAddTeacherOpen}
        onClose={() => setIsAddTeacherOpen(false)}
      />

      {/* Teacher's Students Drawer / Modal */}
      {selectedTeacherForStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedTeacherForStudents(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />
          <div
            className="relative bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-[#bec8c8]/30 flex flex-col max-h-[85vh] z-10"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-5 bg-[#005253] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-2xl">school</span>
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    طلاب {selectedTeacherForStudents.name}
                  </h3>
                  <p className="text-xs text-[#a6eff1]">
                    {selectedTeacherForStudents.circleName} • {studentsOfSelectedTeacher.length} طالب
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeacherForStudents(null)}
                className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/80 hover:text-white"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Students List */}
            <div className="p-5 overflow-y-auto space-y-2.5">
              {studentsOfSelectedTeacher.length === 0 ? (
                <div className="p-8 text-center text-[#6f7979]">
                  لا يوجد طلاب مسجلون تحت هذا المعلم حالياً.
                </div>
              ) : (
                studentsOfSelectedTeacher.map((student, idx) => {
                  const late = student.status === 'active' && isOverdue(student.lastReportDate);
                  return (
                    <div
                      key={student.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        late
                          ? 'bg-red-50/50 border-red-200'
                          : student.status === 'vacation'
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-[#f0f3ff]/60 border-[#bec8c8]/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-xs text-[#6f7979] font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#111c2d]">
                              {student.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                student.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : student.status === 'vacation'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {student.status === 'active'
                                ? 'نشط'
                                : student.status === 'vacation'
                                ? 'في إجازة'
                                : 'منتهي'}
                            </span>
                          </div>
                          <span className="text-xs text-[#6f7979] block mt-0.5">
                            {student.surahProgress} • آخر تقرير: {student.lastReportDate}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {late && (
                          <span className="px-2 py-1 rounded-lg bg-red-100 text-[#ba1a1a] text-xs font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">warning</span>
                            <span>متأخر &gt;14يوم</span>
                          </span>
                        )}
                        <a
                          href={getParentWhatsAppUrl(student.parentPhone, student.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#dcfce7] border border-[#86efac] text-xs font-semibold text-[#15803d] hover:bg-[#16a34a] hover:text-white flex items-center gap-1 transition-all shadow-2xs group"
                          title={`تواصل عبر واتساب بخصوص الطالب ${student.name}`}
                        >
                          <span className="material-symbols-outlined text-xs text-[#16a34a] group-hover:text-white transition-colors">chat</span>
                          <span>واتساب ولي الأمر</span>
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#bec8c8]/20 flex justify-end">
              <button
                onClick={() => setSelectedTeacherForStudents(null)}
                className="px-5 py-2 rounded-xl bg-[#005253] text-white text-xs font-bold hover:bg-[#003e3f]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
