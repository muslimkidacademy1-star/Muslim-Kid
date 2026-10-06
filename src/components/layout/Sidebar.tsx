import React from 'react';
import { useApp } from '../../context/AppContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { UserRole } from '../../types';

export type NavigationTab =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'reports'
  | 'logs';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentUser, logout, isSuperAdmin, previewRole } = useApp();
  const currentRole: UserRole = currentUser.role;

  const isTeacher = currentRole === 'teacher';

  const navItems = isTeacher
    ? [
        { id: 'students' as NavigationTab, label: 'طلابي (حلقة القرآن)', icon: 'school' },
        { id: 'reports' as NavigationTab, label: 'شاشة التقارير', icon: 'monitoring' },
      ]
    : [
        {
          id: 'dashboard' as NavigationTab,
          label:
            currentUser.role === 'manager'
              ? 'لوحة التحكم التنفيذية'
              : currentUser.role === 'general_supervisor'
              ? 'لوحة الإشراف العام'
              : 'المتابعة اليومية',
          icon: 'dashboard',
        },
        {
          id: 'teachers' as NavigationTab,
          label: currentUser.role === 'sub_supervisor' ? 'معلموني' : 'شاشة المعلمين',
          icon: 'badge',
        },
        { id: 'students' as NavigationTab, label: 'شاشة الطلاب', icon: 'school' },
        { id: 'reports' as NavigationTab, label: 'شاشة التقارير', icon: 'monitoring' },
        { id: 'logs' as NavigationTab, label: 'سجل العمليات', icon: 'history' },
      ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed right-0 ${
          isSuperAdmin ? 'top-11 h-[calc(100vh-2.75rem)]' : 'top-0 h-full'
        } w-72 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.03)] border-l border-gray-200/80 z-50 flex flex-col justify-between py-4 transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-4">
          {/* Academy Brand Logo & Title */}
          <div className="px-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.jpg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
                alt="شعار الأكاديمية"
                className="w-10 h-10 rounded-xl aspect-square object-contain shadow-2xs border border-gray-100"
              />
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base text-[#125862] leading-tight tracking-tight">
                  أكاديمية المسلم الصغير
                </span>
                <span className="text-xs text-gray-500 leading-normal font-medium">
                  نظام المتابعة الإدارية
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden min-h-[36px] min-w-[36px] rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              aria-label="إغلاق القائمة"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* User Profile Card with current Role Badge */}
          <div className="mx-4 p-3 bg-[#F5F5F7] rounded-xl flex items-center gap-3 border border-gray-200/70">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#1A7B88] flex items-center justify-center text-white font-bold text-sm shadow-2xs">
                {currentUser.initials}
              </div>
              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-sm text-[#1D1D1F] truncate">
                {currentUser.name}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20">
                  {currentUser.title || (currentUser.role === 'manager' ? 'المدير العام' : 'المشرف')}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-4">
            {navItems.map((item) => {
              const isActive =
                activeTab === item.id ||
                (isTeacher && item.id === 'students' && activeTab === 'dashboard');
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs sm:text-sm font-bold text-right cursor-pointer active:scale-98 ${
                    isActive
                      ? 'bg-[#1A7B88] text-white shadow-xs'
                      : 'text-gray-700 hover:bg-[#EAF5F7] hover:text-[#125862]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl ${isActive ? 'text-white' : 'text-[#1A7B88]'}`}>{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* PWA Install in Sidebar */}
        <div className="px-4">
          <PWAInstallButton variant="sidebar" />
        </div>

        {/* Bottom Section: Version & Logout */}
        <div className="px-4 flex flex-col gap-2">
          <div className="p-2.5 bg-[#F5F5F7] rounded-xl flex items-center justify-between text-gray-600 border border-gray-200/60">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#1A7B88]">verified</span>
              <span className="text-xs font-semibold">منظومة المتابعة المعتمدة</span>
            </div>
            <span className="text-xs text-gray-500 font-mono">1446هـ</span>
          </div>

          <button
            onClick={() => {
              logout();
              if (onCloseMobile) onCloseMobile();
            }}
            className="min-h-[44px] w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all text-xs font-bold border border-rose-200 cursor-pointer shadow-2xs active:scale-98"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>تسجيل الخروج من النظام</span>
          </button>
        </div>
      </aside>
    </>
  );
};
