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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog */}
      <div
        className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#bec8c8]/30 flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-6 bg-linear-to-l from-[#005253] to-[#003738] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">إضافة معلم / محفظ جديد</h2>
              <p className="text-xs text-[#a6eff1] mt-0.5">
                تسجيل المعلم في المنظومة وإسناده للمشرف المباشر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-colors"
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
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              اسم المعلم / الشيخ <span className="text-[#ba1a1a]">*</span>
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
                className="w-full h-11 px-3 pl-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 font-medium"
              />
              <span className="material-symbols-outlined absolute left-3 top-3 text-[#6f7979] text-lg pointer-events-none">
                badge
              </span>
            </div>
          </div>

          {/* Supervisor Selection */}
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              المشرف المسؤول <span className="text-[#ba1a1a]">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                disabled={currentUser.role === 'sub_supervisor'}
                className="w-full h-11 px-3 pl-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#005253]/30 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed"
              >
                {supervisors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.title} • {s.department})
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute left-3 top-3 text-[#6f7979] text-lg pointer-events-none">
                supervisor_account
              </span>
            </div>
            {currentUser.role === 'sub_supervisor' && (
              <p className="text-[11px] text-[#005253] mt-1">
                * يتم إسناد المعلم تلقائياً إلى إشرافك المباشر نظراً لصلاحيتك كمشرف فرعي.
              </p>
            )}
          </div>

          {/* Monthly Salary & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                المصروفات الشهرية (المستحقات) <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  required
                  value={monthlySalary}
                  onChange={(e) => setMonthlySalary(Number(e.target.value))}
                  className="w-full h-11 px-3 pl-11 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
                />
                <span className="absolute left-3 top-3 text-xs text-[#6f7979] font-medium">
                  ر.س
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                رقم هاتف المعلم (واتساب) <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full h-11 px-3 pl-9 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#005253]/30 font-medium"
                />
                <span className="material-symbols-outlined absolute left-3 top-3 text-[#6f7979] text-lg pointer-events-none">
                  phone_iphone
                </span>
              </div>
            </div>
          </div>

          {/* Circle Name & Track */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                اسم الحلقة القرآنية
              </label>
              <input
                type="text"
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                placeholder="مثال: حلقة الفرقان"
                className="w-full h-11 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                المسار الأكاديمي والتخصص
              </label>
              <input
                type="text"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                placeholder="مثال: مسار التلقين وجزء عمّ"
                className="w-full h-11 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 font-medium"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              ملاحظات إدارية / إشرافية
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول أوقات التسميع أو التزامات المعلم..."
              className="w-full p-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 resize-none font-medium"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#bec8c8]/20 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#bec8c8]/40 text-[#3f4949] text-sm font-semibold hover:bg-[#f0f3ff] transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#005253] text-white text-sm font-bold shadow-md hover:bg-[#003e3f] active:scale-98 transition-all flex items-center gap-2"
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
