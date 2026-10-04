import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ARABIC_WEEKDAYS, getTodayArabicWeekday } from '../../mock/initialData';

interface QuickAddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  circleName?: string;
}

const COUNTRY_CODES = [
  { code: '+20', country: 'مصر', flag: '🇪🇬' },
  { code: '+966', country: 'السعودية', flag: '🇸🇦' },
  { code: '+971', country: 'الإمارات', flag: '🇦🇪' },
  { code: '+965', country: 'الكويت', flag: '🇰🇼' },
  { code: '+974', country: 'قطر', flag: '🇶🇦' },
  { code: '+968', country: 'عُمان', flag: '🇴🇲' },
  { code: '+973', country: 'البحرين', flag: '🇧🇭' },
  { code: '+962', country: 'الأردن', flag: '🇯🇴' },
  { code: '+', country: 'دولي آخر', flag: '🌐' },
];

export function formatTimeTo12h(timeStr: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('ص') || timeStr.includes('م')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const min = parts[1];
  const period = hour >= 12 ? 'م' : 'ص';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
  return `${hourStr}:${min} ${period}`;
}

export const QuickAddStudentModal: React.FC<QuickAddStudentModalProps> = ({
  isOpen,
  onClose,
  teacherId,
  circleName,
}) => {
  const { addStudent } = useApp();

  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [localPhone, setLocalPhone] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  // Schedule Days & Custom Day-by-Day Time (Cairo Timezone)
  const initialDay = getTodayArabicWeekday();
  const [selectedDays, setSelectedDays] = useState<string[]>([initialDay, 'الثلاثاء', 'الخميس']);
  const [dayTimes, setDayTimes] = useState<Record<string, string>>({
    [initialDay]: '15:00',
    'الثلاثاء': '16:00',
    'الخميس': '16:00',
  });
  const [sessionDuration, setSessionDuration] = useState<number>(45); // 30, 45, 60 minutes
  const [packageSessionsCount, setPackageSessionsCount] = useState<number>(8); // 8, 12, 16, 24 sessions
  const [notes, setNotes] = useState('');

  // Financial fields: Strictly Teacher Compensation (Student total fee is reserved for Academy Administration)
  const [currency, setCurrency] = useState<'SAR' | 'EGP'>('EGP');
  const [teacherCompType, setTeacherCompType] = useState<'fixed' | 'percentage'>('fixed');
  const [teacherFixedCost, setTeacherFixedCost] = useState<number>(150);
  const [teacherCompPercentage, setTeacherCompPercentage] = useState<number>(50);

  const calculatedTeacherCost =
    teacherCompType === 'percentage'
      ? Math.round((300 * teacherCompPercentage) / 100)
      : teacherFixedCost;

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
      const newTimes = { ...dayTimes };
      delete newTimes[day];
      setDayTimes(newTimes);
    } else {
      setSelectedDays([...selectedDays, day]);
      setDayTimes((prev) => ({
        ...prev,
        [day]: prev[day] || '16:00',
      }));
    }
  };

  const handleDayTimeChange = (day: string, timeVal: string) => {
    setDayTimes((prev) => ({
      ...prev,
      [day]: timeVal,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !localPhone.trim()) return;

    // Clean and normalize phone number with selected country code
    let cleanLocal = localPhone.replace(/\D/g, '');
    if (cleanLocal.startsWith('0')) {
      cleanLocal = cleanLocal.substring(1);
    }
    const cleanCountry = countryCode.replace(/\D/g, '');
    let finalPhone = '';
    if (cleanLocal.startsWith(cleanCountry)) {
      finalPhone = `+${cleanLocal}`;
    } else {
      finalPhone = `${countryCode}${cleanLocal}`;
    }

    // Build human-readable formatted day schedule and sessionTime
    const formattedDaySchedule: Record<string, string> = {};
    const scheduleParts = selectedDays.map((day) => {
      const t12 = formatTimeTo12h(dayTimes[day] || '16:00');
      formattedDaySchedule[day] = t12;
      return `${day} ${t12}`;
    });

    const sessionTimeString =
      scheduleParts.length > 0
        ? `${scheduleParts.join(' • ')} (${sessionDuration} دقيقة - بتوقيت القاهرة)`
        : `04:00 م (${sessionDuration} دقيقة - بتوقيت القاهرة)`;

    addStudent({
      name: name.trim(),
      teacherId,
      parentPhone: finalPhone,
      subscriptionFee: 0, // Managed exclusively by Academy Administration
      currency,
      teacherCost: Number(calculatedTeacherCost) || 0,
      teacherCostType: teacherCompType,
      teacherCostPercentage: teacherCompType === 'percentage' ? teacherCompPercentage : undefined,
      subscriptionDate: startDate,
      lastReportDate: startDate,
      status: 'active',
      surahProgress: 'حلقة القرآن الكريم • مرحلة التأسيس والتلقين',
      notes: notes.trim() || 'طالب جديد بالحلقة',
      scheduleDays: selectedDays.length > 0 ? selectedDays : [getTodayArabicWeekday()],
      sessionTime: sessionTimeString,
      daySchedule: formattedDaySchedule,
      sessionDuration,
      packageSessionsCount,
      currentCycleSessionsCount: 0,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xl shadow-2xl border-t sm:border border-gray-100 overflow-hidden flex flex-col text-right max-h-[90vh] h-[90vh] sm:h-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Fixed Header (Dark Teal #125862) */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-white truncate">إضافة طالب جديد للحلقة</h3>
              <p className="text-xs text-[#EAF5F7] truncate">
                {circleName || 'حلقة القرآن الكريم'} • جدولة دقيقة بتوقيت القاهرة 🇪🇬
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
            {/* Section 1: Basic Student Information */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  اسم الطالب الكامل <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: يوسف خالد الدوسري"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200"
                />
              </div>

              {/* Parent Phone with Country Code Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  رقم هاتف ولي الأمر (واتساب نشط ومباشر) <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="flex items-center gap-2" dir="ltr">
                  {/* Country Selector */}
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-11 px-2.5 rounded-xl bg-[#F4F9FA] text-gray-800 text-xs font-bold border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 cursor-pointer shrink-0"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  {/* Phone input */}
                  <input
                    type="tel"
                    required
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    placeholder="1012345678 أو 501234567"
                    className="flex-1 h-11 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200 text-left"
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-100 my-0.5" />

            {/* Section 2: Days & Custom Time per Day (بتوقيت القاهرة) */}
            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-900">
                    أيام التسميع الأسبوعية <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-[#125862] bg-[#EAF5F7] px-2 py-0.5 rounded-lg border border-[#1A7B88]/20">
                    التوقيت المعتمد: بتوقيت القاهرة 🇪🇬
                  </span>
                </div>

                {/* Day selector pills */}
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
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Day-Specific Time Inputs */}
              {selectedDays.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#EAF5F7]/50 border border-[#1A7B88]/25 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#125862] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#1A7B88]">schedule</span>
                      <span>حدد وقت الحصة لكل يوم على حدة:</span>
                    </span>
                    <span className="text-[10px] text-[#125862] font-semibold">بتوقيت القاهرة</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDays.map((day) => (
                      <div
                        key={`time-${day}`}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 text-xs"
                      >
                        <span className="font-bold text-gray-800 shrink-0">{day}:</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={dayTimes[day] || '16:00'}
                            onChange={(e) => handleDayTimeChange(day, e.target.value)}
                            className="h-8 px-2 rounded-lg bg-[#F4F9FA] text-gray-900 font-mono text-xs font-bold border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#1A7B88] dir-ltr text-center"
                          />
                          <span className="text-[10px] text-gray-500 font-medium">
                            ({formatTimeTo12h(dayTimes[day] || '16:00')})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Duration Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  مدة الحصة
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 45, 60].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setSessionDuration(dur)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        sessionDuration === dur
                          ? 'bg-[#1A7B88] text-white shadow-xs'
                          : 'bg-[#F4F9FA] text-gray-700 hover:bg-[#EAF5F7] border border-gray-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">timer</span>
                      <span>{dur} دقيقة</span>
                    </button>
                  ))}
                </div>
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
            </div>

            <hr className="border-gray-100 my-0.5" />

            {/* Section 3: Teacher Financial Compensation (مستحقات المعلم فقط - حماية الخصوصية المالية) */}
            <div className="bg-[#fcfbf7] p-3.5 sm:p-4 rounded-2xl border border-amber-200/70 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-amber-200/50">
                <span className="font-bold text-xs text-[#7d5800] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#b45309]">payments</span>
                  <span>مستحقات المعلم من هذا الطالب</span>
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md font-medium">
                  حسابات المعلم المباشرة
                </span>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1">
                  عملة المستحقات
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrency('EGP')}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currency === 'EGP'
                        ? 'bg-[#1A7B88] text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    جنيه مصري (ج.م 🇪🇬)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('SAR')}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currency === 'SAR'
                        ? 'bg-[#1A7B88] text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    ريال سعودي (ر.س 🇸🇦)
                  </button>
                </div>
              </div>

              {/* Compensation Method: Fixed vs Percentage */}
              <div>
                <label className="block text-[11px] font-bold text-gray-800 mb-1">
                  طريقة احتساب مستحقات المعلم
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTeacherCompType('fixed')}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      teacherCompType === 'fixed'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    قيمة ثابتة للطالب
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherCompType('percentage')}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      teacherCompType === 'percentage'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    نسبة مئوية (%)
                  </button>
                </div>
              </div>

              {/* Amount input */}
              {teacherCompType === 'fixed' ? (
                <div>
                  <label className="block text-[11px] font-bold text-gray-800 mb-1">
                    المبلغ الثابت للمعلم شهرياً ({currency === 'SAR' ? 'ر.س' : 'ج.م'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={teacherFixedCost}
                    onChange={(e) => setTeacherFixedCost(Number(e.target.value))}
                    placeholder="150"
                    className="w-full h-10 px-3 rounded-xl bg-white text-gray-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 border border-amber-300 font-bold"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-gray-800">
                      نسبة المعلم من الاشتراك
                    </label>
                    <span className="text-[11px] font-mono font-bold text-amber-900">
                      {teacherCompPercentage}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={teacherCompPercentage}
                    onChange={(e) => setTeacherCompPercentage(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mt-1">
                    <span>10%</span>
                    <span>المستحق التقديري: {calculatedTeacherCost} {currency === 'SAR' ? 'ر.س' : 'ج.م'}</span>
                    <span>90%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Start Date & Optional Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  تاريخ بدء الحصص
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200 font-mono dir-ltr"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  ملاحظات
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: يفضل المتابعة من جزء عم"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200"
                />
              </div>
            </div>
          </div>

          {/* Fixed Footer Buttons */}
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
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>حفظ وجدولة مواعيد الحصص</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
