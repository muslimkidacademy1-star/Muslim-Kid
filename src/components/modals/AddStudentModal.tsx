import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SubscriptionStatus } from '../../types';
import { ARABIC_WEEKDAYS, getTodayArabicWeekday } from '../../mock/initialData';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose }) => {
  const { visibleTeachers, addStudent, currentUser } = useApp();

  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState(visibleTeachers[0]?.id || '');
  const [parentPhone, setParentPhone] = useState('');
  const [subscriptionFee, setSubscriptionFee] = useState(250);
  const [teacherCost, setTeacherCost] = useState(120);
  const [subscriptionDate, setSubscriptionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [lastReportDate, setLastReportDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [surahProgress, setSurahProgress] = useState('جزء عمّ • التلقين والتأسيس');
  const [notes, setNotes] = useState('طالب جديد - تم تسجيله بنجاح');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [selectedDays, setSelectedDays] = useState<string[]>([getTodayArabicWeekday(), 'الثلاثاء', 'الخميس']);
  const [sessionTime, setSessionTime] = useState('04:30 م بتوقيت مكة');
  const [meetingUrl, setMeetingUrl] = useState('');

  const canViewFinancials = currentUser.role === 'manager' || currentUser.role === 'general_supervisor';

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTeacherId(visibleTeachers[0]?.id || '');
      setParentPhone('');
      setSubscriptionFee(250);
      setTeacherCost(120);
      const today = new Date().toISOString().slice(0, 10);
      setSubscriptionDate(today);
      setLastReportDate(today);
      setSurahProgress('جزء عمّ • التلقين والتأسيس');
      setNotes('');
      setStatus('active');
      setSelectedDays([getTodayArabicWeekday(), 'الثلاثاء', 'الخميس']);
      setSessionTime('04:30 م بتوقيت مكة');
      setMeetingUrl('');
    }
  }, [isOpen, visibleTeachers]);

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
      teacherId: teacherId || visibleTeachers[0]?.id || '',
      parentPhone: parentPhone.trim(),
      subscriptionFee: canViewFinancials ? Number(subscriptionFee) || 0 : 250,
      teacherCost: canViewFinancials ? Number(teacherCost) || 0 : 120,
      subscriptionDate,
      lastReportDate: lastReportDate || subscriptionDate,
      status,
      surahProgress: surahProgress.trim() || 'حلقة القرآن الكريم',
      notes: notes.trim(),
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
        <div className="px-6 py-4 border-b border-[#bec8c8]/20 flex items-center justify-between bg-[#f0f3ff]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#005253]/10 text-[#005253] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">person_add</span>
            </span>
            <span className="font-bold text-base text-[#111c2d]">تسجيل طالب جديد وجدول الحصص</span>
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
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              اسم الطالب الكامل <span className="text-[#ba1a1a]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: يوسف خالد الدوسري"
              className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none focus:ring-2 focus:ring-[#005253]/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                المعلم المسؤول <span className="text-[#ba1a1a]">*</span>
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none cursor-pointer"
              >
                {visibleTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.circleName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                رقم ولي الأمر (واتساب) <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="tel"
                required
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none text-left dir-ltr"
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

          {/* Financials: Only for Manager & General Supervisor */}
          {canViewFinancials && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200">
              <div>
                <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                  قيمة الاشتراك الشهري (ر.س) <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={subscriptionFee}
                    onChange={(e) => setSubscriptionFee(Number(e.target.value))}
                    className="w-full h-10 px-3 pl-10 rounded-xl bg-white text-[#111c2d] font-semibold focus:outline-none border border-emerald-300"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-[#6f7979]">ر.س</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                  مصروفات المعلم (ر.س) <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={teacherCost}
                    onChange={(e) => setTeacherCost(Number(e.target.value))}
                    className="w-full h-10 px-3 pl-10 rounded-xl bg-white text-[#111c2d] font-semibold focus:outline-none border border-emerald-300"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-[#6f7979]">ر.س</span>
                </div>
              </div>
            </div>
          )}

          {/* Dates: Subscription Start & Last Report */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                تاريخ بدء الاشتراك <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="date"
                required
                value={subscriptionDate}
                onChange={(e) => {
                  setSubscriptionDate(e.target.value);
                  if (!lastReportDate || lastReportDate === subscriptionDate) {
                    setLastReportDate(e.target.value);
                  }
                }}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none focus:ring-2 focus:ring-[#005253]/30 font-mono dir-ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                تاريخ آخر تقرير (تسميع) <span className="text-[#ba1a1a]">*</span>
              </label>
              <input
                type="date"
                required
                value={lastReportDate}
                onChange={(e) => setLastReportDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none focus:ring-2 focus:ring-[#005253]/30 font-mono dir-ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              مسار الحفظ والتسميع
            </label>
            <input
              type="text"
              value={surahProgress}
              onChange={(e) => setSurahProgress(e.target.value)}
              placeholder="مثال: جزء عمّ، سورة البقرة..."
              className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              حالة الاشتراك
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              className="w-full h-10 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none cursor-pointer"
            >
              <option value="active">نشط</option>
              <option value="vacation">في إجازة</option>
              <option value="expired">منتهي</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">ملاحظات إدارية</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات حول مستوى الطالب أو الخطة الدراسية..."
              className="w-full p-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none resize-none"
            />
          </div>

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
              <span className="material-symbols-outlined text-lg">person_add</span>
              <span>تسجيل الطالب</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
