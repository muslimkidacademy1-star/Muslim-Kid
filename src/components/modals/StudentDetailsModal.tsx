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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div
        className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#bec8c8]/30 flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-6 bg-linear-to-l from-[#005253] to-[#003738] text-white flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white text-lg font-bold border border-white/20 shadow-xs">
              {student.initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{student.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
              <p className="text-xs text-[#a6eff1] mt-0.5">
                {teacher?.name || 'غير محدد'} • {student.surahProgress}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
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
              <span className="text-[11px] text-[#6f7979] block mt-1">
                تاريخ البدء: {student.subscriptionDate}
              </span>
            </div>

            {/* If sub_supervisor or teacher: hide financial fees completely, show schedule & time */}
            {currentUser.role === 'sub_supervisor' || currentUser.role === 'teacher' ? (
              <div className="p-3.5 rounded-xl bg-[#f0f3ff] border border-[#bec8c8]/20">
                <span className="text-[11px] text-[#6f7979] block mb-1">
                  مواعيد الحصص الأسبوعية
                </span>
                <div className="font-bold text-xs text-[#005253]">
                  {student.sessionTime || '04:30 م بتوقيت مكة'}
                </div>
                <span className="text-[11px] text-[#526060] block mt-1">
                  {student.scheduleDays && student.scheduleDays.length > 0
                    ? student.scheduleDays.join('، ')
                    : 'الأحد، الثلاثاء، الخميس'}
                </span>
                {student.meetingUrl && (
                  <a
                    href={student.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#0284c7] font-bold mt-1.5 hover:underline"
                  >
                    <span className="material-symbols-outlined text-xs">videocam</span>
                    <span>غرفة التسميع (Zoom)</span>
                  </a>
                )}
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
        <div className="p-4 bg-[#f0f3ff] border-t border-[#bec8c8]/20 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {onAddReport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddReport(student);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#005253] text-white text-xs font-bold hover:bg-[#003e3f] transition-all flex items-center gap-1.5"
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
                className="px-3 py-2 rounded-xl bg-[#ffdea9] text-[#7d5800] text-xs font-bold hover:bg-[#ffc969] transition-all flex items-center gap-1"
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
                className="px-3 py-2 rounded-xl border border-[#bec8c8]/40 bg-white text-[#111c2d] text-xs font-semibold hover:bg-[#dee8ff] transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>تعديل</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white border border-[#bec8c8]/40 text-[#6f7979] text-xs font-bold hover:bg-gray-100 transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
