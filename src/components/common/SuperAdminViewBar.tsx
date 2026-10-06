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
      className="fixed top-0 left-0 right-0 h-11 bg-[#125862] border-b border-[#1A7B88]/40 z-50 text-white flex items-center justify-between px-3 sm:px-6 shadow-xs select-none"
    >
      {/* Right Section: Identity & Mode Indicator */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/10 text-white text-[11px] font-bold">
          <span className="material-symbols-outlined text-sm text-[#EAF5F7]">shield_person</span>
          <span className="hidden sm:inline">معاينة الأدوار (إدارة)</span>
          <span className="sm:hidden">معاينة</span>
        </div>

        {/* Current View Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-white/90">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="text-white/70">الدور الحالي:</span>
          <span className="font-bold text-white">
            {isCurrentManager
              ? 'المدير العام'
              : previewRole === 'teacher'
              ? 'المعلم (حلقة القرآن)'
              : previewRole === 'sub_supervisor'
              ? 'المشرف الفرعي'
              : 'المشرف العام'}
          </span>
        </div>
      </div>

      {/* Left Section: Quick Preview Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {/* 1. Teacher Preview Button */}
        <button
          onClick={() => onSelectRole('teacher')}
          title="معاينة بوابة المعلم"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
            previewRole === 'teacher'
              ? 'bg-white text-[#125862] shadow-xs'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">school</span>
          <span>المعلم</span>
        </button>

        {/* 2. Sub Supervisor Preview Button */}
        <button
          onClick={() => onSelectRole('sub_supervisor')}
          title="معاينة شاشة المشرف الفرعي"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
            previewRole === 'sub_supervisor'
              ? 'bg-white text-[#125862] shadow-xs'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">visibility</span>
          <span>المشرف الفرعي</span>
        </button>

        {/* 3. General Supervisor Preview Button */}
        <button
          onClick={() => onSelectRole('general_supervisor')}
          title="معاينة شاشة المشرف العام"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
            previewRole === 'general_supervisor'
              ? 'bg-white text-[#125862] shadow-xs'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">groups</span>
          <span>المشرف العام</span>
        </button>

        {/* 4. Manager Return Button */}
        <button
          onClick={() => onSelectRole(null)}
          title="العودة للوحة المدير العام"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
            isCurrentManager
              ? 'bg-white/20 text-white'
              : 'bg-amber-400 hover:bg-amber-300 text-gray-900 shadow-xs'
          }`}
        >
          <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
          <span>المدير</span>
        </button>
      </div>
    </div>
  );
};
