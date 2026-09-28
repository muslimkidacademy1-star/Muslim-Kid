import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { getParentWhatsAppUrl } from '../../utils/whatsapp';

interface StudentsListViewProps {
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onAddReport: (student: Student) => void;
  onManageVacation: (student: Student) => void;
}

export const StudentsListView: React.FC<StudentsListViewProps> = ({
  onAddStudent,
  onEditStudent,
  onAddReport,
  onManageVacation,
}) => {
  const {
    students,
    teachers,
    getTeacherById,
    getDaysSinceLastReport,
    isOverdue,
    getReportStatusInfo,
    exportToExcel,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Filter students
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

  const totalFiltered = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Status counts
  const activeCount = useMemo(
    () => students.filter((s) => s.status === 'active').length,
    [students]
  );
  const vacationCount = useMemo(
    () => students.filter((s) => s.status === 'vacation').length,
    [students]
  );
  const overdueCount = useMemo(
    () => students.filter((s) => s.status === 'active' && isOverdue(s.lastReportDate)).length,
    [students, isOverdue]
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto" dir="rtl">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-[#bec8c8]/20">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#005253] animate-pulse"></span>
            <span className="text-xs text-[#6f7979] tracking-wider font-semibold">
              شاشة إدارة ومتابعة الطلاب
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#005253]/10 text-[#005253] text-xs font-black">
              {students.length} طالب مسجل
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111c2d]">
            سجل الطلاب والاشتراكات
          </h1>
          <p className="text-xs sm:text-sm text-[#526060] mt-1 max-w-2xl leading-relaxed">
            متابعة شاملة لبيانات الطلاب، الحلقات القرآنية، مواعيد التسميع، وأوضاع الاشتراكات الشهرية
          </p>
        </div>

        {/* Primary Action Buttons: + Add Student */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => exportToExcel(filteredStudents)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#f0f3ff] hover:bg-[#dee8ff] text-[#005253] text-xs sm:text-sm font-bold border border-[#bec8c8]/20 transition-all cursor-pointer shadow-2xs"
            title="تصدير كشف الطلاب بتنسيق Excel"
          >
            <span className="material-symbols-outlined text-lg">file_download</span>
            <span>تصدير (Excel)</span>
          </button>

          <button
            onClick={onAddStudent}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#005253] hover:bg-[#186b6d] text-white text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-98"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>+ إضافة طالب جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#bec8c8]/20 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#6f7979] block font-medium">إجمالي الطلاب</span>
            <span className="text-xl sm:text-2xl font-black text-[#111c2d]">{students.length}</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-[#005253]/10 text-[#005253] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">school</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#bec8c8]/20 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#6f7979] block font-medium">طلاب منتظمون</span>
            <span className="text-xl sm:text-2xl font-black text-[#15803d]">{activeCount}</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-emerald-50 text-[#15803d] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#bec8c8]/20 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#6f7979] block font-medium">في إجازة رسمية</span>
            <span className="text-xl sm:text-2xl font-black text-[#ca8a04]">{vacationCount}</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-amber-50 text-[#ca8a04] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">event_busy</span>
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#bec8c8]/20 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#6f7979] block font-medium">متأخرون عن التقرير</span>
            <span className="text-xl sm:text-2xl font-black text-[#ba1a1a]">{overdueCount}</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-rose-50 text-[#ba1a1a] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">warning</span>
          </span>
        </div>
      </div>

      {/* Search and Filters Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#bec8c8]/20 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-[#6f7979] text-xl pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="بحث باسم الطالب، المعلم، رقم الهاتف، أو السورة..."
            className="w-full h-11 pr-11 pl-4 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#6f7979] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent focus:border-[#005253]"
          />
        </div>

        {/* Teacher Filter */}
        <div className="w-full md:w-56">
          <select
            value={selectedTeacherId}
            onChange={(e) => {
              setSelectedTeacherId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-11 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs sm:text-sm border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
          >
            <option value="all">كافة المعلمين ({teachers.length})</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.circleName})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-11 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs sm:text-sm border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
          >
            <option value="all">كافة الحالات</option>
            <option value="active">نشط ومنتظم</option>
            <option value="warning">اقتراب موعد التقرير (25-30 يوم)</option>
            <option value="overdue">متأخر (&gt; 30 يوماً)</option>
            <option value="vacation">في إجازة رسمية</option>
          </select>
        </div>
      </div>

      {/* Main Table / Cards */}
      <div className="bg-white rounded-3xl border border-[#bec8c8]/25 shadow-xs overflow-hidden">
        {students.length === 0 ? (
          <div className="p-12 sm:p-16 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#005253]/10 text-[#005253] flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">school</span>
            </div>
            <h3 className="text-lg font-bold text-[#111c2d]">لا يوجد طلاب مضافون بعد</h3>
            <p className="text-xs sm:text-sm text-[#6f7979] max-w-md">
              ابدأ بإضافة أول طالب للأكاديمية وتعيين معلمه وحلقته القرآنية عبر الزر أدناه
            </p>
            <button
              onClick={onAddStudent}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#005253] hover:bg-[#186b6d] text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              <span>+ إضافة طالب جديد</span>
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl text-[#6f7979]/40">search_off</span>
            <p className="text-sm font-bold text-[#111c2d]">لا يوجد طلاب يطابقون شروط البحث والتصفية المحددة</p>
            <p className="text-xs text-[#6f7979]">جرّب تعديل كلمات البحث أو تصفية المعلمين والحالات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#f0f3ff]/70 text-[#005253] border-b border-[#bec8c8]/20 font-bold">
                  <th className="py-3.5 px-4">الطالب</th>
                  <th className="py-3.5 px-4">المعلم والحلقة</th>
                  <th className="py-3.5 px-4">قيمة الاشتراك</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4">تاريخ آخر تقرير</th>
                  <th className="py-3.5 px-4">ولي الأمر</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bec8c8]/15">
                {paginatedStudents.map((student) => {
                  const teacher = getTeacherById(student.teacherId);
                  const days = getDaysSinceLastReport(student.lastReportDate);
                  const isLate = isOverdue(student.lastReportDate) && student.status === 'active';
                  const reportInfo = getReportStatusInfo(student.lastReportDate);
                  const parentWhatsApp = getParentWhatsAppUrl(student.parentPhone, student.name);

                  return (
                    <tr key={student.id} className="hover:bg-[#f9f9ff] transition-colors">
                      {/* Student info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#005253] text-white font-bold flex items-center justify-center text-xs shadow-2xs flex-shrink-0">
                            {student.initials}
                          </div>
                          <div>
                            <span className="font-bold text-[#111c2d] block text-sm">
                              {student.name}
                            </span>
                            <span className="text-[11px] text-[#6f7979]">
                              {student.surahProgress}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Teacher & Circle */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-semibold text-[#111c2d] block">
                            {teacher?.name || 'غير محدد'}
                          </span>
                          <span className="text-[11px] text-[#005253] block">
                            {teacher?.circleName || 'حلقة عامة'}
                          </span>
                        </div>
                      </td>

                      {/* Subscription amount */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#005253]">
                        {student.subscriptionFee} ر.س
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {student.status === 'vacation' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-[#ca8a04] text-[11px] font-bold border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ca8a04]"></span>
                            <span>إجازة رسمية</span>
                          </span>
                        ) : isLate ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-[#ba1a1a] text-[11px] font-bold border border-rose-200 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span>
                            <span>متأخر ({days} يوم)</span>
                          </span>
                        ) : days > 25 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-[#b45309] text-[11px] font-bold border border-amber-200">
                            <span>اقترب ({days} يوم)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#15803d] text-[11px] font-bold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#15803d]"></span>
                            <span>منتظم ({days} يوم)</span>
                          </span>
                        )}
                      </td>

                      {/* Last report date */}
                      <td className="py-3.5 px-4 text-[#526060] font-mono text-xs">
                        {student.lastReportDate || 'لا يوجد تقرير'}
                      </td>

                      {/* Parent Phone & WhatsApp */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#3f4949] dir-ltr">{student.parentPhone}</span>
                          {student.parentPhone && (
                            <a
                              href={parentWhatsApp}
                              target="_blank"
                              rel="noreferrer"
                              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors shadow-2xs"
                              title="محادثة واتساب مع ولي الأمر"
                            >
                              <span className="material-symbols-outlined text-sm">chat</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onAddReport(student)}
                            className="p-1.5 rounded-lg bg-[#f0f3ff] hover:bg-[#dee8ff] text-[#005253] transition-colors cursor-pointer"
                            title="إصدار تقرير دورة الـ 8 حصص"
                          >
                            <span className="material-symbols-outlined text-base">description</span>
                          </button>
                          <button
                            onClick={() => onManageVacation(student)}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-[#ca8a04] transition-colors cursor-pointer"
                            title="إدارة الإجازة"
                          >
                            <span className="material-symbols-outlined text-base">event_busy</span>
                          </button>
                          <button
                            onClick={() => onEditStudent(student)}
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#3f4949] transition-colors cursor-pointer"
                            title="تعديل بيانات الطالب"
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#bec8c8]/20 flex items-center justify-between text-xs text-[#526060] bg-[#f9f9ff]">
            <span>
              عرض {Math.min(filteredStudents.length, (currentPage - 1) * pageSize + 1)} إلى{' '}
              {Math.min(filteredStudents.length, currentPage * pageSize)} من إجمالي {filteredStudents.length} طالب
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#bec8c8]/30 hover:bg-gray-50 disabled:opacity-40 cursor-pointer font-bold"
              >
                السابق
              </button>
              <span className="px-3 py-1 font-bold text-[#005253]">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#bec8c8]/30 hover:bg-gray-50 disabled:opacity-40 cursor-pointer font-bold"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
