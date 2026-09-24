import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose }) => {
  const { activityLogs } = useApp();
  const [searchFilter, setSearchFilter] = useState('');

  const filteredLogs = useMemo(() => {
    if (!searchFilter.trim()) return activityLogs;
    const q = searchFilter.toLowerCase();
    return activityLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        (l.studentName && l.studentName.toLowerCase().includes(q)) ||
        l.userName.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
    );
  }, [activityLogs, searchFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-[#bec8c8]/20 overflow-hidden flex flex-col max-h-[85vh] text-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#bec8c8]/20 flex items-center justify-between bg-[#f0f3ff]">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-[#005253]/10 text-[#005253] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">history</span>
            </span>
            <div>
              <span className="font-bold text-base text-[#111c2d] block">
                سجل التعديلات والعمليات التاريخية (Activity Log)
              </span>
              <span className="text-xs text-[#6f7979]">
                توثيق فوري لأي إضافة، تعديل، إجازة أو تقرير مع اسم المعدّل والتوقيت
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6f7979] hover:bg-[#dee8ff]"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#bec8c8]/20 bg-white">
          <div className="relative">
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-[#6f7979] text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="بحث في السجل باسم الطالب، المشرف، أو نوع العملية..."
              className="w-full h-10 pr-9 pl-4 rounded-xl bg-[#f0f3ff] text-[#111c2d] text-xs sm:text-sm focus:outline-none"
            />
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-[#6f7979] text-xs sm:text-sm">
              لا توجد عمليات تطابق البحث.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-[#f9f9ff] border border-[#bec8c8]/20 flex flex-col gap-2 hover:bg-[#f0f3ff] transition-colors"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#005253]"></span>
                    <span className="font-bold text-sm text-[#111c2d]">{log.action}</span>
                    {log.studentName && (
                      <span className="px-2 py-0.5 rounded-full bg-[#dee8ff] text-[#005253] text-xs font-bold">
                        طالب: {log.studentName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#6f7979]">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span dir="ltr">{log.timestamp}</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#3f4949] leading-relaxed pr-4">
                  {log.details}
                </p>

                <div className="flex items-center gap-2 pt-1 border-t border-[#bec8c8]/10 text-xs text-[#6f7979]">
                  <span className="material-symbols-outlined text-sm text-[#005253]">person</span>
                  <span>المسؤول:</span>
                  <span className="font-semibold text-[#111c2d]">{log.userName}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#e7eeff] text-[#3f4949]">
                    {log.userRole}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#bec8c8]/20 bg-[#f0f3ff] flex items-center justify-between">
          <span className="text-xs text-[#6f7979]">
            إجمالي العمليات الموثقة: {filteredLogs.length} عملية
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#005253] text-white text-xs font-bold hover:bg-[#186b6d]"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
