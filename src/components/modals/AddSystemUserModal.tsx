import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface AddSystemUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AllowedRole = 'teacher' | 'sub_supervisor' | 'general_supervisor' | 'manager';

export const AddSystemUserModal: React.FC<AddSystemUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { supervisors, addSystemUser } = useApp();

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<AllowedRole>('teacher');
  const [track, setTrack] = useState<'boys' | 'girls' | 'general'>('boys');
  const [supervisorId, setSupervisorId] = useState('');

  // Flow Steps: 'form' -> 'review' -> 'success'
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Success details from server
  const [createdUserData, setCreatedUserData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: AllowedRole;
    track: string;
    supervisorName?: string;
    authStatus: string;
  } | null>(null);

  // Filter sub-supervisors for teacher assignment
  const subSupervisors = supervisors.filter(
    (s) => s.role === 'sub_supervisor' || s.role === 'general_supervisor'
  );

  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setPhone('+966 ');
      setRole('teacher');
      setTrack('boys');
      setSupervisorId(subSupervisors[0]?.id || '');
      setStep('form');
      setIsSubmitting(false);
      setErrorMsg(null);
      setCopyFeedback(false);
      setCreatedUserData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getRoleArabicName = (r: AllowedRole) => {
    switch (r) {
      case 'teacher':
        return 'معلم / محفظ حلقة';
      case 'sub_supervisor':
        return 'مشرف فرعي (تعليمي)';
      case 'general_supervisor':
        return 'مشرف عام للأكاديمية';
      case 'manager':
        return 'مدير عام للأكاديمية';
    }
  };

  const getTrackArabicName = (t: 'boys' | 'girls' | 'general') => {
    switch (t) {
      case 'boys':
        return 'مسار البنين';
      case 'girls':
        return 'مسار الفتيات';
      case 'general':
        return 'مسار عام (القرآن الكريم)';
    }
  };

  const handleValidateForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMsg('يرجى إدخال اسم المستخدم الكامل');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMsg('يرجى إدخال رقم واتساب صالح مع مفتاح الدولة (مثال: +966500000000)');
      return;
    }

    if (role === 'teacher') {
      if (subSupervisors.length === 0) {
        setErrorMsg('لا يوجد مشرف فرعي مسجل في النظام حالياً. يرجى إضافة مشرف فرعي أولاً قبل إضافة المعلمين.');
        return;
      }
      if (!supervisorId) {
        setErrorMsg('يرجى اختيار المشرف الفرعي المسؤول عن هذا المعلم');
        return;
      }
    }

    setStep('review');
  };

  const handleConfirmAndSave = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    const targetSupervisor = supervisors.find((s) => s.id === supervisorId);

    const result = await addSystemUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      track: getTrackArabicName(track),
      supervisorId: role === 'teacher' ? supervisorId : undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      setCreatedUserData({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        track: getTrackArabicName(track),
        supervisorName: targetSupervisor?.name,
        authStatus: result.authStatus,
      });
      setStep('success');
      if (onSuccess) onSuccess();
    } else {
      setErrorMsg(result.message || result.error || 'حدث خطأ أثناء حفظ المستخدم في قاعدة البيانات');
    }
  };

  // Generate welcome and administrative follow-up message for WhatsApp
  const generateInviteMessage = () => {
    if (!createdUserData) return '';
    return `السلام عليكم ورحمة الله وبركاته أ. ${createdUserData.name}،
مرحباً بك في أسرة «أكاديمية المسلم الصغير» لتعليم كتاب الله 🌸

تم تسجيل بياناتك في المنظومة الإدارية:
- الصلاحية: ${getRoleArabicName(createdUserData.role)}
- المسار: ${createdUserData.track}
${createdUserData.supervisorName ? `- المشرف المسؤول: ${createdUserData.supervisorName}\n` : ''}- البريد الإلكتروني المعتمد: ${createdUserData.email}

نسأل الله لك التوفيق والسداد في خدمة القرآن الكريم وأهله.`;
  };

  const handleOpenWhatsApp = () => {
    if (!createdUserData) return;
    const cleanNum = createdUserData.phone.replace(/[^0-9]/g, '');
    const message = generateInviteMessage();
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanNum}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyInviteText = () => {
    const text = generateInviteMessage();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
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
              <span className="material-symbols-outlined text-2xl">person_add</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">
                {step === 'form' && 'إضافة مستخدم جديد للنظام'}
                {step === 'review' && 'مراجعة بيانات المستخدم قبل الحفظ'}
                {step === 'success' && 'تم إضافة المستخدم بنجاح'}
              </h2>
              <p className="text-xs text-[#EAF5F7] mt-0.5 truncate">
                {step === 'form' && 'تسجيل معلم أو مشرف أو مدير في قاعدة البيانات المعتمدة'}
                {step === 'review' && 'تحقق من صحة الربط والصلاحية'}
                {step === 'success' && 'توثيق السجل في Supabase وتجهيز تفاصيل الدخول'}
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-4 text-[#1D1D1F]">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in shadow-2xs">
              <span className="material-symbols-outlined text-xl text-rose-600 shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleValidateForm} className="flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  الاسم الكامل <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="مثال: الشيخ محمد عبد الرحمن"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 focus:border-[#1A7B88] transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  البريد الإلكتروني المعتمد <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="name@academy.com"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-sm dir-ltr text-left focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 focus:border-[#1A7B88] transition-all"
                />
              </div>

              {/* WhatsApp Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  رقم الواتساب بمفتاح الدولة <span className="text-rose-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="+966 50 123 4567"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-gray-300 text-sm dir-ltr text-left focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 focus:border-[#1A7B88] transition-all"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  مهم للتواصل المباشر وإرسال تفاصيل الدخول الترحيبية
                </p>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  الدور في المنظومة <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      role === 'teacher'
                        ? 'bg-[#1A7B88] text-white border-[#1A7B88] shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">school</span>
                    <span>معلم حلقة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('sub_supervisor')}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      role === 'sub_supervisor'
                        ? 'bg-[#1A7B88] text-white border-[#1A7B88] shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">visibility</span>
                    <span>مشرف فرعي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('general_supervisor')}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      role === 'general_supervisor'
                        ? 'bg-[#1A7B88] text-white border-[#1A7B88] shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">groups</span>
                    <span>مشرف عام</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('manager')}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      role === 'manager'
                        ? 'bg-[#1A7B88] text-white border-[#1A7B88] shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                    <span>مدير عام</span>
                  </button>
                </div>
              </div>

              {/* Track Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5">
                  المسار الأكاديمي
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTrack('boys')}
                    className={`min-h-[40px] px-2 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      track === 'boys'
                        ? 'bg-[#125862] text-white border-[#125862]'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    مسار البنين
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrack('girls')}
                    className={`min-h-[40px] px-2 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      track === 'girls'
                        ? 'bg-[#125862] text-white border-[#125862]'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    مسار الفتيات
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrack('general')}
                    className={`min-h-[40px] px-2 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      track === 'general'
                        ? 'bg-[#125862] text-white border-[#125862]'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    القرآن الكريم
                  </button>
                </div>
              </div>

              {/* Supervisor Selection (Mandatory for Teacher) */}
              {role === 'teacher' && (
                <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-gray-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-900">
                      المشرف الفرعي المسؤول <span className="text-rose-600">* (مطلوب)</span>
                    </label>
                    <span className="text-[11px] text-gray-500 font-medium">
                      متاح: {subSupervisors.length} مشرف
                    </span>
                  </div>

                  {subSupervisors.length === 0 ? (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">warning</span>
                      <span>لا يوجد مشرف فرعي مسجل في النظام حالياً. يرجى إضافة مشرف فرعي أولاً.</span>
                    </div>
                  ) : (
                    <select
                      value={supervisorId}
                      onChange={(e) => setSupervisorId(e.target.value)}
                      required
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 transition-all cursor-pointer"
                    >
                      <option value="" disabled>
                        -- اختر المشرف الفرعي المسؤول --
                      </option>
                      {subSupervisors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.title})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

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
                  className="min-h-[42px] px-5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-98"
                >
                  <span>متابعة للمراجعة</span>
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                </button>
              </div>
            </form>
          )}

          {step === 'review' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              <div className="p-4 bg-[#F5F5F7] rounded-2xl border border-gray-200/80 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  ملخص بيانات الحساب قبل الحفظ
                </h3>

                <div className="space-y-2.5 text-xs sm:text-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-600">الاسم:</span>
                    <span className="font-bold text-[#1D1D1F]">{name}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-600">البريد الإلكتروني:</span>
                    <span className="font-mono text-gray-900 dir-ltr">{email}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-600">رقم الواتساب:</span>
                    <span className="font-mono text-gray-900 dir-ltr">{phone}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-600">الدور المحدد:</span>
                    <span className="font-bold text-[#125862] px-2 py-0.5 rounded-lg bg-[#EAF5F7]">
                      {getRoleArabicName(role)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-600">المسار:</span>
                    <span className="font-semibold text-gray-800">{getTrackArabicName(track)}</span>
                  </div>

                  {role === 'teacher' && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-gray-600">المشرف المسؤول:</span>
                      <span className="font-bold text-emerald-800">
                        {supervisors.find((s) => s.id === supervisorId)?.name || 'غير محدد'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-blue-700 shrink-0 mt-0.5">
                  info
                </span>
                <span className="leading-relaxed">
                  سيتم تسجيل السجل فوراً في جدول <code className="bg-blue-100 px-1 rounded font-mono font-bold">{role === 'teacher' ? 'teachers' : 'supervisors'}</code> في قاعدة بيانات Supabase.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  disabled={isSubmitting}
                  className="min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  تعديل البيانات
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSave}
                  disabled={isSubmitting}
                  className="min-h-[42px] px-6 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>جاري الحفظ في Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">check</span>
                      <span>تأكيد وحفظ المستخدم</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && createdUserData && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-150">
              {/* Success Badge */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                  <span className="material-symbols-outlined text-3xl">check_circle</span>
                </div>
                <h3 className="font-bold text-base text-emerald-950">
                  تم تسجيل ملف {getRoleArabicName(createdUserData.role)} بنجاح
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed max-w-sm">
                  تم حفظ الملف في جداول Supabase وتوثيق الإسناد الإشرافي وسجل النشاط بدقة.
                </p>
              </div>

              {/* Explicit 4-Part Status Breakdown */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs flex flex-col gap-2.5">
                <h4 className="font-bold text-gray-700 text-xs pb-1 border-b border-gray-200">
                  تفاصيل حالة التسجيل والربط الإداري:
                </h4>

                {/* 1. Database Profile Status */}
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-emerald-600 mt-0.5 shrink-0">
                    check_circle
                  </span>
                  <div>
                    <span className="font-bold text-gray-800">حفظ ملف المستخدم: </span>
                    <span className="text-emerald-700 font-medium">مكتمل وموثق في قاعدة بيانات Supabase.</span>
                  </div>
                </div>

                {/* 2. Auth Account Status */}
                <div className="flex items-start gap-2">
                  {createdUserData.authStatus === 'invited_successfully' || createdUserData.authStatus === 'already_registered' ? (
                    <span className="material-symbols-outlined text-base text-emerald-600 mt-0.5 shrink-0">
                      check_circle
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-base text-amber-600 mt-0.5 shrink-0">
                      pending
                    </span>
                  )}
                  <div>
                    <span className="font-bold text-gray-800">حساب المصادقة والدخول: </span>
                    {createdUserData.authStatus === 'invited_successfully' && (
                      <span className="text-emerald-700 font-medium">تم إنشاء حساب الدخول وتوجيه رابط الدعوة.</span>
                    )}
                    {createdUserData.authStatus === 'already_registered' && (
                      <span className="text-emerald-700 font-medium">الحساب مسجل مسبقاً في نظام المصادقة وتم ربط الملف به.</span>
                    )}
                    {createdUserData.authStatus === 'profile_saved_edge_pending' && (
                      <span className="text-amber-700 font-medium">الملف مسجل بنجاح، وتفعيل الدخول بالبريد بانتظار نشر وظيفة الخادم.</span>
                    )}
                    {createdUserData.authStatus === 'invite_failed' && (
                      <span className="text-rose-700 font-medium">تعذر إرسال دعوة البريد التلقائية، يتطلب استكمال الإعداد.</span>
                    )}
                  </div>
                </div>

                {/* 3. Invitation Delivery Status */}
                <div className="flex items-start gap-2">
                  {createdUserData.authStatus === 'invited_successfully' ? (
                    <span className="material-symbols-outlined text-base text-emerald-600 mt-0.5 shrink-0">
                      mark_email_read
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-base text-gray-400 mt-0.5 shrink-0">
                      info
                    </span>
                  )}
                  <div>
                    <span className="font-bold text-gray-800">حالة إرسال دعوة البريد: </span>
                    {createdUserData.authStatus === 'invited_successfully' ? (
                      <span className="text-emerald-700 font-medium">تم إرسال دعوة تعيين كلمة المرور رسمياً عبر Supabase Auth.</span>
                    ) : (
                      <span className="text-gray-600 font-medium">
                        لم تُرسل دعوة بريد تلقائية (تتطلب نشر Edge Function مع مفتاح الإدارة على خادم Supabase).
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Setup Requirement / Next Step */}
                <div className="flex items-start gap-2 pt-1 border-t border-gray-200/80">
                  <span className="material-symbols-outlined text-base text-[#1A7B88] mt-0.5 shrink-0">
                    chat
                  </span>
                  <div>
                    <span className="font-bold text-gray-800">التواصل والمتابعة: </span>
                    <span className="text-gray-600">
                      يمكنك الترحيب بالمعلم والتنسيق معه عبر واتساب. واتساب وسيلة تواصل وتنسيق إداري مساعدة ولا يحتوي على كلمات مرور.
                    </span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Action Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="min-h-[46px] w-full px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-lg">chat</span>
                  <span>فتح واتساب للتواصل والترحيب الإداري</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyInviteText}
                  className="min-h-[42px] w-full px-4 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <span className="material-symbols-outlined text-lg">
                    {copyFeedback ? 'done' : 'content_copy'}
                  </span>
                  <span>{copyFeedback ? 'تم نسخ نص الرسالة إلى الحافظة ✓' : 'نسخ رسالة الترحيب الإدارية'}</span>
                </button>

                <p className="text-[11px] text-center text-gray-500 mt-1">
                  ملاحظة: الضغط على الزر يجهز الرسالة في تطبيق واتساب، وتأكيد الإرسال يتم داخل التطبيق. لا يتم إرسال أي كلمات مرور في واتساب.
                </p>
              </div>

              {/* Done Button */}
              <div className="pt-2 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] px-6 rounded-xl bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-bold transition-all cursor-pointer"
                >
                  إغلاق والعودة للقائمة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
