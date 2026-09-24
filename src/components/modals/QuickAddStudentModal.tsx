import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ARABIC_WEEKDAYS, getTodayArabicWeekday } from '../../mock/initialData';

interface QuickAddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  circleName?: string;
}

export const QuickAddStudentModal: React.FC<QuickAddStudentModalProps> = ({
  isOpen,
  onClose,
  teacherId,
  circleName,
}) => {
  const { addStudent } = useApp();

  const [name, setName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedDays, setSelectedDays] = useState<string[]>([getTodayArabicWeekday(), 'الثلاثاء', 'الخميس']);
  const [sessionTime, setSessionTime] = useState('04:30 م بتوقيت مكة');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !parentPhone.trim()) return;

    addStudent({
      name: name.trim(),
      teacherId,
      parentPhone: parentPhone.trim(),
      subscriptionFee: 250,
      teacherCost: 120,
      subscriptionDate: startDate,
      lastReportDate: startDate,
      status: 'active',
      surahProgress: 'حلقة القرآن الكريم • مرحلة التأسيس والتلقين',
      notes: notes.trim() || 'طالب جديد بالحلقة',
      scheduleDays: selectedDays.length > 0 ? selectedDays : [getTodayArabicWeekday()],
      sessionTime: sessionTime.trim() || '04:30 م بتوقيت مكة',
      meetingUrl: meetingUrl.trim() || undefined,
      currentCycleSessionsCount: 0,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#bec8c8]/20 overflow-hidden flex flex-col text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#bec8c8]/20 flex items-center justify-between bg-[#005253] text-white">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">person_add</span>
            </span>
            <div>
              <h3 className="font-bold text-base">إضافة طالب جديد للحلقة ومواعيد الحصص</h3>
              <p className="text-xs text-[#a6eff1]">
                {circleName || 'حلقة القرآن الكريم'} • إسناد فوري لجدولك
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

        {/* Quick Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-sm max-h-[80vh] overflow-y-auto">
          {/* Student Name */}
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              اسم الطالب الكامل <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: يوسف خالد الدوسري"
              className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent"
            />
          </div>

          {/* Parent Phone */}
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              رقم هاتف ولي الأمر <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              type="tel"
              required
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="+966 50 123 4567"
              className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent font-mono dir-ltr"
            />
          </div>

          {/* Schedule Days */}
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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

          {/* Session Time & Zoom Link */}
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
                className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent"
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
                className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent font-mono dir-ltr"
              />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              تاريخ البدء في الحلقة
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent font-mono dir-ltr"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              ملاحظات
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: مستوى تأسيس ممتاز، يبدأ من سورة النبأ..."
              className="w-full p-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent resize-none"
            />
          </div>

          {/* Information box */}
          <div className="p-3 rounded-xl bg-[#f0fdf4] border border-[#86efac]/40 text-xs text-[#166534] flex items-start gap-2">
            <span className="material-symbols-outlined text-base text-[#16a34a] mt-0.5">
              event_available
            </span>
            <span>
              سيتم إدراج الطالب فوراً في جدول حصصك الأسبوعي وفي كارت "حصص اليوم" في الأيام المحددة.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#dee8ff] text-[#3f4949] font-bold hover:bg-[#d8e3fb] transition-colors cursor-pointer text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#005253] text-white font-bold hover:bg-[#186b6d] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>إضافة الطالب وجدولة الحصص</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
