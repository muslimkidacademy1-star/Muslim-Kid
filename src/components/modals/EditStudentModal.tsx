import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Student, SubscriptionStatus } from '../../types';
import { getParentWhatsAppUrl } from '../../utils/whatsapp';
import { ARABIC_WEEKDAYS, getTodayArabicWeekday } from '../../mock/initialData';

interface EditStudentModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  onClose,
}) => {
  const { teachers, updateStudent, deleteStudent, getReportStatusInfo, currentUser } = useApp();

  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [subscriptionFee, setSubscriptionFee] = useState(250);
  const [teacherCost, setTeacherCost] = useState(120);
  const [subscriptionDate, setSubscriptionDate] = useState('');
  const [lastReportDate, setLastReportDate] = useState('');
  const [surahProgress, setSurahProgress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [selectedDays, setSelectedDays] = useState<string[]>(['الأحد', 'الثلاثاء', 'الخميس']);
  const [sessionTime, setSessionTime] = useState('04:30 م بتوقيت مكة');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const canViewFinancials = currentUser.role === 'manager' || currentUser.role === 'general_supervisor';

  useEffect(() => {
    if (student) {
      setName(student.name);
      setTeacherId(student.teacherId);
      setParentPhone(student.parentPhone);
      setSubscriptionFee(student.subscriptionFee);
      setTeacherCost(student.teacherCost ?? 120);
      setSubscriptionDate(student.subscriptionDate);
      setLastReportDate(student.lastReportDate);
      setSurahProgress(student.surahProgress);
      setNotes(student.notes || '');
      setStatus(student.status);
      setSelectedDays(student.scheduleDays && student.scheduleDays.length > 0 ? student.scheduleDays : [getTodayArabicWeekday()]);
      setSessionTime(student.sessionTime || '04:30 م بتوقيت مكة');
      setMeetingUrl(student.meetingUrl || '');
      setShowConfirmDelete(false);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const lastReportInfo = lastReportDate ? getReportStatusInfo(lastReportDate) : null;

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const setDaysAgoDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    setLastReportDate(`${year}-${month}-${day}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudent(student.id, {
      name: name.trim(),
      teacherId,
      parentPhone: parentPhone.trim(),
      subscriptionFee: canViewFinancials ? Number(subscriptionFee) : student.subscriptionFee,
      teacherCost: canViewFinancials ? Number(teacherCost) : student.teacherCost,
      subscriptionDate,
      lastReportDate,
      surahProgress,
      notes,
      status,
      scheduleDays: selectedDays,
      sessionTime: sessionTime.trim(),
      meetingUrl: meetingUrl.trim() || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    deleteStudent(student.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#bec8c8]/20 overflow-hidden flex flex-col text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#bec8c8]/20 flex items-center justify-between bg-[#f0f3ff]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#005253]/10 text-[#005253] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">edit</span>
            </span>
            <span className="font-bold text-base text-[#111c2d]">تعديل بيانات الطالب والجدول</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6f7979] hover:bg-[#dee8ff] cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-sm max-h-[82vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">اسم الطالب</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                المعلم المسؤول
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none cursor-pointer"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#111c2d]">
                  رقم ولي الأمر
                </label>
                {parentPhone && (
                  <a
                    href={getParentWhatsAppUrl(parentPhone, name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#005253] text-[11px] font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">chat</span>
                    <span>واتساب</span>
                  </a>
                )}
              </div>
              <input
                type="tel"
                required
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none font-mono dir-ltr"
              />
            </div>
          </div>

          {/* Schedule days */}
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              أيام الحصص في الأسبوع
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ARABIC_WEEKDAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#005253] text-white shadow-xs'
                        : 'bg-[#f0f3ff] text-[#3f4949] hover:bg-[#dee8ff]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Time & Meeting Zoom link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                توقيت الحصة (بتوقيت مكة)
              </label>
              <input
                type="text"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                placeholder="مثال: 04:30 م بتوقيت مكة"
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                رابط غرفة الزووم / التسميع
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none font-mono dir-ltr"
              />
            </div>
          </div>

          {/* Financial fields ONLY shown for manager and general_supervisor */}
          {canViewFinancials && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200">
              <div>
                <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                  قيمة الاشتراك الشهري (ر.س)
                </label>
                <input
                  type="number"
                  min="0"
                  value={subscriptionFee}
                  onChange={(e) => setSubscriptionFee(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-white text-[#111c2d] font-semibold focus:outline-none border border-emerald-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                  مصروفات المعلم (ر.س)
                </label>
                <input
                  type="number"
                  min="0"
                  value={teacherCost}
                  onChange={(e) => setTeacherCost(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-white text-[#111c2d] font-semibold focus:outline-none border border-emerald-300"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                حالة الاشتراك
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none cursor-pointer font-semibold"
              >
                <option value="active">نشط</option>
                <option value="vacation">في إجازة</option>
                <option value="expired">منتهي</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#111c2d]">
                  تاريخ آخر تقرير
                </label>
                {lastReportInfo && (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      lastReportInfo.isOverdue
                        ? 'bg-[#ffdad6] text-[#ba1a1a]'
                        : 'bg-[#005253]/10 text-[#005253]'
                    }`}
                  >
                    {lastReportInfo.badgeText}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={lastReportDate}
                onChange={(e) => setLastReportDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none font-mono dir-ltr"
              />
              {/* Quick Preset Buttons for Testing */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setDaysAgoDate(0)}
                  className="px-2 py-0.5 rounded-md bg-[#005253]/10 text-[#005253] text-[10px] font-bold hover:bg-[#005253]/20 cursor-pointer"
                  title="ضبط تاريخ آخر تقرير على اليوم"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setDaysAgoDate(3)}
                  className="px-2 py-0.5 rounded-md bg-[#005253]/10 text-[#005253] text-[10px] font-bold hover:bg-[#005253]/20 cursor-pointer"
                  title="ضبط التاريخ على قبل 3 أيام"
                >
                  قبل 3 أيام
                </button>
                <button
                  type="button"
                  onClick={() => setDaysAgoDate(28)}
                  className="px-2 py-0.5 rounded-md bg-[#fde047] text-[#854d0e] text-[10px] font-bold hover:bg-[#fde047]/80 cursor-pointer"
                  title="اختبار تحذير: ضبط التاريخ على قبل 28 يوماً (>25 يوم)"
                >
                  قبل 28 يوماً
                </button>
                <button
                  type="button"
                  onClick={() => setDaysAgoDate(32)}
                  className="px-2 py-0.5 rounded-md bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold hover:bg-[#ffdad6]/80 cursor-pointer"
                  title="اختبار فوري: ضبط التاريخ على قبل 32 يوماً (>30 يوم متأخر)"
                >
                  قبل 32 يوماً (متأخر)
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              الحلقة ومسار التسميع
            </label>
            <input
              type="text"
              value={surahProgress}
              onChange={(e) => setSurahProgress(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">الملاحظات</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none"
            />
          </div>

          {/* Delete confirmation section */}
          {showConfirmDelete ? (
            <div className="p-3 bg-[#ffdad6] rounded-xl flex items-center justify-between text-[#93000a] text-xs">
              <span>هل أنت متأكد من حذف هذا الطالب نهائياً؟</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1 bg-[#ba1a1a] text-white rounded-lg font-bold hover:bg-[#93000a] cursor-pointer"
                >
                  نعم، احذف
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-2 py-1 text-[#3f4949] font-bold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="text-[#ba1a1a] text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>حذف الطالب من النظام</span>
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-[#bec8c8]/20 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#dee8ff] text-[#3f4949] font-bold hover:bg-[#d8e3fb] cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#005253] text-white font-bold hover:bg-[#186b6d] shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
