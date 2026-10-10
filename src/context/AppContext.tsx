import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import * as XLSX from 'xlsx';
import {
  Supervisor,
  Teacher,
  Student,
  Report,
  ActivityLog,
  AppNotification,
  UserRole,
  FinancialMonth,
  SessionLog,
} from '../types';
import { INITIAL_SUPERVISORS } from '../mock/initialData';
import { supabase } from '../utils/supabase';
import {
  studentToSupabaseRow,
  supabaseRowToStudent,
  teacherToSupabaseRow,
  supabaseRowToTeacher,
  supervisorToSupabaseRow,
  supabaseRowToSupervisor,
  reportToSupabaseRow,
  supabaseRowToReport,
  sessionLogToSupabaseRow,
  supabaseRowToSessionLog,
  seedInitialDataToSupabase,
  safeUuid,
  resolveUserRoleFromSupabase,
} from '../utils/supabaseSync';

export interface ReportStatusInfo {
  days: number;
  timeText: string;
  badgeText: string;
  isOverdue: boolean; // true if > 30 days (red alert)
  isWarning: boolean; // true if > 25 days and <= 30 days (yellow warning)
  statusLevel: 'regular' | 'warning' | 'overdue';
}

interface AppContextType {
  // Authentication & Role
  currentUser: Supervisor;
  supervisors: Supervisor[];
  setCurrentUser: (supervisor: Supervisor) => void;
  switchUserRole: (role: UserRole) => void;
  isLoggedIn: boolean;
  loginWithSupabase: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; user?: Supervisor }>;
  login: (identifier: string, roleOrPassword?: string, rememberMe?: boolean) => boolean;
  logout: () => Promise<void>;

  // Super Admin View Mode (Exclusive to mahmoudaliwahkotb@gmail.com and managers)
  isSuperAdmin: boolean;
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;

  // Supabase Cloud State & Sync
  isSupabaseConnected: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  seedSupabaseData: () => Promise<{ success: boolean; message: string }>;
  fetchFromSupabase: () => Promise<void>;

  // Data
  students: Student[];
  teachers: Teacher[];
  reports: Report[];
  activityLogs: ActivityLog[];
  financialMonths: FinancialMonth[];
  notifications: AppNotification[];
  sessionLogs: SessionLog[];

  // Role-filtered Data
  visibleStudents: Student[];
  visibleTeachers: Teacher[];

  // Computed Financials & KPIs
  totalSubscriptions: number;
  totalTeacherCosts: number;
  netProfit: number;
  profitMargin: number;
  activeStudentsCount: number;
  vacationStudentsCount: number;
  overdueStudentsCount: number;
  completedReportsCount: number;

  // Actions
  addStudent: (student: Omit<Student, 'id' | 'initials'>) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addTeacher: (teacher: Omit<Teacher, 'id' | 'initials'>) => void;
  updateTeacher: (id: string, updates: Partial<Teacher>) => void;
  setStudentVacation: (id: string, startDate: string, endDate: string, type: string, notes?: string) => void;
  endStudentVacation: (id: string) => void;
  addReport: (report: Omit<Report, 'id'>) => void;
  markReportAsSentToParent: (reportId: string) => void;
  addActivityLog: (action: string, studentName?: string, studentId?: string, details?: string) => void;
  addSessionLog: (log: Omit<SessionLog, 'id' | 'createdAt'>) => void;
  getStudentSessionLogs: (studentId: string) => SessionLog[];
  getAggregatedCycleSummary: (studentId: string) => {
    memorizationDetails: string;
    revisionDetails: string;
    teacherNotes: string;
    studentEncouragement: string;
    completedSessionsCount: number;
  };
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  exportToExcel: (customList?: Student[]) => void;
  exportTeachersToExcel: (customList?: Teacher[]) => void;
  resetDatabase: () => void;

  // System Admin Operations
  reassignTeacherSupervisor: (
    teacherId: string,
    newSupervisorId: string
  ) => Promise<{ success: boolean; error?: string }>;
  addSystemUser: (data: {
    name: string;
    email: string;
    phone: string;
    role: 'teacher' | 'sub_supervisor' | 'general_supervisor' | 'manager';
    track?: string;
    supervisorId?: string;
  }) => Promise<{
    success: boolean;
    message: string;
    error?: string;
    userType: 'teacher' | 'supervisor';
    recordId: string;
    authStatus: string;
    invitationUrl?: string;
  }>;

  // Invite & Password Setup flow
  isSettingNewPassword: boolean;
  setIsSettingNewPassword: (val: boolean) => void;
  onPasswordUpdatedSuccessfully: (userEmail: string) => Promise<void>;

  // Live Date Helpers
  getTeacherById: (id: string) => Teacher | undefined;
  getSupervisorById: (id: string) => Supervisor | undefined;
  getDaysSinceLastReport: (dateStr: string) => number;
  isOverdue: (dateStr: string) => boolean;
  getReportStatusInfo: (dateStr: string) => ReportStatusInfo;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Auth & User state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('mk_logged_in') === 'true';
  });

  // Track if user is currently completing invite / password setup
  const [isSettingNewPassword, setIsSettingNewPassword] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      return hash.includes('type=invite') || hash.includes('type=recovery');
    }
    return false;
  });

  const [realUser, setRealUser] = useState<Supervisor>(() => {
    const cachedProfile = localStorage.getItem('mk_user_profile');
    if (cachedProfile) {
      try {
        const parsed = JSON.parse(cachedProfile);
        if (parsed && parsed.id && parsed.role) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    const savedId = localStorage.getItem('mk_current_user_id');
    const found = INITIAL_SUPERVISORS.find((s) => s.id === savedId);
    return found || INITIAL_SUPERVISORS[0]; // defaults to manager
  });

  // Dynamic supervisors state loaded from Supabase supervisors table
  const [supervisors, setSupervisors] = useState<Supervisor[]>(() => {
    const saved = localStorage.getItem('mk_supervisors_live_prod');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_SUPERVISORS;
  });

  // Super Admin View Mode state (simulating different roles for testing)
  const [previewRole, setPreviewRoleState] = useState<UserRole | null>(null);

  // Strict System Administrator identification:
  // Must be verified by genuine database role 'system_admin' OR
  // authenticated root owner account of the academy in Supabase.
  // Note: Regular managers (e.g. admin@academy.com / د. خالد المنصور, or newly added managers)
  // are NOT system administrators!
  const isSuperAdmin = useMemo(() => {
    if (realUser?.role === 'system_admin') return true;
    const email = realUser?.email?.toLowerCase().trim() || '';
    if (
      (email === 'muslim.kid.academy1@gmail.com' && realUser?.id === '173a41a8-173a-4173-8173-173a41a83999') ||
      (email === 'mahmoudaliwahkotb@gmail.com' && realUser?.id === 'b2132efb-cd93-400d-98fb-35122cff138d')
    ) {
      return true;
    }
    return false;
  }, [realUser]);

  const setPreviewRole = useCallback((role: UserRole | null) => {
    if (!isSuperAdmin) {
      setPreviewRoleState(null);
      return;
    }
    if (role === 'manager') {
      setPreviewRoleState(null);
    } else {
      setPreviewRoleState(role);
    }
  }, [isSuperAdmin]);

  // Complete purge of all legacy mock localStorage keys
  if (typeof window !== 'undefined') {
    const legacyKeys = [
      'mk_students_v1',
      'mk_students_v2',
      'mk_students_v3',
      'mk_teachers_v1',
      'mk_teachers_v2',
      'mk_reports_v1',
      'mk_reports_v2',
      'mk_session_logs_v1',
      'mk_activity_logs_v1',
      'mk_activity_logs_v2',
      'mk_clean_db_purged_v1',
      'mk_clean_db_purged_v2',
      'mk_clean_db_purged_v3',
      'mk_clean_db_purged_v4',
      'mk_clean_db_purged_v5',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  }

  // 2. Data states - Clean, real-data-only collections from Supabase
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('mk_students_live_prod');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Double-check: filter out any legacy mock students
          const clean = parsed.filter(
            (s) =>
              s &&
              s.name &&
              !s.name.includes('عمر أحمد') &&
              !s.name.includes('مريم عبد الله') &&
              !s.name.includes('خالد وليد') &&
              s.id !== 's1'
          );
          return clean;
        }
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('mk_teachers_live_prod');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('mk_reports_live_prod');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>(() => {
    const saved = localStorage.getItem('mk_session_logs_live_prod');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('mk_activity_logs_live_prod');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('mk_last_supabase_sync') || null;
  });

  // Effective currentUser based on authentic user & active preview mode
  const currentUser: Supervisor = useMemo(() => {
    if (!isSuperAdmin || !previewRole) {
      return realUser;
    }

    if (previewRole === 'teacher') {
      const sampleTeacher = teachers[0];
      return {
        id: sampleTeacher ? sampleTeacher.id : 'preview-teacher-id',
        name: sampleTeacher ? sampleTeacher.name : 'معلم الحلقة القرآنية',
        role: 'teacher' as UserRole,
        title: 'معلم الحلقة (وضع المعاينة)',
        roleLabel: sampleTeacher ? `معلم - ${sampleTeacher.circleName}` : 'معلم حلقة النور',
        department: 'قسم التحفيظ والتلقين',
        initials: sampleTeacher ? sampleTeacher.initials : 'مع',
        email: sampleTeacher?.phone || 'teacher.preview@muslimkid.academy',
        assignedTeacherIds: sampleTeacher ? [sampleTeacher.id] : [],
        teacherId: sampleTeacher ? sampleTeacher.id : 'preview-teacher-id',
      };
    }

    if (previewRole === 'sub_supervisor') {
      return {
        id: 'preview-sub-sup-id',
        name: 'المشرف التعليمي الفرعي',
        role: 'sub_supervisor' as UserRole,
        title: 'مشرف تعليمي فرعي (معاينة)',
        roleLabel: 'الإشراف الفرعي والمتابعة',
        department: 'فريق الإشراف الأكاديمي',
        initials: 'مش',
        email: 'sub.supervisor@muslimkid.academy',
        assignedTeacherIds: teachers.map((t) => t.id),
      };
    }

    if (previewRole === 'general_supervisor') {
      return {
        id: 'preview-gen-sup-id',
        name: 'المشرف العام للأكاديمية',
        role: 'general_supervisor' as UserRole,
        title: 'المشرف العام (معاينة)',
        roleLabel: 'الإشراف التربوي العام',
        department: 'إدارة الإشراف العام',
        initials: 'مع',
        email: 'general.supervisor@muslimkid.academy',
        assignedTeacherIds: teachers.map((t) => t.id),
      };
    }

    return realUser;
  }, [isSuperAdmin, previewRole, realUser, teachers]);

  // Check and maintain Supabase Auth session on app launch across reloads
  useEffect(() => {
    // Check initial hash for invite / password recovery tokens
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('type=invite') || hash.includes('type=recovery')) {
        setIsSettingNewPassword(true);
      }
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email) {
        setIsLoggedIn(true);
        localStorage.setItem('mk_logged_in', 'true');
        const resolved = await resolveUserRoleFromSupabase(session.user.email);
        if (resolved) {
          setRealUser(resolved);
          localStorage.setItem('mk_user_profile', JSON.stringify(resolved));
          localStorage.setItem('mk_current_user_id', resolved.id);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsSettingNewPassword(true);
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user?.email) {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (hash.includes('type=invite') || hash.includes('type=recovery')) {
          setIsSettingNewPassword(true);
        } else {
          setIsLoggedIn(true);
          localStorage.setItem('mk_logged_in', 'true');
          const resolved = await resolveUserRoleFromSupabase(session.user.email);
          if (resolved) {
            setRealUser(resolved);
            localStorage.setItem('mk_user_profile', JSON.stringify(resolved));
            localStorage.setItem('mk_current_user_id', resolved.id);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setIsSettingNewPassword(false);
        localStorage.setItem('mk_logged_in', 'false');
        localStorage.removeItem('mk_user_profile');
        localStorage.removeItem('mk_current_user_id');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Complete password update callback after accepting invite or resetting
  const onPasswordUpdatedSuccessfully = async (userEmail: string) => {
    try {
      const cleanEmail = userEmail.trim().toLowerCase();
      const resolved = await resolveUserRoleFromSupabase(cleanEmail);
      if (resolved) {
        setRealUser(resolved);
        localStorage.setItem('mk_user_profile', JSON.stringify(resolved));
        localStorage.setItem('mk_current_user_id', resolved.id);
      }
      setIsLoggedIn(true);
      localStorage.setItem('mk_logged_in', 'true');
      setIsSettingNewPassword(false);

      // Clean the URL hash token
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }

      await fetchFromSupabase();
    } catch (e) {
      console.warn('Error finalizing password update:', e);
      setIsSettingNewPassword(false);
      setIsLoggedIn(true);
    }
  };

  // Function to fetch all data from Supabase
  const fetchFromSupabase = useCallback(async () => {
    try {
      setIsSyncing(true);
      const [studRes, teachRes, repRes, sessRes, supRes] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('teachers').select('*'),
        supabase.from('reports').select('*'),
        supabase.from('session_logs').select('*'),
        supabase.from('supervisors').select('*'),
      ]);

      if (studRes.error) throw studRes.error;
      if (teachRes.error) throw teachRes.error;
      if (repRes.error) throw repRes.error;
      if (sessRes.error) throw sessRes.error;
      // Do not hard fail on supervisors table error if non-fatal
      if (supRes.error) console.warn('Supervisors fetch note:', supRes.error.message);

      // Sync local state with exact Supabase data
      if (teachRes.data) {
        const loadedTeachers = teachRes.data.map(supabaseRowToTeacher);
        setTeachers(loadedTeachers);
        localStorage.setItem('mk_teachers_live_prod', JSON.stringify(loadedTeachers));
      }

      if (supRes.data && supRes.data.length > 0) {
        const loadedSupervisors = supRes.data.map(supabaseRowToSupervisor);
        setSupervisors(loadedSupervisors);
        localStorage.setItem('mk_supervisors_live_prod', JSON.stringify(loadedSupervisors));
      }

      if (studRes.data) {
        const loadedStudents = studRes.data.map(supabaseRowToStudent);
        setStudents(loadedStudents);
        localStorage.setItem('mk_students_live_prod', JSON.stringify(loadedStudents));
      }

      if (repRes.data) {
        const loadedReports = repRes.data.map(supabaseRowToReport);
        setReports(loadedReports);
        localStorage.setItem('mk_reports_live_prod', JSON.stringify(loadedReports));
      }

      if (sessRes.data) {
        const loadedSessions = sessRes.data.map(supabaseRowToSessionLog);
        setSessionLogs(loadedSessions);
        localStorage.setItem('mk_session_logs_live_prod', JSON.stringify(loadedSessions));
      }

      const nowTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(nowTime);
      localStorage.setItem('mk_last_supabase_sync', nowTime);
      setIsSupabaseConnected(true);
    } catch (err: any) {
      console.warn('Error fetching from Supabase, operating with cached data:', err);
      setIsSupabaseConnected(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initial load from Supabase and Realtime subscription
  useEffect(() => {
    fetchFromSupabase();

    // Setup Supabase Realtime Channels for live multi-device synchronization
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'supervisors' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSup = supabaseRowToSupervisor(payload.new);
            setSupervisors((prev) => {
              if (prev.some((s) => s.id === newSup.id)) return prev;
              return [...prev, newSup];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = supabaseRowToSupervisor(payload.new);
            setSupervisors((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
          } else if (payload.eventType === 'DELETE') {
            setSupervisors((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newStudent = supabaseRowToStudent(payload.new);
            setStudents((prev) => {
              if (prev.some((s) => s.id === newStudent.id)) return prev;
              return [newStudent, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = supabaseRowToStudent(payload.new);
            setStudents((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
          } else if (payload.eventType === 'DELETE') {
            setStudents((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teachers' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newT = supabaseRowToTeacher(payload.new);
            setTeachers((prev) => {
              if (prev.some((t) => t.id === newT.id)) return prev;
              return [newT, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = supabaseRowToTeacher(payload.new);
            setTeachers((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newLog = supabaseRowToSessionLog(payload.new);
            setSessionLogs((prev) => {
              if (prev.some((l) => l.id === newLog.id)) return prev;
              return [newLog, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRep = supabaseRowToReport(payload.new);
            setReports((prev) => {
              if (prev.some((r) => r.id === newRep.id)) return prev;
              return [newRep, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = supabaseRowToReport(payload.new);
            setReports((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSupabaseConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFromSupabase]);

  // Seed Supabase Handler
  const seedSupabaseData = useCallback(async () => {
    setIsSyncing(true);
    const result = await seedInitialDataToSupabase();
    if (result.success) {
      await fetchFromSupabase();
    }
    setIsSyncing(false);
    return result;
  }, [fetchFromSupabase]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mk_students_live_prod', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('mk_session_logs_live_prod', JSON.stringify(sessionLogs));
  }, [sessionLogs]);

  useEffect(() => {
    localStorage.setItem('mk_teachers_live_prod', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('mk_reports_live_prod', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('mk_activity_logs_live_prod', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem('mk_current_user_id', currentUser.id);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('mk_logged_in', isLoggedIn ? 'true' : 'false');
  }, [isLoggedIn]);

  // Live Helper: Compute exact calendar days elapsed since last report date relative to today's live date
  const getDaysSinceLastReport = useCallback((dateStr: string): number => {
    if (!dateStr) return 999;
    const parts = dateStr.trim().split('-');
    let targetDate: Date;
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      targetDate = new Date(year, month, day);
    } else {
      targetDate = new Date(dateStr);
    }

    if (isNaN(targetDate.getTime())) return 0;

    const today = new Date();
    // Normalize both to midnight local calendar day
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

    const diffTime = todayMidnight.getTime() - targetMidnight.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, []);

  // Live Helper: Overdue if strictly more than 30 days (دورة الـ 8 حصص الشهرية)
  const isOverdue = useCallback((dateStr: string): boolean => {
    return getDaysSinceLastReport(dateStr) > 30;
  }, [getDaysSinceLastReport]);

  // Live Helper: Dynamically format elapsed days and status text in Arabic for the 8-session monthly cycle
  const getReportStatusInfo = useCallback((dateStr: string): ReportStatusInfo => {
    const days = getDaysSinceLastReport(dateStr);
    const overdue = days > 30;
    const warning = days > 25 && days <= 30;
    const statusLevel: 'regular' | 'warning' | 'overdue' = overdue
      ? 'overdue'
      : warning
      ? 'warning'
      : 'regular';

    let timeText = '';
    if (days === 0) {
      timeText = 'اليوم';
    } else if (days === 1) {
      timeText = 'منذ يوم واحد';
    } else if (days === 2) {
      timeText = 'منذ يومين';
    } else if (days >= 3 && days <= 10) {
      timeText = `منذ ${days} أيام`;
    } else {
      timeText = `منذ ${days} يوماً`;
    }

    let badgeText = `${timeText} (دورة منتظمة)`;
    if (overdue) {
      badgeText = `${timeText} (تجاوز 30 يوماً - متأخر)`;
    } else if (warning) {
      badgeText = `${timeText} (تجاوز 25 يوماً - تحذير)`;
    }

    return { days, timeText, badgeText, isOverdue: overdue, isWarning: warning, statusLevel };
  }, [getDaysSinceLastReport]);

  // Helper to find teacher
  const getTeacherById = useCallback((id: string): Teacher | undefined => {
    return teachers.find((t) => t.id === id);
  }, [teachers]);

  // Helper to find supervisor (checking live supervisors first)
  const getSupervisorById = useCallback(
    (id: string): Supervisor | undefined => {
      if (!id) return undefined;
      const byLiveId = supervisors.find((s) => s.id === id);
      if (byLiveId) return byLiveId;
      const byLiveTeacher = supervisors.find((s) => s.assignedTeacherIds?.includes(id));
      if (byLiveTeacher) return byLiveTeacher;
      const byInitialId = INITIAL_SUPERVISORS.find((s) => s.id === id);
      if (byInitialId) return byInitialId;
      return INITIAL_SUPERVISORS.find((s) => s.assignedTeacherIds?.includes(id));
    },
    [supervisors]
  );

  // Automatic Business Logic 2: Automatic vacation check and status recalculation
  useEffect(() => {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    let updated = false;

    const newStudents = students.map((s) => {
      if (s.status === 'vacation' && s.vacationEndDate) {
        const parts = s.vacationEndDate.split('-');
        let endDate: Date;
        if (parts.length === 3) {
          endDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          endDate = new Date(s.vacationEndDate);
        }
        // If vacation ended before today, auto-switch to active
        if (!isNaN(endDate.getTime()) && endDate.getTime() < todayMidnight) {
          updated = true;
          return {
            ...s,
            status: 'active' as const,
            notes: `${s.notes ? s.notes + ' - ' : ''}(انتهت فترة الإجازة تلقائياً واستأنف الحلقات)`,
          };
        }
      }
      return s;
    });

    if (updated) {
      setStudents(newStudents);
      addActivityLog(
        'تحديث تلقائي لحالة الإجازات',
        undefined,
        undefined,
        'تم إنهاء فترات الإجازة المنتهية وإعادة الطلاب إلى الحالة النشطة تلقائياً بواسطة النظام'
      );
    }
  }, []);

  // Automatic Business Logic 1: Generate dynamic system notifications
  useEffect(() => {
    const list: AppNotification[] = [];
    const overdueList = students.filter(
      (s) => s.status === 'active' && isOverdue(s.lastReportDate)
    );

    if (overdueList.length > 0) {
      const namesList = overdueList.map((s) => s.name).join('، ');
      list.push({
        id: 'notif-overdue-summary',
        title: `تنبيه أحمر: ${overdueList.length} طلاب تجاوزوا 30 يوماً بدون تقرير الـ 8 حصص`,
        message: `قائمة الطلاب المتأخرين عن دورة الـ 8 حصص: (${namesList}). يتطلب الأمر التواصل الفوري مع المعلمين لاعتماد التقارير وتحديث السجلات.`,
        type: 'urgent',
        date: 'اليوم',
        read: false,
      });

      // Individual urgent notices for each overdue student
      overdueList.forEach((s) => {
        const teacher = getTeacherById(s.teacherId);
        const days = getDaysSinceLastReport(s.lastReportDate);
        list.push({
          id: `notif-overdue-${s.id}`,
          title: `تأخر تقرير: ${s.name} (منذ ${days} يوماً)`,
          message: `المعلم: ${teacher?.name || 'غير محدد'} • مسار التسميع: ${s.surahProgress} • هاتف ولي الأمر: ${s.parentPhone}`,
          type: 'warning',
          date: 'اليوم',
          read: false,
          studentId: s.id,
        });
      });
    }

    const vacationList = students.filter((s) => s.status === 'vacation');
    if (vacationList.length > 0) {
      const vacNames = vacationList.map((s) => s.name).join('، ');
      list.push({
        id: 'notif-vacation-summary',
        title: `إشعار إجازات: ${vacationList.length} طلاب في إجازة معتمدة`,
        message: `الطلاب المجازون: (${vacNames}). تم تجميد اشتراكاتهم وحساب مواعيد عودتهم تلقائياً.`,
        type: 'info',
        date: 'هذا الأسبوع',
        read: false,
      });
    }

    list.push({
      id: 'notif-system-ready',
      title: 'النظام الإداري الموحد جاهز للعمل',
      message: 'تم ربط مستويات الصلاحيات الثلاثة بنجاح مع نفس قاعدة البيانات المركزية ومزامنة التغييرات تلقائياً.',
      type: 'success',
      date: 'اليوم',
      read: true,
    });

    setNotifications(list);
  }, [students, isOverdue, getDaysSinceLastReport, getTeacherById]);

  // Log an activity
  const addActivityLog = (
    action: string,
    studentName?: string,
    studentId?: string,
    details?: string
  ) => {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId,
      studentName,
      action,
      userName: currentUser.name,
      userRole: currentUser.title,
      timestamp: timeStr,
      details: details || `تم تنفيذ العملية بنجاح بواسطة ${currentUser.name}`,
    };

    setActivityLogs((prev) => [newLog, ...prev]);

    // Asynchronously persist to Supabase activity_logs table if migrated
    (async () => {
      try {
        await supabase.from('activity_logs').insert({
          action,
          entity_id: studentId ? String(studentId) : null,
          entity_name: studentName ? String(studentName) : null,
          actor_name: currentUser.name,
          actor_role: currentUser.role,
          details: details || `تم تنفيذ العملية بنجاح بواسطة ${currentUser.name}`,
        });
      } catch {
        // Silently continue if table not yet migrated on remote Supabase
      }
    })();
  };

  // Add student
  const addStudent = async (studentData: Omit<Student, 'id' | 'initials'>) => {
    // Generate UUID for compatibility with Supabase UUID id column
    const newId = safeUuid(`s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const initials = studentData.name.trim().charAt(0) || 'ط';
    const teacherCost =
      studentData.teacherCost !== undefined && !isNaN(Number(studentData.teacherCost))
        ? Number(studentData.teacherCost)
        : 120;

    const newStudent: Student = {
      ...studentData,
      id: newId,
      initials,
      teacherCost,
    };

    setStudents((prev) => [newStudent, ...prev]);
    const teacher = getTeacherById(studentData.teacherId);
    const statusLabel =
      studentData.status === 'active'
        ? 'نشط'
        : studentData.status === 'vacation'
        ? 'في إجازة'
        : 'منتهي';

    addActivityLog(
      'إضافة طالب جديد إلى النظام',
      studentData.name,
      newId,
      `تسجيل الطالب باشتراك شهري ${studentData.subscriptionFee} ر.س ومصروفات معلم ${teacherCost} ر.س بإشراف ${teacher?.name || 'غير محدد'} (الحالة: ${statusLabel})`
    );

    // Save directly to Supabase cloud database
    try {
      const row = studentToSupabaseRow(newStudent);
      const { error } = await supabase.from('students').insert(row);
      if (error) {
        console.warn('Supabase student insert error:', error.message);
      }
    } catch (e) {
      console.warn('Supabase connection failed:', e);
    }
  };

  // Update student
  const updateStudent = async (id: string, updates: Partial<Student>) => {
    const targetStudent = students.find((s) => s.id === id);

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, ...updates };
        }
        return s;
      })
    );

    const fieldMap: Record<string, string> = {
      name: 'اسم الطالب',
      teacherId: 'المعلم المسؤول',
      parentPhone: 'رقم ولي الأمر',
      subscriptionFee: 'قيمة الاشتراك',
      teacherCost: 'مصروفات المعلم',
      subscriptionDate: 'تاريخ الاشتراك',
      lastReportDate: 'تاريخ آخر تقرير',
      status: 'حالة الاشتراك',
      surahProgress: 'مسار التسميع',
      notes: 'الملاحظات',
    };

    const changes: string[] = [];
    Object.entries(updates).forEach(([key, val]) => {
      const arabicLabel = fieldMap[key] || key;
      if (key === 'teacherId') {
        const teacher = getTeacherById(String(val));
        changes.push(`${arabicLabel}: ${teacher?.name || val}`);
      } else if (key === 'subscriptionFee') {
        changes.push(`${arabicLabel}: ${val} ر.س`);
      } else if (key === 'teacherCost') {
        changes.push(`${arabicLabel}: ${val} ر.س`);
      } else if (key === 'status') {
        const stText = val === 'active' ? 'نشط' : val === 'vacation' ? 'في إجازة' : 'منتهي';
        changes.push(`${arabicLabel}: ${stText}`);
      } else {
        changes.push(`${arabicLabel}: "${val}"`);
      }
    });

    const details = changes.length > 0 ? changes.join(' | ') : 'تحديث عام للسجل';

    addActivityLog(
      'تعديل بيانات الطالب',
      updates.name || targetStudent?.name || 'طالب',
      id,
      `عدّل بواسطة ${currentUser.name} (${currentUser.title}): ${details}`
    );

    // Sync updates to Supabase
    try {
      const updatedObj = { ...targetStudent, ...updates } as Student;
      const row = studentToSupabaseRow(updatedObj);
      await supabase.from('students').update(row).eq('id', row.id);
    } catch (e) {
      console.warn('Supabase student update error:', e);
    }
  };

  // Delete student
  const deleteStudent = async (id: string) => {
    const target = students.find((s) => s.id === id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
    addActivityLog(
      'حذف سجل الطالب',
      target?.name || 'طالب',
      id,
      `تم حذف الطالب نهائياً من النظام بواسطة ${currentUser.name}`
    );

    // Sync delete to Supabase
    try {
      const targetUuid = safeUuid(id);
      await supabase.from('students').delete().eq('id', targetUuid);
    } catch (e) {
      console.warn('Supabase student delete error:', e);
    }
  };

  // Add teacher
  const addTeacher = async (teacherData: Omit<Teacher, 'id' | 'initials'>) => {
    const newId = safeUuid(`t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const nameParts = teacherData.name.trim().split(/\s+/);
    const initials =
      nameParts.length > 1
        ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`
        : nameParts[0].charAt(0) || 'م';

    const newTeacher: Teacher = {
      ...teacherData,
      id: newId,
      initials,
    };

    setTeachers((prev) => [newTeacher, ...prev]);

    const supervisor = getSupervisorById(teacherData.supervisorId);
    addActivityLog(
      'إضافة معلم جديد إلى النظام',
      teacherData.name,
      newId,
      `تم تسجيل المعلم ${teacherData.name} (حلقة: ${teacherData.circleName || 'عام'}) بمصروفات شهرية ${teacherData.monthlySalary} ر.س وإسناده إلى ${supervisor?.name || 'غير محدد'}`
    );

    // Sync to Supabase
    try {
      const row = teacherToSupabaseRow(newTeacher);
      await supabase.from('teachers').insert(row);
    } catch (e) {
      console.warn('Supabase teacher insert error:', e);
    }
  };

  // Update teacher
  const updateTeacher = async (id: string, updates: Partial<Teacher>) => {
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    const targetTeacher = teachers.find((t) => t.id === id);
    addActivityLog(
      'تعديل بيانات المعلم',
      targetTeacher?.name || updates.name || 'معلم',
      id,
      `تم تحديث بيانات المعلم بنجاح بواسطة ${currentUser.name}`
    );

    // Sync update to Supabase
    try {
      if (targetTeacher) {
        const updatedObj = { ...targetTeacher, ...updates } as Teacher;
        const row = teacherToSupabaseRow(updatedObj);
        await supabase.from('teachers').update(row).eq('id', row.id);
      }
    } catch (e) {
      console.warn('Supabase teacher update error:', e);
    }
  };

  // Reassign teacher's supervisor with full audit logging & Supabase persistence
  const reassignTeacherSupervisor = async (
    teacherId: string,
    newSupervisorId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) {
      return { success: false, error: 'المعلم غير موجود في النظام' };
    }

    const oldSupervisor = supervisors.find((s) => s.id === teacher.supervisorId);
    const newSupervisor = supervisors.find((s) => s.id === newSupervisorId);
    if (!newSupervisor) {
      return { success: false, error: 'المشرف الجديد غير موجود في قائمة المشرفين' };
    }

    try {
      // 1. Try RPC reassign_teacher_supervisor first (with server-side role check & financial protection)
      let updateDone = false;
      try {
        const { error: rpcErr } = await supabase.rpc('reassign_teacher_supervisor', {
          p_teacher_id: safeUuid(teacherId),
          p_new_supervisor_id: safeUuid(newSupervisorId),
        });
        if (!rpcErr) {
          updateDone = true;
        }
      } catch {
        // Fallback to direct update
      }

      if (!updateDone) {
        const { error: dbError } = await supabase
          .from('teachers')
          .update({ supervisor_id: safeUuid(newSupervisorId) })
          .eq('id', safeUuid(teacherId));

        if (dbError) {
          throw dbError;
        }
      }

      // 2. Update local state immediately
      setTeachers((prev) =>
        prev.map((t) => (t.id === teacherId ? { ...t, supervisorId: newSupervisorId } : t))
      );

      // 3. Audit trail in Activity Log
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeFormatted = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const actorLabel =
        currentUser.role === 'general_supervisor'
          ? 'المشرف العام'
          : currentUser.role === 'manager'
          ? 'المدير العام'
          : 'مسؤول النظام';

      addActivityLog(
        'تغيير المشرف المسؤول للمعلم',
        teacher.name,
        teacherId,
        `قام ${actorLabel} (${currentUser.name}) بنقل الإشراف على المعلم «${teacher.name}» من المشرف «${oldSupervisor?.name || 'غير محدد'}» إلى المشرف «${newSupervisor.name}» بتاريخ ${dateFormatted} الساعة ${timeFormatted}. طلاب المعلم وحصصه وتقاريره محفوظة بالكامل.`
      );

      // 4. Re-fetch from Supabase to guarantee complete sync
      await fetchFromSupabase();

      return { success: true };
    } catch (err: any) {
      console.error('Error reassigning teacher supervisor:', err);
      return {
        success: false,
        error: err.message || 'حدث خطأ أثناء حفظ التعديل في قاعدة البيانات',
      };
    }
  };

  // Add system user (Teacher, Sub-supervisor, General supervisor, Manager) safely
  const addSystemUser = async (data: {
    name: string;
    email: string;
    phone: string;
    role: 'teacher' | 'sub_supervisor' | 'general_supervisor' | 'manager';
    track?: string;
    supervisorId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    error?: string;
    userType: 'teacher' | 'supervisor';
    recordId: string;
    authStatus: string;
    invitationUrl?: string;
  }> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();
    const cleanPhone = data.phone.trim();
    const newId = safeUuid(`u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);

    // Strict role validation: General supervisor can only add teachers or sub-supervisors
    if (currentUser.role === 'general_supervisor') {
      if (data.role !== 'teacher' && data.role !== 'sub_supervisor') {
        return {
          success: false,
          message: 'غير مصرح: المشرف العام مصرح له بإضافة المعلمين والمشرفين الفرعيين فقط.',
          error: 'الدور المطلوب غير مسموح به للمشرف العام',
          userType: 'supervisor',
          recordId: '',
          authStatus: 'failed',
        };
      }
    }

    const actorLabel =
      currentUser.role === 'general_supervisor'
        ? 'المشرف العام'
        : currentUser.role === 'manager'
        ? 'المدير العام'
        : 'مسؤول النظام';

    try {
      if (data.role === 'teacher') {
        if (!data.supervisorId) {
          return {
            success: false,
            message: 'يرجى اختيار المشرف الفرعي المسؤول عن المعلم',
            error: 'تعيين المشرف مطلوب للمعلم في هذه المرحلة',
            userType: 'teacher',
            recordId: '',
            authStatus: 'failed',
          };
        }

        const nameParts = cleanName.split(/\s+/);
        const initials =
          nameParts.length > 1
            ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`
            : nameParts[0]?.charAt(0) || 'م';

        const circleName = data.track ? `حلقة (${data.track})` : 'حلقة القرآن الكريم';
        const notes = data.track ? `${circleName} - مسار: ${data.track}` : circleName;

        const teacherRecord: Teacher = {
          id: newId,
          name: cleanName,
          supervisorId: data.supervisorId,
          circleName,
          track: data.track || 'القرآن الكريم والتجويد',
          initials,
          status: 'active',
          phone: cleanPhone,
          email: cleanEmail,
          monthlySalary: 0,
          notes,
        };

        // 1. Insert into Supabase teachers table
        const { error: insErr } = await supabase.from('teachers').insert({
          id: newId,
          name: cleanName,
          supervisor_id: safeUuid(data.supervisorId),
          monthly_expenses: 0,
          phone: cleanPhone,
          notes,
          email: cleanEmail,
        });

        if (insErr) {
          throw insErr;
        }

        // 2. Update local state
        setTeachers((prev) => [teacherRecord, ...prev]);

        // 3. Activity log
        const supervisor = supervisors.find((s) => s.id === data.supervisorId);
        addActivityLog(
          'إضافة معلم جديد وتعيين المشرف',
          cleanName,
          newId,
          `قام ${actorLabel} (${currentUser.name}) بإضافة المعلم «${cleanName}» وإسناد الإشراف إلى «${supervisor?.name || 'غير محدد'}» (مسار: ${data.track || 'عام'})`
        );

        // 4. Try invoking Edge Function if deployed on Supabase
        let authStatus = 'profile_saved_edge_pending';
        let statusMessage = `تم تسجيل ملف المعلم «${cleanName}» بنجاح في قاعدة البيانات وإسناده للمشرف «${supervisor?.name || ''}».`;

        try {
          const edgeRes = await supabase.functions.invoke('create-user', {
            body: {
              email: cleanEmail,
              name: cleanName,
              phone: cleanPhone,
              role: 'teacher',
              track: data.track,
              supervisorId: data.supervisorId,
            },
          });

          if (edgeRes.data?.success) {
            if (edgeRes.data.status === 'invited_successfully') {
              authStatus = 'invited_successfully';
              statusMessage = `تم حفظ ملف المعلم بنجاح وإرسال رابط الدعوة وتعيين كلمة المرور إلى البريد الإلكتروني المعتمد.`;
            } else if (edgeRes.data.status === 'account_already_registered') {
              authStatus = 'already_registered';
              statusMessage = `حساب المعلم مسجل مسبقاً في نظام المصادقة وتم ربط ملفه بنجاح.`;
            } else if (edgeRes.data.status === 'profile_saved_invite_failed') {
              authStatus = 'invite_failed';
              statusMessage = edgeRes.data.message || `تم حفظ السجل، لكن تعذر إرسال دعوة البريد الإلكتروني.`;
            }
          }
        } catch {
          // Edge function not yet deployed on server
          authStatus = 'profile_saved_edge_pending';
        }

        await fetchFromSupabase();

        return {
          success: true,
          message: statusMessage,
          userType: 'teacher',
          recordId: newId,
          authStatus,
        };
      } else {
        // Supervisor or Manager
        const role = data.role;
        const initialChar = cleanName.charAt(0) || 'م';

        const supRecord: Supervisor = {
          id: newId,
          name: cleanName,
          role,
          title:
            role === 'manager'
              ? 'المدير العام للأكاديمية'
              : role === 'sub_supervisor'
              ? 'المشرف التعليمي'
              : 'المشرف العام',
          roleLabel:
            role === 'manager'
              ? 'الإدارة العامة والمالية'
              : role === 'sub_supervisor'
              ? 'الإشراف الميداني'
              : 'الإشراف الأكاديمي العام',
          department:
            role === 'manager'
              ? 'مجلس الإدارة والرقابة المالية'
              : 'الشؤون التعليمية',
          initials: initialChar,
          email: cleanEmail,
          assignedTeacherIds: [],
        };

        // 1. Insert into Supabase supervisors table
        const { error: insErr } = await supabase.from('supervisors').insert({
          id: newId,
          name: cleanName,
          role,
          email: cleanEmail,
        });

        if (insErr) {
          throw insErr;
        }

        // 2. Update local state
        setSupervisors((prev) => [...prev, supRecord]);

        // 3. Activity Log
        addActivityLog(
          'إضافة كادر إشرافي جديد',
          cleanName,
          newId,
          `قام ${actorLabel} (${currentUser.name}) بإضافة ${supRecord.title} «${cleanName}» إلى المنظومة`
        );

        // 4. Try edge function
        let authStatus = 'profile_saved_edge_pending';
        let statusMessage = `تم تسجيل ${supRecord.title} «${cleanName}» بنجاح في قاعدة البيانات.`;

        try {
          const edgeRes = await supabase.functions.invoke('create-user', {
            body: {
              email: cleanEmail,
              name: cleanName,
              phone: cleanPhone,
              role,
              track: data.track,
            },
          });

          if (edgeRes.data?.success) {
            if (edgeRes.data.status === 'invited_successfully') {
              authStatus = 'invited_successfully';
              statusMessage = `تم حفظ ملف ${supRecord.title} بنجاح وإرسال رابط الدعوة وتعيين كلمة المرور إلى البريد الإلكتروني.`;
            } else if (edgeRes.data.status === 'account_already_registered') {
              authStatus = 'already_registered';
              statusMessage = `حساب المستخدم مسجل مسبقاً في نظام المصادقة وتم ربط ملفه بنجاح.`;
            } else if (edgeRes.data.status === 'profile_saved_invite_failed') {
              authStatus = 'invite_failed';
              statusMessage = edgeRes.data.message || `تم حفظ السجل، لكن تعذر إرسال دعوة البريد الإلكتروني.`;
            }
          }
        } catch {
          // Edge function not yet deployed
          authStatus = 'profile_saved_edge_pending';
        }

        await fetchFromSupabase();

        return {
          success: true,
          message: statusMessage,
          userType: 'supervisor',
          recordId: newId,
          authStatus,
        };
      }
    } catch (err: any) {
      console.error('Error adding system user:', err);
      return {
        success: false,
        message: err.message || 'حدث خطأ أثناء حفظ المستخدم في قاعدة البيانات',
        error: err.message,
        userType: data.role === 'teacher' ? 'teacher' : 'supervisor',
        recordId: '',
        authStatus: 'failed',
      };
    }
  };

  // Vacation management
  const setStudentVacation = (
    id: string,
    startDate: string,
    endDate: string,
    type: string,
    notes?: string
  ) => {
    updateStudent(id, {
      status: 'vacation',
      vacationStartDate: startDate,
      vacationEndDate: endDate,
      vacationType: type,
      notes: notes || `إجازة ${type} من ${startDate} إلى ${endDate}`,
    });

    const target = students.find((s) => s.id === id);
    addActivityLog(
      'تسجيل وتفعيل إجازة رسمية',
      target?.name,
      id,
      `تم تسجيل إجازة ${type} من ${startDate} إلى ${endDate} وتجميد الاشتراك تلقائياً`
    );
  };

  const endStudentVacation = (id: string) => {
    updateStudent(id, {
      status: 'active',
      vacationStartDate: undefined,
      vacationEndDate: undefined,
      vacationType: undefined,
      notes: 'تم إنهاء الإجازة واستئناف الحلقات بنجاح',
    });

    const target = students.find((s) => s.id === id);
    addActivityLog(
      'إنهاء الإجازة يدوياً',
      target?.name,
      id,
      `تم استئناف حضور الطالب للحلقة وتفعيل الاشتراك مجدداً`
    );
  };

  // Add report - CRITICAL: automatically updates student's lastReportDate and syncs to Supabase!
  const addReport = async (reportData: Omit<Report, 'id'>) => {
    const newId = safeUuid(`rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const newReport: Report = {
      ...reportData,
      id: newId,
    };

    setReports((prev) => [newReport, ...prev]);

    // AUTOMATION: update student's lastReportDate to immediately reset the 30-day timer and reset cycle session count for the new cycle
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === reportData.studentId) {
          return {
            ...s,
            lastReportDate: reportData.reportDate,
            surahProgress: reportData.memorizationDetails || s.surahProgress,
            notes: reportData.teacherNotes || reportData.notes || s.notes,
            currentCycleSessionsCount: 0, // Reset for next 8-session cycle
          };
        }
        return s;
      })
    );

    const student = students.find((s) => s.id === reportData.studentId);
    addActivityLog(
      'اعتماد تقرير إنجاز 8 حصص',
      student?.name,
      reportData.studentId,
      `تم رصد تقرير الـ 8 حصص بتاريخ ${reportData.reportDate} (التقييم: ${reportData.grade || reportData.memorizationScore + '%'}) وتصفير عداد الـ 30 يوماً وبدء دورة 8 حصص جديدة`
    );

    // Sync report and student's new lastReportDate to Supabase
    try {
      const repRow = reportToSupabaseRow(newReport);
      await supabase.from('reports').insert(repRow);

      if (student) {
        const updatedStudent = {
          ...student,
          lastReportDate: reportData.reportDate,
          surahProgress: reportData.memorizationDetails || student.surahProgress,
          notes: reportData.teacherNotes || reportData.notes || student.notes,
        };
        const studRow = studentToSupabaseRow(updatedStudent);
        await supabase.from('students').update(studRow).eq('id', studRow.id);
      }
    } catch (e) {
      console.warn('Supabase report sync error:', e);
    }
  };

  // Mark report as sent to parent by director
  const markReportAsSentToParent = async (reportId: string) => {
    let targetReport = reports.find((r) => r.id === reportId);
    setReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          return {
            ...r,
            submissionStatus: 'sent_to_parent',
          };
        }
        return r;
      })
    );

    if (targetReport) {
      const student = students.find((s) => s.id === targetReport?.studentId);
      addActivityLog(
        'إرسال التقرير لولي الأمر',
        student?.name,
        student?.id,
        `قام المدير العام ${currentUser.name} بإرسال تقرير إنجاز 8 حصص لولي أمر الطالب ${student?.name || ''} عبر واتساب ونقله إلى سجل التقارير المكتملة`
      );

      // Sync status to Supabase
      try {
        const repUuid = safeUuid(reportId);
        await supabase.from('reports').update({ status: 'sent_to_parent' }).eq('id', repUuid);
      } catch (e) {
        console.warn('Supabase mark report sent error:', e);
      }
    }
  };

  // Add or update session log (يدعم التعديل دون مسح الحصص الأخرى)
  const addSessionLog = async (logData: Omit<SessionLog, 'id' | 'createdAt'>) => {
    let savedLog: SessionLog;
    const existingIndex = sessionLogs.findIndex(
      (l) => l.studentId === logData.studentId && l.sessionNumber === logData.sessionNumber
    );

    if (existingIndex >= 0) {
      savedLog = {
        ...sessionLogs[existingIndex],
        ...logData,
      };
      setSessionLogs((prev) => {
        const next = [...prev];
        next[existingIndex] = savedLog;
        return next;
      });
    } else {
      const newId = safeUuid(`sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      savedLog = {
        ...logData,
        id: newId,
        createdAt: new Date().toISOString(),
      };
      setSessionLogs((prev) => [savedLog, ...prev]);
    }

    // Update student's currentCycleSessionsCount (يحسب إجمالي الحصص المسجلة بالدورة بدون تكرار)
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === logData.studentId) {
          const maxPkg = s.packageSessionsCount || 8;
          const currentNums = sessionLogs
            .filter((l) => l.studentId === s.id)
            .map((l) => l.sessionNumber);
          if (!currentNums.includes(logData.sessionNumber)) {
            currentNums.push(logData.sessionNumber);
          }
          const nextCount = Math.min(maxPkg, Math.max(currentNums.length, logData.sessionNumber));

          return {
            ...s,
            currentCycleSessionsCount: nextCount,
            surahProgress: (logData.attendance === 'attended' && logData.newMemorization) ? logData.newMemorization : s.surahProgress,
            notes: logData.homework ? `الواجب: ${logData.homework}` : s.notes,
          };
        }
        return s;
      })
    );

    const student = students.find((s) => s.id === logData.studentId);
    const sessionNum = logData.sessionNumber;
    const maxPkg = student?.packageSessionsCount || 8;
    addActivityLog(
      existingIndex >= 0 ? `تعديل حصة (${sessionNum}/${maxPkg})` : `تسجيل حصة (${sessionNum}/${maxPkg})`,
      student?.name,
      logData.studentId,
      existingIndex >= 0
        ? `تم تحديث بيانات الحصة رقم ${sessionNum} من ${maxPkg}: حفظ (${logData.newMemorization || 'بدون'}) ومراجعة (${logData.revision || 'بدون'}) بواسطة ${currentUser.name}`
        : `تم توثيق الحصة رقم ${sessionNum} من ${maxPkg}: حفظ جديد (${logData.newMemorization || 'بدون'}) ومراجعة (${logData.revision || 'بدون'}) بواسطة ${currentUser.name}`
    );

    // Sync session log to Supabase
    try {
      const sessRow = sessionLogToSupabaseRow(savedLog);
      await supabase.from('session_logs').upsert(sessRow);
    } catch (e) {
      console.warn('Supabase session log sync error:', e);
    }
  };

  // Get student session logs
  const getStudentSessionLogs = (studentId: string): SessionLog[] => {
    return sessionLogs
      .filter((l) => l.studentId === studentId)
      .sort((a, b) => a.sessionNumber - b.sessionNumber);
  };

  // Get aggregated cycle summary for auto-populating reports
  const getAggregatedCycleSummary = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    const maxPkg = student?.packageSessionsCount || 8;

    const studentLogs = sessionLogs
      .filter((l) => l.studentId === studentId)
      .sort((a, b) => a.sessionNumber - b.sessionNumber);

    const memorizationLines = studentLogs
      .filter((l) => l.attendance === 'attended')
      .map((l) => `حصة ${l.sessionNumber}: ${l.newMemorization}`)
      .filter(Boolean);
    const revisionLines = studentLogs
      .filter((l) => l.attendance === 'attended')
      .map((l) => `حصة ${l.sessionNumber}: ${l.revision}`)
      .filter(Boolean);
    const notesLines = studentLogs
      .map((l) => {
        if (l.attendance === 'absent') return `حصة ${l.sessionNumber}: غائب بدون عذر`;
        if (l.attendance === 'excused') return `حصة ${l.sessionNumber}: غائب بعذر (${l.notes || 'اعتذار مسبق'})`;
        return (l.notes || l.homework ? `حصة ${l.sessionNumber}: ${[l.notes, l.homework ? 'الواجب: ' + l.homework : ''].filter(Boolean).join(' - ')}` : '');
      })
      .filter(Boolean);

    return {
      memorizationDetails: memorizationLines.length > 0
        ? memorizationLines.join(' | ')
        : `إتمام دورة الـ ${maxPkg} حصص بحفظ وتسميع متقن`,
      revisionDetails: revisionLines.length > 0
        ? revisionLines.join(' | ')
        : 'مراجعة وتثبيت شامل لكافة المقاطع السابقة',
      teacherNotes: notesLines.length > 0
        ? notesLines.join(' | ')
        : `أتم الطالب دورة الـ ${maxPkg} حصص بجد واجتهاد، والتزام عالي بالحضور.`,
      studentEncouragement: 'بارك الله فيك يا بطل القرآن الصغير ووفقك ورفع قدرك بالقرآن الكريم!',
      completedSessionsCount: studentLogs.length,
    };
  };

  // Mark notifications
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Role switching
  const setCurrentUser = (supervisor: Supervisor) => {
    setRealUser(supervisor);
    setPreviewRoleState(null);
  };

  const switchUserRole = (role: UserRole) => {
    if (isSuperAdmin) {
      setPreviewRole(role === 'manager' ? null : role);
      return;
    }
    const target = INITIAL_SUPERVISORS.find((s) => s.role === role);
    if (target) {
      setRealUser(target);
      setIsLoggedIn(true);
    }
  };

  const login = (
    identifier: string,
    roleOrPassword?: string,
    rememberMe: boolean = true
  ): boolean => {
    const cleanId = identifier.trim().toLowerCase();

    let matched: Supervisor | undefined;

    // Check by role shortcut or demo credentials
    if (
      cleanId === 'admin@academy.com' ||
      cleanId === 'admin' ||
      cleanId === 'manager' ||
      roleOrPassword === 'manager'
    ) {
      matched = INITIAL_SUPERVISORS.find((s) => s.role === 'manager');
    } else if (
      cleanId === 'supervisor@academy.com' ||
      cleanId === 'supervisor' ||
      cleanId === 'sub_supervisor' ||
      cleanId === 'saleh@muslimkid.academy' ||
      roleOrPassword === 'sub_supervisor'
    ) {
      matched = INITIAL_SUPERVISORS.find((s) => s.role === 'sub_supervisor');
    } else if (
      cleanId === 'teacher@academy.com' ||
      cleanId === 'teacher' ||
      cleanId === 'ahmed.teacher@muslimkid.academy' ||
      roleOrPassword === 'teacher'
    ) {
      matched = INITIAL_SUPERVISORS.find((s) => s.role === 'teacher');
    } else if (
      cleanId === 'saadi@muslimkid.academy' ||
      cleanId === 'general_supervisor' ||
      roleOrPassword === 'general_supervisor'
    ) {
      matched = INITIAL_SUPERVISORS.find((s) => s.role === 'general_supervisor');
    } else {
      matched = INITIAL_SUPERVISORS.find(
        (s) =>
          s.email.toLowerCase() === cleanId ||
          s.name.toLowerCase().includes(cleanId) ||
          (roleOrPassword && s.role === roleOrPassword)
      );
    }

    if (!matched) {
      matched = INITIAL_SUPERVISORS[0];
    }

    setRealUser(matched);
    setPreviewRoleState(null);
    setIsLoggedIn(true);

    if (rememberMe) {
      localStorage.setItem('mk_logged_in', 'true');
      localStorage.setItem('mk_current_user_id', matched.id);
    } else {
      localStorage.setItem('mk_logged_in', 'false');
      localStorage.removeItem('mk_current_user_id');
    }

    return true;
  };

  // Real authentication using Supabase Auth
  const loginWithSupabase = async (
    emailInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string; user?: Supervisor }> => {
    const cleanEmail = emailInput.trim();

    try {
      // 1. Call real Supabase Auth signInWithPassword
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: passwordInput,
      });

      if (error) {
        console.warn('Supabase signInWithPassword failed:', error.message);
        return {
          success: false,
          error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        };
      }

      const userEmail = data.user.email || cleanEmail;

      // 2. Resolve role from teachers or supervisors table
      const resolved = await resolveUserRoleFromSupabase(userEmail);
      if (!resolved) {
        return {
          success: false,
          error: 'الحساب غير مسجل كمعلم أو مشرف في قاعدة بيانات الأكاديمية.',
        };
      }

      // 3. Update state and device persistence
      setRealUser(resolved);
      setPreviewRoleState(null);
      setIsLoggedIn(true);
      localStorage.setItem('mk_logged_in', 'true');
      localStorage.setItem('mk_user_profile', JSON.stringify(resolved));
      localStorage.setItem('mk_current_user_id', resolved.id);

      return {
        success: true,
        user: resolved,
      };
    } catch (e: any) {
      console.error('Error during Supabase sign in:', e);
      return {
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
    setPreviewRoleState(null);
    setIsLoggedIn(false);
    localStorage.setItem('mk_logged_in', 'false');
    localStorage.removeItem('mk_user_profile');
    localStorage.removeItem('mk_current_user_id');
  };

  // Role-filtered students and teachers
  const visibleTeachers = useMemo(() => {
    if (currentUser.role === 'teacher') {
      const myTeacherId = currentUser.teacherId || currentUser.assignedTeacherIds?.[0] || currentUser.id;
      const found = teachers.filter((t) => t.id === myTeacherId || (currentUser.name && t.name === currentUser.name));
      if (found.length > 0) return found;
      return teachers.length > 0 ? [teachers[0]] : [];
    }
    if (currentUser.role === 'sub_supervisor') {
      // Strict scoping: Sub-supervisor only sees teachers whose current supervisorId matches their ID
      // When a teacher is reassigned to another supervisor, the previous supervisor loses access immediately!
      return teachers.filter((t) => t.supervisorId === currentUser.id);
    }
    return teachers;
  }, [teachers, currentUser]);

  const visibleStudents = useMemo(() => {
    if (currentUser.role === 'teacher') {
      const myTeacherId = currentUser.teacherId || currentUser.assignedTeacherIds?.[0] || currentUser.id;
      const validTeacherIds = new Set([
        myTeacherId,
        currentUser.id,
        ...(currentUser.assignedTeacherIds || []),
        ...visibleTeachers.map((vt) => vt.id),
      ]);
      const matched = students.filter((s) => validTeacherIds.has(s.teacherId));
      if (matched.length > 0) return matched;
      if (visibleTeachers.length > 0) {
        const fallbackMatched = students.filter((s) => s.teacherId === visibleTeachers[0].id);
        if (fallbackMatched.length > 0) return fallbackMatched;
      }
      return students;
    }
    if (currentUser.role === 'sub_supervisor') {
      const allowedTeacherIds = new Set(visibleTeachers.map((t) => t.id));
      return students.filter((s) => allowedTeacherIds.has(s.teacherId));
    }
    // General supervisor & Manager see all
    return students;
  }, [students, visibleTeachers, currentUser]);

  // Computed Financials
  const activeStudentsCount = useMemo(
    () => visibleStudents.filter((s) => s.status === 'active').length,
    [visibleStudents]
  );

  const vacationStudentsCount = useMemo(
    () => visibleStudents.filter((s) => s.status === 'vacation').length,
    [visibleStudents]
  );

  const overdueStudentsCount = useMemo(
    () =>
      visibleStudents.filter(
        (s) => s.status === 'active' && isOverdue(s.lastReportDate)
      ).length,
    [visibleStudents, isOverdue]
  );

  const completedReportsCount = useMemo(() => {
    return Math.max(0, visibleStudents.length - overdueStudentsCount - vacationStudentsCount);
  }, [visibleStudents, overdueStudentsCount, vacationStudentsCount]);

  // Financial calculations
  const totalSubscriptions = useMemo(() => {
    return students
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (Number(s.subscriptionFee) || 0), 0);
  }, [students]);

  const totalTeacherCosts = useMemo(() => {
    const studentTeacherCosts = students
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (Number(s.teacherCost) || 0), 0);

    if (studentTeacherCosts > 0) {
      return studentTeacherCosts;
    }

    return teachers
      .filter((t) => t.status === 'active')
      .reduce((sum, t) => sum + (Number(t.monthlySalary) || 0), 0);
  }, [students, teachers]);

  const netProfit = useMemo(() => {
    return totalSubscriptions - totalTeacherCosts;
  }, [totalSubscriptions, totalTeacherCosts]);

  const profitMargin = useMemo(() => {
    if (totalSubscriptions === 0) return 0;
    return parseFloat(((netProfit / totalSubscriptions) * 100).toFixed(1));
  }, [totalSubscriptions, netProfit]);

  // Real financial months computed dynamically from live active subscriptions and teacher costs
  const financialMonths = useMemo<FinancialMonth[]>(() => {
    if (totalSubscriptions === 0 && totalTeacherCosts === 0) {
      return [];
    }
    return [
      {
        monthName: 'الشهر الحالي',
        subscriptions: totalSubscriptions,
        teacherCosts: totalTeacherCosts,
        netProfit,
      },
    ];
  }, [totalSubscriptions, totalTeacherCosts, netProfit]);

  // Export to Excel spreadsheet (.xlsx format using xlsx library with RTL & column formatting)
  const exportToExcel = (customList?: Student[]) => {
    const exportData = customList || visibleStudents;
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    const isManager = currentUser.role === 'manager';
    const headers = isManager
      ? [
          'م',
          'اسم الطالب',
          'المعلم المسؤول',
          'الحلقة ومسار التسميع',
          'رقم ولي الأمر',
          'قيمة الاشتراك الشهري (ر.س)',
          'مصروفات المعلم (ر.س)',
          'تاريخ بدء الاشتراك',
          'تاريخ آخر تقرير',
          'حالة التقرير الدوري',
          'حالة الاشتراك',
          'الملاحظات والإجازة',
        ]
      : [
          'م',
          'اسم الطالب',
          'المعلم المسؤول',
          'الحلقة ومسار التسميع',
          'رقم ولي الأمر',
          'تاريخ بدء الاشتراك',
          'تاريخ آخر تقرير',
          'حالة التقرير الدوري',
          'حالة الاشتراك',
          'الملاحظات والإجازة',
        ];

    const dataRows = exportData.map((s, idx) => {
      const teacher = getTeacherById(s.teacherId);
      const reportInfo = getReportStatusInfo(s.lastReportDate);
      const isLate = reportInfo.isOverdue && s.status === 'active';
      const isVacation = s.status === 'vacation';

      const statusText =
        isVacation
          ? 'في إجازة رسمية'
          : s.status === 'active'
          ? 'نشط ومنتظم'
          : 'اشتراك منتهي';

      const reportStatusText = isVacation
        ? 'في إجازة معتمدة'
        : isLate
        ? `متأخر (${reportInfo.days} يوم)`
        : `منتظم (${reportInfo.days} يوم)`;

      const teacherCostVal =
        s.teacherCost !== undefined
          ? Number(s.teacherCost)
          : Math.round((teacher?.monthlySalary || 1500) / Math.max(1, teacher?.studentsCount || 10));

      if (isManager) {
        return [
          idx + 1,
          s.name,
          teacher?.name || 'غير محدد',
          s.surahProgress || teacher?.circleName || 'حلقة القرآن',
          s.parentPhone,
          Number(s.subscriptionFee) || 0,
          teacherCostVal,
          s.subscriptionDate,
          s.lastReportDate,
          reportStatusText,
          statusText,
          s.notes || '-',
        ];
      }

      return [
        idx + 1,
        s.name,
        teacher?.name || 'غير محدد',
        s.surahProgress || teacher?.circleName || 'حلقة القرآن',
        s.parentPhone,
        s.subscriptionDate,
        s.lastReportDate,
        reportStatusText,
        statusText,
        s.notes || '-',
      ];
    });

    const worksheetData = [
      ['أكاديمية المسلم الصغير لتحفيظ القرآن للأطفال'],
      [`كشف بيانات ومتابعة الطلاب • استخرج بتاريخ: ${nowStr} • عدد السجلات: ${exportData.length} طالب • الدور الحالي: ${currentUser.title} (${currentUser.name})`],
      [],
      headers,
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Merge title headers
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    ];

    // Column widths
    ws['!cols'] = [
      { wch: 6 },  // م
      { wch: 26 }, // اسم الطالب
      { wch: 22 }, // المعلم المسؤول
      { wch: 30 }, // الحلقة ومسار التسميع
      { wch: 18 }, // رقم ولي الأمر
      { wch: 22 }, // قيمة الاشتراك الشهري
      { wch: 20 }, // مصروفات المعلم
      { wch: 16 }, // تاريخ الاشتراك
      { wch: 16 }, // تاريخ آخر تقرير
      { wch: 20 }, // حالة التقرير
      { wch: 16 }, // حالة الاشتراك
      { wch: 35 }, // الملاحظات
    ];

    // Set RTL
    ws['!views'] = [{ rightToLeft: true }];

    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, 'كشف الطلاب');

    const fileName = `كشف_طلاب_أكاديمية_المسلم_الصغير_${nowStr}.xlsx`;
    XLSX.writeFile(wb, fileName);

    addActivityLog(
      'تصدير كشف الطلاب إلى ملف Excel',
      undefined,
      undefined,
      `تم تصدير كشف الطلاب الفعلي المصفى (${exportData.length} طالب) كملف Excel (.xlsx) بواسطة ${currentUser.name} (${currentUser.title}) مع مراعاة الصلاحيات والفلاتر النشطة`
    );
  };

  // Export teachers to Excel spreadsheet (.xlsx format)
  const exportTeachersToExcel = (customList?: Teacher[]) => {
    const exportData = customList || visibleTeachers;
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    const isMgr = currentUser.role === 'manager';
    const headers = [
      'م',
      'اسم المعلم',
      'الحلقة القرآنية',
      'المسار الأكاديمي',
      'المشرف التابع له',
      'عدد الطلاب التابعين',
      'الطلاب المتأخرين (>14 يوم)',
      'رقم هاتف المعلم',
      ...(isMgr ? ['المصروفات الشهرية (ر.س)'] : []),
    ];

    const dataRows = exportData.map((t, idx) => {
      const supervisor = getSupervisorById(t.supervisorId);
      const teacherStudents = students.filter((s) => s.teacherId === t.id);
      const overdueCount = teacherStudents.filter(
        (s) => s.status === 'active' && isOverdue(s.lastReportDate)
      ).length;

      const row: (string | number)[] = [
        idx + 1,
        t.name,
        t.circleName,
        t.track,
        supervisor?.name || 'غير محدد',
        teacherStudents.length,
        overdueCount > 0 ? `${overdueCount} (متأخر)` : '0 (منتظم)',
        t.phone,
      ];

      if (isMgr) {
        row.push(t.monthlySalary);
      }

      return row;
    });

    const worksheetData = [
      ['أكاديمية المسلم الصغير لتحفيظ القرآن للأطفال'],
      [`كشف بيانات المعلمين والحلقات • استخرج بتاريخ: ${nowStr} • السجلات: ${exportData.length} معلم • الدور: ${currentUser.title} (${currentUser.name})`],
      [],
      headers,
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    ];
    ws['!cols'] = [
      { wch: 6 },
      { wch: 25 },
      { wch: 22 },
      { wch: 25 },
      { wch: 25 },
      { wch: 22 },
      { wch: 26 },
      { wch: 18 },
      ...(isMgr ? [{ wch: 22 }] : []),
    ];
    ws['!views'] = [{ rightToLeft: true }];

    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, 'كشف المعلمين');

    XLSX.writeFile(wb, `كشف_معلمي_أكاديمية_المسلم_الصغير_${nowStr}.xlsx`);

    addActivityLog(
      'تصدير كشف المعلمين إلى Excel',
      undefined,
      undefined,
      `تم تصدير كشف المعلمين (${exportData.length} معلم) كملف Excel (.xlsx) بواسطة ${currentUser.name}`
    );
  };

  const resetDatabase = () => {
    localStorage.removeItem('mk_students_live_prod');
    localStorage.removeItem('mk_teachers_live_prod');
    localStorage.removeItem('mk_reports_live_prod');
    localStorage.removeItem('mk_session_logs_live_prod');
    localStorage.removeItem('mk_activity_logs_live_prod');
    setStudents([]);
    setTeachers([]);
    setReports([]);
    setSessionLogs([]);
    setActivityLogs([]);
    addActivityLog(
      'استعادة ضبط المصنع لقاعدة البيانات',
      undefined,
      undefined,
      'تم تفريغ البيانات المحلية وإعادة المزامنة النظيفة'
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        supervisors,
        setCurrentUser,
        switchUserRole,
        isLoggedIn,
        login,
        loginWithSupabase,
        logout,
        isSuperAdmin,
        previewRole,
        setPreviewRole,
        isSupabaseConnected,
        isSyncing,
        lastSyncTime,
        seedSupabaseData,
        fetchFromSupabase,
        students,
        teachers,
        reports,
        sessionLogs,
        activityLogs,
        financialMonths,
        notifications,
        visibleStudents,
        visibleTeachers,
        totalSubscriptions,
        totalTeacherCosts,
        netProfit,
        profitMargin,
        activeStudentsCount,
        vacationStudentsCount,
        overdueStudentsCount,
        completedReportsCount,
        addStudent,
        updateStudent,
        deleteStudent,
        addTeacher,
        updateTeacher,
        reassignTeacherSupervisor,
        addSystemUser,
        isSettingNewPassword,
        setIsSettingNewPassword,
        onPasswordUpdatedSuccessfully,
        setStudentVacation,
        endStudentVacation,
        addReport,
        markReportAsSentToParent,
        addActivityLog,
        addSessionLog,
        getStudentSessionLogs,
        getAggregatedCycleSummary,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        exportToExcel,
        exportTeachersToExcel,
        resetDatabase,
        getTeacherById,
        getSupervisorById,
        getDaysSinceLastReport,
        isOverdue,
        getReportStatusInfo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
