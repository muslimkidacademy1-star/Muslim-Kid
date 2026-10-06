import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddTeacherModal: React.FC<AddTeacherModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addTeacher, supervisors, currentUser } = useApp();

  const [name, setName] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [monthlySalary, setMonthlySalary] = useState(1500);
  const [phone, setPhone] = useState('');
  const [circleName, setCircleName] = useState('');
  const [track, setTrack] = useState('مسار التلقين وتأسيس التلاوة');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      setName('');
      // Default to current user if sub_supervisor, otherwise first supervisor
      const defaultSupervisor =
        currentUser.role === 'sub_supervisor'
          ? currentUser.id
          : supervisors.find((s) => s.role === 'sub_supervisor')?.id || supervisors[0]?.id || '';
      setSupervisorId(defaultSupervisor);
      setMonthlySalary(1500);
      setPhone('');
      setCircleName('');
      setTrack('مسار التلقين وتأسيس التلاوة');
      setNotes('');
      setError(null);
    }
  }, [isOpen, supervisors, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى كتابة اسم المعلم');
      return;
    }
    if (!supervisorId) {
      setError('يرجى اختيار المشرف المسؤول');
      return;
    }

    addTeacher({
      name: name.trim(),
      supervisorId,
      monthlySalary: Number(monthlySalary) || 1500,
      phone: phone.trim() || '0500000000',
      circleName: circleName.trim() || `حلقة ${name.trim()}`,
      track: track.trim() || 'مسار القرآن الكريم',
      status: 'active',
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
      {/* Modal Dialog */}
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border-t sm:border border-gray-100 flex flex-col max-h-[90vh] h-[90vh] sm:h-auto z-10 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">إضافة معلم / محفظ جديد</h2>
              <p className="text-xs text-[#EAF5F7] mt-0.5 truncate">
                تسجيل المعلم في المنظومة وإسناده للمشرف المباشر
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Teacher Name */}
          <div>
            <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
              اسم المعلم / الشيخ <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="مثال: الشيخ عبد الله الراشد"
                className="w-full h-11 px-3.5 pl-10 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-sm border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] font-medium"
              />
              <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg pointer-events-none">
                badge
              </span>
            </div>
          </div>

          {/* Supervisor Selection */}
          <div>
            <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
              المشرف المسؤول <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                disabled={currentUser.role === 'sub_supervisor'}
                className="w-full h-11 px-3.5 pl-10 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.title} • {s.department})
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg pointer-events-none">
                supervisor_account
              </span>
            </div>
            {currentUser.role === 'sub_supervisor' && (
              <p className="text-[11px] text-[#125862] mt-1 font-medium">
                * يتم إسناد المعلم تلقائياً إلى إشرافك المباشر نظراً لصلاحيتك كمشرف فرعي.
              </p>
            )}
          </div>

          {/* Monthly Salary & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
                المصروفات الشهرية (المستحقات) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(Number(e.target.value))}
                  className="w-full h-11 px-3.5 pl-12 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-sm font-bold border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88]"
                />
                <span className="absolute left-3 top-3 text-xs text-gray-500 font-medium">
                  ر.س
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
                رقم هاتف المعلم (واتساب) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full h-11 px-3.5 pl-10 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-sm text-right border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] font-medium"
                />
                <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg pointer-events-none">
                  phone_iphone
                </span>
              </div>
            </div>
          </div>

          {/* Circle Name & Track */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
                اسم الحلقة القرآنية
              </label>
              <input
                type="text"
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                placeholder="مثال: حلقة الفرقان"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-sm border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
                المسار الأكاديمي والتخصص
              </label>
              <input
                type="text"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                placeholder="مثال: مسار التلقين وجزء عمّ"
                className="w-full h-11 px-3.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-sm border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#1D1D1F] mb-1.5">
              ملاحظات إدارية / إشرافية
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول أوقات التسميع أو التزامات المعلم..."
              className="w-full p-3.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-sm border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 focus:border-[#1A7B88] resize-none font-medium"
            />
          </div>

          {/* Footer Actions */}
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
              className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-[#1A7B88] text-white font-bold hover:bg-[#125862] shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs min-h-[44px]"
            >
              <span className="material-symbols-outlined text-lg">check</span>
              <span>حفظ وإضافة المعلم</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
