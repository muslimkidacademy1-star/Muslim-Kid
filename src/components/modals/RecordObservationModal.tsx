import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Teacher, Student } from '../../types';
import { useApp } from '../../context/AppContext';

export interface ObservationData {
  id?: string;
  supervisorId?: string;
  supervisorName?: string;
  teacherId?: string;
  teacherName?: string;
  circleName?: string;
  studentId?: string;
  studentName?: string;
  sessionTime?: string;
  rating?: number;
  teachingMethodScore?: string;
  studentEngagement?: string;
  punctuality?: string;
  notes?: string;
  date?: string;
  createdAt?: string;
}

interface RecordObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher?: Teacher;
  student?: Student;
  sessionTime?: string;
  existingObservation?: ObservationData;
}

// 1. Recitation and Correction Options (Values preserved exactly for database compatibility)
const TEACHING_METHOD_OPTIONS = [
  {
    value: 'ممتاز - تلقين متقن وضبط لأحكام التجويد ومخارج الحروف',
    title: 'ممتاز (متقن)',
    description: 'تلقين متقن وضبط تام لأحكام التجويد والغنن ومخارج الحروف',
    badge: 'ممتاز ⭐',
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    qualityHint:
      'إتقان عالٍ للتجويد، استمر في تشجيع المعلم على ربط مخارج الحروف بالتطبيق العملي في الآيات الصعبة.',
  },
  {
    value: 'جيد جداً - تصحيح متواصل مع تشجيع للطالب',
    title: 'جيد جداً (تفاعلي)',
    description: 'تصحيح متواصل وتفاعل إيجابي وتشجيع محفز للطالب',
    badge: 'جيد جداً',
    badgeStyle: 'bg-[#EAF5F7] text-[#125862] border-[#1A7B88]/20',
    qualityHint:
      'أسلوب تفاعلي طيب، يُوصى بتكرار الكلمات غير المتقنة مرتين إلى ثلاث مرات لترسيخ التصحيح قبل الانتقال.',
  },
  {
    value: 'متوسط - يحتاج تركيزاً أكبر على أحكام التجويد',
    title: 'متوسط (يحتاج تركيز)',
    description: 'يحتاج تركيزاً أكبر على أحكام التجويد والمدود وقلقلة الحروف',
    badge: 'متوسط',
    badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200',
    qualityHint:
      'وجّه المعلم للتأني في التلقين وعدم استعجال الانتقال، مع التركيز على الغنن وأحكام النون والميم الساكنة.',
  },
  {
    value: 'يحتاج لتطوير مهارات إدارة حلقة التسميع التفاعلية',
    title: 'يحتاج تطوير',
    description: 'يحتاج مهارات تفاعلية أفضل في إدارة وقت وانتباه حلقة التسميع',
    badge: 'تطوير',
    badgeStyle: 'bg-rose-100 text-rose-800 border-rose-200',
    qualityHint:
      'يوصى باتباع أساليب التصحيح الفوري اللطيف (إيقاف الطالب عند موضع الخطأ مباشرة وتكراره برفق دون إحباط)، وتجنب مقاطعة التلاوة بحدة، مع اعتماد أسلوب التكرار النموذجي.',
  },
];

// 2. Student Engagement Options
const STUDENT_ENGAGEMENT_OPTIONS = [
  {
    value: 'تفاعل عالي وتجاوب سريع من الطالب',
    title: 'عالي ونشط',
    description: 'تفاعل عالي وتجاوب سريع وترديد منتبه ونشاط ملحوظ',
    badge: 'عالي ⭐',
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    qualityHint:
      'استثمر نشاط الطالب في تثبيت المحفوظات السابقة وزيادة مقدار الترديد ومكافأته بنقاط تشجيعية.',
  },
  {
    value: 'تفاعل متوسط ويحتاج تحفيزاً إضافياً',
    title: 'متوسط ومقبول',
    description: 'تفاعل متوسط مع الحاجة لتحفيز وتشجيع لفظي مستمر',
    badge: 'متوسط',
    badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200',
    qualityHint:
      'وجّه المعلم لربط التسميع بلوحة النجوم وقصص الآيات القصيرة لمنع تسرب الملل أو التشتت للطفل.',
  },
  {
    value: 'تشتت خفيف وتأخر في الترديد',
    title: 'تشتت وضعف تركيز',
    description: 'تشتت خفيف وتأخر ملحوظ في المتابعة والترديد مع المعلم',
    badge: 'تشتت',
    badgeStyle: 'bg-rose-100 text-rose-800 border-rose-200',
    qualityHint:
      'يُنصح بتجزئة الآيات الطويلة إلى كلمات ومقاطع قصيرة، واستخدام أسلوب نبرة الصوت التفاعلية لاستعادة تركيز الطفل دون ضغط.',
  },
];

