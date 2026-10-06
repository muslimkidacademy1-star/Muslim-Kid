import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface HeaderProps {
  activeTab?: string;
  onSelectTab?: (tab: 'dashboard' | 'students' | 'teachers') => void;
  onSearch?: (term: string) => void;
  onOpenActivityLog?: () => void;
  onOpenAddStudent?: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'dashboard',
  onSelectTab,
  onSearch,
  onOpenActivityLog,
  onOpenAddStudent,
  onToggleSidebar,
}) => {
  const {
    currentUser,
    teachers,
    notifications,
    students,
    isOverdue,
    getTeacherById,
    getDaysSinceLastReport,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    logout,
    isSuperAdmin,
    previewRole,
    setPreviewRole,
    fetchFromSupabase,
  } = useApp();

  const currentRole: UserRole = currentUser.role;

  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const overdueStudents = students.filter(
    (s) => s.status === 'active' && isOverdue(s.lastReportDate)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  // State for Teacher Account Menu Popover
  const [isTeacherAccountOpen, setIsTeacherAccountOpen] = useState(false);
  const teacherAccountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teacherAccountRef.current && !teacherAccountRef.current.contains(event.target as Node)) {
        setIsTeacherAccountOpen(false);
      }
    };
    if (isTeacherAccountOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTeacherAccountOpen]);

  // Dedicated Minimalist Clean Header for Teacher, Sub-Supervisor, and General Supervisor Portals (Mobile First)
  if (
    currentUser.role === 'teacher' ||
    currentUser.role === 'sub_supervisor' ||
    currentUser.role === 'general_supervisor'
  ) {
    const isTeacherRole = currentUser.role === 'teacher';
    const isGeneralSupervisorRole = currentUser.role === 'general_supervisor';
    const teacherObj = teachers.find(
      (t) => t.id === currentUser.teacherId || t.name === currentUser.name || t.id === currentUser.id
    );
    const circleName = teacherObj?.circleName || (currentUser as any).circleName || 'حلقة القرآن الكريم';
    const assignedCount = currentUser.assignedTeacherIds?.length || 0;

    return (
      <header
        className={`fixed ${
          isSuperAdmin ? 'top-11' : 'top-0'
        } right-0 lg:right-72 left-0 h-14 bg-white/95 backdrop-blur-md border-b border-gray-100/90 z-40 flex items-center justify-between px-3 sm:px-6 transition-all duration-200 shadow-2xs`}
        dir="rtl"
      >
        {/* Right Side: Logo & Academy Name */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/icon.svg';
            }}
            alt="شعار الأكاديمية"
            className="w-8 h-8 rounded-lg aspect-square object-contain shadow-2xs"
          />
          <span className="font-bold text-sm sm:text-base text-[#125862] tracking-tight">
            أكاديمية المسلم الصغير
          </span>
        </div>

        {/* Left Side: Account Button with Menu */}
        <div className="relative" ref={teacherAccountRef}>
          <button
            onClick={() => setIsTeacherAccountOpen(!isTeacherAccountOpen)}
            className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-xl bg-gray-50 hover:bg-[#EAF5F7] border border-gray-200/80 text-[#125862] transition-colors flex items-center gap-2 cursor-pointer shadow-2xs active:scale-98"
            aria-label={
              isTeacherRole
                ? 'حساب المعلم'
                : isGeneralSupervisorRole
                ? 'حساب المشرف العام'
                : 'حساب المشرف'
            }
            aria-expanded={isTeacherAccountOpen}
          >
            <div className="w-8 h-8 rounded-full bg-[#1A7B88] text-white font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
              {currentUser.initials}
            </div>
            <span className="hidden sm:inline-block font-bold text-xs text-gray-800 max-w-[120px] truncate">
              {currentUser.name.split(' ')[0]}
            </span>
            <span className="material-symbols-outlined text-gray-500 text-lg">
              {isTeacherAccountOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Account Popover Menu */}
          {isTeacherAccountOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 z-50 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 text-right">
              {/* User Info Card */}
              <div className="p-3 rounded-xl bg-[#F5F5F7] border border-[#1A7B88]/15 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1A7B88] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                  {currentUser.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] text-gray-500 font-medium block">أهلًا بك</span>
                  <h4 className="font-bold text-sm text-gray-900 truncate">{currentUser.name}</h4>
                  <span className="inline-block mt-0.5 text-xs text-[#1A7B88] font-semibold truncate">
                    {isTeacherRole
                      ? circleName
                      : isGeneralSupervisorRole
                      ? currentUser.title || 'المشرف العام للأكاديمية'
                      : `${currentUser.title || 'مشرف تعليمي'} · ${assignedCount} معلمين`}
                  </span>
                </div>
              </div>

              {/* Role Preview Banner for Super Admin */}
              {isSuperAdmin && previewRole && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-sm text-amber-600">visibility</span>
                    <span>
                      {previewRole === 'teacher'
                        ? 'معاينة بوابة المعلم'
                        : previewRole === 'general_supervisor'
                        ? 'معاينة بوابة المشرف العام'
                        : 'معاينة بوابة المشرف التعليمي'}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-snug">
                    أنت تتصفح حالياً بوضع المعاينة المخصص للإدارة.
                  </p>
                  <button
                    onClick={() => {
                      setIsTeacherAccountOpen(false);
                      setPreviewRole(null);
                    }}
                    className="min-h-[44px] mt-1 w-full py-2 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>العودة للوحة الإدارة العامة</span>
                  </button>
                </div>
              )}

              {/* PWA Install Button in Account Menu */}
              <div className="px-1 pt-1">
                <PWAInstallButton variant="sidebar" />
              </div>

              {/* Refresh Data */}
              <button
                onClick={() => {
                  fetchFromSupabase();
                  setIsTeacherAccountOpen(false);
                }}
                className="min-h-[44px] w-full px-3 py-2 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-[#125862] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base text-gray-400">sync</span>
                <span>تحديث البيانات من السيرفر</span>
              </button>

              {/* Logout Button */}
              <div className="pt-1 border-t border-gray-100">
                <button
                  onClick={() => {
                    setIsTeacherAccountOpen(false);
                    logout();
                  }}
                  className="min-h-[44px] w-full px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>تسجيل الخروج</span>
                  </div>
                  <span className="text-[10px] text-rose-400 font-normal">إنهاء الجلسة</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header
      className={`fixed ${
        isSuperAdmin ? 'top-11' : 'top-0'
      } right-0 lg:right-72 left-0 h-14 bg-white/95 backdrop-blur-md border-b border-gray-200/80 z-40 flex items-center justify-between px-3 sm:px-6 transition-all duration-200 shadow-2xs`}
    >
      {/* Right Side in RTL: Breadcrumb & Mobile Menu */}
      <div className="flex items-center gap-2.5">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden min-h-[40px] min-w-[40px] rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-[#125862] hover:bg-[#EAF5F7] transition-colors cursor-pointer"
          title="القائمة الجانبية"
          aria-label="القائمة الجانبية"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>

        <div className="flex items-center gap-2">
          <img
            src="/logo.jpg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/icon.svg';
            }}
            alt="شعار الأكاديمية"
            className="w-8 h-8 rounded-lg aspect-square object-contain shadow-2xs"
          />
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className="font-bold text-sm sm:text-base text-[#125862] tracking-tight">
              أكاديمية المسلم الصغير
            </span>
            <span className="material-symbols-outlined text-xs sm:text-sm text-gray-400">chevron_left</span>
            <span className="text-xs text-gray-500 hidden md:inline font-medium">
              نظام المتابعة الإدارية
            </span>
          </div>
        </div>
      </div>

      {/* Screen Switcher Tab (لوحة التحكم vs شاشة الطلاب vs شاشة المعلمين) */}
      <div className="hidden sm:flex items-center bg-[#EAF5F7] p-1 rounded-xl border border-[#1A7B88]/20 shadow-2xs">
        <button
          onClick={() => onSelectTab && onSelectTab('dashboard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#1A7B88] text-white shadow-xs'
              : 'text-gray-700 hover:text-[#125862] hover:bg-white/60'
          }`}
          title="الانتقال إلى اللوحة التنفيذية"
        >
          <span className="material-symbols-outlined text-base">dashboard</span>
          <span>لوحة التحكم</span>
        </button>
        <button
          onClick={() => onSelectTab && onSelectTab('students')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-[#1A7B88] text-white shadow-xs'
              : 'text-gray-700 hover:text-[#125862] hover:bg-white/60'
          }`}
          title="الانتقال إلى شاشة متابعة الطلاب"
        >
          <span className="material-symbols-outlined text-base">school</span>
          <span>شاشة الطلاب</span>
        </button>
        <button
          onClick={() => onSelectTab && onSelectTab('teachers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-[#1A7B88] text-white shadow-xs'
              : 'text-gray-700 hover:text-[#125862] hover:bg-white/60'
          }`}
          title="الانتقال إلى شاشة متابعة المعلمين"
        >
          <span className="material-symbols-outlined text-base">badge</span>
          <span>شاشة المعلمين</span>
        </button>
      </div>

      {/* Left Side in RTL: PWA Install, Search, Notifications, Profile Badge & Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* PWA Install Button */}
        <PWAInstallButton variant="header" />

        {/* Search Bar */}
        <div className="relative hidden md:block">
          <span className="material-symbols-outlined absolute right-3 top-2.5 text-gray-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="بحث عن طالب أو تقرير..."
            className="w-48 lg:w-56 h-9 pr-9 pl-3 rounded-xl bg-gray-50 text-gray-900 placeholder:text-gray-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 border border-gray-200 transition-all"
          />
        </div>

        {/* User Role Badge & Logout (Strict Authenticated Role Only) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#EAF5F7] border border-[#1A7B88]/20 text-[#125862] text-xs font-bold shadow-2xs">
            <span className="material-symbols-outlined text-base">
              {currentUser.role === 'manager' ? 'admin_panel_settings' : 'shield_person'}
            </span>
            <span className="hidden sm:inline">الدور:</span>
            <span>{currentUser.title || (currentUser.role === 'manager' ? 'المدير العام' : 'المشرف')}</span>
          </div>
          <button
            onClick={logout}
            className="min-h-[36px] min-w-[36px] p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            title="تسجيل الخروج"
            aria-label="تسجيل الخروج"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-[#EAF5F7] hover:text-[#125862] transition-colors"
            title="الإشعارات والتنبيهات التلقائية"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#ba1a1a] text-white text-[11px] font-bold flex items-center justify-center leading-none animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications dropdown popup */}
          {showNotifications && (
            <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-gray-200 py-2 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#1A7B88] text-lg">
                    notifications_active
                  </span>
                  <span className="font-bold text-sm text-[#125862]">التنبيهات التلقائية</span>
                  <span className="text-xs bg-[#ffdad6] text-[#93000a] px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} جديد
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-xs text-[#1A7B88] hover:underline cursor-pointer"
                  >
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>

              {/* Overdue Alert Banner with actual student names */}
              {overdueStudents.length > 0 && (
                <div className="p-3 bg-[#fff0f0] border-b border-[#ffdad6]">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-[#ba1a1a] text-white flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-xs">priority_high</span>
                      </span>
                      <span className="text-xs font-bold text-[#ba1a1a]">
                        {overdueStudents.length} طلاب تجاوزوا 14 يوماً بدون تقرير:
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white font-bold flex-shrink-0">
                      مطلوب إجراء
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {overdueStudents.map((s) => {
                      const teacher = getTeacherById(s.teacherId);
                      const days = getDaysSinceLastReport(s.lastReportDate);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-[#ffdad6] text-[11px] shadow-2xs"
                        >
                          <span className="font-bold text-[#ba1a1a]">{s.name}</span>
                          <span className="text-[#6f7979]">({days} يوماً)</span>
                          <span className="text-[#005253] text-[10px] bg-[#f0f3ff] px-1 rounded">
                            {teacher?.name?.split(' ')[0] || 'معلم'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="max-h-80 overflow-y-auto divide-y divide-[#f0f3ff]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#6f7979]">
                    لا توجد إشعارات حالياً
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markNotificationAsRead(notif.id)}
                      className={`p-3 hover:bg-[#f9f9ff] transition-colors cursor-pointer flex items-start gap-2.5 ${
                        !notif.read ? 'bg-[#dee8ff]/30' : ''
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          notif.type === 'urgent'
                            ? 'bg-[#ffdad6] text-[#93000a]'
                            : notif.type === 'warning'
                            ? 'bg-[#ffdea9] text-[#7d5800]'
                            : notif.type === 'success'
                            ? 'bg-[#a6eff1] text-[#005253]'
                            : 'bg-[#dee8ff] text-[#005253]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {notif.type === 'urgent'
                            ? 'warning'
                            : notif.type === 'warning'
                            ? 'hourglass_empty'
                            : notif.type === 'success'
                            ? 'check_circle'
                            : 'info'}
                        </span>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#111c2d] truncate">
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-[#6f7979] flex-shrink-0">
                            {notif.date}
                          </span>
                        </div>
                        <p className="text-xs text-[#3f4949] mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-[#005253] flex-shrink-0 mt-2"></span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {onOpenActivityLog && (
                <div className="p-2 border-t border-[#bec8c8]/20 bg-[#f9f9ff]">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onOpenActivityLog();
                    }}
                    className="w-full py-1.5 rounded-lg text-xs font-semibold text-[#005253] hover:bg-[#e7eeff] transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">history</span>
                    <span>فتح سجل التعديلات الكامل (Activity Log)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Activity Log Quick Button */}
        {onOpenActivityLog && (
          <button
            onClick={onOpenActivityLog}
            className="w-10 h-10 rounded-xl bg-[#f0f3ff] flex items-center justify-center text-[#3f4949] hover:bg-[#dee8ff] hover:text-[#111c2d] transition-colors hidden sm:flex"
            title="سجل التعديلات والعمليات"
          >
            <span className="material-symbols-outlined text-xl">history</span>
          </button>
        )}

        {/* User profile with online indicator */}
        <div className="flex items-center gap-2 sm:gap-2.5 pr-1 pl-1">
          <div className="flex flex-col text-left">
            <span className="text-xs sm:text-sm font-semibold text-[#111c2d] max-w-[110px] truncate">
              {currentUser.name}
            </span>
            <div className="flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#005253] animate-pulse"></span>
              <span className="text-[10px] text-[#6f7979]">متصل</span>
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#005253] text-white flex items-center justify-center font-bold text-sm ring-2 ring-[#005253]/20 shadow-sm">
              {currentUser.initials}
            </div>
            <span className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white"></span>
          </div>
        </div>
      </div>
    </header>
  );
};
