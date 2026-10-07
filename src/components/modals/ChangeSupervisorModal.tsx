import React, { useState } from 'react';
import { Teacher, Supervisor } from '../../types';
import { useApp } from '../../context/AppContext';

interface ChangeSupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  onSuccess?: () => void;
}

export const ChangeSupervisorModal: React.FC<ChangeSupervisorModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onSuccess,
}) => {
  const { supervisors, teachers, reassignTeacherSupervisor } = useApp();

  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfirmStep, setIsConfirmStep] = useState(false);

  // Available supervisors for reassignment: Sub-supervisors & General supervisors
  const eligibleSupervisors = supervisors.filter(
    (s) => s.role === 'sub_supervisor' || s.role === 'general_supervisor'
  );

  // Current supervisor of the teacher
  const currentSupervisor = teacher
    ? supervisors.find((s) => s.id === teacher.supervisorId)
    : null;

  // Newly selected supervisor
  const targetSupervisor = supervisors.find((s) => s.id === selectedSupervisorId);

  // Track check
  const teacherTrack = teacher?.track || 'عام';
  const supervisorTrack = targetSupervisor?.department || targetSupervisor?.roleLabel || '';

  // Count how many teachers the target supervisor already has
  const targetSupervisorLoad = targetSupervisor
    ? teachers.filter((t) => t.supervisorId === targetSupervisor.id).length
    : 0;

  React.useEffect(() => {
    if (isOpen && teacher) {
      setSelectedSupervisorId(teacher.supervisorId || '');
      setErrorMsg(null);
      setIsConfirmStep(false);
      setIsSubmitting(false);
    }
  }, [isOpen, teacher]);

  if (!isOpen || !teacher) return null;

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupervisorId) {
      setErrorMsg('يرجى اختيار المشرف الجديد');
      return;
    }
    if (selectedSupervisorId === teacher.supervisorId) {
      setErrorMsg('المشرف المختار هو المشرف الحالي نفسه للمعلم');
      return;
    }
    setErrorMsg(null);
    setIsConfirmStep(true);
  };

  const handleConfirmReassign = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await reassignTeacherSupervisor(teacher.id, selectedSupervisorId);
    setIsSubmitting(false);

    if (result.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMsg(result.error || 'فشل تحديث ارتباط المشرف، يرجى المحاولة لاحقاً');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border-t sm:border border-gray-100 flex flex-col max-h-[92vh] z-10 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-2xl">supervisor_account</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">
                {isConfirmStep ? 'تأكيد تغيير المشرف المسؤول' : 'تغيير المشرف المسؤول للمعلم'}
              </h2>
              <p className="text-xs text-[#EAF5F7] mt-0.5 truncate">
                تعديل إسناد المعلم في الهيئة الإشرافية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 text-[#1D1D1F]">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in shadow-2xs">
              <span className="material-symbols-outlined text-xl text-rose-600 shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Teacher Summary Card */}
          <div className="p-4 bg-[#F5F5F7] rounded-2xl border border-gray-200/80 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#1A7B88] text-white font-bold flex items-center justify-center text-base shadow-2xs shrink-0">
              {teacher.initials}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base text-[#1D1D1F] truncate">{teacher.name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600">
                <span className="inline-flex items-center gap-1 font-semibold text-[#125862]">
                  <span className="material-symbols-outlined text-sm">circle</span>
                  {teacher.circleName}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-600">{teacher.track}</span>
              </div>
            </div>
          </div>

          {!isConfirmStep ? (
            /* Step 1: Select New Supervisor */
            <form onSubmit={handleProceedToConfirm} className="flex flex-col gap-4">
              {/* Current Supervisor Indicator */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  المشرف المسؤول الحالي
                </label>
                <div className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-gray-500 text-lg">badge</span>
                    <span className="font-bold text-[#1D1D1F]">
                      {currentSupervisor ? currentSupervisor.name : '⚠️ غير مرتبط بأي مشرف'}
                    </span>
                  </div>
                  {currentSupervisor && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                      {currentSupervisor.title}
                    </span>
                  )}
                </div>
              </div>

              {/* New Supervisor Select */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  اختر المشرف الجديد <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedSupervisorId}
                    onChange={(e) => {
                      setSelectedSupervisorId(e.target.value);
                      setErrorMsg(null);
                    }}
                    required
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 focus:border-[#1A7B88] transition-all cursor-pointer"
                  >
                    <option value="" disabled>
                      -- اختر المشرف من القائمة --
                    </option>
                    {eligibleSupervisors.map((s) => {
                      const count = teachers.filter((t) => t.supervisorId === s.id).length;
                      const isCurrent = s.id === teacher.supervisorId;
                      return (
                        <option key={s.id} value={s.id} disabled={isCurrent}>
                          {s.name} ({s.title}) {isCurrent ? '- المشرف الحالي' : `- يدير ${count} معلماً`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                {eligibleSupervisors.length === 0 && (
                  <p className="text-xs text-rose-600 mt-1 font-semibold">
                    لا يوجد مشرفون مسجلون في النظام. يرجى إضافة مشرف أولاً.
                  </p>
                )}
              </div>

              {/* Data Safety Assurance Box */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5 leading-relaxed">
                <span className="material-symbols-outlined text-lg text-emerald-700 shrink-0 mt-0.5">
                  verified_user
                </span>
                <div>
                  <p className="font-bold mb-0.5">حماية كاملة لبيانات الطلاب والحصص</p>
                  <p className="text-emerald-800/90 text-[11px]">
                    تغيير المشرف يُحدّث جهة المتابعة الإشرافية فقط في قاعدة البيانات. تظل جميع حلقات المعلم، وطلابه، وسجلات الحصص، والتقارير المعتمدة مرتبطة بالمعلم دون أي حذف أو تأثير.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!selectedSupervisorId || selectedSupervisorId === teacher.supervisorId}
                  className="min-h-[42px] px-5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-98"
                >
                  <span>متابعة للمراجعة</span>
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Final Confirmation */
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs sm:text-sm text-amber-900 flex flex-col gap-3">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <span className="material-symbols-outlined text-xl text-amber-600">help</span>
                  <span>مراجعة وتأكيد عملية النقل</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white/80 p-3 rounded-xl border border-amber-200/60">
                  <div>
                    <span className="text-gray-500 block mb-0.5">من المشرف الحالي:</span>
                    <span className="font-bold text-rose-700">
                      {currentSupervisor ? currentSupervisor.name : 'غير محدد'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-0.5">إلى المشرف الجديد:</span>
                    <span className="font-bold text-emerald-700">
                      {targetSupervisor ? targetSupervisor.name : 'غير محدد'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-amber-800 leading-relaxed">
                  عند التأكيد، سيتم تحديث حقل <code className="bg-amber-100 px-1 rounded font-mono">supervisor_id</code> في جدول <code className="bg-amber-100 px-1 rounded font-mono">teachers</code> في قاعدة بيانات Supabase فوراً، وتسجيل العملية في سجل النشاط.
                </p>
              </div>

              {/* Confirm Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsConfirmStep(false)}
                  disabled={isSubmitting}
                  className="min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  الرجوع لتعديل الاختيار
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReassign}
                  disabled={isSubmitting}
                  className="min-h-[42px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>جاري حفظ التعديل...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>تأكيد النقل الآن</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
