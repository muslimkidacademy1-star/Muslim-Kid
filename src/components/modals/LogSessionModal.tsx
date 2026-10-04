import React, { useState, useEffect, useMemo } from 'react';
import { Student, SessionLog } from '../../types';
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

  const maxSessions = student?.packageSessionsCount || 8;

  const [sessionNumber, setSessionNumber] = useState(1);
  const [newMemorization, setNewMemorization] = useState('');
  const [revision, setRevision] = useState('');
  const [homework, setHomework] = useState('');
  const [notes, setNotes] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');
  const [attendance, setAttendance] = useState<'attended' | 'excused' | 'absent'>('attended');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState('');
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [showDraftPreview, setShowDraftPreview] = useState(false);

  // Fetch all existing logs for this student
  const studentLogs: SessionLog[] = useMemo(() => {
    if (!student) return [];
    return getStudentSessionLogs(student.id);
  }, [student, getStudentSessionLogs, isOpen]);

  // Load a specific session's data (either existing or fresh)
  const selectSession = (num: number, logsList = studentLogs) => {
    setSessionNumber(num);
    const existing = logsList.find((l) => l.sessionNumber === num);

    if (existing) {
      setIsEditingExisting(true);
      setAttendance(existing.attendance);
      setSessionDate(existing.sessionDate || new Date().toISOString().split('T')[0]);
      setSessionTime(existing.sessionTime || student?.sessionTime || '04:00 م (بتوقيت القاهرة)');

      if (existing.attendance === 'attended') {
        setNewMemorization(existing.newMemorization || '');
        setRevision(existing.revision || '');
        setHomework(existing.homework || '');
        setNotes(existing.notes || '');
        setAbsenceReason('');
      } else {
        setNewMemorization('');
        setRevision('');
        setHomework('');
        setNotes('');
        setAbsenceReason(existing.notes || '');
      }
    } else {
      setIsEditingExisting(false);
      setAttendance('attended');
      setSessionDate(new Date().toISOString().split('T')[0]);
      setSessionTime(student?.sessionTime || '04:00 م (بتوقيت القاهرة)');
      setNewMemorization('');
      setRevision('');
      setHomework('');
      setNotes('');
      setAbsenceReason('');
    }
  };

  useEffect(() => {
    if (student && isOpen) {
      const logs = getStudentSessionLogs(student.id);
      const recordedNumbers = logs.map((l) => l.sessionNumber);

      // Find the first unrecorded session, or next after max recorded
      let targetNum = 1;
      for (let i = 1; i <= maxSessions; i++) {
        if (!recordedNumbers.includes(i)) {
          targetNum = i;
          break;
        }
        if (i === maxSessions) {
          targetNum = maxSessions;
        }
      }

      selectSession(targetNum, logs);
      setShowDraftPreview(false);
    }
  }, [student, isOpen, maxSessions]);

  if (!isOpen || !student) return null;

  const isFinalSession = sessionNumber === maxSessions;
  const isAbsent = attendance === 'absent' || attendance === 'excused';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (attendance === 'attended' && !newMemorization.trim()) {
      return;
    }

    const finalMemorization =
      attendance === 'attended'
        ? newMemorization.trim()
        : attendance === 'excused'
        ? 'غائب بعذر'
        : 'غائب بدون عذر';

    const finalRevision = attendance === 'attended' ? revision.trim() : '';
    const finalHomework = attendance === 'attended' ? homework.trim() : '';
    const finalNotes = isAbsent ? absenceReason.trim() : notes.trim();

    addSessionLog({
      studentId: student.id,
      teacherId: student.teacherId,
      sessionNumber,
      sessionDate,
      sessionTime: sessionTime || student.sessionTime,
      newMemorization: finalMemorization,
      revision: finalRevision,
      homework: finalHomework,
      notes: finalNotes,
      attendance,
    });

    onClose();

    if (isFinalSession && onCompleteCycle) {
      onCompleteCycle(student);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-[#bec8c8]/30 overflow-hidden flex flex-col text-right animate-in zoom-in-95 duration-200 my-8"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-linear-to-l from-[#005253] via-[#004243] to-[#003132] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center border border-white/20 shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">history_edu</span>
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-white">تسجيل حضور وإنجاز الحصة</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#6ff7f8] text-[#003738]">
                  دورة الـ {maxSessions} حصص
                </span>
                {isEditingExisting ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">edit</span>
                    <span>وضع تعديل حصة سابقة</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-200 text-emerald-950 border border-emerald-300">
                    تسجيل حصة جديدة
                  </span>
                )}
              </div>
              <p className="text-xs text-[#a6eff1] mt-0.5">
                الطالب: <span className="font-bold text-white">{student.name}</span> • {student.surahProgress}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Horizontal Session Selector Bar (شريط أزرار التنقل بين حصص الدورة) */}
        <div className="bg-[#f0f9ff] px-4 sm:px-6 py-3 border-b border-[#bae6fd]/60 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#0369a1] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#0284c7]">linear_scale</span>
              <span>شريط حصص الدورة (انقر على أي حصة لاستعراضها وتعديلها):</span>
            </span>
            <span className="text-[11px] font-bold text-[#0284c7]">
              {studentLogs.length} من {maxSessions} مسجلة
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {Array.from({ length: maxSessions }, (_, i) => i + 1).map((num) => {
              const isRecorded = studentLogs.some((l) => l.sessionNumber === num);
              const isSelected = num === sessionNumber;

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => selectSession(num)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    isSelected
                      ? 'bg-[#005253] text-white shadow-md ring-2 ring-[#005253]/40'
                      : isRecorded
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                  title={isRecorded ? `الحصة ${num}: مسجلة سابقاً - انقر للتعديل` : `الحصة ${num}: غير مسجلة بعد`}
                >
                  <span>ح{num}</span>
                  {isRecorded && (
                    <span className="material-symbols-outlined text-xs text-emerald-600 font-black">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Final session banner alert */}
        {isFinalSession && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
              workspace_premium
            </span>
            <div className="text-xs leading-relaxed">
              <span className="font-bold">تنبيه ختام الدورة (الحصة {maxSessions} من {maxSessions}):</span> عند حفظ هذه الحصة، ستكتمل دورة الطالب وتصبح جاهزة للتجميع النهائي وإرسال التقرير للمدير.
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-4 text-sm max-h-[75vh] overflow-y-auto">
          {/* Attendance & Session Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Smart Attendance Selector */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                حالة الحضور والتسميع <span className="text-[#ba1a1a]">*</span>
              </label>
              <select
                value={attendance}
                onChange={(e) => setAttendance(e.target.value as any)}
                className="w-full h-11 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-bold border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 cursor-pointer text-xs"
              >
                <option value="attended">✅ حاضر ومسمّع</option>
                <option value="excused">⚠️ غائب بعذر (مستأذن)</option>
                <option value="absent">❌ غائب بدون عذر</option>
              </select>
            </div>

            {/* Session Number Indicator */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                رقم الحصة المحددة
              </label>
              <div className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#bec8c8]/40 flex items-center justify-between text-xs font-bold text-[#005253]">
                <span>الحصة رقم {sessionNumber} من {maxSessions}</span>
                {isEditingExisting ? (
                  <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    تعديل
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    جديدة
                  </span>
                )}
              </div>
            </div>

            {/* Session Date */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                تاريخ الحصة <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-medium border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 text-xs font-mono dir-ltr text-right"
              />
            </div>
          </div>

          {/* Conditional Rendering: If Absent, hide memorization and show only absence notes */}
          {isAbsent ? (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col gap-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <span className="material-symbols-outlined text-base text-amber-600">event_busy</span>
                <span>
                  {attendance === 'excused'
                    ? 'تسجيل غياب بعذر (اعتذار مسبق)'
                    : 'تسجيل غياب بدون عذر'}
                </span>
              </div>
              <p className="text-xs text-amber-800">
                تم إخفاء خانات الحفظ والمراجعة تلقائياً نظراً لغياب الطالب عن هذه الحصة.
              </p>
              <div>
                <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                  ملاحظات الغياب والتأجيل / سبب الاعتذار <span className="text-[#ba1a1a]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="مثال: تم التنسيق مع ولي الأمر لتأجيل الحصة بسبب ظروف سفر / موعد طبي..."
                  className="w-full p-3 rounded-xl bg-white text-[#111c2d] font-medium border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <>
              {/* New Memorization */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#111c2d]">
                    مقدار الحفظ الجديد اليوم <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <span className="text-[11px] text-[#005253] font-medium">السورة والآيات الجديدة المسمّعة</span>
                </div>
                <input
                  type="text"
                  required
                  value={newMemorization}
                  onChange={(e) => setNewMemorization(e.target.value)}
                  placeholder="مثال: سورة النبأ (الآيات 1 - 15) مع إتقان الغنن والمدود"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-medium border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 placeholder:text-gray-400 text-xs"
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
                  placeholder="مثال: مراجعة سورة المرسلات كاملة"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-medium border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 placeholder:text-gray-400 text-xs"
                />
              </div>

              {/* Homework and next session guidance */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#111c2d]">
                    واجب وتوجيهات الحصة القادمة
                  </label>
                  <span className="text-[11px] text-[#6f7979]">مطلوب للطالب حتى موعد الحصة التالية</span>
                </div>
                <textarea
                  rows={2}
                  value={homework}
                  onChange={(e) => setHomework(e.target.value)}
                  placeholder="مثال: تكرار المقطع 5 مرات مع ولي الأمر، والتأكيد على قلقلة القاف والدال"
                  className="w-full p-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-medium border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 placeholder:text-gray-400 resize-none text-xs leading-relaxed"
                />
              </div>

              {/* Additional Teacher Note */}
              <div>
                <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                  ملاحظة تشجيعية أو تقييم أداء الطالب
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: انتباه ممتاز وتلاوة مرتلة خاشعة، استحق نجمة التميز ⭐"
                  className="w-full h-10 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs border border-[#bec8c8]/30 focus:outline-none focus:ring-2 focus:ring-[#005253]/30 placeholder:text-gray-400"
                />
              </div>
            </>
          )}

          {/* Draft Preview Drawer / Table */}
          {showDraftPreview && (
            <div className="mt-2 p-4 bg-[#f8fafc] rounded-2xl border border-gray-200 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-3">
                <span className="font-bold text-xs text-[#0f172a] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#005253]">table_chart</span>
                  <span>مسودة تقرير الدورة الحالية ({studentLogs.length} من {maxSessions} حصص مسجلة):</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowDraftPreview(false)}
                  className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer"
                >
                  إغلاق المعاينة ✕
                </button>
              </div>

              {studentLogs.length === 0 ? (
                <p className="text-xs text-gray-500 py-3 text-center">
                  لم يتم تسجيل أي حصص في هذه الدورة بعد.
                </p>
              ) : (
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                        <th className="py-2 px-2.5">الحصة</th>
                        <th className="py-2 px-2.5">التاريخ</th>
                        <th className="py-2 px-2.5">الحضور</th>
                        <th className="py-2 px-2.5">الحفظ الجديد</th>
                        <th className="py-2 px-2.5">المراجعة</th>
                        <th className="py-2 px-2.5">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {studentLogs.map((log) => (
                        <tr
                          key={log.id}
                          className={`hover:bg-gray-50 transition-colors ${
                            log.sessionNumber === sessionNumber ? 'bg-emerald-50/70 font-semibold' : ''
                          }`}
                        >
                          <td className="py-2 px-2.5 font-bold text-[#005253]">ح{log.sessionNumber}</td>
                          <td className="py-2 px-2.5 font-mono text-[11px] text-gray-600">{log.sessionDate}</td>
                          <td className="py-2 px-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.attendance === 'attended'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.attendance === 'excused'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-rose-100 text-rose-900'
                              }`}
                            >
                              {log.attendance === 'attended'
                                ? 'حاضر'
                                : log.attendance === 'excused'
                                ? 'بعذر'
                                : 'غائب'}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-gray-800 max-w-44 truncate">{log.newMemorization}</td>
                          <td className="py-2 px-2.5 text-gray-600 max-w-36 truncate">{log.revision || '-'}</td>
                          <td className="py-2 px-2.5">
                            <button
                              type="button"
                              onClick={() => selectSession(log.sessionNumber)}
                              className="text-[11px] text-[#005253] font-bold hover:underline cursor-pointer"
                            >
                              تعديل
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#bec8c8]/20 mt-2 flex-wrap">
            {/* Draft Preview Toggle Button */}
            <button
              type="button"
              onClick={() => setShowDraftPreview(!showDraftPreview)}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                showDraftPreview
                  ? 'bg-[#005253]/10 border-[#005253] text-[#005253]'
                  : 'bg-white border-[#bec8c8]/40 text-[#404848] hover:bg-gray-50'
              }`}
            >
              <span className="material-symbols-outlined text-base text-[#005253]">preview</span>
              <span>{showDraftPreview ? 'إخفاء مسودة التقرير' : 'معاينة مسودة التقرير'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[#bec8c8]/40 text-[#404848] font-bold text-xs hover:bg-[#dee8ff]/50 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#005253] text-white font-bold text-xs hover:bg-[#186b6d] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <span className="material-symbols-outlined text-base">
                  {isEditingExisting ? 'update' : 'save'}
                </span>
                <span>
                  {isEditingExisting
                    ? `تحديث بيانات الحصة (${sessionNumber}/${maxSessions})`
                    : isFinalSession
                    ? `حفظ وإكمال الدورة (${maxSessions}/${maxSessions}) ⭐`
                    : `حفظ إنجاز الحصة (${sessionNumber}/${maxSessions})`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
