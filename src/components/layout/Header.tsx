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

  // Dedicated Minimalist Clean Header for Teacher Portal (Unified Slim Navbar)
  if (currentUser.role === 'teacher') {
    const teacherObj = teachers.find(
      (t) => t.id === currentUser.teacherId || t.name === currentUser.name || t.id === currentUser.id
    );
    const circleName = teacherObj?.circleName || (currentUser as any).circleName || 'حلقة القرآن الكريم';

    return (
      <header
        className={`fixed ${
          isSuperAdmin ? 'top-11' : 'top-0'
        } right-0 lg:right-72 left-0 h-14 bg-white/95 backdrop-blur-md border-b border-gray-100/90 z-40 flex items-center justify-between px-4 sm:px-6 transition-all duration-200 shadow-2xs`}
      >
        {/* Right Side: Small Academy Logo & Academy Name */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden w-8 h-8 rounded-lg bg-gray-50 border border-gray-200/70 flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors"
            title="القائمة الجانبية"
          >
            <span className="material-symbols-outlined text-lg">menu</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-base">menu_book</span>
            </div>
            <span className="font-bold text-sm sm:text-base text-gray-900 tracking-tight">
              أكاديمية المسلم الصغير
            </span>
          </div>
        </div>

        {/* Left Side: Teacher Name Badge & Light Logout Button */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
              {currentUser.initials}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-gray-800">
                {currentUser.name}
              </span>
              <span className="hidden sm:inline-block text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                {circleName}
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          <button
            onClick={logout}
            className="px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer text-xs font-medium"
            title="تسجيل الخروج"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span className="hidden sm:inline">تسجيل خروج</span>
          </button>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`fixed ${
        isSuperAdmin ? 'top-11' : 'top-0'
      } right-0 lg:right-72 left-0 h-16 bg-[#f9f9ff]/90 backdrop-blur-xl border-b border-[#bec8c8]/20 z-40 flex items-center justify-between px-4 sm:px-6 transition-all duration-200`}
    >
      {/* Right Side in RTL: Breadcrumb & Mobile Menu */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-9 h-9 rounded-xl bg-white border border-[#bec8c8]/30 flex items-center justify-center text-[#005253] hover:bg-[#e7eeff] transition-colors"
          title="القائمة الجانبية"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>

        <div className="flex items-center gap-1.5 text-[#6f7979]">
          <span className="font-semibold text-sm sm:text-base text-[#111c2d]">
            منصة الإدارة والتحفيظ
          </span>
          <span className="material-symbols-outlined text-sm sm:text-base">chevron_left</span>
          <span className="text-xs sm:text-sm text-[#6f7979] hidden md:inline">
            متابعة الحلقات اليومية
          </span>
        </div>
      </div>

      {/* Screen Switcher Tab (لوحة التحكم vs شاشة الطلاب vs شاشة المعلمين) */}
      <div className="hidden sm:flex items-center bg-[#f0f3ff] p-1 rounded-xl border border-[#bec8c8]/30 shadow-xs">
        <button
          onClick={() => onSelectTab && onSelectTab('dashboard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#005253] text-white shadow-xs'
              : 'text-[#3f4949] hover:text-[#005253] hover:bg-white/60'
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
              ? 'bg-[#005253] text-white shadow-xs'
              : 'text-[#3f4949] hover:text-[#005253] hover:bg-white/60'
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
              ? 'bg-[#005253] text-white shadow-xs'
              : 'text-[#3f4949] hover:text-[#005253] hover:bg-white/60'
          }`}
          title="الانتقال إلى شاشة متابعة المعلمين"
        >
          <span className="material-symbols-outlined text-base">badge</span>
          <span>شاشة المعلمين</span>
        </button>
      </div>

      {/* Left Side in RTL: PWA Install, Search, Notifications, Profile Badge & Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* PWA Install Button */}
        <PWAInstallButton variant="header" />

        {/* Search Bar */}
        <div className="relative hidden md:block">
          <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#6f7979] text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="بحث سريع عن طالب، حلقة، أو تقرير..."
            className="w-56 lg:w-64 h-10 pr-9 pl-4 rounded-xl bg-[#f0f3ff] text-[#111c2d] placeholder:text-[#6f7979] text-sm focus:outline-none focus:ring-2 focus:ring-[#005253]/30 transition-all"
          />
        </div>

        {/* User Role Badge & Logout (Strict Authenticated Role Only) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#e7eeff] border border-[#bec8c8]/30 text-[#005253] text-xs sm:text-sm font-semibold shadow-xs">
            <span className="material-symbols-outlined text-base sm:text-lg">
              {currentUser.role === 'manager' ? 'admin_panel_settings' : 'shield_person'}
            </span>
            <span className="hidden sm:inline">الدور:</span>
            <span>{currentUser.title || (currentUser.role === 'manager' ? 'المدير العام' : 'المشرف')}</span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#ba1a1a] border border-rose-200 transition-colors flex items-center justify-center cursor-pointer"
            title="تسجيل الخروج"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-10 h-10 rounded-xl bg-[#f0f3ff] flex items-center justify-center text-[#3f4949] hover:bg-[#dee8ff] hover:text-[#111c2d] transition-colors"
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
            <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-[#bec8c8]/30 py-2 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-[#bec8c8]/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#005253] text-lg">
                    notifications_active
                  </span>
                  <span className="font-bold text-sm text-[#111c2d]">التنبيهات التلقائية</span>
                  <span className="text-xs bg-[#ffdad6] text-[#93000a] px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} جديد
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-xs text-[#005253] hover:underline cursor-pointer"
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
