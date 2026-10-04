import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SubscriptionStatus } from '../../types';
import { ARABIC_WEEKDAYS, getTodayArabicWeekday } from '../../mock/initialData';
import { formatTimeTo12h } from './QuickAddStudentModal';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose }) => {
  const { visibleTeachers, addStudent, currentUser } = useApp();

  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState(visibleTeachers[0]?.id || '');
  const [countryCode, setCountryCode] = useState('+20');
  const [localPhone, setLocalPhone] = useState('');

  // Financial fields
  const [currency, setCurrency] = useState<'SAR' | 'EGP'>('EGP');
  const [subscriptionFee, setSubscriptionFee] = useState<number>(300);
  const [teacherCompType, setTeacherCompType] = useState<'fixed' | 'percentage'>('fixed');
  const [teacherFixedCost, setTeacherFixedCost] = useState<number>(150);
  const [teacherCompPercentage, setTeacherCompPercentage] = useState<number>(50);

  const calculatedTeacherCost =
    teacherCompType === 'percentage'
      ? Math.round((subscriptionFee * teacherCompPercentage) / 100)
      : teacherFixedCost;

  const [subscriptionDate, setSubscriptionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [lastReportDate, setLastReportDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [surahProgress, setSurahProgress] = useState('جزء عمّ • التلقين والتأسيس');
  const [notes, setNotes] = useState('طالب جديد - تم تسجيله بنجاح');
  const [status, setStatus] = useState<SubscriptionStatus>('active');

  // Schedule Days & Custom Day-by-Day Time (Cairo Timezone)
  const initialDay = getTodayArabicWeekday();
  const [selectedDays, setSelectedDays] = useState<string[]>([initialDay, 'الثلاثاء', 'الخميس']);
  const [dayTimes, setDayTimes] = useState<Record<string, string>>({
    [initialDay]: '15:00',
    'الثلاثاء': '16:00',
    'الخميس': '16:00',
  });
  const [sessionDuration, setSessionDuration] = useState<number>(45);
  const [packageSessionsCount, setPackageSessionsCount] = useState<number>(8);

  const canViewFinancials = currentUser.role === 'manager' || currentUser.role === 'general_supervisor';

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTeacherId(visibleTeachers[0]?.id || '');
      setCountryCode('+20');
      setLocalPhone('');
      setSubscriptionFee(300);
      setTeacherFixedCost(150);
      setTeacherCompType('fixed');
      setTeacherCompPercentage(50);
      const today = new Date().toISOString().slice(0, 10);
      setSubscriptionDate(today);
      setLastReportDate(today);
      setSurahProgress('جزء عمّ • التلقين والتأسيس');
      setNotes('');
      setStatus('active');
      const startD = getTodayArabicWeekday();
      setSelectedDays([startD, 'الثلاثاء', 'الخميس']);
      setDayTimes({
        [startD]: '15:00',
        'الثلاثاء': '16:00',
        'الخميس': '16:00',
      });
      setSessionDuration(45);
      setPackageSessionsCount(8);
    }
  }, [isOpen, visibleTeachers]);

  if (!isOpen) return null;

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
      teacherId: teacherId || visibleTeachers[0]?.id || '',
      parentPhone: finalPhone,
      subscriptionFee: Number(subscriptionFee) || 0,
      currency,
      teacherCost: Number(calculatedTeacherCost) || 0,
      teacherCostType: teacherCompType,
      teacherCostPercentage: teacherCompType === 'percentage' ? teacherCompPercentage : undefined,
      subscriptionDate,
      lastReportDate: lastReportDate || subscriptionDate,
      status,
      surahProgress: surahProgress.trim() || 'حلقة القرآن الكريم',
      notes: notes.trim(),
      scheduleDays: selectedDays.length > 0 ? selectedDays : [getTodayArabicWeekday()],
      sessionTime: sessionTimeString,
      daySchedule: formattedDaySchedule,
      sessionDuration,
      packageSessionsCount,
      currentCycleSessionsCount: 0,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-[#bec8c8]/30 overflow-hidden flex flex-col text-right my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#bec8c8]/20 flex items-center justify-between bg-linear-to-r from-[#005253] to-[#003738] text-white">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </span>
            <div>
              <h3 className="font-bold text-base sm:text-lg">تسجيل طالب جديد وجدولة الحصص</h3>
              <p className="text-xs text-[#a6eff1]">
                ربط بالحلقات ومواعيد الحصص بتوقيت القاهرة
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-4 text-sm max-h-[82vh] overflow-y-auto">
          {/* Section 1: Basic Info */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                المعلم المسؤول والحلقة <span className="text-[#ba1a1a]">*</span>
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-bold border border-transparent focus:ring-2 focus:ring-[#005253]/30 cursor-pointer"
              >
                {visibleTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.circleName})
                  </option>
                ))}
              </select>
            </div>

            {/* Parent Phone with Country Code */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                رقم ولي الأمر (واتساب مباشر) <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-11 px-2.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs font-bold border border-transparent focus:ring-2 focus:ring-[#005253]/30 cursor-pointer"
                  dir="ltr"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <input
                    type="tel"
                    required
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    placeholder="010XXXXXXXX أو 05XXXXXXXX"
                    className="w-full h-11 pr-9 pl-3 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent font-mono dir-ltr"
                  />
                  <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#25D366] text-base pointer-events-none">
                    chat
                  </span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-[#bec8c8]/20 my-0.5" />

          {/* Section 2: Schedule & Custom Time per Day */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#111c2d]">
                أيام الحصص الأسبوعية
              </label>
              <span className="text-[11px] font-bold text-[#005253] bg-[#e7eeff] px-2 py-0.5 rounded-lg">
                التوقيت المعتمد: بتوقيت القاهرة 🇪🇬
              </span>
            </div>

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

            {selectedDays.length > 0 && (
              <div className="bg-[#f0f9ff] p-3.5 rounded-2xl border border-[#bae6fd]/60 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#0369a1] pb-1 border-b border-[#bae6fd]/40">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#0284c7]">schedule</span>
                    <span>حدد توقيت كل يوم على حدة (بتوقيت القاهرة):</span>
                  </span>
                  <span className="text-[11px] text-[#0284c7] font-semibold">
                    {selectedDays.length} أيام محددة
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedDays.map((day) => (
                    <div
                      key={day}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-[#bae6fd]/50 shadow-2xs"
                    >
                      <span className="font-bold text-xs text-[#111c2d] min-w-16">
                        {day}:
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={dayTimes[day] || '16:00'}
                          onChange={(e) => handleDayTimeChange(day, e.target.value)}
                          className="h-8 px-2 rounded-lg bg-[#f0f3ff] text-xs font-mono font-bold text-[#005253] border border-transparent focus:ring-1 focus:ring-[#005253] cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-[#005253] min-w-14 text-left">
                          {formatTimeTo12h(dayTimes[day] || '16:00')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session Duration Selector */}
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                مدة الحصة
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSessionDuration(mins)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      sessionDuration === mins
                        ? 'bg-[#005253] text-white shadow-xs ring-1 ring-[#005253]'
                        : 'bg-[#f0f3ff] text-[#3f4949] hover:bg-[#dee8ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">timer</span>
                    <span>{mins} دقيقة</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Package Sessions Count Selector (8 / 12 / 16 / 24 حصة) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#111c2d]">
                  إجمالي حصص الباقة الشهرية
                </label>
                <span className="text-[11px] font-bold text-[#005253] bg-[#e7eeff] px-2 py-0.5 rounded-lg">
                  دورة الـ {packageSessionsCount} حصص
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[8, 12, 16, 24].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPackageSessionsCount(count)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      packageSessionsCount === count
                        ? 'bg-[#005253] text-white shadow-xs ring-1 ring-[#005253]'
                        : 'bg-[#f0f3ff] text-[#3f4949] hover:bg-[#dee8ff]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">auto_stories</span>
                    <span>{count} حصة</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className="border-[#bec8c8]/20 my-0.5" />

          {/* Section 3: Financials */}
          <div className="bg-[#fcfbf7] p-4 rounded-2xl border border-amber-200/60 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1 border-b border-amber-200/50">
              <span className="font-bold text-xs text-[#7d5800] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#b45309]">payments</span>
                <span>البيانات المالية للطالب والمعلم</span>
              </span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-amber-200 text-xs">
                <button
                  type="button"
                  onClick={() => setCurrency('EGP')}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    currency === 'EGP' ? 'bg-[#005253] text-white' : 'text-gray-600'
                  }`}
                >
                  ج.م 🇪🇬
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('SAR')}
                  className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                    currency === 'SAR' ? 'bg-[#005253] text-white' : 'text-gray-600'
                  }`}
                >
                  ر.س 🇸🇦
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                  قيمة الاشتراك الشهري للطالب ({currency === 'SAR' ? 'ر.س' : 'ج.م'}) <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={subscriptionFee}
                  onChange={(e) => setSubscriptionFee(Number(e.target.value))}
                  placeholder="300"
                  className="w-full h-11 px-3.5 rounded-xl bg-white text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-amber-200 font-bold font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#111c2d]">
                    مستحقات المعلم من هذا الطالب
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTeacherCompType('fixed')}
                      className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                        teacherCompType === 'fixed' ? 'bg-[#005253] text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      مبلغ ثابت
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeacherCompType('percentage')}
                      className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                        teacherCompType === 'percentage' ? 'bg-[#005253] text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      نسبة مئوية %
                    </button>
                  </div>
                </div>

                {teacherCompType === 'fixed' ? (
                  <input
                    type="number"
                    min="0"
                    value={teacherFixedCost}
                    onChange={(e) => setTeacherFixedCost(Number(e.target.value))}
                    placeholder="150"
                    className="w-full h-11 px-3.5 rounded-xl bg-white text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-amber-200 font-bold font-mono"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={teacherCompPercentage}
                      onChange={(e) => setTeacherCompPercentage(Number(e.target.value))}
                      placeholder="50"
                      className="w-24 h-11 px-3.5 rounded-xl bg-white text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-amber-200 font-bold font-mono"
                    />
                    <span className="text-xs font-bold text-gray-600">% =</span>
                    <span className="flex-1 px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 font-bold font-mono text-xs border border-emerald-200">
                      {calculatedTeacherCost} {currency === 'SAR' ? 'ر.س' : 'ج.م'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Progress & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                مسار التسميع والمنهج
              </label>
              <input
                type="text"
                value={surahProgress}
                onChange={(e) => setSurahProgress(e.target.value)}
                placeholder="مثال: جزء عمّ • التلقين والتأسيس"
                className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
                تاريخ بدء الاشتراك
              </label>
              <input
                type="date"
                value={subscriptionDate}
                onChange={(e) => setSubscriptionDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent font-mono dir-ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              ملاحظات إدارية
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تم إرسال كتاب القاعدة النورانية لولي الأمر"
              className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 border border-transparent"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#dee8ff] text-[#3f4949] font-bold hover:bg-[#d8e3fb] transition-colors cursor-pointer text-xs"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#005253] text-white font-bold hover:bg-[#186b6d] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>تسجيل وحفظ الطالب</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
