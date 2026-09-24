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
import {
  INITIAL_SUPERVISORS,
  INITIAL_TEACHERS,
  SEEDED_STUDENTS,
  INITIAL_REPORTS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_FINANCIAL_MONTHS,
  INITIAL_SESSION_LOGS,
} from '../mock/initialData';

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
  login: (email: string, role?: UserRole) => boolean;
  logout: () => void;

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
    return localStorage.getItem('mk_logged_in') !== 'false';
  });

  const [currentUser, setCurrentUserState] = useState<Supervisor>(() => {
    const savedId = localStorage.getItem('mk_current_user_id');
    const found = INITIAL_SUPERVISORS.find((s) => s.id === savedId);
    return found || INITIAL_SUPERVISORS[0]; // defaults to general supervisor
  });

  // 2. Data states with LocalStorage persistence (v3 incorporates live relative dates and schedules)
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('mk_students_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].scheduleDays) {
          return parsed;
        }
      } catch {
        // fallback
      }
    }
    return SEEDED_STUDENTS;
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('mk_teachers_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_TEACHERS;
  });

  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('mk_reports_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_REPORTS;
  });

  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>(() => {
    const saved = localStorage.getItem('mk_session_logs_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_SESSION_LOGS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('mk_activity_logs_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_ACTIVITY_LOGS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mk_students_v3', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('mk_session_logs_v1', JSON.stringify(sessionLogs));
  }, [sessionLogs]);

  useEffect(() => {
    localStorage.setItem('mk_teachers_v2', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('mk_reports_v2', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('mk_activity_logs_v2', JSON.stringify(activityLogs));
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

  // Helper to find supervisor
  const getSupervisorById = useCallback((id: string): Supervisor | undefined => {
    return INITIAL_SUPERVISORS.find((s) => s.id === id);
  }, []);

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
  };

  // Add student
  const addStudent = (studentData: Omit<Student, 'id' | 'initials'>) => {
    const newId = `s-${Date.now()}`;
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
  };

  // Update student
  const updateStudent = (id: string, updates: Partial<Student>) => {
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
  };

  // Delete student
  const deleteStudent = (id: string) => {
    const target = students.find((s) => s.id === id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
    addActivityLog(
      'حذف سجل الطالب',
      target?.name || 'طالب',
      id,
      `تم حذف الطالب نهائياً من النظام بواسطة ${currentUser.name}`
    );
  };

  // Add teacher
  const addTeacher = (teacherData: Omit<Teacher, 'id' | 'initials'>) => {
    const newId = `t-${Date.now()}`;
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
  };

  // Update teacher
  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
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

  // Add report - CRITICAL: automatically updates student's lastReportDate!
  const addReport = (reportData: Omit<Report, 'id'>) => {
    const newId = `rep-${Date.now()}`;
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
  };

  // Add session log
  const addSessionLog = (logData: Omit<SessionLog, 'id' | 'createdAt'>) => {
    const newId = `sess-${Date.now()}`;
    const newLog: SessionLog = {
      ...logData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    setSessionLogs((prev) => [newLog, ...prev]);

    // Update student's currentCycleSessionsCount (increments up to 8)
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === logData.studentId) {
          const nextCount = Math.min(8, logData.sessionNumber || (s.currentCycleSessionsCount || 0) + 1);
          return {
            ...s,
            currentCycleSessionsCount: nextCount,
            surahProgress: logData.newMemorization || s.surahProgress,
            notes: logData.homework ? `الواجب: ${logData.homework}` : s.notes,
          };
        }
        return s;
      })
    );

    const student = students.find((s) => s.id === logData.studentId);
    const sessionNum = logData.sessionNumber;
    addActivityLog(
      `تسجيل حصة تسميع (${sessionNum}/8)`,
      student?.name,
      logData.studentId,
      `تم توثيق الحصة رقم ${sessionNum} من 8: حفظ جديد (${logData.newMemorization}) ومراجعة (${logData.revision}) بواسطة ${currentUser.name}`
    );
  };

  // Get student session logs
  const getStudentSessionLogs = (studentId: string): SessionLog[] => {
    return sessionLogs
      .filter((l) => l.studentId === studentId)
      .sort((a, b) => a.sessionNumber - b.sessionNumber);
  };

  // Get aggregated 8 sessions summary for auto-populating reports
  const getAggregatedCycleSummary = (studentId: string) => {
    const studentLogs = sessionLogs
      .filter((l) => l.studentId === studentId)
      .sort((a, b) => a.sessionNumber - b.sessionNumber);

    const memorizationLines = studentLogs
      .map((l) => `حصة ${l.sessionNumber}: ${l.newMemorization}`)
      .filter(Boolean);
    const revisionLines = studentLogs
      .map((l) => `حصة ${l.sessionNumber}: ${l.revision}`)
      .filter(Boolean);
    const notesLines = studentLogs
      .map((l) => (l.notes || l.homework ? `حصة ${l.sessionNumber}: ${[l.notes, l.homework ? 'الواجب: ' + l.homework : ''].filter(Boolean).join(' - ')}` : ''))
      .filter(Boolean);

    return {
      memorizationDetails: memorizationLines.length > 0
        ? memorizationLines.join(' | ')
        : 'إتمام دورة الـ 8 حصص بحفظ وتسميع متقن',
      revisionDetails: revisionLines.length > 0
        ? revisionLines.join(' | ')
        : 'مراجعة وتثبيت شامل لكافة المقاطع السابقة',
      teacherNotes: notesLines.length > 0
        ? notesLines.join(' | ')
        : 'أتم الطالب دورة الـ 8 حصص بجد واجتهاد، والتزام عالي بالحضور.',
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
    setCurrentUserState(supervisor);
  };

  const switchUserRole = (role: UserRole) => {
    const target = INITIAL_SUPERVISORS.find((s) => s.role === role);
    if (target) {
      setCurrentUserState(target);
      setIsLoggedIn(true);
    }
  };

  const login = (email: string, role?: UserRole): boolean => {
    let matched = INITIAL_SUPERVISORS.find(
      (s) => s.email.toLowerCase() === email.toLowerCase()
    );
    if (!matched && role) {
      matched = INITIAL_SUPERVISORS.find((s) => s.role === role);
    }
    if (!matched) {
      matched = INITIAL_SUPERVISORS[0];
    }
    setCurrentUserState(matched);
    setIsLoggedIn(true);
    return true;
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  // Role-filtered students and teachers
  const visibleTeachers = useMemo(() => {
    if (currentUser.role === 'teacher') {
      const myTeacherId = currentUser.teacherId || currentUser.assignedTeacherIds?.[0] || 't1';
      return teachers.filter((t) => t.id === myTeacherId);
    }
    if (currentUser.role === 'sub_supervisor') {
      return teachers.filter(
        (t) =>
          t.supervisorId === currentUser.id ||
          currentUser.assignedTeacherIds?.includes(t.id)
      );
    }
    return teachers;
  }, [teachers, currentUser]);

  const visibleStudents = useMemo(() => {
    if (currentUser.role === 'teacher') {
      const myTeacherId = currentUser.teacherId || currentUser.assignedTeacherIds?.[0] || 't1';
      return students.filter((s) => s.teacherId === myTeacherId);
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
      .reduce((sum, s) => sum + (s.subscriptionFee || 0), 0);
  }, [students]);

  const totalTeacherCosts = useMemo(() => {
    return teachers
      .filter((t) => t.status === 'active')
      .reduce((sum, t) => sum + (t.monthlySalary || 0), 0);
  }, [teachers]);

  const netProfit = useMemo(() => {
    return totalSubscriptions - totalTeacherCosts;
  }, [totalSubscriptions, totalTeacherCosts]);

  const profitMargin = useMemo(() => {
    if (totalSubscriptions === 0) return 0;
    return parseFloat(((netProfit / totalSubscriptions) * 100).toFixed(1));
  }, [totalSubscriptions, netProfit]);

  // Export to Excel spreadsheet (.xlsx format using xlsx library with RTL & column formatting)
  const exportToExcel = (customList?: Student[]) => {
    const exportData = customList || visibleStudents;
    const now = new Date();
    const nowStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    const headers = [
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
    localStorage.removeItem('mk_students_v1');
    localStorage.removeItem('mk_students_v2');
    localStorage.removeItem('mk_students_v3');
    localStorage.removeItem('mk_teachers_v2');
    localStorage.removeItem('mk_reports_v1');
    localStorage.removeItem('mk_reports_v2');
    localStorage.removeItem('mk_session_logs_v1');
    localStorage.removeItem('mk_activity_logs_v1');
    localStorage.removeItem('mk_activity_logs_v2');
    setStudents(SEEDED_STUDENTS);
    setTeachers(INITIAL_TEACHERS);
    setReports(INITIAL_REPORTS);
    setSessionLogs(INITIAL_SESSION_LOGS);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    addActivityLog(
      'استعادة ضبط المصنع لقاعدة البيانات',
      undefined,
      undefined,
      'تمت إعادة تعيين البيانات التجريبية إلى الوضع الافتراضي الأولي'
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        supervisors: INITIAL_SUPERVISORS,
        setCurrentUser,
        switchUserRole,
        isLoggedIn,
        login,
        logout,
        students,
        teachers,
        reports,
        sessionLogs,
        activityLogs,
        financialMonths: INITIAL_FINANCIAL_MONTHS,
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
        setStudentVacation,
        endStudentVacation,
        addReport,
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
