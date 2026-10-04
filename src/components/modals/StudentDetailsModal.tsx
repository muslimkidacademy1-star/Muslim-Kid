import React from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { getParentWhatsAppUrl } from '../../utils/whatsapp';

interface StudentDetailsModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onEditStudent?: (student: Student) => void;
  onAddReport?: (student: Student) => void;
  onManageVacation?: (student: Student) => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  isOpen,
  student,
  onClose,
  onEditStudent,
  onAddReport,
  onManageVacation,
}) => {
  const { getTeacherById, getReportStatusInfo, currentUser } = useApp();

  if (!isOpen || !student) return null;

  const teacher = getTeacherById(student.teacherId);
  const reportInfo = getReportStatusInfo(student.lastReportDate);
  const whatsAppUrl = getParentWhatsAppUrl(student.parentPhone, student.name);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
      {/* Modal Dialog */}
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border-t sm:border border-gray-100 flex flex-col max-h-[90vh] h-[90vh] sm:h-auto z-10 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header (Dark Teal #125862) */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-white text-base font-bold border border-white/20 shadow-xs shrink-0">
              {student.initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold truncate">{student.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    student.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                      : student.status === 'vacation'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                      : 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                  }`}
                >
                  {student.status === 'active'
                    ? 'مشترك نشط'
                    : student.status === 'vacation'
                    ? 'في إجازة معتمدة'
                    : 'منتهي'}
                </span>
              </div>
              <p className="text-xs text-[#EAF5F7] mt-0.5 truncate">
                {teacher?.name || 'غير محدد'} • {student.surahProgress}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0 mr-2"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Primary WhatsApp Direct Communication Banner */}
          <div className="p-4 rounded-2xl bg-[#f0fdf4] border border-[#86efac]/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-md flex-shrink-0">
                {/* Official WhatsApp style chat icon */}
                <span className="material-symbols-outlined text-2xl">chat</span>
              </div>
              <div>
                <span className="text-xs text-[#166534] font-bold block">
                  رقم هاتف ولي الأمر (واتساب)
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-black text-[#111c2d]" dir="ltr">
                    {student.parentPhone}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                    مباشر
                  </span>
                </div>
              </div>
            </div>

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-md active:scale-98 transition-all whitespace-nowrap"
              title={`تواصل فوري عبر واتساب مع ولي أمر الطالب ${student.name}`}
            >
              <span className="material-symbols-outlined text-lg">chat</span>
              <span>تواصل عبر واتساب</span>
            </a>
          </div>

          {/* Academic & Report Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#f0f3ff] border border-[#bec8c8]/20">
              <span className="text-[11px] text-[#6f7979] block mb-1">
                المعلم والحلقة القرآنية
              </span>
              <span className="font-bold text-sm text-[#111c2d] block">
                {teacher?.name || 'غير محدد'}
              </span>
              <span className="text-xs text-[#005253] font-semibold">
                {teacher?.circleName || 'حلقة عامة'}
              </span>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                reportInfo.isOverdue
                  ? 'bg-red-50 border-red-200'
                  : 'bg-[#f0f3ff] border-[#bec8c8]/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#6f7979]">تاريخ آخر تقرير</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    reportInfo.isOverdue
                      ? 'bg-red-100 text-[#ba1a1a]'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {reportInfo.badgeText}
                </span>
              </div>
              <span
                className={`font-black text-sm block ${
                  reportInfo.isOverdue ? 'text-[#ba1a1a]' : 'text-[#005253]'
                }`}
                dir="ltr"
              >
                {student.lastReportDate}
              </span>
              <span className="text-[11px] text-[#6f7979]">
                {reportInfo.isOverdue
                  ? '⚠️ تجاوز 14 يوماً بلا تقرير'
                  : '✓ سجل التسميع منتظم'}
              </span>
            </div>
          </div>

          {/* Progress & Academic / Schedule Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#f0f3ff] border border-[#bec8c8]/20">
              <span className="text-[11px] text-[#6f7979] block mb-1">
                مسار الحفظ والتلاوة
              </span>
              <span className="font-bold text-xs text-[#111c2d]">
                {student.surahProgress || 'جزء عمّ'}
              </span>
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className="text-[#6f7979]">الباقة: دورة الـ {student.packageSessionsCount || 8} حصص</span>
                <span className="text-[#005253] font-bold">({student.currentCycleSessionsCount || 0}/{student.packageSessionsCount || 8})</span>
              </div>
            </div>

            {/* If sub_supervisor or teacher: hide financial fees completely, show schedule & time */}
            {currentUser.role === 'sub_supervisor' || currentUser.role === 'teacher' ? (
              <div className="p-3.5 rounded-xl bg-[#f0f3ff] border border-[#bec8c8]/20">
                <span className="text-[11px] text-[#6f7979] block mb-1">
                  مواعيد الحصص الأسبوعية
                </span>
                <div className="font-bold text-xs text-[#005253]">
                  {student.sessionTime || '04:00 م بتوقيت القاهرة'}
                </div>
                <span className="text-[11px] text-[#526060] block mt-1">
                  {student.scheduleDays && student.scheduleDays.length > 0
                    ? student.scheduleDays.join('، ')
                    : 'الأحد، الثلاثاء، الخميس'}
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#f0f3ff] border border-[#bec8c8]/20">
                <span className="text-[11px] text-[#6f7979] block mb-1">
                  الرسوم والمستحقات
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-sm text-[#005253]">
                    {student.subscriptionFee}
                  </span>
                  <span className="text-xs text-[#6f7979]">ر.س اشتراك شهري</span>
                </div>
                {currentUser.role === 'manager' && student.teacherCost !== undefined && (
                  <span className="text-[11px] text-[#6f7979] block mt-1">
                    مصروف المعلم: {student.teacherCost} ر.س
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {student.notes && (
            <div className="p-3.5 rounded-xl bg-[#f9f9ff] border border-[#bec8c8]/20">
              <span className="text-[11px] font-bold text-[#6f7979] block mb-1">
                ملاحظات المتابعة:
              </span>
              <p className="text-xs text-[#111c2d] leading-relaxed">
                {student.notes}
              </p>
            </div>
          )}

          {/* Vacation Notice if on vacation */}
          {student.status === 'vacation' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <span className="material-symbols-outlined text-base">event_busy</span>
                <span>إجازة سارية: {student.vacationType || 'معتمدة'}</span>
              </div>
              <p className="text-[11px] text-amber-800">
                من: {student.vacationStartDate || '-'} إلى: {student.vacationEndDate || '-'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-2.5 shrink-0 z-20">
          <div className="flex items-center gap-2">
            {onAddReport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddReport(student);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[#1A7B88] text-white text-xs font-bold hover:bg-[#125862] transition-all flex items-center gap-1.5 cursor-pointer min-h-[42px]"
              >
                <span className="material-symbols-outlined text-sm">fact_check</span>
                <span>إضافة تقرير</span>
              </button>
            )}

            {onManageVacation && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onManageVacation(student);
                }}
                className="px-3 py-2.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-1 cursor-pointer min-h-[42px]"
              >
                <span className="material-symbols-outlined text-sm">event_available</span>
                <span>الإجازة</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onEditStudent && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditStudent(student);
                }}
                className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-[#F4F9FA] text-[#125862] text-xs font-bold hover:bg-[#EAF5F7] transition-all flex items-center gap-1 cursor-pointer min-h-[42px]"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>تعديل</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer min-h-[42px]"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
