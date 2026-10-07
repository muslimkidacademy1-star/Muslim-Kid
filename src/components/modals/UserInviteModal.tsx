import React, { useState } from 'react';
import { Teacher, Supervisor } from '../../types';

interface UserInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name: string;
    email: string;
    phone: string;
    role: string;
    roleTitle: string;
    track?: string;
    supervisorName?: string;
  } | null;
}

export const UserInviteModal: React.FC<UserInviteModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [copyFeedback, setCopyFeedback] = useState(false);

  if (!isOpen || !user) return null;

  const message = `السلام عليكم ورحمة الله وبركاته أ. ${user.name}،
مرحباً بك في أسرة «أكاديمية المسلم الصغير» لتعليم كتاب الله 🌸

بيانات تسجيلك في المنظومة الإدارية:
- الصلاحية: ${user.roleTitle}
${user.track ? `- المسار: ${user.track}\n` : ''}${user.supervisorName ? `- المشرف المسؤول: ${user.supervisorName}\n` : ''}- البريد الإلكتروني المعتمد: ${user.email}

نسأل الله لك التوفيق والسداد في تعليم كتاب الله الكريم.`;

  const handleOpenWhatsApp = () => {
    const cleanNum = user.phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanNum}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border-t sm:border border-gray-100 flex flex-col max-h-[90vh] z-10 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-2xl">chat</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">المتابعة والتواصل الإداري</h2>
              <p className="text-xs text-[#EAF5F7] mt-0.5 truncate">{user.name}</p>
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
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-4 text-[#1D1D1F]">
          {/* User Preview */}
          <div className="p-3.5 bg-[#F5F5F7] rounded-xl border border-gray-200/80 flex items-center justify-between text-xs sm:text-sm">
            <div>
              <p className="font-bold text-[#1D1D1F]">{user.name}</p>
              <p className="text-gray-500 font-mono dir-ltr text-left text-xs mt-0.5">{user.email}</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#EAF5F7] text-[#125862] font-bold text-xs">
              {user.roleTitle}
            </span>
          </div>

          {/* Status Breakdown */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
              <span className="font-bold text-gray-700">حالة السجل:</span>
              <span className="text-gray-600">موثق في قاعدة بيانات Supabase</span>
            </div>
            {user.supervisorName && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#1A7B88]">supervised_user_circle</span>
                <span className="font-bold text-gray-700">المشرف المسؤول:</span>
                <span className="text-gray-800 font-medium">{user.supervisorName}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-1 border-t border-gray-200">
              <span className="material-symbols-outlined text-sm text-amber-600">security</span>
              <span>واتساب وسيلة تواصل مساعدة فقط ولا يتم تداول كلمات المرور عبره.</span>
            </div>
          </div>

          {/* Formatted Message Box */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              نص رسالة المتابعة والترحيب (واتساب)
            </label>
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-mono whitespace-pre-wrap text-gray-800 leading-relaxed max-h-48 overflow-y-auto">
              {message}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="min-h-[46px] w-full px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
            >
              <span className="material-symbols-outlined text-lg">chat</span>
              <span>فتح واتساب للتواصل الإداري</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[42px] w-full px-4 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <span className="material-symbols-outlined text-lg">
                {copyFeedback ? 'done' : 'content_copy'}
              </span>
              <span>{copyFeedback ? 'تم نسخ الرسالة بنجاح ✓' : 'نسخ نص الرسالة'}</span>
            </button>

            <p className="text-[11px] text-center text-gray-500 mt-1">
              ملاحظة: الضغط على الزر يجهز الرسالة في تطبيق واتساب، وتأكيد الإرسال يتم داخل التطبيق. لا يتم إرسال أي كلمات مرور في واتساب.
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
