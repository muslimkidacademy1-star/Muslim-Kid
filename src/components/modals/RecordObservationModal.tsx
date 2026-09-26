import React, { useState } from 'react';
import { Teacher, Student } from '../../types';
import { useApp } from '../../context/AppContext';

interface RecordObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher?: Teacher;
  student?: Student;
  sessionTime?: string;
  meetingUrl?: string;
}

export const RecordObservationModal: React.FC<RecordObservationModalProps> = ({
  isOpen,
  onClose,
  teacher,
  student,
  sessionTime,
  meetingUrl,
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
      sessionTime: sessionTime || student?.sessionTime || 'بتوقيت مكة',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#bec8c8]/20 overflow-hidden flex flex-col text-right">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#bec8c8]/20 flex items-center justify-between bg-[#005253] text-white">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">visibility</span>
            </span>
            <div>
              <h3 className="font-bold text-base">تسجيل ملاحظة مراقبة ميدانية</h3>
              <p className="text-xs text-[#a6eff1]">
                تقييم أداء المعلم أثناء الحصة المباشرة
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/15 transition-colors cursor-pointer"
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

            {meetingUrl && (
              <a
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#0284c7] text-white font-bold text-xs hover:bg-[#0369a1] transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">videocam</span>
                <span>غرفة الزووم</span>
              </a>
            )}
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
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#bec8c8]/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#dee8ff] text-[#3f4949] font-bold hover:bg-[#d8e3fb] transition-colors cursor-pointer text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaved}
              className="px-5 py-2.5 rounded-xl bg-[#005253] text-white font-bold hover:bg-[#186b6d] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-50"
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
