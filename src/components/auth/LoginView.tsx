import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

export const LoginView: React.FC = () => {
  const { supervisors, login } = useApp();
  const [selectedRole, setSelectedRole] = useState<UserRole>('general_supervisor');
  const [email, setEmail] = useState('saadi@muslimkid.academy');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    const target = supervisors.find((s) => s.role === role);
    if (target) setEmail(target.email);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, selectedRole);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-[#dee8ff]/40 to-[#f9f9ff] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-[#bec8c8]/20 p-6 sm:p-8 flex flex-col text-right animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#005253]/10 text-[#005253] flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-4xl">menu_book</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#111c2d]">أكاديمية المسلم الصغير</h1>
            <p className="text-sm text-[#6f7979] mt-1">
              نظام المتابعة الإدارية والأكاديمية الموحد للحلقات القرآنية
            </p>
          </div>
        </div>

        {/* Role Selector Persona Cards */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-[#111c2d] mb-2">
            اختر حساب الدخول ومستوى الصلاحية (Role):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {supervisors.map((sup) => {
              const isSelected = selectedRole === sup.role;
              return (
                <button
                  key={sup.id}
                  type="button"
                  onClick={() => handleRoleSelect(sup.role)}
                  className={`p-3.5 rounded-2xl text-right transition-all border flex flex-col justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-[#005253] bg-[#005253]/5 ring-2 ring-[#005253]'
                      : 'border-[#bec8c8]/30 bg-[#f9f9ff] hover:bg-[#f0f3ff]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-[#005253] text-white' : 'bg-[#e7eeff] text-[#005253]'
                      }`}
                    >
                      {sup.initials}
                    </span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[#005253] text-lg">
                        check_circle
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#111c2d]">{sup.title}</span>
                    <span className="text-[11px] text-[#6f7979] truncate">{sup.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              البريد الإلكتروني الوظيفي
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none focus:ring-2 focus:ring-[#005253]/30 text-left dir-ltr text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111c2d] mb-1.5">
              كلمة المرور
            </label>
            <input
              type="password"
              defaultValue="••••••••"
              className="w-full h-11 px-3.5 rounded-xl bg-[#f0f3ff] text-[#111c2d] focus:outline-none text-left dir-ltr text-xs sm:text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-[#005253] text-white font-bold hover:bg-[#186b6d] transition-colors shadow-md flex items-center justify-center gap-2 mt-2 cursor-pointer text-sm"
          >
            <span>تسجيل الدخول إلى النظام</span>
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
        </form>

        {/* Unified Database Clarification Note */}
        <div className="mt-6 pt-4 border-t border-[#bec8c8]/20 flex items-start gap-2 text-xs text-[#6f7979] leading-relaxed">
          <span className="material-symbols-outlined text-sm text-[#005253] mt-0.5 flex-shrink-0">
            info
          </span>
          <span>
            هذا تطبيق واحد متكامل يعمل على نفس قاعدة البيانات المركزية، وتتغير الواجهة ومستوى الأرقام المعروضة تلقائياً بحسب صلاحيات الحساب المختار (مشرف عام / مشرف فرعي / مدير).
          </span>
        </div>
      </div>
    </div>
  );
};