// 3. Punctuality Options
const PUNCTUALITY_OPTIONS = [
  {
    value: 'بدء الحصة في الموعد المحدد تماماً',
    title: 'في الموعد المحدد تماماً',
    description: 'التزام دقيق وبدء الحلقة في الوقت المحدد دون أي تأخير',
    badge: 'دقيق ⭐',
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    qualityHint:
      'الانضباط في الموعد يعزز مصداقية الأكاديمية ويبني احترام الوقت لدى الطالب وولي الأمر.',
  },
  {
    value: 'تأخر طفيف (1-3 دقائق) بعذر',
    title: 'تأخر طفيف (١-٣ دقائق)',
    description: 'تأخر يسير لا يؤثر على سير الحصة وبعذر مسبق',
    badge: 'مقبول',
    badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200',
    qualityHint:
      'يُوصى بتوجيه المعلم لفتح غرفة الزووم قبل الموعد بدقيقتين لتهيئة الاتصال ومراعاة أي بطء في الشبكة.',
  },
  {
    value: 'تأخر ملحوظ في بدء الحصة',
    title: 'تأخر ملحوظ في البدء',
    description: 'تأخر واضح في موعد بدء الحلقة يتطلب تنبيهاً إدارياً',
    badge: 'تنبيه',
    badgeStyle: 'bg-rose-100 text-rose-800 border-rose-200',
    qualityHint:
      'ضرورة تعويض وقت الحصة كاملاً للطالب، والتنبيه على المعلم بوجوب إخطار المشرف مسبقاً في حال أي طارئ.',
  },
];

// 4. Rating Quality Hints
const RATING_QUALITY_HINTS: Record<number, string> = {
  5: 'أداء نموذجي متكامل، يُوصى بتوثيق أسلوب المعلم كمرجع تدريبي ونقل الشكر والتقدير له وللطالب.',
  4: 'أداء متميز ومتقن، مع التركيز على استدامة التفاعل الإيجابي والتنويع في أساليب التشجيع والتحفيز.',
  3: 'أداء جيد ومقبول، مع توجيه المعلم لضبط أزمنة المدود وقلقلة الحروف وتوزيع وقت الحصة بفعالية.',
  2: 'يحتاج المعلم إلى خطة توجيه في إدارة وقت الحلقة وأسلوب التلقين، وتحديد موعد زيارة متابعة قريبة.',
  1: 'يتطلب تدخلاً إشرافياً عاجلاً وتكثيف جلسات التدريب على مخارج الحروف وإدارة حلقة التسميع التفاعلية.',
};

