import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface SuperAdminViewBarProps {
  onSelectRole: (role: UserRole | null) => void;
}

export const SuperAdminViewBar: React.FC<SuperAdminViewBarProps> = ({ onSelectRole }) => {
  const { isSuperAdmin, previewRole } = useApp();

  // Strict exclusive access check: If not super admin, completely hidden and prohibited
  if (!isSuperAdmin) {
    return null;
  }

  const isCurrentManager = previewRole === null || previewRole === 'manager';

  return (
    <div
      dir="rtl"
      className="fixed top-0 left-0 right-0 h-11 bg-linear-to-r from-[#002728] via-[#003738] to-[#001f20] border-b border-[#00e5ff]/25 z-50 text-white flex items-center justify-between px-3 sm:px-6 shadow-md select-none"
    >
      {/* Right Section: Identity & Mode Indicator */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00e5ff]/15 border border-[#00e5ff]/30 text-[#6ff7f8] text-[11px] font-black">
          <span className="material-symbols-outlined text-sm text-[#00e5ff]">shield_person</span>
          <span className="hidden sm:inline">معاينة واختبار الشاشات (Super Admin)</span>
          <span className="sm:hidden">معاينة المدير</span>
        </div>

        {/* Current View Pill */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-[#e7eeff]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-white/60">أنت الآن في:</span>
          <span className="font-extrabold text-[#fde047]">
            {isCurrentManager
              ? 'لوحة المدير العام (الرئيسية)'
              : previewRole === 'teacher'
              ? 'بوابة المعلم (حلقة القرآن)'
              : previewRole === 'sub_supervisor'
              ? 'شاشة المشرف التعليمي الفرعي'
              : 'شاشة المشرف العام'}
          </span>
        </div>
      </div>

      {/* Left Section: 4 Quick Preview Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
        {/* 1. Teacher Preview Button */}
        <button
          onClick={() => onSelectRole('teacher')}
          title="لعرض بوابة المعلم وتجربة تسجيل الحصص وإضافة طالب للحلقة وتسليم التقرير"
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            previewRole === 'teacher'
              ? 'bg-[#00e5ff] text-[#003738] shadow-sm ring-1 ring-white/60 font-black'
              : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">visibility</span>
          <span>تجربة شاشة المعلم</span>
        </button>

        {/* 2. Sub Supervisor Preview Button */}
        <button
          onClick={() => onSelectRole('sub_supervisor')}
          title="لعرض جدول المراقبة ورادار التنبيهات"
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            previewRole === 'sub_supervisor'
              ? 'bg-[#fbbf24] text-[#1c1917] shadow-sm ring-1 ring-white/60 font-black'
              : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">visibility</span>
          <span className="hidden sm:inline">تجربة شاشة المشرف الفرعي</span>
          <span className="sm:hidden">المشرف الفرعي</span>
        </button>

        {/* 3. General Supervisor Preview Button */}
        <button
          onClick={() => onSelectRole('general_supervisor')}
          title="لعرض كافة الحلقات والمعلمين بدون كروت مالية"
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            previewRole === 'general_supervisor'
              ? 'bg-[#34d399] text-[#064e3b] shadow-sm ring-1 ring-white/60 font-black'
              : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">visibility</span>
          <span className="hidden sm:inline">تجربة شاشة المشرف العام</span>
          <span className="sm:hidden">المشرف العام</span>
        </button>

        {/* 4. Manager Return Button */}
        <button
          onClick={() => onSelectRole(null)}
          title="للرجوع إلى لوحة القيادة التنفيذية والمالية"
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            isCurrentManager
              ? 'bg-white/25 text-white ring-1 ring-[#00e5ff]/50 font-black shadow-inner'
              : 'bg-rose-500/25 hover:bg-rose-500/40 text-rose-100 border border-rose-400/40 animate-pulse'
          }`}
        >
          <span className="material-symbols-outlined text-sm">settings</span>
          <span className="hidden sm:inline">العودة للوحة المدير العام</span>
          <span className="sm:hidden">لوحة المدير</span>
        </button>
      </div>
    </div>
  );
};
