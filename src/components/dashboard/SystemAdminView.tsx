import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Teacher, Supervisor } from '../../types';
import { AddSystemUserModal } from '../modals/AddSystemUserModal';
import { ChangeSupervisorModal } from '../modals/ChangeSupervisorModal';
import { UserInviteModal } from '../modals/UserInviteModal';
import { SystemAdminSecurityModal } from '../modals/SystemAdminSecurityModal';

interface UnifiedUserRow {
  id: string;
  name: string;
  role: 'teacher' | 'sub_supervisor' | 'general_supervisor' | 'manager' | 'system_admin';
  roleTitle: string;
  email: string;
  phone: string;
  track: string;
  initials: string;
  supervisorId?: string;
  supervisorName?: string;
  assignedTeachersCount?: number;
  originalTeacher?: Teacher;
  originalSupervisor?: Supervisor;
}

export const SystemAdminView: React.FC = () => {
  const { teachers, supervisors, fetchFromSupabase, isSyncing, isSuperAdmin } = useApp();

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [unassignedOnly, setUnassignedOnly] = useState(false);

  // Modals State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [selectedTeacherForChangeSup, setSelectedTeacherForChangeSup] = useState<Teacher | null>(null);
  const [selectedUserForInvite, setSelectedUserForInvite] = useState<UnifiedUserRow | null>(null);

  // Unify Teachers & Supervisors into consistent, normalized list
  const unifiedUsers: UnifiedUserRow[] = useMemo(() => {
    const list: UnifiedUserRow[] = [];

    // 1. Teachers
    teachers.forEach((t) => {
      const sup = supervisors.find((s) => s.id === t.supervisorId);
      list.push({
        id: t.id,
        name: t.name,
        role: 'teacher',
        roleTitle: 'معلم حلقة',
        email: t.email || '—',
        phone: t.phone || '—',
        track: t.notes?.includes('مسار:') ? t.notes.split('مسار:')[1].trim() : t.track || 'القرآن الكريم',
        initials: t.initials,
        supervisorId: t.supervisorId,
        supervisorName: sup ? sup.name : undefined,
        originalTeacher: t,
      });
    });

    // 2. Supervisors & Managers
    supervisors.forEach((s) => {
      const supervisedCount = teachers.filter((t) => t.supervisorId === s.id).length;
      list.push({
        id: s.id,
        name: s.name,
        role: s.role as any,
        roleTitle: s.title || (s.role === 'manager' ? 'المدير العام' : 'مشرف'),
        email: s.email,
        phone: '—',
        track: s.department || 'عام',
        initials: s.initials,
        assignedTeachersCount: supervisedCount,
        originalSupervisor: s,
      });
    });

    return list;
  }, [teachers, supervisors]);

  // Real KPI Metrics
  const totalTeachers = teachers.length;
  const totalSupervisors = supervisors.filter(
    (s) => s.role === 'sub_supervisor' || s.role === 'general_supervisor'
  ).length;
  const unassignedTeachersCount = teachers.filter((t) => {
    if (!t.supervisorId) return true;
    const exists = supervisors.some((s) => s.id === t.supervisorId);
    return !exists;
  }).length;
  const totalUsersCount = unifiedUsers.length;

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return unifiedUsers.filter((u) => {
      // 1. Unassigned filter
      if (unassignedOnly) {
        if (u.role !== 'teacher') return false;
        if (u.supervisorName) return false;
      }

      // 2. Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'teacher' && u.role !== 'teacher') return false;
        if (roleFilter === 'sub_supervisor' && u.role !== 'sub_supervisor') return false;
        if (roleFilter === 'general_supervisor' && u.role !== 'general_supervisor') return false;
        if (roleFilter === 'manager' && u.role !== 'manager' && u.role !== 'system_admin') return false;
      }

      // 3. Track filter
      if (trackFilter !== 'all') {
        if (trackFilter === 'boys' && !u.track.includes('بنين')) return false;
        if (trackFilter === 'girls' && !u.track.includes('فتيات') && !u.track.includes('بنات')) return false;
      }

      // 4. Search term (name, email, phone)
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesPhone = u.phone.toLowerCase().includes(q);
        const matchesSup = u.supervisorName?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesSup) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedUsers, roleFilter, trackFilter, unassignedOnly, searchTerm]);

  // Security gate check (Fail safe)
  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
        <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">lock</span>
        <h3 className="text-base font-bold text-gray-800">هذه الشاشة مخصصة لمسؤول النظام فقط</h3>
        <p className="text-xs text-gray-500 mt-1">ليس لديك صلاحية الوصول إلى لوحة إدارة النظام.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#EAF5F7] text-[#125862] material-symbols-outlined text-xl">
              admin_panel_settings
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
              إدارة النظام والارتباطات
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            إضافة المعلمين والمشرفين وإدارة إسناد الحلقات والهيئة الإشرافية في قاعدة البيانات
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSecurityModalOpen(true)}
            title="إرشادات حماية قاعدة البيانات ونشر وظيفة الدعوات"
            className="min-h-[42px] px-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-base text-[#1A7B88]">security</span>
            <span className="hidden sm:inline">حماية RLS والنشر</span>
          </button>

          <button
            onClick={() => fetchFromSupabase()}
            disabled={isSyncing}
            title="تحديث البيانات من Supabase"
            className="min-h-[42px] px-3.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <span
              className={`material-symbols-outlined text-base text-[#1A7B88] ${
                isSyncing ? 'animate-spin' : ''
              }`}
            >
              sync
            </span>
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="min-h-[42px] px-4 sm:px-5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>إضافة مستخدم جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Teachers */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 block mb-1">إجمالي المعلمين</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight">
              {totalTeachers}
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5">في حلقات التحفيظ</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#EAF5F7] text-[#125862] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">school</span>
          </div>
        </div>

        {/* Total Supervisors */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 block mb-1">إجمالي المشرفين</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight">
              {totalSupervisors}
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5">مشرف فرعي وعام</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">supervisor_account</span>
          </div>
        </div>

        {/* Unassigned Teachers */}
        <div
          onClick={() => setUnassignedOnly(!unassignedOnly)}
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
            unassignedTeachersCount > 0
              ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-50'
              : 'bg-white border-gray-200/80'
          }`}
        >
          <div>
            <span
              className={`text-xs font-bold block mb-1 ${
                unassignedTeachersCount > 0 ? 'text-amber-800' : 'text-gray-500'
              }`}
            >
              معلمون بحاجة لإسناد
            </span>
            <span
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                unassignedTeachersCount > 0 ? 'text-amber-700' : 'text-[#1D1D1F]'
              }`}
            >
              {unassignedTeachersCount}
            </span>
            <span
              className={`text-[11px] block mt-0.5 ${
                unassignedTeachersCount > 0 ? 'text-amber-700 font-bold' : 'text-gray-400'
              }`}
            >
              {unassignedTeachersCount > 0 ? 'اضغط للتصفية الفورية' : 'جميع المعلمين مسندون'}
            </span>
          </div>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              unassignedTeachersCount > 0
                ? 'bg-amber-200 text-amber-900'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {unassignedTeachersCount > 0 ? 'link_off' : 'verified'}
            </span>
          </div>
        </div>

        {/* Total System Users */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 block mb-1">مستخدمو المنظومة</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight">
              {totalUsersCount}
            </span>
            <span className="text-[11px] text-gray-400 block mt-0.5">معلمون وإداريون</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute right-3.5 top-3 text-gray-400 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم، البريد الإلكتروني، أو رقم الهاتف..."
              className="w-full min-h-[42px] pr-10 pl-4 rounded-xl bg-[#F5F5F7] border border-transparent hover:border-gray-300 focus:border-[#1A7B88] focus:bg-white text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/20 transition-all placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-2.5 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          {/* Quick Toggle: Unassigned Only */}
          <button
            onClick={() => setUnassignedOnly(!unassignedOnly)}
            className={`min-h-[42px] px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border cursor-pointer whitespace-nowrap active:scale-98 ${
              unassignedOnly
                ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="material-symbols-outlined text-base">link_off</span>
            <span>غير المرتبطين فقط ({unassignedTeachersCount})</span>
          </button>
        </div>

        {/* Secondary Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          {/* Role Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-gray-400 font-bold ml-1 text-[11px]">الدور:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'teacher', label: 'المعلمون' },
              { id: 'sub_supervisor', label: 'المشرفون الفرعيون' },
              { id: 'general_supervisor', label: 'المشرف العام' },
              { id: 'manager', label: 'الإدارة' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  roleFilter === tab.id
                    ? 'bg-[#1A7B88] text-white shadow-2xs'
                    : 'bg-[#F5F5F7] text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Track Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 font-bold ml-1 text-[11px]">المسار:</span>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'boys', label: 'بنين' },
              { id: 'girls', label: 'فتيات' },
            ].map((tr) => (
              <button
                key={tr.id}
                onClick={() => setTrackFilter(tr.id)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  trackFilter === tr.id
                    ? 'bg-gray-800 text-white'
                    : 'bg-[#F5F5F7] text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Users List Section */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Table / List Header */}
        <div className="px-5 py-3.5 bg-[#F5F5F7] border-b border-gray-200/80 flex items-center justify-between text-xs font-bold text-gray-600">
          <span>قائمة المستخدمين المعتمدين ({filteredUsers.length})</span>
          <span className="text-gray-400 text-[11px]">قاعدة بيانات Supabase المباشرة</span>
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <span className="material-symbols-outlined text-3xl">person_search</span>
            </div>
            <h3 className="font-bold text-base text-gray-800">لا توجد نتائج مطابقة</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              لم نعثر على مستخدمين يطابقون خيارات البحث والفلاتر المحددة حالياً.
            </p>
            {(searchTerm || roleFilter !== 'all' || trackFilter !== 'all' || unassignedOnly) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setTrackFilter('all');
                  setUnassignedOnly(false);
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
              >
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>
        ) : (
          /* User Cards List (Responsive for mobile & desktop) */
          <div className="divide-y divide-gray-100">
            {filteredUsers.map((user) => {
              const isTeacher = user.role === 'teacher';
              const isSubSupervisor = user.role === 'sub_supervisor';
              const hasSupervisor = Boolean(user.supervisorName);

              return (
                <div
                  key={user.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors"
                >
                  {/* User Profile Block */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-2xs ${
                        isTeacher
                          ? 'bg-[#1A7B88]'
                          : isSubSupervisor
                          ? 'bg-indigo-600'
                          : user.role === 'manager' || user.role === 'system_admin'
                          ? 'bg-amber-600'
                          : 'bg-[#125862]'
                      }`}
                    >
                      {user.initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm sm:text-base text-[#1D1D1F] truncate">
                          {user.name}
                        </h4>

                        {/* Role Badge */}
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isTeacher
                              ? 'bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20'
                              : isSubSupervisor
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : user.role === 'manager' || user.role === 'system_admin'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {user.roleTitle}
                        </span>

                        {/* Track Badge */}
                        {user.track && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                            {user.track}
                          </span>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                        {user.email !== '—' && (
                          <span className="font-mono text-gray-700 dir-ltr flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-gray-400">
                              mail
                            </span>
                            {user.email}
                          </span>
                        )}
                        {user.phone !== '—' && (
                          <span className="font-mono text-gray-700 dir-ltr flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-emerald-600">
                              call
                            </span>
                            {user.phone}
                          </span>
                        )}
                      </div>

                      {/* Linking Relationship Block */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {isTeacher && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">المشرف المسؤول:</span>
                            {hasSupervisor ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                <span className="material-symbols-outlined text-sm text-emerald-600">
                                  check_circle
                                </span>
                                {user.supervisorName}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
                                <span className="material-symbols-outlined text-sm text-rose-600">
                                  warning
                                </span>
                                غير مرتبط بأي مشرف
                              </span>
                            )}
                          </div>
                        )}

                        {isSubSupervisor && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <span className="text-gray-500">المعلمون التابعون:</span>
                            <span className="font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {user.assignedTeachersCount} معلماً
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Block */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    {/* Change Supervisor Action (For Teachers) */}
                    {isTeacher && user.originalTeacher && (
                      <button
                        onClick={() => setSelectedTeacherForChangeSup(user.originalTeacher!)}
                        className="min-h-[38px] px-3 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-2xs"
                      >
                        <span className="material-symbols-outlined text-base text-[#1A7B88]">
                          supervisor_account
                        </span>
                        <span>تغيير المشرف</span>
                      </button>
                    )}

                    {/* Administrative Follow-up via WhatsApp Action */}
                    <button
                      onClick={() => setSelectedUserForInvite(user)}
                      className="min-h-[38px] px-3 rounded-xl bg-[#EAF5F7] hover:bg-[#d6ecf0] text-[#125862] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-98"
                      title="متابعة وتنسيق إداري عبر واتساب"
                    >
                      <span className="material-symbols-outlined text-base text-emerald-600">
                        chat
                      </span>
                      <span>متابعة وتواصل</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Add User Modal */}
      <AddSystemUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onSuccess={() => fetchFromSupabase()}
      />

      {/* 2. Change Supervisor Modal */}
      <ChangeSupervisorModal
        isOpen={Boolean(selectedTeacherForChangeSup)}
        teacher={selectedTeacherForChangeSup}
        onClose={() => setSelectedTeacherForChangeSup(null)}
        onSuccess={() => fetchFromSupabase()}
      />

      {/* 3. User Invite & WhatsApp Modal */}
      <UserInviteModal
        isOpen={Boolean(selectedUserForInvite)}
        user={selectedUserForInvite}
        onClose={() => setSelectedUserForInvite(null)}
      />

      {/* 4. Security & Deployment Guide Modal */}
      <SystemAdminSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
    </div>
  );
};
