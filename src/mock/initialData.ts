import { Supervisor, Teacher, Student, Report, ActivityLog, FinancialMonth, SessionLog } from '../types';

export const ARABIC_WEEKDAYS = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
] as const;

export function getTodayArabicWeekday(): string {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayIndex = new Date().getDay();
  return days[dayIndex];
}

export function getRelativeDateString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export const INITIAL_SUPERVISORS: Supervisor[] = [
  {
    id: '173a41a8-173a-4173-8173-173a41a83999',
    name: 'إدارة الأكاديمية',
    role: 'manager',
    title: 'المدير العام للأكاديمية',
    roleLabel: 'الإدارة العامة والمالية',
    department: 'مجلس الإدارة والرقابة المالية',
    initials: 'م',
    email: 'muslim.kid.academy1@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    assignedTeacherIds: [],
  },
  {
    id: '173a41a8-173a-4173-8173-173a41a83123',
    name: 'د. خالد المنصور',
    role: 'manager',
    title: 'المدير العام للأكاديمية',
    roleLabel: 'الإدارة العامة والمالية',
    department: 'مجلس الإدارة والرقابة المالية',
    initials: 'خ',
    email: 'admin@academy.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    assignedTeacherIds: [],
  },
  {
    id: '173496c5-1734-4173-8173-173496c5b123',
    name: 'أ. عبد الرحمن الصالح',
    role: 'sub_supervisor',
    title: 'المشرف التعليمي',
    roleLabel: 'الإشراف الفرعي والمتابعة',
    department: 'فريق الإشراف التعليمي',
    initials: 'ص',
    email: 'supervisor@academy.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    assignedTeacherIds: [],
  },
  {
    id: '173f99f4-173f-4173-8173-173f99f4b123',
    name: 'أ. عبد الرحمن السعدي',
    role: 'general_supervisor',
    title: 'المشرف العام',
    roleLabel: 'الإشراف الأكاديمي العام',
    department: 'قسم الشؤون التعليمية والأكاديمية',
    initials: 'س',
    email: 'saadi@muslimkid.academy',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    assignedTeacherIds: [],
  },
  {
    id: 'a2819696-2524-4c96-a3bb-a6e4223ebcf4',
    name: 'الشيخ محمد أبو شتا',
    role: 'teacher',
    title: 'معلم حلقة قرآن',
    roleLabel: 'معلم - حلقة النور',
    department: 'الهيئة التعليمية',
    initials: 'م',
    email: 'teacher@academy.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    assignedTeacherIds: ['a2819696-2524-4c96-a3bb-a6e4223ebcf4'],
    teacherId: 'a2819696-2524-4c96-a3bb-a6e4223ebcf4',
  },
];

// Clean empty collections - 100% reliant on real Supabase tables
export const INITIAL_TEACHERS: Teacher[] = [];
export const INITIAL_STUDENTS: Student[] = [];
export const SEEDED_STUDENTS: Student[] = [];
export const INITIAL_REPORTS: Report[] = [];
export const INITIAL_SESSION_LOGS: SessionLog[] = [];
export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];
export const INITIAL_FINANCIAL_MONTHS: FinancialMonth[] = [];
