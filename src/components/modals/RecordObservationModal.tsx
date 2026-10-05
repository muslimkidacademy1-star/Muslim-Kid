import React, { useState } from 'react';
import { Teacher, Student } from '../../types';
import { useApp } from '../../context/AppContext';

interface RecordObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher?: Teacher;
  student?: Student;
  sessionTime?: string;
}

export const RecordObservationModal: React.FC<RecordObservationModalProps> = ({
  isOpen,
  onClose,
  teacher,
  student,
  sessionTime,
}) => {
  const { currentUser, addActivityLog, updateStudent } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [teachingMethodScore, setTeachingMethodScore] = useState<string>('ممتاز - تلقين متقن وضبط لأحكام التجويد');
  const [studentEngagement, setStudentEngagement] = useState<string>('تفاعل عالي وتجاوب سريع من الطالب');
  const [punctuality, setPunctuality] = useState<string>('بدء الحصة في الموعد المحدد تماماً');
  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  if (!isOpen || !teacher) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const todayIso = new Date().toISOString().slice(0, 10);
    const observationNoteText = notes.trim() || 'الأداء متقن ومثمر، تفاعل طيب من الطالب وضبط للتلاوة.';

    const observationData = {
      id: `obs-${Date.now()}`,
      supervisorId: currentUser.id,
      supervisorName: currentUser.name,
      teacherId: teacher.id,
      teacherName: teacher.name,
      circleName: teacher.circleName,
      studentId: student?.id,
      studentName: student?.name,
      sessionTime: sessionTime || student?.sessionTime || '04:00 م (بتوقيت القاهرة)',
      rating,
      teachingMethodScore,
      studentEngagement,
      punctuality,
      notes: observationNoteText,
      date: todayIso,
      createdAt: new Date().toISOString(),
    };

    // Store in localStorage for fast retrieval & offline support
    try {
      const existing = JSON.parse(localStorage.getItem('mk_observation_notes') || '[]');
      existing.unshift(observationData);
      localStorage.setItem('mk_observation_notes', JSON.stringify(existing));
    } catch {
      // fallback
    }

    // Automatically update student's lastObservationDate in Supabase and App state
    if (student?.id) {
      updateStudent(student.id, {
        lastObservationDate: todayIso,
        lastObservationNote: observationNoteText,
        lastObservationRating: rating,
      });
    }

    addActivityLog(
      'تسجيل ملاحظة مراقبة ميدانية',
      student?.name,
      student?.id,
      `قام المشرف ${currentUser.name} بتسجيل زيارة وملاحظة مراقبة لحلقة ${teacher.name} (${teacher.circleName}) - تقييم ${rating}/5 نجوم: ${observationNoteText}`
    );

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs transition-all duration-200"
      dir="rtl"
    >
      {/* Backdrop overlay dismiss */}
      <div
        className="fixed inset-0 bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Responsive Sheet / Dialog Card */}
      <div
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col text-right max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-xl">visibility</span>
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                تسجيل ملاحظة مراقبة ميدانية
              </h3>
              <p className="text-[11px] text-[#EAF5F7] truncate">
                تقييم حضور وأداء المعلم بالحصة المباشرة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-3.5 text-sm overflow-y-auto">
          {/* Target Teacher & Student Ribbon */}
          <div className="bg-[#EAF5F7] border border-[#1A7B88]/20 rounded-2xl p-3 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#1A7B88] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                {teacher.initials || 'مع'}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate">{teacher.name}</h4>
                <span className="text-[11px] text-gray-600 truncate block">
                  {teacher.circleName} {student ? `• الطالب: ${student.name}` : '• جلسة مراقبة عامة'}
                </span>
              </div>
            </div>

            {sessionTime && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-[#125862] border border-[#1A7B88]/20 shrink-0">
                {sessionTime.replace(/\s*\(بتوقيت القاهرة\)/, '')}
              </span>
            )}
          </div>

          {/* Star Rating */}
          <div className="bg-gray-50/70 p-3 rounded-2xl border border-gray-100 flex flex-col items-center gap-1.5">
            <label className="text-xs font-bold text-gray-700">
              التقييم العام لأداء المعلم في الحصة
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-0.5 text-2xl transition-transform hover:scale-120 focus:outline-none cursor-pointer"
                >
                  <span
                    className={`material-symbols-outlined ${
                      star <= rating ? 'text-amber-400' : 'text-gray-200'
                    }`}
                  >
                    star
                  </span>
                </button>
              ))}
              <span className="font-bold text-xs text-[#125862] mr-2">
                {rating === 5
                  ? 'ممتاز (5/5) ⭐'
                  : rating === 4
                  ? 'جيد جداً (4/5)'
                  : rating === 3
                  ? 'جيد (3/5)'
                  : rating === 2
                  ? 'يحتاج متابعة (2/5)'
                  : 'ضعيف (1/5)'}
              </span>
            </div>
          </div>

          {/* Teaching Quality & Recitation */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              تمكن المعلم وأسلوب التلقين والتصحيح
            </label>
            <select
              value={teachingMethodScore}
              onChange={(e) => setTeachingMethodScore(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-gray-50 text-gray-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200"
            >
              <option value="ممتاز - تلقين متقن وضبط لأحكام التجويد ومخارج الحروف">
                ممتاز - تلقين متقن وضبط لأحكام التجويد ومخارج الحروف
              </option>
              <option value="جيد جداً - تصحيح متواصل مع تشجيع للطالب">
                جيد جداً - تصحيح متواصل مع تشجيع للطالب
              </option>
              <option value="متوسط - يحتاج تركيزاً أكبر على أحكام التجويد">
                متوسط - يحتاج تركيزاً أكبر على أحكام التجويد
              </option>
              <option value="يحتاج لتطوير مهارات إدارة حلقة التسميع التفاعلية">
                يحتاج لتطوير مهارات إدارة حلقة التسميع التفاعلية
              </option>
            </select>
          </div>

          {/* Student Engagement & Punctuality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                تفاعل الطالب وانتباهه
              </label>
              <select
                value={studentEngagement}
                onChange={(e) => setStudentEngagement(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 text-gray-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200"
              >
                <option value="تفاعل عالي وتجاوب سريع من الطالب">تفاعل عالي وتجاوب سريع من الطالب</option>
                <option value="تفاعل متوسط ويحتاج تحفيزاً إضافياً">تفاعل متوسط ويحتاج تحفيزاً إضافياً</option>
                <option value="تشتت خفيف وتأخر في الترديد">تشتت خفيف وتأخر في الترديد</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                الالتزام بالوقت
              </label>
              <select
                value={punctuality}
                onChange={(e) => setPunctuality(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-gray-50 text-gray-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200"
              >
                <option value="بدء الحصة في الموعد المحدد تماماً">بدء الحصة في الموعد المحدد تماماً</option>
                <option value="تأخر طفيف (1-3 دقائق) بعذر">تأخر طفيف (1-3 دقائق) بعذر</option>
                <option value="تأخر ملحوظ في بدء الحصة">تأخر ملحوظ في بدء الحصة</option>
              </select>
            </div>
          </div>

          {/* Supervisor Notes & Recommendations */}
          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              ملاحظات وتوجيهات المشرف الميداني
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تميز المعلم بحسن الإنصات والتشجيع اللفظي للطفل..."
              className="w-full p-2.5 rounded-xl bg-gray-50 text-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200 resize-none leading-relaxed"
            />
          </div>

          {/* Success Message banner */}
          {isSaved && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-bold animate-in fade-in">
              <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
              <span>تم توثيق ملاحظة المراقبة بنجاح في سجل المشرف.</span>
            </div>
          )}

          {/* Footer actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors cursor-pointer text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaved}
              className="px-5 py-2.5 rounded-xl bg-[#1A7B88] text-white font-bold hover:bg-[#125862] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>{isSaved ? 'جاري الحفظ...' : 'حفظ تقييم المراقبة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
