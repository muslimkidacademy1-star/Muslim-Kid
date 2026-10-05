/**
 * Utility function to build a standard, sanitized WhatsApp contact URL
 * for student parents or guardians.
 *
 * Rules:
 * - Strips all non-digit characters (+, spaces, dashes, brackets, etc.)
 * - Handles Saudi local format (05XXXXXXXX) by replacing leading zero with 966
 * - Handles international numbers already starting with country code
 * - Pre-fills standard Arabic message:
 *   "السلام عليكم ورحمة الله، نتواصل معكم من أكاديمية المسلم الصغير بخصوص الطالب [اسم الطالب]"
 */
export function getParentWhatsAppUrl(
  parentPhone: string,
  studentName?: string,
  customMessage?: string
): string {
  if (!parentPhone) return '';

  // Remove all non-digits (strip +, spaces, hyphens, brackets, etc.)
  let digits = parentPhone.replace(/\D/g, '');

  // If number starts with 00, remove the 00 prefix
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // If Egyptian local number starting with 01 (11 digits: 010, 011, 012, 015)
  if (digits.startsWith('01') && digits.length === 11) {
    digits = `20${digits.substring(1)}`;
  } else if (digits.startsWith('05') && digits.length === 10) {
    // If Saudi number starting with 05 (10 digits), convert 05... to 9665...
    digits = `966${digits.substring(1)}`;
  } else if (digits.startsWith('5') && digits.length === 9) {
    // If Saudi number without leading zero (5XXXXXXXX), prepend 966
    digits = `966${digits}`;
  }

  // Fallback default message:
  const message =
    customMessage ||
    (studentName
      ? `السلام عليكم ورحمة الله، نتواصل معكم من أكاديمية المسلم الصغير بخصوص الطالب ${studentName}.`
      : 'السلام عليكم ورحمة الله، نتواصل معكم من أكاديمية المسلم الصغير.');

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Direct WhatsApp chat URL without prefilled text, for fast 1-click chatting
 */
export function getDirectWhatsAppChatUrl(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }
  if (digits.startsWith('01') && digits.length === 11) {
    digits = `20${digits.substring(1)}`;
  } else if (digits.startsWith('05') && digits.length === 10) {
    digits = `966${digits.substring(1)}`;
  } else if (digits.startsWith('5') && digits.length === 9) {
    digits = `966${digits}`;
  }
  return `https://wa.me/${digits}`;
}

/**
 * Format phone numbers into standard international representation
 * e.g. +966 58 319 4463 or +20 10 1234 5678
 */
export function formatInternationalPhone(phone?: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return phone;

  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // Saudi 05XXXXXXXX -> 9665XXXXXXXX
  if (digits.startsWith('05') && digits.length === 10) {
    digits = `966${digits.substring(1)}`;
  } else if (digits.startsWith('5') && digits.length === 9) {
    digits = `966${digits}`;
  } else if (digits.startsWith('01') && digits.length === 11) {
    // Egyptian 01XXXXXXXXX -> 201XXXXXXXXX
    digits = `20${digits.substring(1)}`;
  }

  // Saudi format: +966 58 319 4463
  if (digits.startsWith('966') && digits.length === 12) {
    return `+966 ${digits.substring(3, 5)} ${digits.substring(5, 8)} ${digits.substring(8)}`;
  }

  // Egyptian format: +20 10 1234 5678
  if (digits.startsWith('20') && digits.length === 12) {
    return `+20 ${digits.substring(2, 4)} ${digits.substring(4, 8)} ${digits.substring(8)}`;
  }

  // General format: +XXX XX XXX XXXX
  if (digits.length >= 10) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }

  return phone.startsWith('+') ? phone : `+${digits}`;
}

/**
 * Ensure session time is always exclusively formatted with (بتوقيت القاهرة)
 */
export function formatCairoTime(time?: string): string {
  if (!time || !time.trim()) {
    return '04:00 م (بتوقيت القاهرة)';
  }
  // Strip any old timezone text like بتوقيت مكة or بتوقيت السعودية or بتوقيت القاهرة
  const cleaned = time
    .replace(/\(?\s*بتوقيت\s+[^)]+\)?/gi, '')
    .replace(/بتوقيت\s+[\u0621-\u064A]+/gi, '')
    .trim();
  return `${cleaned || '04:00 م'} (بتوقيت القاهرة)`;
}


/**
 * Specialized WhatsApp message URL for after 8-session report generation:
 * "مرحباً بكم، تم بحمد الله إتمام 8 حصص للطالب [اسم الطالب] في أكاديمية المسلم الصغير وصدور تقريره الشهري، تجدون التقرير مرفقاً."
 */
export function getReportWhatsAppUrl(
  parentPhone: string,
  studentName: string
): string {
  const customMessage = `مرحباً بكم، تم بحمد الله إتمام 8 حصص للطالب ${studentName} في أكاديمية المسلم الصغير وصدور تقريره الشهري، تجدون التقرير مرفقاً.`;
  return getParentWhatsAppUrl(parentPhone, studentName, customMessage);
}

/**
 * Specialized WhatsApp message URL for reminding teachers to submit reports:
 * "السلام عليكم ورحمة الله وبركاته، أستاذنا الفاضل [اسم المعلم]، تذكير لطيف بخصوص حلقة الطالب [اسم الطالب]، نرجو التكرم برفع تقرير الدورة. بارك الله في جهودكم."
 */
export function getTeacherReminderWhatsAppUrl(
  teacherPhone: string,
  studentName: string,
  teacherName?: string
): string {
  const customMessage = teacherName
    ? `السلام عليكم ورحمة الله وبركاته، أستاذنا الفاضل ${teacherName}، تذكير لطيف بخصوص حلقة الطالب ${studentName}، نرجو التكرم برفع تقرير الدورة. بارك الله في جهودكم.`
    : `السلام عليكم ورحمة الله وبركاته، شيخنا الفاضل، تذكير لطيف بخصوص حلقة الطالب ${studentName}، نرجو التكرم برفع تقرير الدورة. بارك الله في جهودكم.`;
  return getParentWhatsAppUrl(teacherPhone, studentName, customMessage);
}
