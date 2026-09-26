import { supabase } from './supabase';
import { Student, Teacher, Supervisor, SessionLog, Report, UserRole } from '../types';
import {
  INITIAL_SUPERVISORS,
  INITIAL_TEACHERS,
  SEEDED_STUDENTS,
  INITIAL_REPORTS,
  INITIAL_SESSION_LOGS,
} from '../mock/initialData';

// Generate consistent UUID v4 from string seed so deterministic mapping is preserved across initial seed
export function stringToUuid(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = (Math.abs(hash) + 0x100000000).toString(16);
  const part1 = hex.padStart(8, '0').slice(0, 8);
  const part2 = hex.padStart(8, '1').slice(0, 4);
  const part3 = '4' + hex.padStart(8, '2').slice(0, 3);
  const part4 = '8' + hex.padStart(8, '3').slice(0, 3);
  const part5 = (hex + '1234567890ab').slice(0, 12);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

export function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function safeUuid(id: string): string {
  return isUuid(id) ? id : stringToUuid(id);
}

// Convert app Student to Supabase row
export function studentToSupabaseRow(s: Student, teacherUuidMap?: Record<string, string>) {
  const rawTeacherId = s.teacherId;
  const teacherId = teacherUuidMap && teacherUuidMap[rawTeacherId] ? teacherUuidMap[rawTeacherId] : rawTeacherId;
  const id = safeUuid(s.id);

  return {
    id,
    name: s.name,
    teacher_id: safeUuid(teacherId),
    parent_phone: s.parentPhone || '',
    monthly_subscription: s.subscriptionFee || 0,
    teacher_expense: s.teacherCost || 0,
    start_date: s.subscriptionDate || new Date().toISOString().split('T')[0],
    last_report_date: s.lastReportDate || new Date().toISOString().split('T')[0],
    subscription_status: s.status || 'active',
    session_days: s.scheduleDays ? JSON.stringify(s.scheduleDays) : null,
    session_time: s.sessionTime || null,
    zoom_link: s.meetingUrl || null,
    notes: s.notes || s.surahProgress || '',
  };
}

// Convert Supabase row to app Student
export function supabaseRowToStudent(row: any): Student {
  let scheduleDays: string[] = ['الأحد', 'الثلاثاء', 'الخميس'];
  if (row.session_days) {
    try {
      if (Array.isArray(row.session_days)) {
        scheduleDays = row.session_days;
      } else {
        scheduleDays = JSON.parse(row.session_days);
      }
    } catch {
      // fallback
    }
  }

  const initialChar = row.name ? row.name.trim().charAt(0) : 'ط';

  return {
    id: row.id,
    name: row.name || 'طالب',
    teacherId: row.teacher_id || '',
    parentPhone: row.parent_phone || '',
    subscriptionFee: Number(row.monthly_subscription) || 0,
    teacherCost: Number(row.teacher_expense) || 120,
    subscriptionDate: row.start_date || new Date().toISOString().split('T')[0],
    lastReportDate: row.last_report_date || new Date().toISOString().split('T')[0],
    status: (row.subscription_status as any) || 'active',
    notes: row.notes || '',
    surahProgress: row.notes || 'سورة البقرة',
    initials: initialChar,
    scheduleDays,
    sessionTime: row.session_time || '04:30 م',
    meetingUrl: row.zoom_link || '',
    currentCycleSessionsCount: 0,
  };
}

// Convert app Teacher to Supabase row
export function teacherToSupabaseRow(t: Teacher, supervisorUuidMap?: Record<string, string>) {
  const rawSupId = t.supervisorId;
  const supervisorId = supervisorUuidMap && supervisorUuidMap[rawSupId] ? supervisorUuidMap[rawSupId] : rawSupId;
  const id = safeUuid(t.id);

  return {
    id,
    name: t.name,
    supervisor_id: safeUuid(supervisorId),
    monthly_expenses: t.monthlySalary || 0,
    phone: t.phone || '',
    notes: t.circleName ? `${t.circleName} - ${t.notes || ''}` : (t.notes || ''),
  };
}

// Convert Supabase row to app Teacher
export function supabaseRowToTeacher(row: any): Teacher {
  const nameParts = (row.name || '').trim().split(/\s+/);
  const initials =
    nameParts.length > 1
      ? `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`
      : nameParts[0]?.charAt(0) || 'م';

  const notesStr = row.notes || '';
  const circleName = notesStr.includes('-') ? notesStr.split('-')[0].trim() : (notesStr || 'حلقة القرآن');

  return {
    id: row.id,
    name: row.name || 'معلم',
    monthlySalary: Number(row.monthly_expenses) || 1200,
    supervisorId: row.supervisor_id || '',
    circleName: circleName || 'حلقة الفرقان',
    track: 'القرآن الكريم والتجويد',
    initials,
    status: 'active',
    phone: row.phone || '',
    notes: row.notes || '',
  };
}

// Convert app Supervisor to Supabase row
export function supervisorToSupabaseRow(s: Supervisor) {
  const id = safeUuid(s.id);

  return {
    id,
    name: s.name,
    role: s.role,
  };
}

// Convert Supabase row to app Supervisor
export function supabaseRowToSupervisor(row: any): Supervisor {
  const initialChar = row.name ? row.name.trim().charAt(0) : 'م';
  return {
    id: row.id,
    name: row.name || 'مشرف',
    role: row.role || 'general_supervisor',
    title: row.role === 'manager' ? 'المدير العام' : row.role === 'sub_supervisor' ? 'مشرف تعليمي' : 'المشرف العام',
    roleLabel: row.role === 'manager' ? 'الإدارة العامة والمالية' : row.role === 'sub_supervisor' ? 'إشراف ميداني' : 'الإشراف العام',
    department: 'الشؤون التعليمية',
    initials: initialChar,
    email: `${row.role || 'user'}@muslimkid.academy`,
    assignedTeacherIds: [],
  };
}

// Convert app SessionLog to Supabase row
export function sessionLogToSupabaseRow(
  l: SessionLog,
  studentUuidMap?: Record<string, string>,
  teacherUuidMap?: Record<string, string>
) {
  const studentId = studentUuidMap && studentUuidMap[l.studentId] ? studentUuidMap[l.studentId] : l.studentId;
  const teacherId = teacherUuidMap && teacherUuidMap[l.teacherId] ? teacherUuidMap[l.teacherId] : l.teacherId;
  const id = safeUuid(l.id);

  return {
    id,
    student_id: safeUuid(studentId),
    teacher_id: safeUuid(teacherId),
    session_number: l.sessionNumber || 1,
    memorization: l.newMemorization || '',
    review: l.revision || '',
    homework: l.homework || '',
    notes: l.notes || '',
  };
}

// Convert Supabase row to app SessionLog
export function supabaseRowToSessionLog(row: any): SessionLog {
  return {
    id: row.id,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    sessionNumber: row.session_number || 1,
    sessionDate: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    newMemorization: row.memorization || '',
    revision: row.review || '',
    homework: row.homework || '',
    attendance: 'attended',
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// Convert app Report to Supabase row
export function reportToSupabaseRow(
  r: Report,
  studentUuidMap?: Record<string, string>,
  teacherUuidMap?: Record<string, string>
) {
  const studentId = studentUuidMap && studentUuidMap[r.studentId] ? studentUuidMap[r.studentId] : r.studentId;
  const teacherId = teacherUuidMap && teacherUuidMap[r.teacherId] ? teacherUuidMap[r.teacherId] : r.teacherId;
  const id = safeUuid(r.id);

  return {
    id,
    student_id: safeUuid(studentId),
    teacher_id: safeUuid(teacherId),
    report_date: r.reportDate || new Date().toISOString().split('T')[0],
    memorization: r.memorizationDetails || r.performanceSummary || '',
    review: r.revisionDetails || '',
    rating: r.grade || (r.memorizationScore ? `${r.memorizationScore}%` : 'ممتاز'),
    notes: r.teacherNotes || r.notes || '',
    status: r.submissionStatus || 'submitted_ready_to_send',
  };
}

// Convert Supabase row to app Report
export function supabaseRowToReport(row: any): Report {
  return {
    id: row.id,
    studentId: row.student_id,
    teacherId: row.teacher_id,
    reportDate: row.report_date || new Date().toISOString().split('T')[0],
    performanceSummary: row.memorization || 'تقرير دورة الـ 8 حصص',
    memorizationScore: 95,
    grade: row.rating || 'ممتاز',
    notes: row.notes || '',
    recordedBy: 'معلم الحلقة',
    memorizationDetails: row.memorization || '',
    revisionDetails: row.review || '',
    teacherNotes: row.notes || '',
    studentEncouragement: 'بارك الله فيك يا بطل القرآن الصغير وحفظك ورعاك!',
    cycleSessionsCount: 8,
    submissionStatus: row.status || 'submitted_ready_to_send',
    submittedByTeacherName: 'معلم الحلقة',
  };
}

// Seed initial data to Supabase
export async function seedInitialDataToSupabase(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Prepare and insert supervisors
    const supRows = INITIAL_SUPERVISORS.map(supervisorToSupabaseRow);
    const { error: supErr } = await supabase.from('supervisors').upsert(supRows, { onConflict: 'id' });
    if (supErr) throw new Error(`Supervisors seed error: ${supErr.message}`);

    // Map supervisor IDs
    const supMap: Record<string, string> = {};
    INITIAL_SUPERVISORS.forEach((s) => {
      supMap[s.id] = safeUuid(s.id);
    });

    // 2. Prepare and insert teachers
    const teachRows = INITIAL_TEACHERS.map((t) => teacherToSupabaseRow(t, supMap));
    const { error: teachErr } = await supabase.from('teachers').upsert(teachRows, { onConflict: 'id' });
    if (teachErr) throw new Error(`Teachers seed error: ${teachErr.message}`);

    // Map teacher IDs
    const teacherMap: Record<string, string> = {};
    INITIAL_TEACHERS.forEach((t) => {
      teacherMap[t.id] = safeUuid(t.id);
    });

    // 3. Prepare and insert students
    const studentRows = SEEDED_STUDENTS.map((s) => studentToSupabaseRow(s, teacherMap));
    const { error: studErr } = await supabase.from('students').upsert(studentRows, { onConflict: 'id' });
    if (studErr) throw new Error(`Students seed error: ${studErr.message}`);

    // Map student IDs
    const studentMap: Record<string, string> = {};
    SEEDED_STUDENTS.forEach((s) => {
      studentMap[s.id] = safeUuid(s.id);
    });

    // 4. Clean and re-insert session logs and reports
    await supabase.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('session_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const sessionRows = INITIAL_SESSION_LOGS.map((sess) =>
      sessionLogToSupabaseRow(sess, studentMap, teacherMap)
    );
    const { error: sessErr } = await supabase.from('session_logs').insert(sessionRows);
    if (sessErr) throw new Error(`Session logs seed error: ${sessErr.message}`);

    const reportRows = INITIAL_REPORTS.map((r) =>
      reportToSupabaseRow(r, studentMap, teacherMap)
    );
    const { error: repErr } = await supabase.from('reports').insert(reportRows);
    if (repErr) throw new Error(`Reports seed error: ${repErr.message}`);

    return {
      success: true,
      message: `تم بنجاح رفع ومزامنة البيانات التجريبية إلى Supabase (${supRows.length} مشرفين، ${teachRows.length} معلماً، ${studentRows.length} طالباً، ${sessionRows.length} حصة، ${reportRows.length} تقارير)!`,
    };
  } catch (err: any) {
    console.error('Seed error:', err);
    return {
      success: false,
      message: err.message || 'فشل ترحيل البيانات إلى Supabase',
    };
  }
}

// Resolve user role and profile from Supabase by email
export async function resolveUserRoleFromSupabase(userEmail: string): Promise<Supervisor | null> {
  const cleanEmail = userEmail.trim().toLowerCase();

  // 1. Search in teachers table first
  try {
    const { data: tRows, error: tErr } = await supabase
      .from('teachers')
      .select('*')
      .ilike('email', cleanEmail)
      .limit(1);

    if (!tErr && tRows && tRows.length > 0) {
      const t = tRows[0];
      const initials = t.name ? t.name.trim().charAt(0) : 'م';
      const circleName =
        t.notes && t.notes.includes('-')
          ? t.notes.split('-')[0].trim()
          : t.notes || 'حلقة القرآن';

      return {
        id: t.id,
        name: t.name || 'معلم',
        role: 'teacher',
        title: 'معلم حلقة قرآن',
        roleLabel: `معلم - ${circleName}`,
        department: 'الهيئة التعليمية',
        initials,
        email: cleanEmail,
        teacherId: t.id,
        assignedTeacherIds: [t.id],
      };
    }
  } catch (e) {
    console.warn('Error resolving teacher role from Supabase:', e);
  }

  // 2. Search in supervisors table
  try {
    const { data: sRows, error: sErr } = await supabase
      .from('supervisors')
      .select('*')
      .ilike('email', cleanEmail)
      .limit(1);

    if (!sErr && sRows && sRows.length > 0) {
      const s = sRows[0];
      const role: UserRole =
        s.role === 'manager'
          ? 'manager'
          : s.role === 'sub_supervisor'
          ? 'sub_supervisor'
          : s.role === 'teacher'
          ? 'teacher'
          : 'general_supervisor';

      const initials = s.name ? s.name.trim().charAt(0) : 'م';
      return {
        id: s.id,
        name: s.name || 'مشرف',
        role,
        title:
          role === 'manager'
            ? 'المدير العام للأكاديمية'
            : role === 'sub_supervisor'
            ? 'المشرف التعليمي'
            : role === 'teacher'
            ? 'معلم حلقة'
            : 'المشرف العام',
        roleLabel:
          role === 'manager'
            ? 'الإدارة العامة والمالية'
            : role === 'sub_supervisor'
            ? 'الإشراف الفرعي'
            : role === 'teacher'
            ? 'معلم حلقة'
            : 'الإشراف الأكاديمي العام',
        department:
          role === 'manager'
            ? 'مجلس الإدارة والرقابة المالية'
            : role === 'sub_supervisor'
            ? 'فريق الإشراف التعليمي'
            : 'قسم الشؤون التعليمية',
        initials,
        email: cleanEmail,
        assignedTeacherIds: role === 'sub_supervisor' ? ['t1', 't2', 't3', 't4'] : [],
      };
    }
  } catch (e) {
    console.warn('Error resolving supervisor role from Supabase:', e);
  }

  // 3. Fallback to mock / initial supervisors if applicable
  const fallback = INITIAL_SUPERVISORS.find(
    (sup) =>
      sup.email.toLowerCase() === cleanEmail ||
      (cleanEmail.includes('admin') && sup.role === 'manager') ||
      (cleanEmail.includes('supervisor') && sup.role === 'sub_supervisor') ||
      (cleanEmail.includes('teacher') && sup.role === 'teacher')
  );

  return fallback || null;
}
