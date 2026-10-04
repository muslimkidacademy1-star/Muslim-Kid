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
  const { currentUser, addActivityLog } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [teachingMethodScore, setTeachingMethodScore] = useState<string>('ممتاز - تلقين متقن وضبط لأحكام التجويد');
  const [studentEngagement, setStudentEngagement] = useState<string>('تفاعل عالي وتجاوب سريع من الطالب');
  const [punctuality, setPunctuality] = useState<string>('بدء الحصة في الموعد المحدد تماماً');
  const [notes, setNotes] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  if (!isOpen || !teacher) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
      notes: notes.trim() || 'لا توجد ملاحظات سلبية، الأداء متقن ومثمر.',
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };

    // Store in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('mk_observation_notes') || '[]');
      existing.unshift(observationData);
      localStorage.setItem('mk_observation_notes', JSON.stringify(existing));
    } catch {
      // fallback
    }

    addActivityLog(
      'تسجيل ملاحظة مراقبة ميدانية',
      student?.name,
      student?.id,
      `قام المشرف ${currentUser.name} بتسجيل زيارة وملاحظة مراقبة لحلقة ${teacher.name} (${teacher.circleName}) - تقييم ${rating}/5 نجوم: ${notes || 'أداء ممتاز'}`
    );

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl border-t sm:border border-gray-100 overflow-hidden flex flex-col text-right max-h-[90vh] h-[90vh] sm:h-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">visibility</span>
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-white truncate">تسجيل ملاحظة مراقبة ميدانية</h3>
              <p className="text-xs text-[#EAF5F7] truncate">
                تقييم أداء المعلم أثناء الحصة المباشرة
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-sm max-h-[82vh] overflow-y-auto">
          {/* Target Teacher & Student Ribbon */}
          <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0284c7] text-white font-bold flex items-center justify-center text-sm">
                {teacher.initials}
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#111c2d]">{teacher.name}</h4>
                <span className="text-xs text-[#526060]">
                  {teacher.circleName} • {student ? `الطالب: ${student.name}` : 'جلسة مراقبة عامة'}
                </span>
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              التقييم العام لأداء المعلم في الحصة
            </label>
            <div className="flex items-center gap-2 bg-[#f9f9ff] p-3 rounded-2xl border border-[#bec8c8]/20 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                >
                  <span
                    className={`material-symbols-outlined ${
                      star <= rating ? 'text-[#f59e0b]' : 'text-gray-300'
                    }`}
                  >
                    star
                  </span>
                </button>
              ))}
              <span className="font-black text-sm text-[#005253] mr-3">
                {rating === 5
                  ? 'ممتاز جداً (5/5)'
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
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              تمكن المعلم وأسلوب التلقين والتصحيح
            </label>
            <select
              value={teachingMethodScore}
              onChange={(e) => setTeachingMethodScore(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent font-medium"
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

          {/* Student Engagement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                تفاعل الطالب وانتباهه
              </label>
              <select
                value={studentEngagement}
                onChange={(e) => setStudentEngagement(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent font-medium"
              >
                <option value="تفاعل عالي وتجاوب سريع من الطالب">تفاعل عالي وتجاوب سريع من الطالب</option>
                <option value="تفاعل متوسط ويحتاج تحفيزاً إضافياً">تفاعل متوسط ويحتاج تحفيزاً إضافياً</option>
                <option value="تشتت خفيف وتأخر في الترديد">تشتت خفيف وتأخر في الترديد</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                الالتزام بالوقت
              </label>
              <select
                value={punctuality}
                onChange={(e) => setPunctuality(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent font-medium"
              >
                <option value="بدء الحصة في الموعد المحدد تماماً">بدء الحصة في الموعد المحدد تماماً</option>
                <option value="تأخر طفيف (1-3 دقائق) بعذر">تأخر طفيف (1-3 دقائق) بعذر</option>
                <option value="تأخر ملحوظ في بدء الحصة">تأخر ملحوظ في بدء الحصة</option>
              </select>
            </div>
          </div>

          {/* Supervisor Notes & Recommendations */}
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              ملاحظات وتوجيهات المشرف الميداني
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تميز المعلم بطول النفس وتكرار الآيات مع الطفل، نوصي بزيادة التحفيز اللفظي..."
              className="w-full p-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent resize-none leading-relaxed"
            />
          </div>

          {/* Success Message banner */}
          {isSaved && (
            <div className="p-3 rounded-xl bg-[#dcfce7] border border-[#86efac] text-xs text-[#15803d] flex items-center gap-2 font-bold animate-in fade-in">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>تم توثيق ملاحظة المراقبة بنجاح في سجل المشرف الميداني.</span>
            </div>
          )}

          {/* Footer actions */}
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
              disabled={isSaved}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-[#1A7B88] text-white font-bold hover:bg-[#125862] transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-xs disabled:opacity-50 min-h-[44px]"
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
