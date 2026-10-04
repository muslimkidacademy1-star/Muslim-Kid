import React from 'react';
import { Student } from '../../types';

interface TeacherEarningsViewProps {
  students: Student[];
  teacherName: string;
}

export const TeacherEarningsView: React.FC<TeacherEarningsViewProps> = ({
  students,
  teacherName,
}) => {
  const activeStudents = students.filter((s) => s.status !== 'expired');

  // Compute student-by-student teacher share
  const studentRows = activeStudents.map((st) => {
    const pkg = st.packageSessionsCount || 8;
    // Determine teacher cost per student
    let teacherShare = st.teacherCost;
    if (!teacherShare || teacherShare <= 0) {
      if (st.teacherCostType === 'percentage' && st.teacherCostPercentage) {
        teacherShare = Math.round(((st.subscriptionFee || 300) * st.teacherCostPercentage) / 100);
      } else {
        // Standard fair share: default 50% of subscription fee or 150 SAR / 8 sessions
        teacherShare = Math.round((st.subscriptionFee || 300) * 0.5);
      }
    }

    const currency = st.currency || 'SAR';
    const currencyLabel = currency === 'EGP' ? 'ج.م' : 'ر.س';

    return {
      student: st,
      packageLabel: `${pkg} حصص شهرياً`,
      subscriptionFee: st.subscriptionFee || 300,
      teacherShare,
      currencyLabel,
      completedSessions: st.currentCycleSessionsCount || 0,
      status: st.status,
    };
  });

  const totalEarnings = studentRows.reduce((acc, r) => acc + r.teacherShare, 0);
  const totalCompletedSessions = studentRows.reduce((acc, r) => acc + r.completedSessions, 0);
  const currencyPrimary = studentRows[0]?.currencyLabel || 'ر.س';

  return (
    <div className="flex flex-col gap-4 sm:gap-5" dir="rtl">
      {/* 1. Transparent Financial Summary Banner */}
      <div className="bg-gradient-to-br from-[#125862] to-[#1A7B88] rounded-3xl p-5 sm:p-7 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white/90">
              ملخص مستحقات المعلم الشهرية ({teacherName})
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            {totalEarnings.toLocaleString()} <span className="text-base font-bold text-white/90">{currencyPrimary}</span>
          </h2>
          <p className="text-xs text-white/80">
            إجمالي المستحقات المتوقعة لهذا الشهر محسوبة تلقائياً بجمع مستحقات الطلاب النشطين المسجلين في حلقتك
          </p>
        </div>

        {/* Quick Numbers Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl px-4 py-3 border border-white/15 flex flex-col">
            <span className="text-[11px] text-white/80 font-medium">عدد طلاب الحلقة النشطين</span>
            <span className="text-lg font-bold text-white mt-0.5">{activeStudents.length} طلاب</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs rounded-2xl px-4 py-3 border border-white/15 flex flex-col">
            <span className="text-[11px] text-white/80 font-medium">الحصص المنجزة بالدورة</span>
            <span className="text-lg font-bold text-white mt-0.5">{totalCompletedSessions} حصة</span>
          </div>
        </div>
      </div>

      {/* 2. Simplified & Transparent Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1A7B88] text-xl">payments</span>
            <h3 className="font-bold text-sm sm:text-base text-gray-900">
              تفاصيل مستحقات المعلم عن كل طالب
            </h3>
          </div>
          <span className="text-xs font-semibold text-[#125862] bg-[#EAF5F7] px-3 py-1 rounded-xl border border-[#1A7B88]/20">
            {studentRows.length} طالب مسجل
          </span>
        </div>

        {studentRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            لا يوجد طلاب نشطون مسجلون في حلقتك حالياً لحساب المستحقات.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F4F9FA] text-gray-600 font-bold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">اسم الطالب</th>
                  <th className="py-3 px-4">الباقة الشهرية</th>
                  <th className="py-3 px-4">الحصص المنجزة</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-left">مستحق المعلم من هذا الطالب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {studentRows.map((row, idx) => (
                  <tr key={row.student.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-gray-400">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{row.student.name}</span>
                        <span className="text-[11px] text-gray-400 font-normal">
                          ({row.student.surahProgress})
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">
                      <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 text-[11px] font-semibold">
                        {row.packageLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 font-mono">
                      <span className="text-[#125862] font-bold">
                        {row.completedSessions}
                      </span>{' '}
                      / {row.student.packageSessionsCount || 8}
                    </td>
                    <td className="py-3.5 px-4">
                      {row.status === 'vacation' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          إجازة مؤقتة
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          نشط ومنتظم
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-left font-bold text-[#125862] font-mono text-sm">
                      {row.teacherShare} <span className="text-xs font-normal text-gray-500">{row.currencyLabel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#EAF5F7]/60 font-bold border-t border-[#1A7B88]/20">
                <tr>
                  <td colSpan={5} className="py-3.5 px-4 text-gray-800 text-xs">
                    الإجمالي المتوقع لكافة طلاب الحلقة:
                  </td>
                  <td className="py-3.5 px-4 text-left font-mono text-base font-extrabold text-[#125862]">
                    {totalEarnings.toLocaleString()} <span className="text-xs font-bold text-gray-600">{currencyPrimary}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="p-4 bg-[#fafafa] border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>
            💡 يتم احتساب المستحقات بانتظام مع اعتماد تقارير الحصص من الإدارة العامة.
          </span>
          <span className="font-semibold text-[#1A7B88]">أكاديمية المسلم الصغير</span>
        </div>
      </div>
    </div>
  );
};
