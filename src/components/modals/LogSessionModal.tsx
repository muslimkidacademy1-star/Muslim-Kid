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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl shadow-2xl border-t sm:border border-gray-100 overflow-hidden flex flex-col text-right max-h-[90vh] h-[90vh] sm:h-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Fixed Header (Dark Teal #125862 with Clear Close Button) */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center border border-white/20 shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">history_edu</span>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-white truncate">
                  تسجيل حضور وإنجاز الحصة
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF5F7] text-[#125862] shrink-0">
                  دورة الـ {maxSessions} حصص
                </span>
                {isEditingExisting ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950 border border-amber-300 flex items-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-xs">edit</span>
                    <span>تعديل حصة مسجلة</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-950 border border-emerald-300 shrink-0">
                    تسجيل جديد
                  </span>
                )}
              </div>
              <p className="text-xs text-[#EAF5F7] mt-0.5 truncate">
                الطالب: <strong className="text-white font-bold">{student.name}</strong> • {student.surahProgress}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0 mr-2"
            title="إغلاق النافذة"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Fixed Horizontal Session Selector Bar (شريط أرقام الحصص قابل للتمرير الأفقي الناعم) */}
        <div className="bg-[#EAF5F7] px-4 sm:px-6 py-2.5 border-b border-[#1A7B88]/20 flex flex-col gap-1.5 shrink-0 z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#125862] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#1A7B88]">linear_scale</span>
              <span>شريط حصص الدورة (اسحب أفقياً لاختيار أي حصة):</span>
            </span>
            <span className="text-[11px] font-bold text-[#1A7B88] font-mono">
              {studentLogs.length} من {maxSessions} مسجلة
            </span>
          </div>

          {/* Smooth Finger Scrollable Buttons Bar (ح1 إلى ح24) */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1.5 pt-0.5 touch-pan-x scrollbar-thin scrollbar-thumb-[#1A7B88]/30">
            {Array.from({ length: maxSessions }, (_, i) => i + 1).map((num) => {
              const isRecorded = studentLogs.some((l) => l.sessionNumber === num);
              const isSelected = num === sessionNumber;

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => selectSession(num)}
                  className={`min-w-[54px] h-10 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                    isSelected
                      ? 'bg-[#1A7B88] text-white shadow-xs ring-2 ring-[#125862]/30 scale-102 font-black'
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
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 shrink-0 text-xs">
            <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
              workspace_premium
            </span>
            <div className="leading-relaxed">
              <span className="font-bold">تنبيه ختام الدورة (الحصة {maxSessions} من {maxSessions}):</span> عند حفظ هذه الحصة، ستكتمل دورة الطالب وتصبح جاهزة للتجميع النهائي وإرسال التقرير للمدير.
            </div>
          </div>
        )}

        {/* Form Body - Scrollable Area */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 text-sm overscroll-contain">
            {/* Attendance & Session Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Smart Attendance Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  حالة الحضور والتسميع <span className="text-[#ba1a1a]">*</span>
                </label>
                <select
                  value={attendance}
                  onChange={(e) => setAttendance(e.target.value as any)}
                  className="w-full h-11 px-3 rounded-xl bg-[#F4F9FA] text-[#125862] font-bold border border-[#1A7B88]/20 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 cursor-pointer text-xs"
                >
                  <option value="attended">✅ حاضر ومسمّع</option>
                  <option value="excused">⚠️ غائب بعذر (مستأذن)</option>
                  <option value="absent">❌ غائب بدون عذر</option>
                </select>
              </div>

              {/* Session Number Indicator */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  رقم الحصة المحددة
                </label>
                <div className="w-full h-11 px-3.5 rounded-xl bg-white border border-gray-200 flex items-center justify-between text-xs font-bold text-[#1A7B88]">
                  <span>الحصة {sessionNumber} من {maxSessions}</span>
                  {isEditingExisting ? (
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      تعديل
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      جديدة
                    </span>
                  )}
                </div>
              </div>

              {/* Session Date */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  تاريخ الحصة <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#F4F9FA] text-gray-900 font-medium border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 text-xs font-mono dir-ltr text-right"
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
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    ملاحظات الغياب والتأجيل / سبب الاعتذار <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    placeholder="مثال: تم التنسيق مع ولي الأمر لتأجيل الحصة بسبب ظروف سفر / موعد طبي..."
                    className="w-full p-3 rounded-xl bg-white text-gray-900 font-medium border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-xs leading-relaxed"
                  />
                </div>
              </div>
            ) : (
              <>
                {/* New Memorization */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-900">
                      مقدار الحفظ الجديد اليوم <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <span className="text-[11px] text-[#1A7B88] font-medium">السورة والآيات الجديدة المسمّعة</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={newMemorization}
                    onChange={(e) => setNewMemorization(e.target.value)}
                    placeholder="مثال: سورة النبأ (الآيات 1 - 15) مع إتقان الغنن والمدود"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 font-medium border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 placeholder:text-gray-400 text-xs"
                  />
                </div>

                {/* Previous Revision */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-900">
                      مقدار المراجعة السابقة
                    </label>
                    <span className="text-[11px] text-gray-500">تثبيت المحفوظ السابق</span>
                  </div>
                  <input
                    type="text"
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                    placeholder="مثال: مراجعة سورة المرسلات كاملة"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 font-medium border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 placeholder:text-gray-400 text-xs"
                  />
                </div>

                {/* Homework and next session guidance */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-900">
                      واجب وتوجيهات الحصة القادمة
                    </label>
                    <span className="text-[11px] text-gray-500">مطلوب للطالب حتى موعد الحصة التالية</span>
                  </div>
                  <textarea
                    rows={2}
                    value={homework}
                    onChange={(e) => setHomework(e.target.value)}
                    placeholder="مثال: تكرار المقطع 5 مرات مع ولي الأمر، والتأكيد على قلقلة القاف والدال"
                    className="w-full p-3 rounded-xl bg-[#F4F9FA] text-gray-900 font-medium border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 placeholder:text-gray-400 resize-none text-xs leading-relaxed"
                  />
                </div>

                {/* Additional Teacher Note & Quick Praise Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-900">
                      ملاحظة تشجيعية أو تقييم أداء الطالب
                    </label>
                    <span className="text-[11px] text-gray-500 font-medium">
                      انقر على عبارة تشجيعية لكتابتها تلقائياً ⚡
                    </span>
                  </div>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="اكتب ملاحظة أو اختر من بنك العبارات أدناه..."
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 placeholder:text-gray-400"
                  />

                  {/* Quick Praise Chips Bank */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      {
                        icon: '🌟',
                        title: 'بطل اليوم',
                        text: 'بطل اليوم: إتقان رائع لأحكام التجويد وتلاوة خاشعة',
                      },
                      {
                        icon: '👏',
                        title: 'أحسنت يا بطل',
                        text: 'أحسنت يا بطل: حفظ متقن وانتباه مميز طوال الحلقة',
                      },
                      {
                        icon: '🌸',
                        title: 'وردة الحلقة',
                        text: 'وردة الحلقة: تلاوة مباركة ونرجو الاستمرار بنفس الهمة',
                      },
                      {
                        icon: '💡',
                        title: 'جهد طيب',
                        text: 'جهد طيب: نرجو تكرار مقطع اليوم مع ولي الأمر لضبط الغنن',
                      },
                    ].map((chip) => {
                      const isSelected = notes.includes(chip.text);
                      return (
                        <button
                          key={chip.title}
                          type="button"
                          onClick={() => setNotes(chip.text)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer text-right border ${
                            isSelected
                              ? 'bg-[#1A7B88] text-white border-[#1A7B88] shadow-xs'
                              : 'bg-white hover:bg-[#EAF5F7] text-gray-700 hover:text-[#125862] border-gray-200/80 hover:border-[#1A7B88]/30 shadow-2xs'
                          }`}
                          title={`كتابة: ${chip.text}`}
                        >
                          <span className="text-xs">{chip.icon}</span>
                          <span className="font-semibold">{chip.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Draft Preview Drawer / Table */}
            {showDraftPreview && (
              <div className="mt-2 p-4 bg-[#F4F9FA] rounded-2xl border border-gray-200 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200 mb-3">
                  <span className="font-bold text-xs text-[#125862] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#1A7B88]">table_chart</span>
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
                            <td className="py-2 px-2.5 font-bold text-[#1A7B88]">ح{log.sessionNumber}</td>
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
                                className="text-[11px] text-[#1A7B88] font-bold hover:underline cursor-pointer"
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
          </div>

          {/* Fixed Action Footer at the bottom with comfortable thumb area */}
          <div className="p-3 sm:p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-2.5 shrink-0 z-20 shadow-md sm:shadow-none">
            {/* Draft Preview Toggle Button */}
            <button
              type="button"
              onClick={() => setShowDraftPreview(!showDraftPreview)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                showDraftPreview
                  ? 'bg-[#EAF5F7] border-[#1A7B88] text-[#125862]'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="material-symbols-outlined text-base text-[#1A7B88]">preview</span>
              <span className="hidden sm:inline">{showDraftPreview ? 'إخفاء المسودة' : 'معاينة المسودة'}</span>
            </button>

            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
              >
                <span className="material-symbols-outlined text-base">
                  {isEditingExisting ? 'update' : 'save'}
                </span>
                <span>
                  {isEditingExisting
                    ? `تحديث (${sessionNumber}/${maxSessions})`
                    : isFinalSession
                    ? `حفظ وإكمال (${maxSessions}/${maxSessions}) ⭐`
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
