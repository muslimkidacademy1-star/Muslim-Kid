import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';

interface LogSessionModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onCompleteCycle?: (student: Student) => void;
}

export const LogSessionModal: React.FC<LogSessionModalProps> = ({
  isOpen,
  student,
  onClose,
  onCompleteCycle,
}) => {
  const { addSessionLog, getStudentSessionLogs } = useApp();

  const [sessionNumber, setSessionNumber] = useState(1);
  const [newMemorization, setNewMemorization] = useState('');
  const [revision, setRevision] = useState('');
  const [homework, setHomework] = useState('');
  const [notes, setNotes] = useState('');
  const [attendance, setAttendance] = useState<'attended' | 'absent' | 'excused'>('attended');
  const [sessionDate, setSessionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [sessionTime, setSessionTime] = useState('');

  useEffect(() => {
    if (student) {
      const logs = getStudentSessionLogs(student.id);
      const nextNum = Math.min(8, (student.currentCycleSessionsCount || logs.length) + 1);
      setSessionNumber(nextNum);
      setSessionTime(student.sessionTime || '04:30 م');
      setNewMemorization('');
      setRevision('');
      setHomework('');
      setNotes('');
      setAttendance('attended');
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const isFinalSession = sessionNumber === 8;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemorization.trim() && attendance === 'attended') {
      return;
    }

    addSessionLog({
      studentId: student.id,
      teacherId: student.teacherId,
      sessionNumber,
      sessionDate,
      sessionTime: sessionTime || student.sessionTime,
      newMemorization: newMemorization.trim() || (attendance === 'absent' ? 'غائب بعذر/بدون عذر' : 'مراجعة وتثبيت'),
      revision: revision.trim() || 'تثبيت ما تم حفظه سابقاً',
      homework: homework.trim(),
      notes: notes.trim(),
      attendance,
    });

    onClose();

    if (isFinalSession && onCompleteCycle) {
      onCompleteCycle(student);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#bec8c8]/30 overflow-hidden flex flex-col text-right animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-linear-to-l from-[#005253] via-[#004243] to-[#003132] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center border border-white/20 shadow-xs">
              <span className="material-symbols-outlined text-2xl">history_edu</span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">تسجيل حضور وإنجاز الحصة</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#6ff7f8] text-[#003738]">
                  الحصة {sessionNumber} من 8
                </span>
              </div>
              <p className="text-xs text-[#a6eff1] mt-0.5">
                الطالب: <span className="font-bold text-white">{student.name}</span> • {student.surahProgress}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* 8-Session Progress bar */}
        <div className="bg-[#f0f3ff] px-6 py-3 border-b border-[#bec8c8]/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 flex-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
              const isDone = num < sessionNumber;
              const isCurrent = num === sessionNumber;
              return (
                <div
                  key={num}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    isDone
                      ? 'bg-[#005253]'
                      : isCurrent
                      ? 'bg-[#006a6b] ring-2 ring-[#006a6b]/30 ring-offset-1 animate-pulse'
                      : 'bg-gray-200'
                  }`}
                  title={`الحصة ${num}`}
                />
              );
            })}
          </div>
          <span className="text-xs font-bold text-[#005253] whitespace-nowrap">
            دورة الـ 8 حصص ({sessionNumber}/8)
          </span>
        </div>

        {/* Final session banner alert */}
        {isFinalSession && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
              workspace_premium
            </span>
            <div className="text-xs leading-relaxed">
              <span className="font-bold">تنبيه ختام الدورة (الحصة 8 من 8):</span> عند حفظ هذه الحصة، ستكتمل دورة الـ 8 حصص رسمياً للطالب، وسيتم تجميع كافة إنجازات الحصص تلقائياً لإرسال التقرير النهائي للمدير!
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-sm max-h-[75vh] overflow-y-auto">
          {/* Attendance & Session Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                حالة الحضور <span className="text-[#ba1a1a]">*</span>
              </label>
              <select
                value={attendance}
                onChange={(e) => setAttendance(e.target.value as any)}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-medium border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 cursor-pointer"
              >
                <option value="attended">✅ حاضر ومسمّع</option>
                <option value="excused">⏳ مستأذن بعذر</option>
                <option value="absent">❌ غائب</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                رقم الحصة في الدورة
              </label>
              <select
                value={sessionNumber}
                onChange={(e) => setSessionNumber(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-bold border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    الحصة رقم {n} من 8 {n === 8 ? '⭐ (ختام الدورة)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                تاريخ الحصة
              </label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-medium border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
              />
            </div>
          </div>

          {/* New Memorization */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#111c2d]">
                مقدار الحفظ الجديد اليوم <span className="text-[#ba1a1a]">*</span>
              </label>
              <span className="text-[11px] text-[#005253] font-medium">سورة وآيات التسميع اليومي</span>
            </div>
            <input
              type="text"
              required={attendance === 'attended'}
              value={newMemorization}
              onChange={(e) => setNewMemorization(e.target.value)}
              placeholder="مثال: سورة النبأ (الآيات 1 - 15) مع أحكام التجويد"
              className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-medium border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 placeholder:text-gray-400"
            />
          </div>

          {/* Previous Revision */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#111c2d]">
                مقدار المراجعة السابقة
              </label>
              <span className="text-[11px] text-[#6f7979]">تثبيت المحفوظ السابق</span>
            </div>
            <input
              type="text"
              value={revision}
              onChange={(e) => setRevision(e.target.value)}
              placeholder="مثال: مراجعة سورة المرسلات من 1 إلى 25"
              className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-medium border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 placeholder:text-gray-400"
            />
          </div>

          {/* Homework and next session guidance */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#111c2d]">
                واجب وتوجيهات الحصة القادمة
              </label>
              <span className="text-[11px] text-[#6f7979]">مطلوب للطالب حتى الحصة المقبلة</span>
            </div>
            <textarea
              rows={2}
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="مثال: تكرار المقطع 5 مرات مع الوالدين، والتركيز على الغنن وقلقلة الدال"
              className="w-full p-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-medium border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 placeholder:text-gray-400 resize-none text-xs leading-relaxed"
            />
          </div>

          {/* Additional Teacher Note */}
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              ملاحظة تشجيعية أو تقييم الحصة
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: أداء رائع وانتباه ممتاز اليوم، استحق نجمة التميز"
              className="w-full h-10 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 placeholder:text-gray-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#bec8c8]/20 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#bec8c8]/40 text-[#404848] font-bold text-xs hover:bg-[#dee8ff]/50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#005253] text-white font-bold text-xs hover:bg-[#003738] shadow-md shadow-[#005253]/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>{isFinalSession ? 'حفظ وإكمال الدورة (8/8) ⭐' : `حفظ إنجاز الحصة (${sessionNumber}/8)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
