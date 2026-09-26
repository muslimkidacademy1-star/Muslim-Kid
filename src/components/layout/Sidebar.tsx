import React from 'react';
import { useApp } from '../../context/AppContext';
import { PWAInstallButton } from '../common/PWAInstallButton';

export type NavigationTab =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'reports'
  | 'logs'
  | 'settings';

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
  const { currentUser, logout, switchUserRole } = useApp();

  const isTeacher = currentUser.role === 'teacher';

  const navItems = isTeacher
    ? [
        { id: 'students' as NavigationTab, label: 'طلابي (حلقة القرآن)', icon: 'school' },
        { id: 'reports' as NavigationTab, label: 'تقارير الإنجاز', icon: 'monitoring' },
      ]
    : [
        { id: 'students' as NavigationTab, label: 'شاشة الطلاب', icon: 'school' },
        { id: 'teachers' as NavigationTab, label: 'شاشة المعلمين', icon: 'badge' },
        { id: 'reports' as NavigationTab, label: 'التقارير والمتابعة', icon: 'monitoring' },
        { id: 'logs' as NavigationTab, label: 'سجل التعديلات', icon: 'history' },
        {
          id: 'settings' as NavigationTab,
          label: currentUser.role === 'manager' ? 'الميزانية والإعدادات' : 'الإعدادات',
          icon: currentUser.role === 'manager' ? 'account_balance' : 'settings',
        },
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
        className={`fixed right-0 top-0 h-full w-72 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-l border-[#bec8c8]/20 z-50 flex flex-col justify-between py-5 transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-5">
          {/* Academy Brand Logo & Title */}
          <div className="px-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#005253]/10 flex items-center justify-center text-[#005253] flex-shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-2xl">menu_book</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-[#005253] leading-tight tracking-tight">
                  أكاديمية المسلم الصغير
                </span>
                <span className="text-xs text-[#6f7979] leading-normal font-medium">
                  نظام المتابعة الإدارية
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#6f7979] hover:bg-[#f0f3ff]"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* User Profile Card with current Role Badge */}
          <div className="mx-4 p-3 bg-[#f0f3ff] rounded-xl flex items-center gap-3 border border-[#bec8c8]/20">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#005253] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                {currentUser.initials}
              </div>
              <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white"></span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-sm text-[#111c2d] truncate">
                {currentUser.name}
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                    currentUser.role === 'manager'
                      ? 'bg-[#dee8ff] text-[#005253]'
                      : currentUser.role === 'general_supervisor'
                      ? 'bg-[#ffdea9] text-[#7d5800]'
                      : 'bg-[#a6eff1] text-[#002021]'
                  }`}
                >
                  {currentUser.title}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 px-4">
            {navItems.map((item) => {
              const isActive =
                activeTab === item.id ||
                (item.id === 'students' && activeTab === 'dashboard');
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm font-semibold text-right ${
                    isActive
                      ? 'bg-[#186b6d] text-white shadow-[0_4px_20px_-2px_rgba(24,107,109,0.25)]'
                      : 'text-[#3f4949] hover:bg-[#f0f3ff] hover:text-[#111c2d]'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Role Fast Switcher in Sidebar */}
          <div className="px-4 py-2 border-t border-[#bec8c8]/20">
            <div className="mb-2.5">
              <PWAInstallButton variant="sidebar" />
            </div>
            <span className="text-[11px] text-[#6f7979] font-semibold block mb-1.5 px-1">
              تجربة مستويات الصلاحيات:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              <button
                onClick={() => {
                  switchUserRole('general_supervisor');
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors text-center ${
                  currentUser.role === 'general_supervisor'
                    ? 'bg-[#005253] text-white shadow-xs'
                    : 'bg-[#f0f3ff] text-[#3f4949] hover:bg-[#dee8ff]'
                }`}
                title="مشرف عام"
              >
                مشرف عام
              </button>
              <button
                onClick={() => {
                  switchUserRole('sub_supervisor');
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors text-center ${
                  currentUser.role === 'sub_supervisor'
                    ? 'bg-[#005253] text-white shadow-xs'
                    : 'bg-[#f0f3ff] text-[#3f4949] hover:bg-[#dee8ff]'
                }`}
                title="مشرف فرعي"
              >
                مشرف فرعي
              </button>
              <button
                onClick={() => {
                  switchUserRole('manager');
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors text-center ${
                  currentUser.role === 'manager'
                    ? 'bg-[#005253] text-white shadow-xs'
                    : 'bg-[#f0f3ff] text-[#3f4949] hover:bg-[#dee8ff]'
                }`}
                title="المدير العام"
              >
                المدير
              </button>
              <button
                onClick={() => {
                  switchUserRole('teacher');
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-colors text-center ${
                  currentUser.role === 'teacher'
                    ? 'bg-[#005253] text-white shadow-xs'
                    : 'bg-[#f0f3ff] text-[#3f4949] hover:bg-[#dee8ff]'
                }`}
                title="معلم حلقة"
              >
                معلم
              </button>
            </div>
          </div>
        </div>

        {/* PWA Install in Sidebar */}
        <div className="px-4">
          <PWAInstallButton variant="sidebar" />
        </div>

        {/* Bottom Section: Version & Logout */}
        <div className="px-4 flex flex-col gap-2">
          <div className="p-2.5 bg-[#e7eeff] rounded-xl flex items-center justify-between text-[#3f4949] border border-[#bec8c8]/20">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#005253]">verified</span>
              <span className="text-xs font-semibold">النسخة الإدارية 2.4</span>
            </div>
            <span className="text-xs text-[#6f7979]">1445هـ</span>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[#ba1a1a] hover:bg-[#ffdad6] hover:text-[#93000a] transition-colors text-xs font-bold"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
};
