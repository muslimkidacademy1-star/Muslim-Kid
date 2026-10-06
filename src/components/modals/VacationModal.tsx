import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';

interface VacationModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
}

export const VacationModal: React.FC<VacationModalProps> = ({
  isOpen,
  student,
  onClose,
}) => {
  const { setStudentVacation, endStudentVacation } = useApp();

  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [vacationType, setVacationType] = useState('إجازة سفر عائلية معتمدة');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (student) {
      if (student.vacationStartDate) setStartDate(student.vacationStartDate);
      if (student.vacationEndDate) setEndDate(student.vacationEndDate);
      if (student.vacationType) setVacationType(student.vacationType);
      setNotes(student.notes || '');
    }
  }, [student]);

  if (!isOpen || !student) return null;

  // Auto-calculated days using live calendar date
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysRemaining = Math.round(
    (end.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleActivateVacation = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentVacation(
      student.id,
      startDate,
      endDate,
      vacationType,
      `${vacationType} - العودة المتوقعة: ${endDate}${notes ? ` (${notes})` : ''}`
    );
    onClose();
  };

  const handleEndVacation = () => {
    endStudentVacation(student.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl border-t sm:border border-gray-100 overflow-hidden flex flex-col text-right max-h-[90vh] h-[90vh] sm:h-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">event_busy</span>
            </span>
            <div className="min-w-0">
              <span className="font-bold text-base sm:text-lg text-white block truncate">
                إدارة إجازة الطالب وتجميد الاشتراك
              </span>
              <span className="text-xs text-[#EAF5F7] truncate block">
                حساب تلقائي لمدة الإجازة وتاريخ العودة
              </span>
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

        {/* Current status pill */}
        <div className="mx-6 mt-4 p-3.5 bg-[#F5F5F7] rounded-xl flex items-center justify-between border border-gray-200/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1A7B88] text-white font-bold flex items-center justify-center text-sm shadow-2xs">
              {student.initials}
            </div>
            <div>
              <span className="font-bold text-sm text-[#1D1D1F] block">{student.name}</span>
              <span className="text-xs text-gray-500">الحالة الحالية: </span>
              <span
                className={`text-xs font-bold ${
                  student.status === 'vacation' ? 'text-amber-700' : 'text-[#125862]'
                }`}
              >
                {student.status === 'vacation' ? 'في إجازة رسمية' : 'نشط بالحلقات'}
              </span>
            </div>
          </div>

          {student.status === 'vacation' && (
            <button
              type="button"
              onClick={handleEndVacation}
              className="px-3 py-1.5 rounded-lg bg-[#1A7B88] text-white text-xs font-bold hover:bg-[#125862] flex items-center gap-1 shadow-xs cursor-pointer min-h-[36px]"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              <span>إنهاء الإجازة الآن</span>
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleActivateVacation} className="p-6 flex flex-col gap-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
              نوع أو سبب الإجازة <span className="text-rose-600">*</span>
            </label>
            <select
              value={vacationType}
              onChange={(e) => setVacationType(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] cursor-pointer"
            >
              <option value="إجازة سفر عائلية معتمدة">إجازة سفر عائلية معتمدة</option>
              <option value="عذر طبي معتمد">عذر طبي معتمد</option>
              <option value="فترة امتحانات مدرسية">فترة امتحانات مدرسية</option>
              <option value="ظرف عائلي خاص">ظرف عائلي خاص</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
                تاريخ بداية الإجازة <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
                تاريخ نهاية الإجازة (العودة) <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88]"
              />
            </div>
          </div>

          {/* Automatic Calculation Card */}
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700">calculate</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-amber-900">
                  المدة المحسوبة تلقائياً: {totalDays} يوماً
                </span>
                <span className="text-[11px] text-amber-700">
                  {daysRemaining > 0
                    ? `متبقي على تاريخ العودة المقدر: ${daysRemaining} يوماً`
                    : 'تاريخ العودة قد حان أو انتهى'}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-600 text-white text-[11px] font-bold shadow-2xs">
              تجميد الاشتراك مؤقتاً
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
              ملاحظات إضافية بخصوص الإجازة
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تم التنسيق مع ولي الأمر لتعويض حصص التسميع لاحقاً"
              className="w-full h-11 px-3.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88]"
            />
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-3 shrink-0 shadow-lg sm:shadow-none z-20">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer text-xs min-h-[44px]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-xs min-h-[44px]"
            >
              <span className="material-symbols-outlined text-base">event_available</span>
              <span>تأكيد الإجازة وحفظ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
