import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Report } from '../../types';
import { generateStudentReportPdf } from '../../utils/pdfGenerator';
import { getReportWhatsAppUrl } from '../../utils/whatsapp';
import { AddReportModal } from '../modals/AddReportModal';

export const ReportsListView: React.FC = () => {
  const { reports, students, getTeacherById, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddReportModalOpen, setIsAddReportModalOpen] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  const getStudentById = (id: string) => students.find((s) => s.id === id);

  const filteredReports = reports.filter((rep) => {
    // If current user is teacher, only show reports of their students
    if (currentUser.role === 'teacher') {
      const myTeacherId = currentUser.teacherId || currentUser.assignedTeacherIds?.[0] || 't1';
      if (rep.teacherId !== myTeacherId) return false;
    }

    const student = getStudentById(rep.studentId);
    const teacher = getTeacherById(rep.teacherId);
    const q = searchTerm.toLowerCase();

    const matchesSearch =
      (student && student.name.toLowerCase().includes(q)) ||
      (teacher && teacher.name.toLowerCase().includes(q)) ||
      rep.performanceSummary.toLowerCase().includes(q) ||
      (rep.memorizationDetails && rep.memorizationDetails.toLowerCase().includes(q));

    const matchesGrade =
      gradeFilter === 'all' ||
      (gradeFilter === 'excellent' && (rep.grade?.includes('ممتاز') || (rep.memorizationScore ?? 0) >= 90)) ||
      (gradeFilter === 'very_good' && rep.grade?.includes('جيد جداً'));

    return matchesSearch && matchesGrade;
  });

  const handleDownloadPdf = (report: Report) => {
    const student = getStudentById(report.studentId);
    if (!student) return;
    const teacher = getTeacherById(report.teacherId);

    generateStudentReportPdf({
      student,
      teacher,
      report,
      recordedByName: currentUser.name,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Page Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-[#bec8c8]/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#005253] animate-pulse"></span>
            <span className="text-xs text-[#6f7979] tracking-wider font-semibold">
              دورة الـ 8 حصص الشهرية
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#111c2d]">
            سجل تقارير الإنجاز الشهرية (8 حصص)
          </h1>
          <p className="text-sm text-[#3f4949] mt-1">
            إصدار تقارير الـ PDF الرسمية، تصفير عداد الـ 30 يوماً، والتواصل المباشر مع أولياء الأمور عبر واتساب
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddReportModalOpen(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#005253] text-white hover:bg-[#186b6d] transition-all shadow-md font-semibold text-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">note_add</span>
            <span>إضافة تقرير 8 حصص جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#bec8c8]/20 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#6f7979] text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم الطالب، المعلم، أو السورة..."
            className="w-full h-10 pr-9 pl-3 rounded-xl bg-[#f0f3ff] text-sm focus:outline-none border border-transparent focus:border-[#005253]"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#6f7979]">التقدير:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setGradeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                gradeFilter === 'all'
                  ? 'bg-[#005253] text-white'
                  : 'bg-[#f0f3ff] text-[#3f4949] hover:bg-[#dee8ff]'
              }`}
            >
              الكل ({currentUser.role === 'teacher' ? filteredReports.length : reports.length})
            </button>
            <button
              onClick={() => setGradeFilter('excellent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                gradeFilter === 'excellent'
                  ? 'bg-[#15803d] text-white'
                  : 'bg-[#f0f3ff] text-[#3f4949] hover:bg-[#dee8ff]'
              }`}
            >
              ممتاز
            </button>
            <button
              onClick={() => setGradeFilter('very_good')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                gradeFilter === 'very_good'
                  ? 'bg-[#005253] text-white'
                  : 'bg-[#f0f3ff] text-[#3f4949] hover:bg-[#dee8ff]'
              }`}
            >
              جيد جداً
            </button>
          </div>
        </div>
      </div>

      {/* Reports Feed */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#bec8c8]/20">
            <span className="material-symbols-outlined text-5xl text-[#6f7979]/40 mb-2 block">
              description
            </span>
            <p className="text-base font-bold text-[#111c2d]">لا توجد تقارير مطابقة</p>
            <p className="text-xs text-[#6f7979] mt-1">جرّب تعديل كلمات البحث أو تصفية التقدير</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const student = getStudentById(report.studentId);
            const teacher = getTeacherById(report.teacherId);
            const parentPhone = student?.parentPhone || '';

            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-[#bec8c8]/25 shadow-2xs hover:shadow-md transition-all flex flex-col gap-4 group"
              >
                {/* Header row */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#bec8c8]/15">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#005253] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {student?.initials || 'ط'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base sm:text-lg text-[#111c2d]">
                          {student?.name || 'طالب'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#fef9c3] text-[#854d0e] border border-[#fde047]/60 text-xs font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">workspace_premium</span>
                          <span>دورة 8 حصص</span>
                        </span>

                        {/* Submission status badge */}
                        {report.submissionStatus === 'submitted_ready_to_send' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#86efac] text-xs font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">send_and_archive</span>
                            <span>
                              {currentUser.role === 'teacher'
                                ? 'تم التسليم للمدير - بانتظار إرسال الإدارة لولي الأمر'
                                : `سلّمه المعلم: ${report.submittedByTeacherName || teacher?.name || 'المعلم'} - جاهز للإرسال لولي الأمر`}
                            </span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#6f7979] block mt-0.5">
                        المعلم: <strong>{teacher?.name || 'غير محدد'}</strong> • الحلقة:{' '}
                        {teacher?.circleName || 'عام'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex flex-col items-end">
                      <span className="px-3 py-1 rounded-full bg-[#dcfce7] text-[#15803d] border border-[#86efac] font-bold text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">stars</span>
                        <span>
                          {report.grade || 'ممتاز'} ({report.memorizationScore ?? 95}%)
                        </span>
                      </span>
                      <span className="text-[11px] text-[#6f7979] font-mono dir-ltr mt-1">
                        تاريخ التقرير: {report.reportDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Memorization */}
                  <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <div className="flex items-center gap-1.5 font-bold text-[#005253] mb-1">
                      <span className="material-symbols-outlined text-sm">menu_book</span>
                      <span>السور والآيات التي تم حفظها:</span>
                    </div>
                    <p className="text-[#334155] leading-relaxed font-medium">
                      {report.memorizationDetails || report.performanceSummary}
                    </p>
                  </div>

                  {/* Revision */}
                  <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                    <div className="flex items-center gap-1.5 font-bold text-[#005253] mb-1">
                      <span className="material-symbols-outlined text-sm">sync</span>
                      <span>مقدار المراجعة والتثبيت:</span>
                    </div>
                    <p className="text-[#334155] leading-relaxed">
                      {report.revisionDetails || 'مراجعة وتثبيت الأجزاء السابقة وأحكام التجويد'}
                    </p>
                  </div>
                </div>

                {/* Encouragement banner */}
                {report.studentEncouragement && (
                  <div className="p-3 bg-[#fefce8] border border-[#fef08a] rounded-xl text-xs flex items-start gap-2 text-[#713f12]">
                    <span className="material-symbols-outlined text-base text-[#ca8a04] mt-0.5">
                      sentiment_very_satisfied
                    </span>
                    <div>
                      <strong className="block mb-0.5">رسالة تحفيز الطالب:</strong>
                      <p className="font-semibold italic">« {report.studentEncouragement} »</p>
                    </div>
                  </div>
                )}

                {/* Footer Action Buttons */}
                <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="text-[#6f7979]">
                    سُجل واعتُمد بواسطة: <strong>{report.recordedBy}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {/* PDF Download Button */}
                    <button
                      onClick={() => handleDownloadPdf(report)}
                      className="px-3.5 py-2 rounded-xl bg-[#005253] text-white hover:bg-[#186b6d] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      title="تحميل وطباعة تقرير الـ PDF الفاخر"
                    >
                      <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                      <span>تحميل تقرير PDF</span>
                    </button>

                    {/* Direct WhatsApp Contact Button - Only Manager and General Supervisor */}
                    {student && parentPhone && (currentUser.role === 'manager' || currentUser.role === 'general_supervisor') && (
                      <a
                        href={getReportWhatsAppUrl(parentPhone, student.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-[#16a34a] text-white hover:bg-[#15803d] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="إرسال إشعار التقرير لولي الأمر عبر واتساب"
                      >
                        <span className="material-symbols-outlined text-base">chat</span>
                        <span>إرسال لولي الأمر (واتساب)</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Report Modal */}
      <AddReportModal
        isOpen={isAddReportModalOpen}
        student={null}
        onClose={() => setIsAddReportModalOpen(false)}
      />
    </div>
  );
};