// Reusable Quality Hint Component
const ObservationHintBox: React.FC<{
  hint: string;
  onAddToNotes?: (text: string) => void;
  isAdded?: boolean;
}> = ({ hint, onAddToNotes, isAdded }) => {
  return (
    <div className="mt-2.5 p-3 rounded-xl bg-[#F0F8FA] border border-[#1A7B88]/25 text-gray-900 text-xs flex items-start justify-between gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="flex items-start gap-2 min-w-0">
        <span className="material-symbols-outlined text-base text-[#1A7B88] shrink-0 mt-0.5">
          lightbulb
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold text-[11px] text-[#125862]">
              تلميح معيار الجودة:
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#1A7B88]/15 text-[#125862]">
              إرشاد معتمد
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-700">{hint}</p>
        </div>
      </div>
      {onAddToNotes && (
        <button
          type="button"
          onClick={() => onAddToNotes(hint)}
          className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer min-h-[28px] ${
            isAdded
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-white hover:bg-[#EAF5F7] text-[#125862] border-[#1A7B88]/30 shadow-2xs'
          }`}
          title="إضافة هذا التوجيه إلى الملاحظات النهائية"
        >
          <span className="material-symbols-outlined text-xs">
            {isAdded ? 'check' : 'add'}
          </span>
          <span>{isAdded ? 'مُضاف للملاحظات' : 'إضافة للتوجيهات'}</span>
        </button>
      )}
    </div>
  );
};

// Quick Chips for Supervisor Guidance
const QUICK_NOTES_CHIPS = [
  'تميز المعلم بحسن الإنصات والتشجيع اللفظي للطفل وضبط أحكام النون الساكنة.',
  'جهد مبارك، نرجو التأكيد على مخارج الحروف وقلقلة القاف والدال.',
  'تلاوة طيبة وأسلوب تفاعلي متميز أضفى نشاطاً وتفاعلاً ملحوظاً على الطالب.',
  'الالتزام بالتوقيت ممتاز، ونوصي بالاستمرار على نفس منهجية التحفيز.',
  'حلقة منظمة وهادئة، ونقترح تنويع أساليب التشجيع بالنجوم والعبارات.',
];

export const RecordObservationModal: React.FC<RecordObservationModalProps> = ({
  isOpen,
  onClose,
  teacher,
  student,
  sessionTime,
  existingObservation,
}) => {
  const { currentUser, addActivityLog, updateStudent, students } = useApp();

  // Wizard Step: 1 = Visit Meta, 2 = Evaluation & Scoring, 3 = Notes & Save
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submission & Discard states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Form Fields
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [visitTime, setVisitTime] = useState('');
  
  // Scope: 'general' (Teacher only) or 'student' (Specific Student)
  const [scopeType, setScopeType] = useState<'general' | 'student'>('general');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Evaluation Fields (Default to 0 or '' for new observations — NO PRE-SELECTION)
  const [rating, setRating] = useState<number>(0);
  const [teachingMethodScore, setTeachingMethodScore] = useState<string>('');
  const [studentEngagement, setStudentEngagement] = useState<string>('');
  const [punctuality, setPunctuality] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const isEditing = Boolean(existingObservation?.id);

  // Students belonging to this teacher
  const teacherStudents = useMemo(() => {
    if (!teacher?.id) return [];
    return students.filter((s) => s.teacherId === teacher.id);
  }, [students, teacher?.id]);

  // The active student if in student mode
  const activeStudent = useMemo(() => {
    if (scopeType !== 'student') return undefined;
    if (selectedStudentId) {
      return students.find((s) => s.id === selectedStudentId);
    }
    return student;
  }, [scopeType, selectedStudentId, students, student]);

  // Handler to quickly add an accredited quality hint to the notes in Step 3
  const handleAddHintToNotes = (hintText: string) => {
    setNotes((prev) => {
      const cleanHint = hintText.trim();
      if (!prev.trim()) return cleanHint;
      if (prev.includes(cleanHint)) return prev;
      return `${prev}\n• ${cleanHint}`;
    });
  };

  const selectedMethodOpt = TEACHING_METHOD_OPTIONS.find((o) => o.value === teachingMethodScore);
  const selectedEngagementOpt = STUDENT_ENGAGEMENT_OPTIONS.find((o) => o.value === studentEngagement);
  const selectedPunctualityOpt = PUNCTUALITY_OPTIONS.find((o) => o.value === punctuality);

  // Initial snapshot to detect dirty state
  const initialSnapshotRef = useRef<{
    visitDate: string;
    visitTime: string;
    scopeType: 'general' | 'student';
    selectedStudentId: string;
    rating: number;
    teachingMethodScore: string;
    studentEngagement: string;
    punctuality: string;
    notes: string;
  }>({
    visitDate: '',
    visitTime: '',
    scopeType: 'general',
    selectedStudentId: '',
    rating: 0,
    teachingMethodScore: '',
    studentEngagement: '',
    punctuality: '',
    notes: '',
  });

  // Load or Reset on Modal Open
  useEffect(() => {
    if (isOpen && teacher) {
      setStep(1);
      setErrors({});
      setSubmitError(null);
      setIsSaved(false);
      setShowDiscardConfirm(false);

      const defaultDate = existingObservation?.date || new Date().toISOString().slice(0, 10);
      const defaultTime =
        existingObservation?.sessionTime ||
        sessionTime ||
        student?.sessionTime ||
        '04:00 م (بتوقيت القاهرة)';

      if (existingObservation) {
        // Editing existing observation: load saved values
        const r = existingObservation.rating || 0;
        const tm = existingObservation.teachingMethodScore || '';
        const se = existingObservation.studentEngagement || '';
        const pu = existingObservation.punctuality || '';
        const n = existingObservation.notes || '';
        const isStudentObs = Boolean(existingObservation.studentId);
        const stId = existingObservation.studentId || '';

        setVisitDate(defaultDate);
        setVisitTime(defaultTime);
        setScopeType(isStudentObs ? 'student' : 'general');
        setSelectedStudentId(stId);
        setRating(r);
        setTeachingMethodScore(tm);
        setStudentEngagement(se);
        setPunctuality(pu);
        setNotes(n);

        initialSnapshotRef.current = {
          visitDate: defaultDate,
          visitTime: defaultTime,
          scopeType: isStudentObs ? 'student' : 'general',
          selectedStudentId: stId,
          rating: r,
          teachingMethodScore: tm,
          studentEngagement: se,
          punctuality: pu,
          notes: n,
        };
      } else {
        // New observation: Retain context, DO NOT auto-select student when opened for teacher generally!
        const initialIsStudent = Boolean(student?.id);
        const initialStudentId = student?.id || '';

        setVisitDate(defaultDate);
        setVisitTime(defaultTime);
        setScopeType(initialIsStudent ? 'student' : 'general');
        setSelectedStudentId(initialStudentId);

        // Explicit requirement: DO NOT pre-select 'ممتاز' or any rating!
        setRating(0);
        setTeachingMethodScore('');
        setStudentEngagement('');
        setPunctuality('');
        setNotes('');

        initialSnapshotRef.current = {
          visitDate: defaultDate,
          visitTime: defaultTime,
          scopeType: initialIsStudent ? 'student' : 'general',
          selectedStudentId: initialStudentId,
          rating: 0,
          teachingMethodScore: '',
          studentEngagement: '',
          punctuality: '',
          notes: '',
        };
      }
    }
  }, [isOpen, teacher, student, sessionTime, existingObservation]);

  // Check if form is modified
  const isDirty = useMemo(() => {
    const snap = initialSnapshotRef.current;
    return (
      visitDate !== snap.visitDate ||
      visitTime !== snap.visitTime ||
      scopeType !== snap.scopeType ||
      selectedStudentId !== snap.selectedStudentId ||
      rating !== snap.rating ||
      teachingMethodScore !== snap.teachingMethodScore ||
      studentEngagement !== snap.studentEngagement ||
      punctuality !== snap.punctuality ||
      notes.trim() !== snap.notes.trim()
    );
  }, [
    visitDate,
    visitTime,
    scopeType,
    selectedStudentId,
    rating,
    teachingMethodScore,
    studentEngagement,
    punctuality,
    notes,
  ]);

  if (!isOpen || !teacher) return null;

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!visitDate) {
      errs.visitDate = 'يرجى تحديد تاريخ الزيارة الميدانية';
    }
    if (scopeType === 'student' && !selectedStudentId && !student?.id) {
      errs.studentId = 'يرجى اختيار الطالب المرتبط بالمراقبة أو تحويل النطاق لمراقبة عامة';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation (Explicit choice required)
  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!rating || rating === 0) {
      errs.rating = 'يرجى تحديد التقييم العام بالضغط على النجوم (من ١ إلى ٥)';
    }
    if (!teachingMethodScore) {
      errs.teachingMethodScore = 'يرجى اختيار تقييم أسلوب التلقين والتصحيح';
    }
    if (activeStudent && !studentEngagement) {
      errs.studentEngagement = 'يرجى اختيار مستوى تفاعل الطالب وانتباهه';
    }
    if (!punctuality) {
      errs.punctuality = 'يرجى اختيار مدى الالتزام بالوقت وبدء الحلقة';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setErrors({});
      setSubmitError(null);
      setStep((prev) => (prev - 1) as 1 | 2);
    }
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setErrors({});
    setSubmitError(null);
    setShowDiscardConfirm(false);
    onClose();
  };

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const observationNoteText =
        notes.trim() || 'الأداء متقن ومثمر، تميز المعلم بأسلوب تلقين طيب والتزام بوقت الحلقة.';

      const observationId = existingObservation?.id || `obs-${Date.now()}`;

      const targetStudent = activeStudent;

      const observationData: ObservationData = {
        id: observationId,
        supervisorId: currentUser.id,
        supervisorName: currentUser.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        circleName: teacher.circleName,
        studentId: targetStudent?.id,
        studentName: targetStudent?.name,
        sessionTime: visitTime || '04:00 م (بتوقيت القاهرة)',
        rating,
        teachingMethodScore,
        studentEngagement: targetStudent ? studentEngagement : 'مراقبة عامة للمعلم',
        punctuality,
        notes: observationNoteText,
        date: visitDate,
        createdAt: existingObservation?.createdAt || new Date().toISOString(),
      };

      // Store in localStorage without duplication when editing
      try {
        const existingList = JSON.parse(localStorage.getItem('mk_observation_notes') || '[]');
        if (isEditing) {
          const idx = existingList.findIndex((item: any) => item.id === observationId);
          if (idx >= 0) {
            existingList[idx] = { ...existingList[idx], ...observationData };
          } else {
            existingList.unshift(observationData);
          }
        } else {
          existingList.unshift(observationData);
        }
        localStorage.setItem('mk_observation_notes', JSON.stringify(existingList));
      } catch (err) {
        console.error('Failed to store observation in localStorage:', err);
      }

      // Update student's observation details if a student is targeted to update 60-day radar immediately
      if (targetStudent?.id) {
        await updateStudent(targetStudent.id, {
          lastObservationDate: visitDate,
          lastObservationNote: observationNoteText,
          lastObservationRating: rating,
        });
      }

      // Log in Activity Logs
      addActivityLog(
        isEditing ? 'تعديل ملاحظة مراقبة ميدانية' : 'تسجيل ملاحظة مراقبة ميدانية',
        targetStudent?.name,
        targetStudent?.id,
        `قام المشرف ${currentUser.name} ${
          isEditing ? 'بتعديل' : 'بتسجيل'
        } زيارة وملاحظة مراقبة لحلقة المعلم ${teacher.name} (${teacher.circleName})${
          targetStudent ? ` للطالب ${targetStudent.name}` : ' (مراقبة عامة للمعلم)'
        } - تقييم ${rating}/5 نجوم: ${observationNoteText}`
      );

      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        resetAndClose();
      }, 900);
    } catch (err: any) {
      console.error('Error saving observation:', err);
      setSubmitError('عذراً، حدث خطأ أثناء حفظ تقييم المراقبة. يرجى إعادة المحاولة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper text for current star rating
  const getRatingSummaryText = (r: number) => {
    switch (r) {
      case 5:
        return 'ممتاز (٥ من ٥)';
      case 4:
        return 'جيد جداً (٤ من ٥)';
      case 3:
        return 'جيد (٣ من ٥)';
      case 2:
        return 'يحتاج متابعة (٢ من ٥)';
      case 1:
        return 'ضعيف (١ من ٥)';
      default:
        return 'لم يتم التحديد بعد';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xl shadow-2xl border-t sm:border border-gray-100 overflow-hidden flex flex-col text-right max-h-[92vh] sm:max-h-[85vh] h-full sm:h-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Fixed Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#125862] text-white flex items-center justify-between shrink-0 shadow-xs z-20">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-white/15 text-white flex items-center justify-center border border-white/20 shadow-xs shrink-0">
              <span className="material-symbols-outlined text-2xl">visibility</span>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-white truncate">
                  {isEditing ? 'تعديل تقييم المراقبة الميدانية' : 'تسجيل ملاحظة مراقبة ميدانية'}
                </h3>
                {isEditing ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-950 border border-amber-300 shrink-0">
                    تعديل زيارة مسجلة
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-950 border border-emerald-300 shrink-0">
                    زيارة جديدة
                  </span>
                )}
              </div>
              <p className="text-xs text-[#EAF5F7] mt-0.5 truncate">
                المعلم: <strong className="text-white font-bold">{teacher.name}</strong> · {teacher.circleName}
              </p>
            </div>
          </div>

          <button
            onClick={handleAttemptClose}
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="bg-[#F4F9FA] px-4 py-2.5 border-b border-gray-200/80 shrink-0">
          <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-gray-700">
            <span className="text-[#125862] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1A7B88] animate-pulse"></span>
              {step === 1 && 'الخطوة ١ من ٣: بيانات الزيارة ونطاق المراقبة'}
              {step === 2 && 'الخطوة ٢ من ٣: تقييم أداء المعلم والحصة'}
              {step === 3 && 'الخطوة ٣ من ٣: الملاحظات والتوجيهات والحفظ'}
            </span>
            <span className="text-gray-500 font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded-md border border-gray-200">
              {step}/3
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden flex">
            <div
              className="bg-[#1A7B88] h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Discard Confirmation Banner */}
        {showDiscardConfirm && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-base text-amber-600">warning</span>
              <span>هل تريد إغلاق النموذج وتجاهل التعديلات المدخلة؟</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                متابعة التعديل
              </button>
              <button
                type="button"
                onClick={resetAndClose}
                className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors cursor-pointer"
              >
                تجاهل وإغلاق
              </button>
            </div>
          </div>
        )}

        {/* Global Submit Error Banner */}
        {submitError && (
          <div className="p-3 bg-red-50 border-b border-red-200 text-red-900 text-xs flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="material-symbols-outlined text-base text-red-600">error</span>
              <span>{submitError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-red-700 hover:text-red-900 font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Success Banner */}
        {isSaved && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 font-bold animate-in fade-in shrink-0">
            <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
            <span>تم توثيق ملاحظة المراقبة الميدانية بنجاح وتحديث السجلات.</span>
          </div>
        )}

        {/* Form Body - Scrollable Area */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 text-sm overscroll-contain">
            {/* ======================================================== */}
            {/* STEP 1: Visit Meta & Scope                              */}
            {/* ======================================================== */}
            {step === 1 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                {/* Context Card */}
                <div className="p-3.5 rounded-2xl bg-[#F4F9FA] border border-gray-200/90 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-[#1A7B88] text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                        {teacher.initials || 'مع'}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900">{teacher.name}</h4>
                        <span className="text-xs text-gray-500 font-medium">حلقة: {teacher.circleName}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        scopeType === 'student' && activeStudent
                          ? 'bg-[#EAF5F7] text-[#125862] border-[#1A7B88]/20'
                          : 'bg-amber-50 text-amber-900 border-amber-200'
                      }`}
                    >
                      {scopeType === 'student' && activeStudent
                        ? `طالب محدد: ${activeStudent.name}`
                        : 'مراقبة عامة للمعلم والحلقة'}
                    </span>
                  </div>

                  {scopeType === 'student' && activeStudent && (
                    <div className="pt-2 border-t border-gray-200/70 flex items-center justify-between text-xs text-gray-600">
                      <span className="text-gray-500">
                        مسار الحفظ: <strong className="text-gray-800">{activeStudent.surahProgress || 'حلقة القرآن'}</strong>
                      </span>
                      <span className="font-mono font-bold text-[#125862]">
                        {activeStudent.currentCycleSessionsCount || 0}/{activeStudent.packageSessionsCount || 8} حصص
                      </span>
                    </div>
                  )}
                </div>

                {/* Scope Selection: General Teacher Observation vs Specific Student */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    نطاق المراقبة الميدانية <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScopeType('general');
                        setErrors((prev) => ({ ...prev, studentId: '' }));
                      }}
                      className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        scopeType === 'general'
                          ? 'bg-[#EAF5F7] text-[#125862] border-[#1A7B88] ring-1 ring-[#1A7B88]/30 shadow-2xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">group</span>
                      <span>مراقبة عامة للمعلم</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setScopeType('student');
                        if (!selectedStudentId && teacherStudents.length > 0) {
                          setSelectedStudentId(student?.id || teacherStudents[0].id);
                        }
                      }}
                      className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        scopeType === 'student'
                          ? 'bg-[#EAF5F7] text-[#125862] border-[#1A7B88] ring-1 ring-[#1A7B88]/30 shadow-2xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">person</span>
                      <span>ربط بطالب محدد</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {scopeType === 'general'
                      ? 'ملاحظة عامة على أسلوب المعلم وإدارة الحلقة دون ربطها بسجل طالب محدد.'
                      : 'توثيق المراقبة في ملف الطالب وتحديث رادار دورة الـ ٦٠ يوماً مباشرة.'}
                  </p>
                </div>

                {/* Specific Student Dropdown (shown only when in 'student' mode) */}
                {scopeType === 'student' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1.5">
                      الطالب المرتبط بالزيارة <span className="text-[#ba1a1a]">*</span>
                    </label>
                    {teacherStudents.length > 0 ? (
                      <select
                        value={selectedStudentId}
                        onChange={(e) => {
                          setSelectedStudentId(e.target.value);
                          if (errors.studentId) setErrors((prev) => ({ ...prev, studentId: '' }));
                        }}
                        className={`w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-sm border focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 cursor-pointer ${
                          errors.studentId ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                        }`}
                      >
                        <option value="">-- اختر طالباً من طلاب المعلم --</option>
                        {teacherStudents.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.surahProgress || 'حلقة القرآن'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                        لا يوجد طلاب مسجلون حالياً لهذا المعلم. يمكنك تسجيل المراقبة كمراقبة عامة للمعلم.
                      </div>
                    )}
                    {errors.studentId && (
                      <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span>{errors.studentId}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Visit Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    تاريخ الزيارة والمراقبة <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => {
                      setVisitDate(e.target.value);
                      if (errors.visitDate) setErrors((prev) => ({ ...prev, visitDate: '' }));
                    }}
                    className={`w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-base font-mono border focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 dir-ltr text-right ${
                      errors.visitDate ? 'border-red-400 bg-red-50/50' : 'border-gray-200'
                    }`}
                  />
                  {errors.visitDate && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span>{errors.visitDate}</span>
                    </p>
                  )}
                </div>

                {/* Visit Time */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    توقيت الحصة المراقبة
                  </label>
                  <input
                    type="text"
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    placeholder="مثال: 04:30 م (بتوقيت القاهرة)"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#F4F9FA] text-gray-900 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    المواعيد معتمدة بتوقيت القاهرة لضبط التنسيق مع المعلمين وأولياء الأمور.
                  </p>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: Evaluation Criteria & Scoring                   */}
            {/* ======================================================== */}
            {step === 2 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                {/* 1. General Star Rating */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2.5 ${
                    errors.rating ? 'bg-red-50/50 border-red-300' : 'bg-[#F4F9FA] border-gray-200'
                  }`}
                >
                  <label className="text-xs font-bold text-gray-900">
                    التقييم العام لأداء المعلم في الحصة <span className="text-[#ba1a1a]">*</span>
                  </label>

                  {/* Interactive Star Buttons */}
                  <div className="flex items-center gap-2 py-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= rating;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => {
                            setRating(star);
                            if (errors.rating) setErrors((prev) => ({ ...prev, rating: '' }));
                          }}
                          className="min-h-[48px] min-w-[48px] flex items-center justify-center p-1 cursor-pointer transition-transform active:scale-125 focus:outline-none"
                          aria-label={`تقييم ${star} من 5 نجوم`}
                        >
                          <span
                            className={`material-symbols-outlined text-3xl sm:text-4xl transition-colors ${
                              isFilled
                                ? 'text-amber-400 font-black fill-amber-400 drop-shadow-xs'
                                : 'text-gray-300 hover:text-amber-200'
                            }`}
                          >
                            star
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Text Rating Indicator */}
                  <div className="text-xs font-bold">
                    {rating === 0 ? (
                      <span className="text-gray-400 font-normal">
                        اضغط على النجوم أعلاه لتحديد التقييم (من ١ إلى ٥)
                      </span>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full font-bold border ${
                          rating >= 4
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : rating === 3
                            ? 'bg-[#EAF5F7] text-[#125862] border-[#1A7B88]/20'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {getRatingSummaryText(rating)} ⭐
                      </span>
                    )}
                  </div>

                  {errors.rating && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span>{errors.rating}</span>
                    </p>
                  )}

                  {/* Rating Quality Hint */}
                  {rating > 0 && RATING_QUALITY_HINTS[rating] && (
                    <div className="w-full">
                      <ObservationHintBox
                        hint={RATING_QUALITY_HINTS[rating]}
                        onAddToNotes={handleAddHintToNotes}
                        isAdded={notes.includes(RATING_QUALITY_HINTS[rating])}
                      />
                    </div>
                  )}
                </div>

                {/* 2. Teaching Quality & Recitation */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    تمكن المعلم وأسلوب التلقين والتصحيح <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    {TEACHING_METHOD_OPTIONS.map((opt) => {
                      const isSelected = teachingMethodScore === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setTeachingMethodScore(opt.value);
                            if (errors.teachingMethodScore)
                              setErrors((prev) => ({ ...prev, teachingMethodScore: '' }));
                          }}
                          className={`w-full p-3 rounded-xl border text-right transition-all cursor-pointer min-h-[44px] flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#EAF5F7] border-[#1A7B88] ring-1 ring-[#1A7B88]/30 shadow-2xs'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-gray-900">{opt.title}</span>
                            <span className="text-[11px] text-gray-500 mt-0.5">{opt.description}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${opt.badgeStyle}`}
                          >
                            {opt.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.teachingMethodScore && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span>{errors.teachingMethodScore}</span>
                    </p>
                  )}

                  {/* Teaching Method Quality Hint */}
                  {selectedMethodOpt?.qualityHint && (
                    <ObservationHintBox
                      hint={selectedMethodOpt.qualityHint}
                      onAddToNotes={handleAddHintToNotes}
                      isAdded={notes.includes(selectedMethodOpt.qualityHint)}
                    />
                  )}
                </div>

                {/* 3. Student Engagement (If student is targeted) */}
                {activeStudent && (
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1.5">
                      تفاعل الطالب وانتباهه أثناء التسميع ({activeStudent.name}) <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="flex flex-col gap-2">
                      {STUDENT_ENGAGEMENT_OPTIONS.map((opt) => {
                        const isSelected = studentEngagement === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setStudentEngagement(opt.value);
                              if (errors.studentEngagement)
                                setErrors((prev) => ({ ...prev, studentEngagement: '' }));
                            }}
                            className={`w-full p-3 rounded-xl border text-right transition-all cursor-pointer min-h-[44px] flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-[#EAF5F7] border-[#1A7B88] ring-1 ring-[#1A7B88]/30 shadow-2xs'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-gray-900">{opt.title}</span>
                              <span className="text-[11px] text-gray-500 mt-0.5">{opt.description}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${opt.badgeStyle}`}
                            >
                              {opt.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.studentEngagement && (
                      <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span>{errors.studentEngagement}</span>
                      </p>
                    )}

                    {/* Student Engagement Quality Hint */}
                    {selectedEngagementOpt?.qualityHint && (
                      <ObservationHintBox
                        hint={selectedEngagementOpt.qualityHint}
                        onAddToNotes={handleAddHintToNotes}
                        isAdded={notes.includes(selectedEngagementOpt.qualityHint)}
                      />
                    )}
                  </div>
                )}

                {/* 4. Punctuality */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    الالتزام بالوقت وبدء الحصة <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <div className="flex flex-col gap-2">
                    {PUNCTUALITY_OPTIONS.map((opt) => {
                      const isSelected = punctuality === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setPunctuality(opt.value);
                            if (errors.punctuality) setErrors((prev) => ({ ...prev, punctuality: '' }));
                          }}
                          className={`w-full p-3 rounded-xl border text-right transition-all cursor-pointer min-h-[44px] flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#EAF5F7] border-[#1A7B88] ring-1 ring-[#1A7B88]/30 shadow-2xs'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-xs text-gray-900">{opt.title}</span>
                            <span className="text-[11px] text-gray-500 mt-0.5">{opt.description}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${opt.badgeStyle}`}
                          >
                            {opt.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.punctuality && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      <span>{errors.punctuality}</span>
                    </p>
                  )}

                  {/* Punctuality Quality Hint */}
                  {selectedPunctualityOpt?.qualityHint && (
                    <ObservationHintBox
                      hint={selectedPunctualityOpt.qualityHint}
                      onAddToNotes={handleAddHintToNotes}
                      isAdded={notes.includes(selectedPunctualityOpt.qualityHint)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: Supervisor Notes & Final Review                 */}
            {/* ======================================================== */}
            {step === 3 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-150">
                {/* Notes & Guidance */}
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    ملاحظات وتوجيهات المشرف الميداني
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: تميز المعلم بالحرص على أحكام النون الساكنة وتشجيع الطفل، مع التنبيه على مراجعة سورة النبأ..."
                    className="w-full p-3 rounded-xl bg-[#F4F9FA] text-gray-900 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1A7B88]/30 resize-none leading-relaxed"
                  />

                  {/* Quick Chips Bank */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_NOTES_CHIPS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (!notes.includes(chip)) {
                            setNotes((prev) => (prev ? `${prev} ${chip}` : chip));
                          }
                        }}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#EAF5F7] text-gray-700 hover:text-[#125862] border border-gray-200 transition-colors cursor-pointer text-right line-clamp-1"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comprehensive Evaluation Review Card */}
                <div className="p-4 rounded-2xl bg-[#F4F9FA] border border-gray-200 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                    <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-[#1A7B88]">checklist</span>
                      <span>ملخص بيانات وتقييم المراقبة:</span>
                    </span>
                  </div>

                  {/* Step 1 Summary */}
                  <div className="flex items-start justify-between text-xs bg-white p-3 rounded-xl border border-gray-100">
                    <div>
                      <p className="font-bold text-gray-900">
                        {teacher.name} ({teacher.circleName})
                      </p>
                      <p className="text-gray-600 text-[11px] mt-0.5">
                        {activeStudent ? `الطالب: ${activeStudent.name}` : 'مراقبة عامة لحلقة المعلم'} · {visitDate} · {visitTime || 'بتوقيت القاهرة'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[#125862] hover:underline font-bold text-xs shrink-0 cursor-pointer flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>تعديل</span>
                    </button>
                  </div>

                  {/* Step 2 Summary */}
                  <div className="flex items-start justify-between text-xs bg-white p-3 rounded-xl border border-gray-100">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <span>التقييم:</span>
                        <span>{rating} من ٥ نجوم ({getRatingSummaryText(rating)}) ⭐</span>
                      </div>
                      <p className="text-gray-600 text-[11px]">
                        <strong>التلقين والتصحيح:</strong> {teachingMethodScore || '—'}
                      </p>
                      <p className="text-gray-600 text-[11px]">
                        <strong>الالتزام بالوقت:</strong> {punctuality || '—'}
                      </p>
                      {activeStudent && (
                        <p className="text-gray-600 text-[11px]">
                          <strong>تفاعل الطالب:</strong> {studentEngagement || '—'}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-[#125862] hover:underline font-bold text-xs shrink-0 cursor-pointer flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>تعديل</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer Buttons */}
          <div className="p-3.5 sm:p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-2.5 shrink-0 shadow-lg sm:shadow-none z-20">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleAttemptClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer text-xs min-h-[44px]"
              >
                إلغاء
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer text-xs min-h-[44px] flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
                <span>السابق</span>
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] active:scale-98"
              >
                <span>
                  {step === 1 ? 'التالي: تقييم الأداء' : 'التالي: الملاحظات والحفظ'}
                </span>
                <span className="material-symbols-outlined text-base">arrow_back</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || isSaved}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-[#1A7B88] hover:bg-[#125862] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] active:scale-98 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>جارٍ توثيق المراقبة...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">
                      {isEditing ? 'update' : 'save'}
                    </span>
                    <span>
                      {isEditing ? 'حفظ التعديلات' : 'حفظ تقييم المراقبة ⭐'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
