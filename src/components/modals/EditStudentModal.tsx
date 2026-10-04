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
  const [sessionTime, setSessionTime] = useState('04:00 م (بتوقيت القاهرة)');
  const [packageSessionsCount, setPackageSessionsCount] = useState<number>(8);
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
      setSessionTime(student.sessionTime || '04:00 م (بتوقيت القاهرة)');
      setPackageSessionsCount(student.packageSessionsCount || 8);
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
      packageSessionsCount,
    });
    onClose();
  };

  const handleDelete = () => {
    deleteStudent(student.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xl shadow-2xl border-t sm:border border-gray-100 overflow-hidden flex flex-col text-right max-h-[90vh] h-[90vh] sm:h-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Fixed Header (Dark Teal #125862) */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">edit_note</span>
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-white truncate">تعديل بيانات الطالب والجدول</h3>
              <p className="text-xs text-[#EAF5F7] truncate">
                تحديث بيانات الطالب والمواعيد وحالة الحساب
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

        {/* Form Body - Scrollable Area */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 text-sm overscroll-contain">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1.5">اسم الطالب <span className="text-[#ba1a1a]">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  المعلم المسؤول <span className="text-[#ba1a1a]">*</span>
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#F4F9FA] text-gray-900 text-xs font-bold border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 cursor-pointer"
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
                  <label className="block text-xs font-bold text-gray-900">
                    رقم ولي الأمر <span className="text-[#ba1a1a]">*</span>
                  </label>
                  {parentPhone && (
                    <a
                      href={getParentWhatsAppUrl(parentPhone, name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 text-[11px] font-bold hover:underline flex items-center gap-1"
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
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200 dir-ltr text-right"
                />
              </div>
            </div>

            {/* Schedule days */}
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1.5">
                أيام الحصص في الأسبوع
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {ARABIC_WEEKDAYS.map((day) => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-[#1A7B88] text-white shadow-xs ring-1 ring-[#125862]'
                          : 'bg-[#F4F9FA] text-gray-700 hover:bg-[#EAF5F7] border border-gray-200'
                      }`}
                    >
                      <span>{day}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Session Time */}
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1.5">
                مواعيد الحصة (بتوقيت القاهرة 🇪🇬)
              </label>
              <input
                type="text"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                placeholder="مثال: 04:00 م (بتوقيت القاهرة)"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200"
              />
            </div>

            {/* Package Sessions Count Selector (8 / 12 / 16 / 24 حصة) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#1A7B88]">view_timeline</span>
                  <span>إجمالي حصص الباقة (دورة الحساب):</span>
                </label>
                <span className="text-xs font-bold text-[#125862] bg-[#EAF5F7] px-2.5 py-1 rounded-lg border border-[#1A7B88]/20 shrink-0">
                  دورة الـ {packageSessionsCount} حصص
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[8, 12, 16, 24].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPackageSessionsCount(count)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[42px] ${
                      packageSessionsCount === count
                        ? 'bg-[#1A7B88] text-white shadow-xs ring-2 ring-[#125862]/30 scale-102 font-black'
                        : 'bg-[#EAF5F7] text-[#125862] hover:bg-[#d8eef2] border border-[#1A7B88]/20'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">auto_stories</span>
                    <span>{count} حصة</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Financial fields ONLY shown for manager and general_supervisor */}
            {canViewFinancials && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    قيمة الاشتراك الشهري (ر.س)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={subscriptionFee}
                    onChange={(e) => setSubscriptionFee(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-white text-gray-900 font-semibold focus:outline-none border border-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    مصروفات المعلم (ر.س)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={teacherCost}
                    onChange={(e) => setTeacherCost(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-white text-gray-900 font-semibold focus:outline-none border border-amber-300"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  حالة الاشتراك
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                  className="w-full h-11 px-3 rounded-xl bg-[#F4F9FA] text-gray-900 focus:outline-none cursor-pointer font-semibold text-xs border border-gray-200"
                >
                  <option value="active">نشط</option>
                  <option value="vacation">في إجازة</option>
                  <option value="expired">منتهي</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-900">
                    تاريخ آخر تقرير
                  </label>
                  {lastReportInfo && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        lastReportInfo.isOverdue
                          ? 'bg-[#ffdad6] text-[#ba1a1a]'
                          : 'bg-[#EAF5F7] text-[#125862]'
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
                  className="w-full h-11 px-3 rounded-xl bg-[#F4F9FA] text-gray-900 focus:outline-none font-mono dir-ltr border border-gray-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1.5">
                الحلقة ومسار التسميع
              </label>
              <input
                type="text"
                value={surahProgress}
                onChange={(e) => setSurahProgress(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 focus:outline-none border border-gray-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1.5">الملاحظات</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#F4F9FA] text-gray-900 focus:outline-none border border-gray-200 text-xs resize-none"
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
                    className="px-2 py-1 text-gray-700 font-bold cursor-pointer"
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
          </div>

          {/* Fixed Footer */}
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
              className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-[#1A7B88] text-white font-bold hover:bg-[#125862] transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-xs active:scale-98 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-base">save</span>
              <span>حفظ التعديلات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
