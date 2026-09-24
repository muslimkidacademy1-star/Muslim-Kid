export type UserRole = 'general_supervisor' | 'sub_supervisor' | 'manager' | 'teacher';

export interface Supervisor {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  roleLabel: string;
  department: string;
  avatar?: string;
  initials: string;
  email: string;
  assignedTeacherIds: string[];
  teacherId?: string; // إذا كان الدور معلماً، يربط مع سجل المعلم المحدد
}

export interface Teacher {
  id: string;
  name: string;
  monthlySalary: number; // مستحقات المعلم الشهرية
  supervisorId: string; // المشرف التابع له
  circleName: string; // اسم الحلقة
  track: string; // المسار الأكاديمي
  avatar?: string;
  initials: string;
  status: 'active' | 'inactive';
  phone: string;
  studentsCount?: number;
  notes?: string;
}

export type SubscriptionStatus = 'active' | 'expired' | 'vacation';
export type ReportStatus = 'regular' | 'overdue' | 'pending';

export interface Student {
  id: string;
  name: string;
  teacherId: string; // المعلم المسؤول
  parentPhone: string; // رقم ولي الأمر الإداري
  subscriptionFee: number; // قيمة الاشتراك بالريال
  teacherCost?: number; // مصروفات/مستحقات المعلم لهذا الطالب
  subscriptionDate: string; // تاريخ اشتراك الطالب
  lastReportDate: string; // تاريخ آخر تقرير
  status: SubscriptionStatus; // حالة الاشتراك: نشط / منتهي / إجازة
  vacationStartDate?: string; // تاريخ بداية الإجازة
  vacationEndDate?: string; // تاريخ نهاية الإجازة
  vacationType?: string; // عذر طبي، سفر عائلي، إلخ
  notes: string; // نص حر
  surahProgress: string; // تقدم الحفظ: سورة البقرة، جزء عم، إلخ
  level?: string; // المستوى
  initials: string;
  // مواعيد الحصص وجدول التسميع
  scheduleDays?: string[]; // أيام الحصص في الأسبوع: الأحد، الإثنين، إلخ
  sessionTime?: string; // توقيت الحصة بتوقيت مكة المكرمة
  meetingUrl?: string; // رابط غرفة الزووم أو التسميع
  currentCycleSessionsCount?: number; // عداد الحصص المنجزة في دورة الـ 8 حصص الحالية (من 0 إلى 8)
}

export interface SessionLog {
  id: string;
  studentId: string;
  teacherId: string;
  sessionNumber: number; // رقم الحصة في الدورة (من 1 إلى 8)
  sessionDate: string; // تاريخ الحصة YYYY-MM-DD
  sessionTime?: string; // توقيت الحصة
  newMemorization: string; // مقدار الحفظ الجديد اليوم
  revision: string; // مقدار المراجعة السابقة
  homework: string; // واجب وتوجيهات الحصة القادمة
  attendance: 'attended' | 'absent' | 'excused'; // حالة الحضور
  notes?: string; // ملاحظات إضافية
  createdAt: string;
}

export interface Report {
  id: string;
  studentId: string;
  teacherId: string;
  reportDate: string;
  performanceSummary: string;
  memorizationScore?: number;
  grade?: string;
  notes?: string;
  recordedBy: string;
  // دورة الـ 8 حصص الشهرية
  memorizationDetails?: string; // السور والآيات التي تم حفظها
  revisionDetails?: string; // مقدار المراجعة والتثبيت
  teacherNotes?: string; // ملاحظات المعلم
  studentEncouragement?: string; // تشجيع وتحفيز الطالب
  cycleSessionsCount?: number; // افتراضياً 8 حصص
  submissionStatus?: 'submitted_ready_to_send' | 'sent_to_parent' | 'approved'; // حالة تسليم التقرير
  submittedByTeacherName?: string; // اسم المعلم الذي قام بالتسليم
}

export interface ActivityLog {
  id: string;
  studentId?: string;
  studentName?: string;
  action: string;
  userName: string;
  userRole: string;
  timestamp: string;
  details: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'urgent' | 'warning' | 'info' | 'success';
  date: string;
  read: boolean;
  studentId?: string;
}

export interface FinancialMonth {
  monthName: string;
  subscriptions: number;
  teacherCosts: number;
  netProfit: number;
}
