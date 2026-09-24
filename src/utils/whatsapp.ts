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

  // If Saudi number starting with 05 (10 digits), convert 05... to 9665...
  if (digits.startsWith('0') && digits.length === 10) {
    digits = `966${digits.substring(1)}`;
  } else if (digits.startsWith('5') && digits.length === 9) {
    // If Saudi number without leading zero (5XXXXXXXX), prepend 966
    digits = `966${digits}`;
  }

  // Fallback default message matching user requirement exactly:
  // "السلام عليكم ورحمة الله، نتواصل معكم من أكاديمية المسلم الصغير بخصوص الطالب [اسم الطالب]"
  const message =
    customMessage ||
    (studentName
      ? `السلام عليكم ورحمة الله، نتواصل معكم من أكاديمية المسلم الصغير بخصوص الطالب ${studentName}.`
      : 'السلام عليكم ورحمة الله، نتواصل معكم من أكاديمية المسلم الصغير.');

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
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
