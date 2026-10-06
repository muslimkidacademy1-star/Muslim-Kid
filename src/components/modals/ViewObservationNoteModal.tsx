import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, Teacher } from '../../types';
import { useApp } from '../../context/AppContext';
import { ObservationData } from './RecordObservationModal';
import { formatCairoTime } from '../../utils/whatsapp';

export interface ViewObservationNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If targetStudentId is provided, the modal operates in single-student visits history mode
  targetStudentId?: string;
  student?: Student;
  teacher?: Teacher;
  onNewObservation?: (teacher?: Teacher, student?: Student) => void;
}

// Helpers for Cairo date and days calculation
function formatVisitDate(dateStr?: string): string {
  if (!dateStr) return 'تاريخ غير مسجل';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('ar-EG', {
      timeZone: 'Africa/Cairo',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

function calculateDaysAgo(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export const ViewObservationNoteModal: React.FC<ViewObservationNoteModalProps> = ({
  isOpen,
  onClose,
  targetStudentId,
  student,
  teacher,
  onNewObservation,
}) => {
  const { currentUser, visibleTeachers, visibleStudents, getTeacherById, isSuperAdmin } = useApp();

  // Selected observation for deep read-only inspection
  const [selectedDetailObs, setSelectedDetailObs] = useState<ObservationData | null>(null);

  // Search & Teacher filtering for comprehensive mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('all');

  // Batch loading (load more & infinite scroll)
  const PAGE_SIZE = 8;
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Refs for Infinite Scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Loading and Error states
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset local state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setSelectedDetailObs(null);
      setSearchQuery('');
      setSelectedTeacherFilter('all');
      setDisplayLimit(PAGE_SIZE);
      setLoadError(null);
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [isOpen, targetStudentId]);

  // Reset display limit when search or filter changes
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [searchQuery, selectedTeacherFilter]);

  // Resolve target student object if targetStudentId was passed
  const activeStudent = useMemo(() => {
    if (student) return student;
    if (targetStudentId) {
      return visibleStudents.find((s) => s.id === targetStudentId);
    }
    return undefined;
  }, [student, targetStudentId, visibleStudents]);

  const activeTeacher = useMemo(() => {
    if (teacher) return teacher;
    if (activeStudent?.teacherId) {
      return getTeacherById(activeStudent.teacherId);
    }
    return undefined;
  }, [teacher, activeStudent, getTeacherById]);

  // Load and derive permitted observations
  const allPermittedObservations = useMemo(() => {
    try {
      // 1. Read stored observations from localStorage
      const rawStored: ObservationData[] = JSON.parse(
        localStorage.getItem('mk_observation_notes') || '[]'
      );

      // 2. Set of teacher IDs this supervisor is permitted to access
      const allowedTeacherIds = new Set(visibleTeachers.map((t) => t.id));

      // 3. Filter by supervisor access boundary
      let list = rawStored.filter((item) => {
        if (isSuperAdmin) return true;
        if (!item.teacherId) return false;
        return allowedTeacherIds.has(item.teacherId);
      });

      // 4. Synthesize records for students who have a lastObservationDate recorded in Supabase / AppContext
      // but do not yet exist in localStorage (ensures cross-device and synced visits are never lost)
      visibleStudents.forEach((stud) => {
        if (stud.lastObservationDate) {
          const alreadyInList = list.some(
            (o) => o.studentId === stud.id && o.date === stud.lastObservationDate
          );
          if (!alreadyInList) {
            const studTeacher = getTeacherById(stud.teacherId);
            list.push({
              id: `synced-${stud.id}-${stud.lastObservationDate}`,
              studentId: stud.id,
              studentName: stud.name,
              teacherId: stud.teacherId,
              teacherName: studTeacher?.name || 'معلم غير محدد',
              circleName: studTeacher?.circleName || 'حلقة القرآن',
              date: stud.lastObservationDate,
              rating: stud.lastObservationRating || 0,
              notes: stud.lastObservationNote || 'غير مسجل',
              sessionTime: stud.sessionTime || '04:00 م (بتوقيت القاهرة)',
              supervisorName: 'المشرف التعليمي',
              teachingMethodScore: 'غير مسجل',
              studentEngagement: 'غير مسجل',
              punctuality: 'غير مسجل',
              createdAt: new Date(stud.lastObservationDate).toISOString(),
            });
          }
        }
      });

      // 5. If targetStudentId is set, strictly filter by this specific student's ID (not name)
      if (targetStudentId) {
        list = list.filter((item) => item.studentId === targetStudentId);
      }

      // 6. Sort from newest to oldest
      return list.sort((a, b) => {
        const timeA = new Date(a.date || a.createdAt || 0).getTime();
        const timeB = new Date(b.date || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    } catch (err) {
      console.error('Error loading observations:', err);
      return [];
    }
  }, [visibleTeachers, visibleStudents, getTeacherById, isSuperAdmin, targetStudentId]);

  // Filter list by search query and teacher dropdown (in comprehensive mode)
  const filteredObservations = useMemo(() => {
    let result = allPermittedObservations;

    if (!targetStudentId) {
      if (selectedTeacherFilter !== 'all') {
        result = result.filter((item) => item.teacherId === selectedTeacherFilter);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter(
          (item) =>
            (item.teacherName && item.teacherName.toLowerCase().includes(q)) ||
            (item.studentName && item.studentName.toLowerCase().includes(q)) ||
            (item.circleName && item.circleName.toLowerCase().includes(q)) ||
            (item.notes && item.notes.toLowerCase().includes(q)) ||
            (item.supervisorName && item.supervisorName.toLowerCase().includes(q))
        );
      }
    }

    return result;
  }, [allPermittedObservations, targetStudentId, selectedTeacherFilter, searchQuery]);

  // Paginated records for display
  const displayedObservations = useMemo(() => {
    return filteredObservations.slice(0, displayLimit);
  }, [filteredObservations, displayLimit]);

  const hasMore = displayedObservations.length < filteredObservations.length;

  // Infinite Scroll Trigger via IntersectionObserver
  useEffect(() => {
    if (!hasMore || selectedDetailObs || !isOpen) return;

    const sentinelEl = sentinelRef.current;
    if (!sentinelEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          // Smooth micro-delay for 60fps rendering without jank on mobile
          setTimeout(() => {
            setDisplayLimit((prev) => Math.min(prev + PAGE_SIZE, filteredObservations.length));
            setIsLoadingMore(false);
          }, 180);
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '120px', // Pre-fetch smoothly before reaching bottom
        threshold: 0.05,
      }
    );

    observer.observe(sentinelEl);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, selectedDetailObs, isOpen, filteredObservations.length]);

  if (!isOpen) return null;

  const isStudentMode = Boolean(targetStudentId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs transition-all duration-200 font-sans"
      dir="rtl"
    >
      <div className="fixed inset-0 bg-transparent" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] bg-[#F5F5F7] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 flex flex-col text-right overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {selectedDetailObs ? (
              <button
                type="button"
                onClick={() => setSelectedDetailObs(null)}
                className="min-h-[40px] px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0 ml-1"
                title="العودة لسجل الزيارات"
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
                <span className="hidden sm:inline">العودة للسجل</span>
              </button>
            ) : (
              <span className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">
                  {isStudentMode ? 'history' : 'reviews'}
                </span>
              </span>
            )}

            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                {selectedDetailObs
                  ? 'تفاصيل زيارة المراقبة'
                  : isStudentMode
                  ? `سجل زيارات الطالب: ${activeStudent?.name || 'الطالب'}`
                  : 'سجل المراقبات الميدانية'}
              </h3>
              <p className="text-[11px] text-[#EAF5F7] truncate">
                {selectedDetailObs
                  ? 'قراءة تفصيلية لمعايير التقييم وملاحظات المشرف الميداني (للقراءة فقط)'
                  : isStudentMode
                  ? `كافة الزيارات المسجلة لهذا الطالب (${allPermittedObservations.length} زيارة)`
                  : `كافة الزيارات المسجلة لمعلمي إشرافك (${allPermittedObservations.length} مراقبة)`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق النافذة"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          ref={scrollContainerRef}
          className="p-4 sm:p-5 flex-1 overflow-y-auto overscroll-contain flex flex-col gap-3 text-xs text-gray-700 pb-12 sm:pb-6 scroll-smooth"
        >
          {/* VIEW A: DETAIL INSPECTION VIEW (Read-Only) */}
          {selectedDetailObs ? (
            <div className="flex flex-col gap-3 animate-in fade-in duration-150">
              {/* Context Ribbon: Student vs Teacher */}
              <div className="bg-white rounded-2xl p-4 border border-[#E5E5EA] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  {selectedDetailObs.studentId ? (
                    <div>
                      <span className="text-[11px] text-gray-500 block">الطالب:</span>
                      <h4 className="font-bold text-base text-[#1D1D1F] truncate">
                        {selectedDetailObs.studentName || 'طالب'}
                      </h4>
                      <p className="text-xs text-[#125862] font-semibold mt-0.5 truncate">
                        المعلم: {selectedDetailObs.teacherName || 'غير محدد'}
                        {selectedDetailObs.circleName && <span> ({selectedDetailObs.circleName})</span>}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20 mb-1">
                        <span className="material-symbols-outlined text-xs">groups</span>
                        <span>مراقبة عامة للمعلم</span>
                      </span>
                      <h4 className="font-bold text-base text-[#1D1D1F] truncate">
                        {selectedDetailObs.teacherName || 'معلم غير محدد'}
                      </h4>
                      <p className="text-xs text-[#62626A] font-medium mt-0.5 truncate">
                        حلقة: {selectedDetailObs.circleName || 'حلقة القرآن'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-right sm:text-left shrink-0 font-mono text-[11px]">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70 inline-block font-sans">
                    {calculateDaysAgo(selectedDetailObs.date) !== null
                      ? `منذ ${calculateDaysAgo(selectedDetailObs.date)} يوماً`
                      : 'زيارة سابقة'}
                  </span>
                  <div className="text-gray-500 mt-1 font-sans">
                    {formatVisitDate(selectedDetailObs.date)}
                  </div>
                  <div className="text-gray-400 text-[10px]">
                    {formatCairoTime(selectedDetailObs.sessionTime)}
                  </div>
                </div>
              </div>

              {/* Supervisor Identity */}
              <div className="bg-white rounded-xl p-3 border border-[#E5E5EA] shadow-2xs flex items-center justify-between">
                <span className="font-medium text-[#62626A]">المشرف القائم بالمراقبة:</span>
                <span className="font-bold text-[#1D1D1F]">
                  {selectedDetailObs.supervisorName || 'غير مسجل'}
                </span>
              </div>

              {/* Overall Rating */}
              <div className="bg-white rounded-xl p-3 border border-[#E5E5EA] shadow-2xs flex items-center justify-between">
                <span className="font-bold text-[#1D1D1F]">التقييم العام:</span>
                {selectedDetailObs.rating && selectedDetailObs.rating > 0 ? (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={`material-symbols-outlined text-lg ${
                          s <= (selectedDetailObs.rating || 0) ? 'text-amber-400' : 'text-gray-200'
                        }`}
                      >
                        star
                      </span>
                    ))}
                    <span className="font-mono font-bold text-gray-900 mr-1 text-xs">
                      ({selectedDetailObs.rating}/5)
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400 font-medium">غير مسجل</span>
                )}
              </div>

              {/* Accredited Criteria Breakdown */}
              <div className="bg-white rounded-2xl p-4 border border-[#E5E5EA] shadow-2xs flex flex-col gap-3">
                <h5 className="font-bold text-xs text-[#1D1D1F] border-b border-gray-100 pb-2">
                  معايير الجودة المعتمدة
                </h5>

                {/* 1. Recitation and Correction */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-[#62626A]">
                    أسلوب التلقين وتصحيح التجويد:
                  </span>
                  <p className="font-semibold text-xs text-[#1D1D1F] bg-[#F5F5F7] p-2.5 rounded-xl">
                    {selectedDetailObs.teachingMethodScore || 'غير مسجل'}
                  </p>
                </div>

                {/* 2. Student Engagement */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-[#62626A]">
                    تفاعل الطالب وانتباهه:
                  </span>
                  <p className="font-semibold text-xs text-[#1D1D1F] bg-[#F5F5F7] p-2.5 rounded-xl">
                    {selectedDetailObs.studentId
                      ? selectedDetailObs.studentEngagement || 'غير مسجل'
                      : 'مراقبة عامة للمعلم'}
                  </p>
                </div>

                {/* 3. Punctuality */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-[#62626A]">
                    الالتزام بالوقت وبدء الحلقة:
                  </span>
                  <p className="font-semibold text-xs text-[#1D1D1F] bg-[#F5F5F7] p-2.5 rounded-xl">
                    {selectedDetailObs.punctuality || 'غير مسجل'}
                  </p>
                </div>
              </div>

              {/* Notes and Directives */}
              <div className="bg-white rounded-2xl p-4 border border-[#E5E5EA] shadow-2xs flex flex-col gap-1.5">
                <span className="font-bold text-xs text-[#1D1D1F]">
                  ملاحظات وتوجيهات المشرف:
                </span>
                <div className="bg-[#F5F5F7] p-3.5 rounded-xl text-xs sm:text-sm text-[#1D1D1F] leading-relaxed whitespace-pre-wrap border border-gray-100">
                  {selectedDetailObs.notes || 'غير مسجل'}
                </div>
              </div>

              {/* Bottom Actions for Detail View */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setSelectedDetailObs(null)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white border border-[#E5E5EA] hover:bg-gray-50 text-[#1D1D1F] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                  <span>العودة للسجل</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                >
                  إغلاق
                </button>
              </div>
            </div>
          ) : (
            /* VIEW B: OBSERVATIONS LIST VIEW */
            <div className="flex flex-col gap-3">
              {/* Comprehensive Mode Filters: Search & Teacher dropdown */}
              {!isStudentMode && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute right-3.5 top-3 text-gray-400 text-lg pointer-events-none">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث باسم المعلم أو الطالب أو الحلقة أو الملاحظة"
                      className="w-full min-h-[44px] pr-10 pl-8 rounded-xl bg-white text-xs sm:text-sm text-gray-900 border border-gray-200/90 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 shadow-2xs placeholder:text-gray-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute left-3 top-2.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                        aria-label="مسح البحث"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Teacher Filter */}
                  {visibleTeachers.length > 0 && (
                    <div className="w-full sm:w-auto shrink-0">
                      <select
                        value={selectedTeacherFilter}
                        onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                        className="w-full sm:w-auto min-h-[44px] px-3 sm:px-4 rounded-xl bg-white border border-gray-200 text-xs text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 shadow-2xs cursor-pointer"
                        aria-label="فلترة بالمعلم"
                      >
                        <option value="all">كل معلموني ({visibleTeachers.length})</option>
                        {visibleTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Status Header for Student Mode */}
              {isStudentMode && (
                <div className="bg-white rounded-2xl p-3.5 border border-[#E5E5EA] shadow-2xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] text-gray-500 block">سجل زيارات الطالب المعتمد:</span>
                    <h4 className="font-bold text-sm sm:text-base text-[#1D1D1F] truncate">
                      {activeStudent?.name || 'الطالب المحدد'}
                    </h4>
                    <span className="text-[11px] text-[#125862] font-semibold block mt-0.5 truncate">
                      المعلم: {activeTeacher?.name || 'غير محدد'} ({activeTeacher?.circleName || 'حلقة القرآن'})
                    </span>
                  </div>

                  {onNewObservation && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNewObservation(activeTeacher, activeStudent);
                      }}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs shrink-0"
                    >
                      <span className="material-symbols-outlined text-base">add_circle</span>
                      <span>تسجيل مراقبة</span>
                    </button>
                  )}
                </div>
              )}

              {/* Error State */}
              {loadError ? (
                <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-rose-500">cloud_off</span>
                  <p className="font-bold text-sm text-gray-900">تعذر تحميل سجل المراقبات</p>
                  <p className="text-xs text-gray-500">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => setLoadError(null)}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-[#1A7B88] text-white font-bold text-xs cursor-pointer"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : isLoading ? (
                <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-2 border-[#1A7B88] border-t-transparent rounded-full animate-spin" />
                  <p className="font-bold text-xs text-gray-700">جاري تحميل سجل المراقبات...</p>
                </div>
              ) : filteredObservations.length === 0 ? (
                /* EMPTY STATES */
                <div className="bg-white rounded-2xl p-8 sm:p-10 border border-[#E5E5EA] text-center flex flex-col items-center justify-center gap-3 w-full">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center shadow-2xs">
                    <span className="material-symbols-outlined text-2xl">
                      {isStudentMode ? 'person_off' : searchQuery || selectedTeacherFilter !== 'all' ? 'search_off' : 'reviews'}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm sm:text-base text-[#1D1D1F]">
                    {isStudentMode
                      ? 'لا توجد زيارات مسجلة لهذا الطالب'
                      : searchQuery || selectedTeacherFilter !== 'all'
                      ? 'لا توجد نتائج مطابقة'
                      : 'لا توجد سجلات مراقبة حتى الآن'}
                  </h4>

                  <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
                    {isStudentMode
                      ? 'لم يتم توثيق أي زيارات أو ملاحظات مراقبة ميدانية لهذا الطالب حتى الآن.'
                      : searchQuery || selectedTeacherFilter !== 'all'
                      ? 'لم نتمكن من العثور على أي مراقبة تطابق معايير البحث والفلترة المحددة.'
                      : 'لم يتم تسجيل أي زيارات مراقبة ميدانية للمعلمين التابعين لك حتى الآن.'}
                  </p>

                  {isStudentMode && onNewObservation ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNewObservation(activeTeacher, activeStudent);
                      }}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs mt-1"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      <span>تسجيل أول مراقبة للطالب</span>
                    </button>
                  ) : !isStudentMode && (searchQuery || selectedTeacherFilter !== 'all') ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedTeacherFilter('all');
                      }}
                      className="min-h-[44px] px-5 py-2 rounded-xl bg-[#EAF5F7] text-[#125862] hover:bg-[#d9eff3] font-bold text-xs cursor-pointer transition-colors mt-1"
                    >
                      مسح الفلاتر
                    </button>
                  ) : null}
                </div>
              ) : (
                /* LIST OF OBSERVATION CARDS */
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 font-medium">
                    <span>
                      عرض {displayedObservations.length} من أصل {filteredObservations.length} زيارة
                    </span>
                    <span>مرتبة من الأحدث إلى الأقدم</span>
                  </div>

                  {displayedObservations.map((obs) => {
                    const daysAgo = calculateDaysAgo(obs.date);
                    const isGeneral = !obs.studentId;

                    return (
                      <div
                        key={obs.id || `obs-${obs.date}-${obs.teacherId}`}
                        className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E5E5EA] shadow-2xs hover:shadow-xs transition-shadow flex flex-col gap-2.5"
                      >
                        {/* Card Header: Subject (Student vs General Teacher) + Date */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="min-w-0 flex-1">
                            {isGeneral ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF5F7] text-[#125862] border border-[#1A7B88]/20 shrink-0">
                                  <span className="material-symbols-outlined text-xs">groups</span>
                                  <span>مراقبة عامة للمعلم</span>
                                </span>
                                <h4 className="font-bold text-sm text-[#1D1D1F] truncate">
                                  {obs.teacherName || 'معلم غير محدد'}
                                </h4>
                              </div>
                            ) : (
                              <div>
                                <h4 className="font-bold text-sm sm:text-base text-[#1D1D1F] truncate">
                                  {obs.studentName || 'طالب'}
                                </h4>
                                <p className="text-xs text-[#62626A] font-medium mt-0.5 truncate">
                                  المعلم: {obs.teacherName || 'غير محدد'}
                                  {obs.circleName && <span> · {obs.circleName}</span>}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="text-left shrink-0 font-mono text-[11px]">
                            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60 inline-block font-sans">
                              {daysAgo !== null ? (daysAgo === 0 ? 'اليوم' : `منذ ${daysAgo} يوماً`) : 'زيارة سابقة'}
                            </span>
                            <div className="text-gray-500 font-sans mt-0.5 text-[11px]">
                              {formatVisitDate(obs.date)}
                            </div>
                          </div>
                        </div>

                        {/* Timing, Supervisor & Rating line */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100 text-xs flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Star Rating */}
                            {obs.rating && obs.rating > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                                <span className="material-symbols-outlined text-xs text-amber-500">star</span>
                                <span>{obs.rating}/5</span>
                              </span>
                            ) : (
                              <span className="text-gray-400 font-medium text-[11px]">غير مسجل</span>
                            )}

                            {/* Session Time */}
                            <span className="text-[#62626A] text-[11px] flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs text-[#1A7B88]">schedule</span>
                              <span>{formatCairoTime(obs.sessionTime)}</span>
                            </span>

                            {/* Supervisor Name */}
                            {obs.supervisorName && (
                              <span className="text-gray-400 text-[11px] hidden sm:inline">
                                · المشرف: {obs.supervisorName}
                              </span>
                            )}
                          </div>

                          {/* Read-Only Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedDetailObs(obs)}
                            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#125862] hover:text-[#0E474F] font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors border border-[#E5E5EA] shrink-0"
                            title="عرض كافة معايير الزيارة والملاحظات"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            <span>عرض التفاصيل</span>
                          </button>
                        </div>

                        {/* Note Snippet */}
                        {obs.notes && obs.notes !== 'غير مسجل' && (
                          <div className="bg-[#F5F5F7] px-3 py-1.5 rounded-xl text-[11px] text-[#1D1D1F] line-clamp-2 leading-relaxed">
                            <span className="text-[#62626A] font-medium">الملاحظة: </span>
                            {obs.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Infinite Scroll Sentinel & Automated Loader */}
                  {hasMore && (
                    <div
                      ref={sentinelRef}
                      onClick={() => {
                        if (!isLoadingMore) {
                          setIsLoadingMore(true);
                          setTimeout(() => {
                            setDisplayLimit((prev) => Math.min(prev + PAGE_SIZE, filteredObservations.length));
                            setIsLoadingMore(false);
                          }, 150);
                        }
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-white/70 hover:bg-white border border-[#E5E5EA]/80 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-[#125862] transition-all cursor-pointer shadow-2xs min-h-[48px]"
                      title="يتم التحميل تلقائياً عند التمرير، أو اضغط للتحميل الفوري"
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <span className="w-4 h-4 rounded-full border-2 border-[#1A7B88] border-t-transparent animate-spin shrink-0" />
                        <span className="text-xs">جاري تحميل المزيد من السجلات تلقائياً...</span>
                      </div>
                      <span className="text-[11px] text-gray-500 font-mono">
                        (معروض {displayedObservations.length} من أصل {filteredObservations.length})
                      </span>
                    </div>
                  )}

                  {/* All Records Loaded Completion Indicator */}
                  {!hasMore && filteredObservations.length > PAGE_SIZE && (
                    <div className="w-full py-3 text-center text-[11px] text-[#62626A] font-medium border-t border-[#E5E5EA] mt-1 flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                      <span>تم عرض كافة السجلات ({filteredObservations.length} زيارة)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
