import React from 'react';
import { Student, Teacher } from '../../types';

interface ViewObservationNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: Student;
  teacher?: Teacher;
  onNewObservation?: () => void;
}

export const ViewObservationNoteModal: React.FC<ViewObservationNoteModalProps> = ({
  isOpen,
  onClose,
  student,
  teacher,
  onNewObservation,
}) => {
  if (!isOpen || !student) return null;

  // Retrieve stored note from localStorage if available, or fallback to student.lastObservationNote
  let storedObs: any = null;
  try {
    const list = JSON.parse(localStorage.getItem('mk_observation_notes') || '[]');
    storedObs = list.find((item: any) => item.studentId === student.id);
  } catch {
    // fallback
  }

  const visitDate = storedObs?.date || student.lastObservationDate;
  const rating = storedObs?.rating || student.lastObservationRating || 5;
  const noteText =
    storedObs?.notes ||
    student.lastObservationNote ||
    'الأداء متقن، التزام بالتوقيت وحسن إدارة للحلقة.';
  const supervisorName = storedObs?.supervisorName || 'المشرف التعليمي';
  const methodScore = storedObs?.teachingMethodScore || 'ممتاز - تلقين متقن وضبط لأحكام التجويد';
  const engagement = storedObs?.studentEngagement || 'تفاعل عالي وتجاوب سريع من الطالب';
  const punctuality = storedObs?.punctuality || 'بدء الحصة في الموعد المحدد تماماً';

  const calculateDaysAgo = (dateStr?: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const daysAgo = calculateDaysAgo(visitDate);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs transition-all duration-200"
      dir="rtl"
    >
      <div className="fixed inset-0 bg-transparent" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col text-right overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-5 py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">reviews</span>
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                تفاصيل آخر زيارة مراقبة
              </h3>
              <p className="text-[11px] text-[#EAF5F7]">
                توثيق تقييم وملاحظات المشرف الميداني
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-3.5 text-xs text-gray-700">
          {/* Student & Teacher ribbon */}
          <div className="bg-[#EAF5F7] border border-[#1A7B88]/20 rounded-2xl p-3 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[11px] text-gray-500 block">الطالب:</span>
              <h4 className="font-bold text-sm text-gray-900 truncate">{student.name}</h4>
              <span className="text-[11px] text-[#125862] font-semibold block mt-0.5 truncate">
                المعلم: {teacher?.name || 'غير محدد'} ({teacher?.circleName || 'حلقة القرآن'})
              </span>
            </div>

            <div className="text-left shrink-0">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 inline-block">
                {daysAgo !== null ? `منذ ${daysAgo} يوماً` : 'زيارة سابقة'}
              </span>
              <span className="text-[10px] text-gray-400 block font-mono mt-1 text-left">
                {visitDate || 'تاريخ غير محدد'}
              </span>
            </div>
          </div>

          {/* Rating */}
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between">
            <span className="font-bold text-gray-800">التقييم العام:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  className={`material-symbols-outlined text-lg ${
                    s <= rating ? 'text-amber-400' : 'text-gray-200'
                  }`}
                >
                  star
                </span>
              ))}
              <span className="font-mono font-bold text-gray-900 mr-1 text-xs">
                ({rating}/5)
              </span>
            </div>
          </div>

          {/* Method and punctuality */}
          <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">تمكن التلقين:</span>
              <span className="font-semibold text-gray-800 text-[11px] text-left truncate max-w-[190px]">
                {methodScore}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">تفاعل الطالب:</span>
              <span className="font-semibold text-gray-800 text-[11px] text-left truncate max-w-[190px]">
                {engagement}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">الالتزام بالوقت:</span>
              <span className="font-semibold text-gray-800 text-[11px] text-left truncate max-w-[190px]">
                {punctuality}
              </span>
            </div>
          </div>

          {/* Note content */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              ملاحظة وتوجيه {supervisorName}:
            </label>
            <div className="p-3 rounded-2xl bg-white border border-[#1A7B88]/20 text-gray-900 font-medium leading-relaxed text-xs shadow-2xs">
              "{noteText}"
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors cursor-pointer text-xs"
            >
              إغلاق
            </button>

            {onNewObservation && (
              <button
                onClick={() => {
                  onClose();
                  onNewObservation();
                }}
                className="px-4 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                <span>تسجيل زيارة جديدة الآن</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
