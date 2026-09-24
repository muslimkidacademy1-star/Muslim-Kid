import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, Report } from '../../types';
import { generateStudentReportPdf } from '../../utils/pdfGenerator';
import { getReportWhatsAppUrl } from '../../utils/whatsapp';

interface AddReportModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
}

export const AddReportModal: React.FC<AddReportModalProps> = ({
  isOpen,
  student,
  onClose,
}) => {
  const { addReport, currentUser, getTeacherById, students, getAggregatedCycleSummary } = useApp();

  // Selected student id (allows picking student from dropdown if opened without preselection)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Form Fields for the 8-session monthly cycle
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [memorizationDetails, setMemorizationDetails] = useState('');
  const [revisionDetails, setRevisionDetails] = useState('');
  const [grade, setGrade] = useState('ممتاز مرتفع');
  const [score, setScore] = useState(98);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [studentEncouragement, setStudentEncouragement] = useState('');
  const [hasAggregatedData, setHasAggregatedData] = useState(false);

  // Post-save state for immediate PDF download & WhatsApp direct sharing
  const [savedReport, setSavedReport] = useState<Report | null>(null);

  const currentStudent = student || students.find((s) => s.id === selectedStudentId);
  const teacher = currentStudent ? getTeacherById(currentStudent.teacherId) : undefined;

  useEffect(() => {
    const targetStudent = student || (students.length > 0 ? (selectedStudentId ? students.find(s => s.id === selectedStudentId) : students[0]) : null);
    if (targetStudent) {
      setSelectedStudentId(targetStudent.id);
      const summary = getAggregatedCycleSummary(targetStudent.id);
      if (summary.completedSessionsCount > 0) {
        setHasAggregatedData(true);
        setMemorizationDetails(summary.memorizationDetails);
        setRevisionDetails(summary.revisionDetails);
        setTeacherNotes(summary.teacherNotes);
        setStudentEncouragement(
          summary.studentEncouragement ||
          `بارك الله فيك يا بطل القرآن الصغير (${targetStudent.name.split(' ')[0]}) ورفع قدرك في الدارين!`
        );
      } else {
        setHasAggregatedData(false);
        setMemorizationDetails(`حفظ ${targetStudent.surahProgress || 'المقرر الجديد'}`);
        setRevisionDetails('مراجعة وتثبيت الأجزاء السابقة وأحكام التجويد');
        setTeacherNotes('أداء متميز وتلاوة خاشعة مع مراعاة مخارج الحروف والمدود.');
        setStudentEncouragement(
          `بارك الله فيك يا بطل القرآن الصغير (${targetStudent.name.split(' ')[0]}) ورفع قدرك في الدارين!`
        );
      }
    }
    setSavedReport(null);
  }, [student, isOpen, students, selectedStudentId]);

  if (!isOpen) return null;

  const handleStudentChange = (stId: string) => {
    setSelectedStudentId(stId);
    const target = students.find((s) => s.id === stId);
    if (target) {
      const summary = getAggregatedCycleSummary(target.id);
      if (summary.completedSessionsCount > 0) {
        setHasAggregatedData(true);
        setMemorizationDetails(summary.memorizationDetails);
        setRevisionDetails(summary.revisionDetails);
        setTeacherNotes(summary.teacherNotes);
        setStudentEncouragement(summary.studentEncouragement);
      } else {
        setHasAggregatedData(false);
        setMemorizationDetails(`حفظ ${target.surahProgress || 'المقرر الجديد'}`);
        setStudentEncouragement(
          `بارك الله فيك يا بطل القرآن الصغير (${target.name.split(' ')[0]}) ورفع قدرك في الدارين!`
        );
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;
    if (!memorizationDetails.trim()) return;

    const performanceSummary = `أتم دورة الـ 8 حصص بحفظ: ${memorizationDetails.trim()}، ومراجعة: ${revisionDetails.trim() || 'المقرر السابق'}. التقييم: ${grade}.`;

    const isTeacher = currentUser.role === 'teacher';

    const newReportData: Omit<Report, 'id'> = {
      studentId: currentStudent.id,
      teacherId: currentStudent.teacherId,
      reportDate,
      performanceSummary,
      memorizationScore: Number(score),
      grade,
      memorizationDetails: memorizationDetails.trim(),
      revisionDetails: revisionDetails.trim(),
      teacherNotes: teacherNotes.trim(),
      studentEncouragement: studentEncouragement.trim(),
      cycleSessionsCount: 8,
      notes: teacherNotes.trim(),
      recordedBy: currentUser.name,
      submissionStatus: 'submitted_ready_to_send',
      submittedByTeacherName: isTeacher ? currentUser.name : (teacher?.name || currentUser.name),
    };

    addReport(newReportData);

    const generatedReportObj: Report = {
      ...newReportData,
      id: `rep-temp-${Date.now()}`,
    };
    setSavedReport(generatedReportObj);
  };

  const handleDownloadPdf = (repToUse?: Report) => {
    if (!currentStudent) return;
    const targetRep = repToUse || savedReport || {
      id: 'rep-curr',
      studentId: currentStudent.id,
      teacherId: currentStudent.teacherId,
      reportDate,
      performanceSummary: `أتم دورة الـ 8 حصص بنجاح: ${memorizationDetails}`,
      memorizationScore: score,
      grade,
      memorizationDetails,
      revisionDetails,
      teacherNotes,
      studentEncouragement,
      cycleSessionsCount: 8,
      recordedBy: currentUser.name,
    };

    generateStudentReportPdf({
      student: currentStudent,
      teacher,
      report: targetRep,
      recordedByName: currentUser.name,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-[#bec8c8]/20 overflow-hidden flex flex-col text-right my-6 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#bec8c8]/20 flex items-center justify-between bg-[#005253] text-white">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </span>
            <div>
              <span className="font-bold text-base block">
                نموذج تقرير دورة الـ 8 حصص القرآنية
              </span>
              <span className="text-xs text-[#a6eff1]">
                تصفير عداد الـ 30 يوماً وتوليد شهادة PDF فاخرة وإرسال إشعار واتساب لولي الأمر
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/15 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Post-Save Success Panel */}
        {savedReport && currentStudent ? (
          <div className="p-6 flex flex-col gap-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center mx-auto shadow-sm">
              <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#111c2d]">
                {currentUser.role === 'teacher'
                  ? 'تم تسليم التقرير للإدارة / المدير بنجاح!'
                  : 'تم اعتماد تقرير دورة الـ 8 حصص بنجاح!'}
              </h3>
              <p className="text-sm text-[#3f4949] mt-1">
                تم تحديث تاريخ آخر تقرير للطالب{' '}
                <strong className="text-[#005253]">{currentStudent.name}</strong> إلى{' '}
                <strong dir="ltr" className="font-mono text-[#005253]">
                  {reportDate}
                </strong>
                ، وتصفير عداد الـ 30 يوماً فوراً.
              </p>
              {currentUser.role === 'teacher' && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#86efac] text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>تم التسليم للمدير - بانتظار إرسال الإدارة لولي الأمر</span>
                </div>
              )}
            </div>

            {/* Quick Action Grid */}
            <div className={`grid ${currentUser.role === 'teacher' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3.5 pt-2`}>
              <button
                type="button"
                onClick={() => handleDownloadPdf(savedReport)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#005253] text-white font-bold hover:bg-[#186b6d] transition-all shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                <span>تحميل تقرير PDF رسمي فاخر</span>
              </button>

              {/* WhatsApp button only visible to Manager & General Supervisor */}
              {(currentUser.role === 'manager' || currentUser.role === 'general_supervisor') && (
                <a
                  href={getReportWhatsAppUrl(currentStudent.parentPhone, currentStudent.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#16a34a] text-white font-bold hover:bg-[#15803d] transition-all shadow-md cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xl">chat</span>
                  <span>تواصل عبر واتساب مع ولي الأمر</span>
                </a>
              )}
            </div>

            {(currentUser.role === 'manager' || currentUser.role === 'general_supervisor') && (
              <div className="p-3 bg-[#f0fdf4] border border-[#86efac]/40 rounded-xl text-xs text-[#166534] text-right flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-[#16a34a] mt-0.5">
                  mark_chat_read
                </span>
                <div>
                  <strong>نص الرسالة الجاهز في واتساب:</strong>
                  <p className="mt-0.5 font-sans">
                    "مرحباً بكم، تم بحمد الله إتمام 8 حصص للطالب {currentStudent.name} في أكاديمية
                    المسلم الصغير وصدور تقريره الشهري، تجدون التقرير مرفقاً."
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-bold hover:bg-[#dee8ff] transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          /* Report Input Form */
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-sm overflow-y-auto">
            {/* Student Selector / Student Header */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                اختيار الطالب <span className="text-[#ba1a1a]">*</span>
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                required
                className="w-full h-11 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-bold focus:outline-none border border-[#bec8c8]/30"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - (المعلم: {getTeacherById(s.teacherId)?.name || 'غير محدد'}) - آخر تقرير: {s.lastReportDate}
                  </option>
                ))}
              </select>
            </div>

            {/* Student mini info banner */}
            {currentStudent && (
              <div className="p-3 bg-[#dee8ff]/50 rounded-xl border border-[#bec8c8]/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#005253] text-white font-bold flex items-center justify-center text-xs">
                    {currentStudent.initials}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-[#111c2d] block">
                      {currentStudent.name}
                    </span>
                    <span className="text-xs text-[#005253]">
                      المعلم: {teacher?.name || 'غير محدد'} ({teacher?.circleName}) • ولي الأمر: {currentStudent.parentPhone}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-[11px] text-[#6f7979] block">آخر تقرير:</span>
                  <span className="text-xs font-mono font-bold text-[#ba1a1a]" dir="ltr">
                    {currentStudent.lastReportDate}
                  </span>
                </div>
              </div>
            )}

            {/* Date & Overall Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                  تاريخ التقرير <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                  التقييم العام <span className="text-[#ba1a1a]">*</span>
                </label>
                <select
                  value={grade}
                  onChange={(e) => {
                    const g = e.target.value;
                    setGrade(g);
                    if (g === 'ممتاز مرتفع') setScore(100);
                    else if (g === 'ممتاز') setScore(95);
                    else if (g === 'جيد جداً مرتفع') setScore(88);
                    else if (g === 'جيد جداً') setScore(80);
                    else setScore(75);
                  }}
                  className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] font-bold focus:outline-none"
                >
                  <option value="ممتاز مرتفع">ممتاز مرتفع (100%)</option>
                  <option value="ممتاز">ممتاز (95%)</option>
                  <option value="جيد جداً مرتفع">جيد جداً مرتفع (88%)</option>
                  <option value="جيد جداً">جيد جداً (80%)</option>
                  <option value="جيد">جيد (75%)</option>
                </select>
              </div>
            </div>

            {/* Memorization Details */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                السور والآيات التي تم حفظها (حصيلة الـ 8 حصص) <span className="text-[#ba1a1a]">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={memorizationDetails}
                onChange={(e) => setMemorizationDetails(e.target.value)}
                placeholder="مثال: سورة النبأ كاملة وسورة النازعات من الآية 1 إلى 25 مع التجويد..."
                className="w-full p-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none font-medium"
              />
            </div>

            {/* Revision Details */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                مقدار المراجعة والتثبيت
              </label>
              <input
                type="text"
                value={revisionDetails}
                onChange={(e) => setRevisionDetails(e.target.value)}
                placeholder="مثال: مراجعة جزء عمّ كاملاً وتثبيت أحكام النون الساكنة..."
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none"
              />
            </div>

            {/* Teacher notes */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                ملاحظات المعلم وتوصياته
              </label>
              <input
                type="text"
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                placeholder="مثال: إتقان ممتاز للمدود ومخارج الحروف، ونوصي بمتابعة المراجعة اليومية..."
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none"
              />
            </div>

            {/* Student Encouragement */}
            <div>
              <label className="block text-xs font-bold text-[#005253] mb-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span>تشجيع وتحفيز الطالب (يظهر في تقرير الـ PDF الفاخر)</span>
              </label>
              <input
                type="text"
                value={studentEncouragement}
                onChange={(e) => setStudentEncouragement(e.target.value)}
                placeholder="مثال: بارك الله فيك يا بطل القرآن الصغير ووفقك لحفظ كتابه الكريم!"
                className="w-full h-10 px-3 rounded-xl bg-[#fefce8] border border-[#fde047]/60 text-[#713f12] font-semibold focus:outline-none"
              />
            </div>

            {/* Automation callout */}
            <div className="p-3 bg-[#a6eff1]/30 rounded-xl flex items-center gap-2 text-[#002021] text-xs">
              <span className="material-symbols-outlined text-xl text-[#005253]">auto_awesome</span>
              <span>
                <strong>المنطق التلقائي المعتمد:</strong> عند حفظ التقرير يُسجل فوراً في سجل التقارير،
                ويُحدّث تاريخ آخر تقرير للطالب إلى <strong dir="ltr">{reportDate}</strong> لتصفير عداد
                الـ 30 يوماً وإلغاء حالة التحذير والتأخر تلقائياً!
              </span>
            </div>

            {/* Form Footer Buttons */}
            <div className="pt-3 border-t border-[#bec8c8]/20 flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleDownloadPdf()}
                className="px-4 py-2 rounded-xl bg-white border border-[#bec8c8]/40 text-[#005253] font-bold hover:bg-[#dee8ff] transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                title="معاينة نموذج التقرير وطباعته كـ PDF"
              >
                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                <span>معاينة PDF</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-[#dee8ff] text-[#3f4949] font-bold hover:bg-[#d8e3fb]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#005253] text-white font-bold hover:bg-[#186b6d] shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">
                    {currentUser.role === 'teacher' ? 'send' : 'check_circle'}
                  </span>
                  <span>
                    {currentUser.role === 'teacher'
                      ? 'تسليم التقرير للإدارة / المدير'
                      : 'حفظ تقرير الـ 8 حصص'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
