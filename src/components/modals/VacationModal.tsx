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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#bec8c8]/20 overflow-hidden flex flex-col text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#bec8c8]/20 flex items-center justify-between bg-[#f0f3ff]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#ffdea9] text-[#7d5800] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">event_busy</span>
            </span>
            <div>
              <span className="font-bold text-base text-[#111c2d] block">
                إدارة إجازة الطالب وتجميد الاشتراك
              </span>
              <span className="text-xs text-[#6f7979]">
                حساب تلقائي لمدة الإجازة وتاريخ العودة
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6f7979] hover:bg-[#dee8ff]"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Current status pill */}
        <div className="mx-6 mt-4 p-3.5 bg-[#f0f3ff] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#005253] text-white font-bold flex items-center justify-center text-sm">
              {student.initials}
            </div>
            <div>
              <span className="font-bold text-sm text-[#111c2d] block">{student.name}</span>
              <span className="text-xs text-[#6f7979]">الحالة الحالية: </span>
              <span
                className={`text-xs font-bold ${
                  student.status === 'vacation' ? 'text-[#7d5800]' : 'text-[#005253]'
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
              className="px-3 py-1.5 rounded-lg bg-[#005253] text-white text-xs font-bold hover:bg-[#186b6d] flex items-center gap-1 shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              <span>إنهاء الإجازة الآن</span>
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleActivateVacation} className="p-6 flex flex-col gap-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              نوع أو سبب الإجازة <span className="text-[#ba1a1a]">*</span>
            </label>
            <select
              value={vacationType}
              onChange={(e) => setVacationType(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none cursor-pointer"
            >
              <option value="إجازة سفر عائلية معتمدة">إجازة سفر عائلية معتمدة</option>
              <option value="عذر طبي معتمد">عذر طبي معتمد</option>
              <option value="فترة امتحانات مدرسية">فترة امتحانات مدرسية</option>
              <option value="ظرف عائلي خاص">ظرف عائلي خاص</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                تاريخ بداية الإجازة <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                تاريخ نهاية الإجازة (العودة) <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none"
              />
            </div>
          </div>

          {/* Automatic Calculation Card */}
          <div className="p-3.5 bg-[#ffdea9]/40 rounded-xl border border-[#ffdea9] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7d5800]">calculate</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#271900]">
                  المدة المحسوبة تلقائياً: {totalDays} يوماً
                </span>
                <span className="text-[11px] text-[#7d5800]">
                  {daysRemaining > 0
                    ? `متبقي على تاريخ العودة المقدر: ${daysRemaining} يوماً`
                    : 'تاريخ العودة قد حان أو انتهى'}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#7d5800] text-white text-[11px] font-bold">
              تجميد الاشتراك مؤقتاً
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              ملاحظات إضافية بخصوص الإجازة
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تم التنسيق مع ولي الأمر لتعويض حصص التسميع لاحقاً"
              className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#bec8c8]/20 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#dee8ff] text-[#3f4949] font-bold hover:bg-[#d8e3fb]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#7d5800] text-white font-bold hover:bg-[#634600] shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-lg">event_available</span>
              <span>تأكيد الإجازة وحفظ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
