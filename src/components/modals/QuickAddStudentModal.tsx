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

  // Wizard Step (1, 2, or 3)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission & Confirmation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Step 1: Student Data
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [localPhone, setLocalPhone] = useState('');
  const [surahProgress, setSurahProgress] = useState('حلقة القرآن الكريم • مرحلة التأسيس والتلقين');

  // Step 2: Package & Schedule
  const [packageSessionsCount, setPackageSessionsCount] = useState<number>(8);
  const [sessionDuration, setSessionDuration] = useState<number>(45);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const initialDay = getTodayArabicWeekday();
  const [selectedDays, setSelectedDays] = useState<string[]>([initialDay, 'الثلاثاء', 'الخميس']);
  const [dayTimes, setDayTimes] = useState<Record<string, string>>({
    [initialDay]: '15:00',
    'الثلاثاء': '16:00',
    'الخميس': '16:00',
  });

  // Step 3: Compensation & Notes
  const [currency, setCurrency] = useState<'SAR' | 'EGP'>('EGP');
  const [teacherCompType, setTeacherCompType] = useState<'fixed' | 'percentage'>('fixed');
  const [teacherFixedCost, setTeacherFixedCost] = useState<number>(150);
  const [teacherCompPercentage, setTeacherCompPercentage] = useState<number>(50);
  const [notes, setNotes] = useState('');

  // Calculate estimated teacher compensation
  const calculatedTeacherCost =
    teacherCompType === 'percentage'
      ? Math.round((300 * teacherCompPercentage) / 100)
      : teacherFixedCost;

  // Has the form been touched by user?
  const isDirty = Boolean(name.trim() || localPhone.trim() || notes.trim());

  // Toggle selected day in schedule
  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
      setDayTimes((prev) => ({
        ...prev,
        [day]: prev[day] || '16:00',
      }));
    }
    if (errors.days) {
      setErrors((prev) => ({ ...prev, days: '' }));
    }
  };

  const handleDayTimeChange = (day: string, timeVal: string) => {
    setDayTimes((prev) => ({
      ...prev,
      [day]: timeVal,
    }));
  };

  // Helper to normalize phone
  const getFullNormalizedPhone = () => {
    let cleanLocal = localPhone.replace(/\D/g, '');
    if (cleanLocal.startsWith('0')) {
      cleanLocal = cleanLocal.substring(1);
    }
    const cleanCountry = countryCode.replace(/\D/g, '');
    if (cleanLocal.startsWith(cleanCountry)) {
      return `+${cleanLocal}`;
    }
    return `${countryCode}${cleanLocal}`;
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'يرجى إدخال اسم الطالب الكامل';
    } else if (name.trim().length < 2) {
      errs.name = 'اسم الطالب يجب أن يكون حرفين على الأقل';
    }

    const cleanLocal = localPhone.replace(/\D/g, '');
    if (!cleanLocal) {
      errs.phone = 'يرجى إدخال رقم هاتف ولي الأمر';
    } else if (cleanLocal.length < 7) {
      errs.phone = 'رقم الهاتف قصير جداً، يرجى التأكد من صحة الرقم';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (selectedDays.length === 0) {
      errs.days = 'يرجى اختيار يوم واحد على الأقل للحصص الأسبوعية';
    }
    if (!startDate) {
      errs.startDate = 'يرجى تحديد تاريخ بدء الحصص';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        setStep(3);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setErrors({});
      setSubmitError(null);
      setStep((prev) => (prev - 1) as 1 | 2);
    }
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setName('');
    setLocalPhone('');
    setNotes('');
    setErrors({});
    setSubmitError(false as any);
    setShowDiscardConfirm(false);
    onClose();
  };

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const finalPhone = getFullNormalizedPhone();

      // Build daySchedule and sessionTime string
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

      await addStudent({
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
        surahProgress: surahProgress.trim() || 'حلقة القرآن الكريم • مرحلة التأسيس والتلقين',
        notes: notes.trim() || 'طالب جديد بالحلقة',
        scheduleDays: selectedDays.length > 0 ? selectedDays : [getTodayArabicWeekday()],
        sessionTime: sessionTimeString,
        daySchedule: formattedDaySchedule,
        sessionDuration,
        packageSessionsCount,
        currentCycleSessionsCount: 0,
      });

      resetAndClose();
    } catch (err: any) {
      console.error('Error saving student:', err);
      setSubmitError('عذراً، حدث خطأ أثناء حفظ بيانات الطالب. يرجى إعادة المحاولة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xl shadow-2xl border-t sm:border border-gray-100 overflow-hidden flex flex-col text-right max-h-[92vh] sm:max-h-[85vh] h-full sm:h-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Fixed Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-white truncate">إضافة طالب جديد للحلقة</h3>
              <p className="text-xs text-[#EAF5F7] truncate">
                {circleName || 'حلقة القرآن الكريم'} · مواعيد بتوقيت القاهرة 🇪🇬
              </p>
            </div>
          </div>
          <button
            onClick={handleAttemptClose}
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="bg-[#F4F9FA] px-4 py-2.5 border-b border-gray-200/80 shrink-0">
          <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-gray-700">
            <span className="text-[#125862] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#1A7B88]"></span>
              {step === 1 && 'الخطوة ١ من ٣: بيانات الطالب الأساسية'}
              {step === 2 && 'الخطوة ٢ من ٣: الباقة والمواعيد'}
              {step === 3 && 'الخطوة ٣ من ٣: المستحقات والمراجعة'}
            </span>
            <span className="text-gray-400 font-mono text-[11px]">{step}/3</span>
          </div>

          {/* Progress track */}
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden flex">
            <div
              className="bg-[#1A7B88] h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Discard Confirmation Banner */}
        {showDiscardConfirm && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-base text-amber-600">warning</span>
              <span>هل تريد إغلاق النموذج وتجاهل البيانات المدخلة؟</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                متابعة الإدخال
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors cursor-pointer"
              >
                تجاهل وإغلاق
              </button>
            </div>
          </div>
        )}

        {/* Global Submit Error Banner */}
        {submitError && (
          <div className="p-3.5 bg-red-50 border-b border-red-200 text-red-900 text-xs flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-base text-red-600">error</span>
              <span>{submitError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-red-700 hover:text-red-900 font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Form Body - Scrollable Area */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 text-sm overscroll-contain">
            {/* STEP 1: Student Information */}
            {step === 1 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                {/* Full Student Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    اسم الطالب الكامل <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="مثال: يوسف خالد الدوسري"
                    className={`w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border ${
                      errors.name ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                    }`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                {/* Parent WhatsApp Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    رقم واتساب ولي الأمر <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="flex items-center gap-2" dir="ltr">
                    {/* Country Selector */}
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="min-h-[44px] px-2.5 rounded-xl bg-[#F4F9FA] text-gray-800 text-xs font-bold border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 cursor-pointer shrink-0"
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
                      inputMode="tel"
                      required
                      value={localPhone}
                      onChange={(e) => {
                        setLocalPhone(e.target.value);
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      placeholder="1012345678 أو 501234567"
                      className={`flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 font-mono text-base focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border text-left ${
                        errors.phone ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                      }`}
                    />
                  </div>
                  {errors.phone ? (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span>{errors.phone}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-gray-500 mt-1">
                      يمكن استخدام نفس رقم ولي الأمر لأكثر من طالب (الإخوة).
                    </p>
                  )}
                </div>

                {/* Surah Progress / Curriculum */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    مسار الحفظ أو السورة الحالية
                  </label>
                  <input
                    type="text"
                    value={surahProgress}
                    onChange={(e) => setSurahProgress(e.target.value)}
                    placeholder="مثال: سورة النبأ، أو جزء عم والتلقين"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200"
                  />
                </div>
              </div>
            )}

            {/* STEP 2: Package & Schedule */}
            {step === 2 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                {/* Package Sessions Count Selector (8 / 12 / 16 / 24 حصة) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#1A7B88]">view_timeline</span>
                      <span>عدد حصص الباقة (دورة الحساب) <span className="text-[#ba1a1a]">*</span></span>
                    </label>
                    <span className="text-xs font-bold text-[#125862] bg-[#EAF5F7] px-2.5 py-0.5 rounded-lg border border-[#1A7B88]/20">
                      دورة الـ {packageSessionsCount} حصص
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[8, 12, 16, 24].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setPackageSessionsCount(count)}
                        className={`min-h-[44px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          packageSessionsCount === count
                            ? 'bg-[#1A7B88] text-white shadow-xs ring-2 ring-[#125862]/30 font-bold'
                            : 'bg-[#EAF5F7] text-[#125862] hover:bg-[#d8eef2] border border-[#1A7B88]/20'
                        }`}
                      >
                        <span>{count} حصة</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Session Duration Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    مدة الحصة <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 45, 60].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setSessionDuration(dur)}
                        className={`min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          sessionDuration === dur
                            ? 'bg-[#1A7B88] text-white shadow-xs'
                            : 'bg-[#F4F9FA] text-gray-700 hover:bg-[#EAF5F7] border border-gray-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">timer</span>
                        <span>{dur} دقيقة</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    تاريخ بدء الحصص <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: '' }));
                    }}
                    className={`w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border font-mono dir-ltr ${
                      errors.startDate ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                    }`}
                  />
                  {errors.startDate && (
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      {errors.startDate}
                    </p>
                  )}
                </div>

                {/* Days of the Week */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-900">
                      أيام التسميع الأسبوعية <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-[#125862] bg-[#EAF5F7] px-2 py-0.5 rounded-lg border border-[#1A7B88]/20">
                      مواعيد بتوقيت القاهرة 🇪🇬
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {ARABIC_WEEKDAYS.map((day) => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`min-h-[44px] px-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
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
                  {errors.days && (
                    <p className="text-xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span>{errors.days}</span>
                    </p>
                  )}
                </div>

                {/* Dynamic Day-Specific Time Inputs */}
                {selectedDays.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-[#EAF5F7]/50 border border-[#1A7B88]/25 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#125862] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-[#1A7B88]">schedule</span>
                        <span>وقت الحصة لكل يوم مختار:</span>
                      </span>
                      <span className="text-[10px] text-[#125862] font-semibold">توقيت القاهرة</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedDays.map((day) => (
                        <div
                          key={`time-${day}`}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-gray-200 text-xs min-h-[44px]"
                        >
                          <span className="font-bold text-gray-800 shrink-0">{day}:</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              value={dayTimes[day] || '16:00'}
                              onChange={(e) => handleDayTimeChange(day, e.target.value)}
                              className="min-h-[36px] px-2 rounded-lg bg-[#F4F9FA] text-gray-900 font-mono text-sm font-bold border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#1A7B88] dir-ltr text-center"
                            />
                            <span className="text-[11px] text-gray-600 font-medium">
                              ({formatTimeTo12h(dayTimes[day] || '16:00')})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Teacher Compensation & Final Review */}
            {step === 3 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                {/* Teacher Financial Compensation Box */}
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
                        className={`min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                        className={`min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                        className={`min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                        className={`min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                        className="w-full min-h-[44px] px-3 rounded-xl bg-white text-gray-900 font-mono text-base focus:outline-none focus:ring-2 focus:ring-amber-500/30 border border-amber-300 font-bold"
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
                        className="w-full accent-amber-600 cursor-pointer h-2"
                      />
                      <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono mt-1">
                        <span>10%</span>
                        <span className="font-bold text-amber-900">
                          المستحق التقديري: {calculatedTeacherCost} {currency === 'SAR' ? 'ر.س' : 'ج.م'}
                        </span>
                        <span>90%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Field */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    ملاحظات عامة (اختياري)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: يفضل البدء من جزء عم مع مراعاة أحكام النون الساكنة"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200"
                  />
                </div>

                {/* Comprehensive Review Summary Card */}
                <div className="p-4 rounded-2xl bg-[#F4F9FA] border border-gray-200 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                    <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-[#1A7B88]">checklist</span>
                      <span>مراجعة ملخص بيانات الطالب قبل الحفظ:</span>
                    </span>
                  </div>

                  {/* Section A: Student Data */}
                  <div className="flex items-start justify-between text-xs bg-white p-2.5 rounded-xl border border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{name || '—'}</p>
                      <p className="text-gray-500 font-mono mt-0.5" dir="ltr">{getFullNormalizedPhone()}</p>
                      <p className="text-gray-600 mt-1">{surahProgress}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[#125862] hover:underline font-bold text-xs shrink-0 cursor-pointer"
                    >
                      تعديل
                    </button>
                  </div>

                  {/* Section B: Schedule Data */}
                  <div className="flex items-start justify-between text-xs bg-white p-2.5 rounded-xl border border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900">
                        باقة {packageSessionsCount} حصص · {sessionDuration} دقيقة
                      </p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        البدء: {startDate} (بتوقيت القاهرة)
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedDays.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAF5F7] text-[#125862] text-[11px] font-semibold"
                          >
                            <span>{d}</span>
                            <span className="font-mono">({formatTimeTo12h(dayTimes[d] || '16:00')})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-[#125862] hover:underline font-bold text-xs shrink-0 cursor-pointer"
                    >
                      تعديل
                    </button>
                  </div>

                  {/* Section C: Compensation & Notes */}
                  <div className="text-xs bg-white p-2.5 rounded-xl border border-gray-100 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">المستحقات المعتمدة:</span>
                      <span className="font-bold text-gray-900 font-mono">
                        {calculatedTeacherCost} {currency === 'SAR' ? 'ر.س' : 'ج.م'} ({teacherCompType === 'fixed' ? 'مبلغ ثابت' : `${teacherCompPercentage}%`})
                      </span>
                    </div>
                    {notes.trim() && (
                      <div className="flex items-start justify-between text-gray-500 text-[11px] pt-1 border-t border-gray-50">
                        <span>ملاحظات: {notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer Buttons */}
          <div className="p-3.5 sm:p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-2.5 shrink-0 shadow-lg sm:shadow-none z-20">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleAttemptClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer text-xs min-h-[44px]"
              >
                إلغاء
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer text-xs min-h-[44px] flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
                <span>السابق</span>
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#1A7B88] text-white font-bold hover:bg-[#125862] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs min-h-[44px] active:scale-98"
              >
                <span>
                  {step === 1 ? 'التالي: الباقة والمواعيد' : 'التالي: المستحقات والمراجعة'}
                </span>
                <span className="material-symbols-outlined text-base">arrow_back</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#1A7B88] text-white font-bold hover:bg-[#125862] transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-xs min-h-[44px] active:scale-98 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>جارٍ حفظ بيانات الطالب...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">person_add</span>
                    <span>حفظ الطالب وجدولة المواعيد ⭐</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
