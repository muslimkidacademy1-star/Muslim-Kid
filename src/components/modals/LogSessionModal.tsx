import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, SessionLog } from '../../types';
import { useApp } from '../../context/AppContext';

// Helper to get Cairo date details
function getCairoDateDetails() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    weekday: 'long',
  }).format(now);

  const formattedDate = new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(now);

  const cairoDateString = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return { weekday, formattedDate, cairoDateString };
}

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

  // Wizard Step: 1 = Attendance, 2 = Memorization & Revision, 3 = Homework & Notes
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission & Discard confirmation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Pending session change confirmation
  const [pendingSessionNumber, setPendingSessionNumber] = useState<number | null>(null);

  // Session draft preview toggle
  const [showDraftPreview, setShowDraftPreview] = useState(false);

  // Form Fields
  const [sessionNumber, setSessionNumber] = useState(1);
  const [attendance, setAttendance] = useState<'attended' | 'excused' | 'absent'>('attended');
  const [sessionDate, setSessionDate] = useState(() => {
    try {
      return getCairoDateDetails().cairoDateString;
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });
  const [sessionTime, setSessionTime] = useState('');
  const [newMemorization, setNewMemorization] = useState('');
  const [revision, setRevision] = useState('');
  const [homework, setHomework] = useState('');
  const [notes, setNotes] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Snapshot of loaded session data to check for unsaved edits
  const initialSnapshotRef = useRef<{
    attendance: 'attended' | 'excused' | 'absent';
    sessionDate: string;
    newMemorization: string;
    revision: string;
    homework: string;
    notes: string;
    absenceReason: string;
  }>({
    attendance: 'attended',
    sessionDate: '',
    newMemorization: '',
    revision: '',
    homework: '',
    notes: '',
    absenceReason: '',
  });

  // Fetch all existing logs for this student
  const studentLogs: SessionLog[] = useMemo(() => {
    if (!student) return [];
    return getStudentSessionLogs(student.id);
  }, [student, getStudentSessionLogs, isOpen]);

  // Is current session dirty?
  const isDirty = useMemo(() => {
    const snap = initialSnapshotRef.current;
    return (
      attendance !== snap.attendance ||
      sessionDate !== snap.sessionDate ||
      newMemorization.trim() !== snap.newMemorization.trim() ||
      revision.trim() !== snap.revision.trim() ||
      homework.trim() !== snap.homework.trim() ||
      notes.trim() !== snap.notes.trim() ||
      absenceReason.trim() !== snap.absenceReason.trim()
    );
  }, [attendance, sessionDate, newMemorization, revision, homework, notes, absenceReason]);

  // Load a specific session's data (either existing or fresh)
  const loadSession = (num: number, logsList = studentLogs) => {
    setSessionNumber(num);
    setErrors({});
    setSubmitError(null);
    setStep(1);

    const existing = logsList.find((l) => l.sessionNumber === num);
    const cairoDate = getCairoDateDetails().cairoDateString;

    if (existing) {
      setIsEditingExisting(true);
      const att = existing.attendance;
      const sDate = existing.sessionDate || cairoDate;
      const sTime = existing.sessionTime || student?.sessionTime || '04:00 م (بتوقيت القاهرة)';
      const nMem = att === 'attended' ? existing.newMemorization || '' : '';
      const rev = att === 'attended' ? existing.revision || '' : '';
      const hw = att === 'attended' ? existing.homework || '' : '';
      const nts = att === 'attended' ? existing.notes || '' : '';
      const absR = att !== 'attended' ? existing.notes || '' : '';

      setAttendance(att);
      setSessionDate(sDate);
      setSessionTime(sTime);
      setNewMemorization(nMem);
      setRevision(rev);
      setHomework(hw);
      setNotes(nts);
      setAbsenceReason(absR);

      initialSnapshotRef.current = {
        attendance: att,
        sessionDate: sDate,
        newMemorization: nMem,
        revision: rev,
        homework: hw,
        notes: nts,
        absenceReason: absR,
      };
    } else {
      setIsEditingExisting(false);
      const sDate = cairoDate;
      const sTime = student?.sessionTime || '04:00 م (بتوقيت القاهرة)';

      setAttendance('attended');
      setSessionDate(sDate);
      setSessionTime(sTime);
      setNewMemorization('');
      setRevision('');
      setHomework('');
      setNotes('');
      setAbsenceReason('');

      initialSnapshotRef.current = {
        attendance: 'attended',
        sessionDate: sDate,
        newMemorization: '',
        revision: '',
        homework: '',
        notes: '',
        absenceReason: '',
      };
    }
  };

  // Safe session switch handler with unsaved changes check
  const handleSelectSession = (num: number) => {
    if (num === sessionNumber) return;

    if (isDirty) {
      setPendingSessionNumber(num);
    } else {
      loadSession(num);
    }
  };

  // Initialize or reset modal when opened
  useEffect(() => {
    if (student && isOpen) {
      const logs = getStudentSessionLogs(student.id);
      const cairoToday = getCairoDateDetails().cairoDateString;

      // 1. Check if there is already a log for today (e.g. user clicked "عرض / تعديل" on today's card)
      const todayLog = logs.find((l) => l.sessionDate === cairoToday);

      if (todayLog) {
        loadSession(todayLog.sessionNumber, logs);
      } else {
        // 2. Otherwise find the first unrecorded session
        const recordedNumbers = logs.map((l) => l.sessionNumber);
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
        loadSession(targetNum, logs);
      }

      setShowDraftPreview(false);
      setShowDiscardConfirm(false);
      setPendingSessionNumber(null);
    }
  }, [student, isOpen, maxSessions]);

  if (!isOpen || !student) return null;

  const isFinalSession = sessionNumber === maxSessions;
  const isAbsent = attendance === 'absent' || attendance === 'excused';

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!sessionDate) {
      errs.sessionDate = 'يرجى تحديد تاريخ الحصة';
    }
    if (isAbsent && !absenceReason.trim()) {
      errs.absenceReason = 'يرجى كتابة سبب الاعتذار أو ملاحظة الغياب';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation (Memorization & Revision)
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    // Do not force new memorization if session is dedicated to revision only!
    if (!newMemorization.trim() && !revision.trim()) {
      errs.learning = 'يرجى إدخال مقدار الحفظ الجديد أو مقدار المراجعة على الأقل';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Navigation Handlers
  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        // If absent, directly save without steps 2 & 3
        if (isAbsent) {
          submitSession();
        } else {
          setStep(2);
        }
      }
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setErrors({});
      setSubmitError(null);
      setStep((prev) => (prev - 1) as 1 | 2);
    }
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setErrors({});
    setSubmitError(null);
    setShowDiscardConfirm(false);
    setPendingSessionNumber(null);
    onClose();
  };

  // Save session log to system
  const submitSession = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const finalMemorization =
        attendance === 'attended'
          ? newMemorization.trim() || 'مراجعة وتثبيت المحفوظ'
          : attendance === 'excused'
          ? 'غائب بعذر'
          : 'غائب بدون عذر';

      const finalRevision = attendance === 'attended' ? revision.trim() : '';
      const finalHomework = attendance === 'attended' ? homework.trim() : '';
      const finalNotes = isAbsent ? absenceReason.trim() : notes.trim();

      await addSessionLog({
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

      // Maintain final report assembly trigger only when completing the cycle fresh (not repeating on edit)
      if (isFinalSession && onCompleteCycle && !isEditingExisting) {
        onCompleteCycle(student);
      }

      resetAndClose();
    } catch (err: any) {
      console.error('Error saving session log:', err);
      setSubmitError('عذراً، حدث خطأ أثناء حفظ سجل الحصة. يرجى إعادة المحاولة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAbsent) {
      if (validateStep1()) {
        submitSession();
      }
    } else if (step === 3) {
      submitSession();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xl shadow-2xl border-t sm:border border-gray-100 overflow-hidden flex flex-col text-right max-h-[92vh] sm:max-h-[85vh] h-full sm:h-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Fixed Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center border border-white/20 shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">history_edu</span>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white truncate">
                  تسجيل الحضور وإنجاز الحصة
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF5F7] text-[#125862] shrink-0">
                  ح{sessionNumber} من {maxSessions}
                </span>
                {isEditingExisting ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950 border border-amber-300 shrink-0">
                    تعديل حصة مسجلة
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-950 border border-emerald-300 shrink-0">
                    تسجيل جديد
                  </span>
                )}
              </div>
              <p className="text-xs text-[#EAF5F7] mt-0.5 truncate">
                الطالب: <strong className="text-white font-bold">{student.name}</strong> · {student.surahProgress}
              </p>
            </div>
          </div>
          <button
            onClick={handleAttemptClose}
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Horizontal Session Selector Bar (ح1 إلى حX) */}
        <div className="bg-[#EAF5F7] px-4 py-2.5 border-b border-[#1A7B88]/20 flex flex-col gap-1.5 shrink-0 z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#125862] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#1A7B88]">linear_scale</span>
              <span>اختر الحصة (اسحب أفقياً لاختيار أي حصة بالدورة):</span>
            </span>
            <span className="text-[11px] font-bold text-[#1A7B88] font-mono">
              {studentLogs.length} من {maxSessions} مسجلة
            </span>
          </div>

          {/* Smooth Finger Scrollable Buttons Bar */}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 pt-0.5 touch-pan-x scrollbar-thin scrollbar-thumb-[#1A7B88]/30">
            {Array.from({ length: maxSessions }, (_, i) => i + 1).map((num) => {
              const isRecorded = studentLogs.some((l) => l.sessionNumber === num);
              const isSelected = num === sessionNumber;

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSelectSession(num)}
                  className={`min-w-[54px] min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                    isSelected
                      ? 'bg-[#1A7B88] text-white shadow-xs ring-2 ring-[#125862]/30 scale-102 font-black'
                      : isRecorded
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                  title={
                    isRecorded
                      ? `الحصة ${num}: مسجلة سابقاً - انقر لتعديلها`
                      : `الحصة ${num}: غير مسجلة بعد`
                  }
                >
                  <span>ح{num}</span>
                  {isRecorded && (
                    <span className="material-symbols-outlined text-xs text-emerald-700 font-black">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Indicator Bar */}
        <div className="bg-[#F4F9FA] px-4 py-2 border-b border-gray-200/80 shrink-0">
          <div className="flex items-center justify-between mb-1 text-xs font-bold text-gray-700">
            <span className="text-[#125862] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#1A7B88]"></span>
              {isAbsent
                ? 'تسجيل حالة الغياب (مباشر)'
                : step === 1
                ? 'الخطوة ١ من ٣: الحضور وتاريخ الحصة'
                : step === 2
                ? 'الخطوة ٢ من ٣: إنجاز الحفظ والمراجعة'
                : 'الخطوة ٣ من ٣: الواجب والملاحظات'}
            </span>
            <span className="text-gray-400 font-mono text-[11px]">
              {isAbsent ? '1/1' : `${step}/3`}
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden flex">
            <div
              className="bg-[#1A7B88] h-full transition-all duration-300"
              style={{ width: isAbsent ? '100%' : `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Unsaved Changes Confirmation Banner on Session Switch */}
        {pendingSessionNumber !== null && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-base text-amber-600">warning</span>
              <span>
                لديك تعديلات غير محفوظة في الحصة {sessionNumber}. هل تريد الانتقال إلى الحصة {pendingSessionNumber} وتجاهلها؟
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setPendingSessionNumber(null)}
                className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                البقاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = pendingSessionNumber;
                  setPendingSessionNumber(null);
                  loadSession(target);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors cursor-pointer"
              >
                تجاهل والانتقال
              </button>
            </div>
          </div>
        )}

        {/* Discard Confirmation on Modal Close */}
        {showDiscardConfirm && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-base text-amber-600">warning</span>
              <span>هل تريد إغلاق النموذج وتجاهل التعديلات؟</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                متابعة التعديل
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors cursor-pointer"
              >
                تجاهل وإغلاق
              </button>
            </div>
          </div>
        )}

        {/* Global Submit Error Banner */}
        {submitError && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-900 text-xs flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-base text-red-600">error</span>
              <span>{submitError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-red-700 hover:text-red-900 font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Form Body - Scrollable Area */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 text-sm overscroll-contain">
            {/* STEP 1: Attendance & Session Meta */}
            {step === 1 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                {/* Student & Session Info Card */}
                <div className="p-3.5 rounded-2xl bg-[#F4F9FA] border border-gray-200/90 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] text-gray-500 font-medium">الطالب المحدد للحصة:</span>
                    <h4 className="font-bold text-base text-gray-900 leading-snug">{student.name}</h4>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-xs font-bold text-[#125862] bg-[#EAF5F7] px-2.5 py-1 rounded-xl border border-[#1A7B88]/20 inline-block font-mono">
                      الحصة {sessionNumber} من {maxSessions}
                    </span>
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
                    onChange={(e) => {
                      setSessionDate(e.target.value);
                      if (errors.sessionDate) setErrors((prev) => ({ ...prev, sessionDate: '' }));
                    }}
                    className={`w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-base font-mono border focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 dir-ltr text-right ${
                      errors.sessionDate ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                    }`}
                  />
                  {errors.sessionDate && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span>{errors.sessionDate}</span>
                    </p>
                  )}
                </div>

                {/* Attendance Options */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    حالة الحضور والتسميع <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendance('attended')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        attendance === 'attended'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[#F4F9FA] text-gray-700 hover:bg-emerald-50 border border-gray-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>حاضر ومسمّع</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttendance('excused')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        attendance === 'excused'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-[#F4F9FA] text-gray-700 hover:bg-amber-50 border border-gray-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">warning</span>
                      <span>غائب بعذر (مستأذن)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAttendance('absent')}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        attendance === 'absent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-[#F4F9FA] text-gray-700 hover:bg-rose-50 border border-gray-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">cancel</span>
                      <span>غائب بدون عذر</span>
                    </button>
                  </div>
                </div>

                {/* If Absent or Excused: Fast-track absence notes directly in Step 1 */}
                {isAbsent && (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col gap-2.5 animate-in fade-in duration-200 mt-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <span className="material-symbols-outlined text-base text-amber-600">event_busy</span>
                      <span>
                        {attendance === 'excused'
                          ? 'تسجيل غياب بعذر (اعتذار مسبق)'
                          : 'تسجيل غياب بدون عذر'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800">
                      تم تجاوز خطوات الحفظ والمراجعة تلقائياً. يمكنك تسجيل سبب الاعتذار والحفظ مباشرة.
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-1.5">
                        سبب الاعتذار أو ملاحظات الغياب <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={absenceReason}
                        onChange={(e) => {
                          setAbsenceReason(e.target.value);
                          if (errors.absenceReason) setErrors((prev) => ({ ...prev, absenceReason: '' }));
                        }}
                        placeholder="مثال: تم التنسيق مع ولي الأمر لتأجيل الحصة بسبب ظروف سفر / موعد طبي..."
                        className={`w-full p-3 rounded-xl bg-white text-gray-900 text-base border focus:outline-none focus:ring-2 focus:ring-amber-500/30 leading-relaxed ${
                          errors.absenceReason ? 'border-red-400 bg-red-50/50' : 'border-amber-300'
                        }`}
                      />
                      {errors.absenceReason && (
                        <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">info</span>
                          <span>{errors.absenceReason}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Memorization & Revision (Only when attended) */}
            {step === 2 && !isAbsent && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                {errors.learning && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-base text-red-600">info</span>
                    <span>{errors.learning}</span>
                  </div>
                )}

                {/* New Memorization */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-900">
                      مقدار الحفظ الجديد اليوم
                    </label>
                    <span className="text-[11px] text-[#1A7B88] font-medium">السورة والآيات الجديدة المسمّعة</span>
                  </div>
                  <input
                    type="text"
                    value={newMemorization}
                    onChange={(e) => {
                      setNewMemorization(e.target.value);
                      if (errors.learning) setErrors((prev) => ({ ...prev, learning: '' }));
                    }}
                    placeholder="مثال: سورة النبأ (الآيات 1 - 15) مع إتقان الغنن والمدود"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 placeholder:text-gray-400"
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
                    onChange={(e) => {
                      setRevision(e.target.value);
                      if (errors.learning) setErrors((prev) => ({ ...prev, learning: '' }));
                    }}
                    placeholder="مثال: مراجعة سورة المرسلات كاملة"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 placeholder:text-gray-400"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    إذا كانت الحصة مخصصة للمراجعة فقط، يمكنك الاكتفاء بمقدار المراجعة دون إدخال حفظ جديد.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: Homework & Notes (Only when attended) */}
            {step === 3 && !isAbsent && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                {/* Final Session Alert Banner */}
                {isFinalSession && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
                    <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
                      workspace_premium
                    </span>
                    <div className="leading-relaxed">
                      <span className="font-bold">تنبيه ختام الدورة (الحصة {maxSessions} من {maxSessions}):</span>{' '}
                      عند حفظ هذه الحصة، ستكتمل دورة الطالب وتصبح جاهزة للتجميع النهائي وإرسال التقرير للمدير.
                    </div>
                  </div>
                )}

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
                    className="w-full p-3 rounded-xl bg-[#F4F9FA] text-gray-900 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 placeholder:text-gray-400 resize-none leading-relaxed"
                  />
                </div>

                {/* Additional Teacher Note & Quick Praise Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-900">
                      ملاحظة تشجيعية أو تقييم أداء الطالب
                    </label>
                    <span className="text-[11px] text-gray-500 font-medium">
                      انقر على عبارة تشجيعية لإضافتها تلقائياً ⚡
                    </span>
                  </div>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="اكتب ملاحظة أو اختر من بنك العبارات أدناه..."
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-base border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 placeholder:text-gray-400"
                  />

                  {/* Quick Praise Chips Bank */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
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
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#1A7B88] text-white border-[#1A7B88] shadow-xs'
                              : 'bg-white hover:bg-[#EAF5F7] text-gray-700 hover:text-[#125862] border-gray-200/80 shadow-2xs'
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
              </div>
            )}

            {/* Cycle Draft Preview Table */}
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
                    إغلاق ✕
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
                                onClick={() => handleSelectSession(log.sessionNumber)}
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
          <div className="p-3.5 sm:p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-2.5 shrink-0 z-20 shadow-lg sm:shadow-none">
            {/* Draft Preview Toggle Button */}
            <button
              type="button"
              onClick={() => setShowDraftPreview(!showDraftPreview)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[44px] ${
                showDraftPreview
                  ? 'bg-[#EAF5F7] border-[#1A7B88] text-[#125862]'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              title="معاينة مسودة تقرير الدورة"
            >
              <span className="material-symbols-outlined text-base text-[#1A7B88]">table_chart</span>
              <span className="hidden sm:inline">
                {showDraftPreview ? 'إخفاء المسودة' : 'معاينة المسودة'}
              </span>
            </button>

            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
              {step === 1 ? (
                <button
                  type="button"
                  onClick={handleAttemptClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer text-xs min-h-[44px]"
                >
                  إلغاء
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer text-xs min-h-[44px] flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                  <span>السابق</span>
                </button>
              )}

              {/* If Absent in Step 1: Submit Directly */}
              {isAbsent ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 min-h-[44px] disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">
                        {isEditingExisting ? 'update' : 'save'}
                      </span>
                      <span>
                        {isEditingExisting
                          ? `تحديث تسجيل الغياب (ح${sessionNumber})`
                          : `حفظ تسجيل الغياب (ح${sessionNumber})`}
                      </span>
                    </>
                  )}
                </button>
              ) : step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 min-h-[44px]"
                >
                  <span>
                    {step === 1 ? 'التالي: إنجاز الحصة' : 'التالي: الواجب والملاحظات'}
                  </span>
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 min-h-[44px] disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>جارٍ الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">
                        {isEditingExisting ? 'update' : 'save'}
                      </span>
                      <span>
                        {isEditingExisting
                          ? `حفظ التعديلات (ح${sessionNumber})`
                          : isFinalSession
                          ? `حفظ وإكمال الدورة (${maxSessions}/${maxSessions}) ⭐`
                          : `حفظ الحصة (${sessionNumber}/${maxSessions})`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
