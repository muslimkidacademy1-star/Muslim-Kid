import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface HeaderProps {
  activeTab?: string;
  onSelectTab?: (tab: 'students' | 'teachers') => void;
  onSearch?: (term: string) => void;
  onOpenActivityLog?: () => void;
  onOpenAddStudent?: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'students',
  onSelectTab,
  onSearch,
  onOpenActivityLog,
  onOpenAddStudent,
  onToggleSidebar,
}) => {
  const {
    currentUser,
    switchUserRole,
    notifications,
    students,
    isOverdue,
    getTeacherById,
    getDaysSinceLastReport,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    logout,
    resetDatabase,
    isSupabaseConnected,
    isSyncing,
    fetchFromSupabase,
  } = useApp();

  const currentRole: UserRole = currentUser.role;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const overdueStudents = students.filter(
    (s) => s.status === 'active' && isOverdue(s.lastReportDate)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
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

  const handleRoleChange = (role: UserRole) => {
    switchUserRole(role);
    setShowRoleMenu(false);
  };

  return (
    <header className="fixed top-0 right-0 lg:right-72 left-0 h-16 bg-[#f9f9ff]/90 backdrop-blur-xl border-b border-[#bec8c8]/20 z-40 flex items-center justify-between px-4 sm:px-6">
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

        {/* Semester pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-[#dee8ff] rounded-full text-[#005253] text-xs font-semibold">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          <span>الفصل الدراسي الثاني 1445 - 2024</span>
        </div>
      </div>

      {/* Screen Switcher Tab (شاشة الطلاب vs شاشة المعلمين) - مخفية لدور المعلم */}
      {currentUser.role !== 'teacher' && (
        <div className="flex items-center bg-[#f0f3ff] p-1 rounded-xl border border-[#bec8c8]/30 shadow-xs">
          <button
            onClick={() => onSelectTab && onSelectTab('students')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab !== 'teachers'
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
      )}

      {/* Left Side in RTL: PWA Install, Cloud Sync, Search, Role Switcher, Notifications, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Supabase Cloud Connection Indicator Pill */}
        <button
          onClick={() => fetchFromSupabase()}
          disabled={isSyncing}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#e7eeff] hover:bg-[#dee8ff] text-[#005253] text-[11px] font-bold border border-[#bec8c8]/30 transition-all cursor-pointer"
          title="متصل بسحابة Supabase - انقر للمزامنة الفورية"
        >
          <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'} ${isSyncing ? 'animate-ping' : ''}`}></span>
          <span className="material-symbols-outlined text-sm">
            {isSyncing ? 'sync' : 'cloud_done'}
          </span>
          <span className="hidden xl:inline">{isSyncing ? 'مزامنة...' : 'سحابة Supabase'}</span>
        </button>

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

        {/* Quick Role Switcher Pill - متاح فقط للمدير العام والمشرف العام للتجربة والمتابعة */}
        {(currentUser.role === 'manager' || currentUser.role === 'general_supervisor') ? (
          <div className="relative" ref={roleRef}>
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#e7eeff] border border-[#bec8c8]/30 text-[#005253] hover:bg-[#dee8ff] transition-all text-xs sm:text-sm font-semibold shadow-xs"
              title="تبديل مستوى الصلاحية (Role Switcher)"
            >
              <span className="material-symbols-outlined text-base sm:text-lg">
                {currentUser.role === 'manager'
                  ? 'admin_panel_settings'
                  : 'shield_person'}
              </span>
              <span className="hidden sm:inline">الدور:</span>
              <span className="underline decoration-dotted">{currentUser.title}</span>
              <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>

            {/* Role selection dropdown */}
            {showRoleMenu && (
              <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white shadow-xl border border-[#bec8c8]/30 py-2 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-[#bec8c8]/20 bg-[#f9f9ff]">
                  <span className="text-xs font-bold text-[#005253] block">
                    تبديل مستوى الصلاحية (تجربة الإدارة)
                  </span>
                  <span className="text-[11px] text-[#6f7979]">
                    معاينة النظام بالصلاحيات المختلفة
                  </span>
                </div>

                <div className="p-1 space-y-1">
                  <button
                    onClick={() => handleRoleChange('general_supervisor')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition-colors ${
                      currentRole === 'general_supervisor'
                        ? 'bg-[#005253] text-white'
                        : 'hover:bg-[#f0f3ff] text-[#111c2d]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">shield_person</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">المشرف العام</span>
                        <span
                          className={`text-[10px] ${
                            currentRole === 'general_supervisor'
                              ? 'text-[#a6eff1]'
                              : 'text-[#6f7979]'
                          }`}
                        >
                          كل الطلاب والمعلمين بدون ماليات دقيقة
                        </span>
                      </div>
                    </div>
                    {currentRole === 'general_supervisor' && (
                      <span className="material-symbols-outlined text-base">check</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleRoleChange('sub_supervisor')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition-colors ${
                      currentRole === 'sub_supervisor'
                        ? 'bg-[#005253] text-white'
                        : 'hover:bg-[#f0f3ff] text-[#111c2d]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">supervisor_account</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">مشرف فرعي (تعليمي)</span>
                        <span
                          className={`text-[10px] ${
                            currentRole === 'sub_supervisor'
                              ? 'text-[#a6eff1]'
                              : 'text-[#6f7979]'
                          }`}
                        >
                          فقط الطلاب والمعلمين المكلف بهم (4 معلمين)
                        </span>
                      </div>
                    </div>
                    {currentRole === 'sub_supervisor' && (
                      <span className="material-symbols-outlined text-base">check</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleRoleChange('manager')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition-colors ${
                      currentRole === 'manager'
                        ? 'bg-[#005253] text-white'
                        : 'hover:bg-[#f0f3ff] text-[#111c2d]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">المدير العام والمالية</span>
                        <span
                          className={`text-[10px] ${
                            currentRole === 'manager'
                              ? 'text-[#a6eff1]'
                              : 'text-[#6f7979]'
                          }`}
                        >
                          صلاحية كاملة + الكروت والرسم المالي
                        </span>
                      </div>
                    </div>
                    {currentRole === 'manager' && (
                      <span className="material-symbols-outlined text-base">check</span>
                    )}
                  </button>

                  <button
                    onClick={() => handleRoleChange('teacher')}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition-colors ${
                      currentRole === 'teacher'
                        ? 'bg-[#005253] text-white'
                        : 'hover:bg-[#f0f3ff] text-[#111c2d]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">school</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">معلم حلقة قرآن</span>
                        <span
                          className={`text-[10px] ${
                            currentRole === 'teacher'
                              ? 'text-[#a6eff1]'
                              : 'text-[#6f7979]'
                          }`}
                        >
                          واجهة مبسطة لطلابه فقط + زر تسليم تقرير 8 حصص
                        </span>
                      </div>
                    </div>
                    {currentRole === 'teacher' && (
                      <span className="material-symbols-outlined text-base">check</span>
                    )}
                  </button>
                </div>

                <div className="px-2 pt-2 border-t border-[#bec8c8]/20 flex items-center justify-between gap-1">
                  <button
                    onClick={() => {
                      resetDatabase();
                      setShowRoleMenu(false);
                    }}
                    className="text-[11px] text-[#7d5800] hover:underline flex items-center gap-1 p-1"
                    title="استعادة البيانات الأصلية"
                  >
                    <span className="material-symbols-outlined text-xs">restart_alt</span>
                    <span>إعادة ضبط البيانات</span>
                  </button>
                  <button
                    onClick={logout}
                    className="text-[11px] text-[#ba1a1a] hover:underline flex items-center gap-1 p-1"
                  >
                    <span className="material-symbols-outlined text-xs">logout</span>
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#e7eeff] border border-[#bec8c8]/30 text-[#005253] text-xs sm:text-sm font-semibold shadow-xs">
              <span className="material-symbols-outlined text-base sm:text-lg">
                {currentUser.role === 'teacher' ? 'school' : 'supervisor_account'}
              </span>
              <span className="hidden sm:inline">الدور:</span>
              <span>{currentUser.title}</span>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-[#ba1a1a] border border-rose-200 transition-colors flex items-center justify-center cursor-pointer"
              title="تسجيل الخروج"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        )}

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
