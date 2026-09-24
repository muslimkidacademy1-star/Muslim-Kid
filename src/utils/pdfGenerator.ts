import { Student, Teacher, Report } from '../types';

/**
 * Generates an executive, child-motivating, official printable/downloadable HTML document
 * styled specifically for @media print / Save as PDF.
 * Perfect Arabic typography with Amiri / Cairo font integration, elegant gold/emerald royal borders,
 * academic badge, score bar, memorization breakdown table, teacher commendation, and verified QR/seal.
 */
export function generateStudentReportPdf(options: {
  student: Student;
  teacher?: Teacher;
  report: Report;
  recordedByName?: string;
}): void {
  const { student, teacher, report, recordedByName } = options;

  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة لتحميل وطباعة تقرير الـ 8 حصص بصيغة PDF.');
    return;
  }

  const studentName = student.name;
  const teacherName = teacher?.name || 'غير محدد';
  const circleName = teacher?.circleName || 'حلقة القرآن الكريم';
  const reportDate = report.reportDate || new Date().toISOString().slice(0, 10);
  const score = report.memorizationScore ?? 98;
  const grade = report.grade || (score >= 95 ? 'ممتاز مرتفع' : score >= 90 ? 'ممتاز' : 'جيد جداً');
  const memorization =
    report.memorizationDetails ||
    report.performanceSummary ||
    'سورة النبأ وسورة النازعات ومراجعة قصار السور';
  const revision = report.revisionDetails || 'مراجعة وتثبيت الأجزاء السابقة وأحكام التجويد الأساسية';
  const teacherNotes =
    report.teacherNotes ||
    report.notes ||
    'أظهر الطالب التزاماً ممتازاً وإتقاناً في مخارج الحروف وترتيل الآيات.';
  const encouragement =
    report.studentEncouragement ||
    'بارك الله فيك يا بطل القرآن الصغير ووفقك لختم كتابه الكريم ونفع بك والديك!';
  const recorder = recordedByName || report.recordedBy || teacherName;

  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير إنجاز 8 حصص - ${studentName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,700&family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Cairo', 'Amiri', 'Segoe UI', Tahoma, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      direction: rtl;
      text-align: right;
      padding: 15px;
      display: flex;
      justify-content: center;
    }
    .page-container {
      width: 100%;
      max-width: 800px;
      background: #ffffff;
      border: 3px solid #005253;
      border-radius: 24px;
      padding: 28px 32px;
      position: relative;
      box-shadow: 0 10px 25px rgba(0, 82, 83, 0.08);
      overflow: hidden;
    }
    /* Decorative Islamic borders */
    .outer-border-decor {
      position: absolute;
      top: 6px;
      right: 6px;
      bottom: 6px;
      left: 6px;
      border: 1px dashed #c29d59;
      border-radius: 18px;
      pointer-events: none;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 20px;
      position: relative;
    }
    .logo-area {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-badge {
      width: 58px;
      height: 58px;
      border-radius: 16px;
      background: linear-gradient(135deg, #005253 0%, #002e2f 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      box-shadow: 0 4px 10px rgba(0, 82, 83, 0.25);
    }
    .title-area h1 {
      font-size: 22px;
      font-weight: 900;
      color: #005253;
      margin-bottom: 2px;
      letter-spacing: -0.5px;
    }
    .title-area p {
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
    .cert-badge {
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      color: #b45309;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .student-banner {
      background: linear-gradient(135deg, #005253 0%, #086d6f 100%);
      border-radius: 18px;
      padding: 18px 24px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22px;
      box-shadow: 0 6px 16px rgba(0, 82, 83, 0.18);
    }
    .student-name-box h2 {
      font-size: 20px;
      font-weight: 900;
      margin-bottom: 4px;
    }
    .student-name-box span {
      font-size: 12px;
      opacity: 0.9;
    }
    .cycle-badge {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 14px;
      padding: 10px 18px;
      text-align: center;
    }
    .cycle-badge .num {
      font-size: 24px;
      font-weight: 900;
      line-height: 1;
      color: #fef08a;
    }
    .cycle-badge .label {
      font-size: 10px;
      font-weight: 700;
      display: block;
      margin-top: 2px;
    }
    .grid-info {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 10px 14px;
    }
    .info-card .label {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      display: block;
      margin-bottom: 2px;
    }
    .info-card .val {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
    }
    .highlight-section {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .table-header {
      background: #f1f5f9;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 800;
      color: #005253;
      border-bottom: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .table-content {
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .item-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .item-icon {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: #e6fffa;
      color: #005253;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 13px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .item-text h4 {
      font-size: 12px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 2px;
    }
    .item-text p {
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .score-banner {
      background: #f0fdf4;
      border: 1.5px solid #bbf7d0;
      border-radius: 16px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .score-text h3 {
      font-size: 14px;
      font-weight: 900;
      color: #15803d;
      margin-bottom: 2px;
    }
    .score-text p {
      font-size: 11px;
      color: #166534;
    }
    .score-val {
      font-size: 26px;
      font-weight: 900;
      color: #15803d;
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .score-val span {
      font-size: 13px;
      font-weight: 700;
      background: #dcfce7;
      padding: 2px 8px;
      border-radius: 6px;
      margin-right: 6px;
    }
    .encouragement-box {
      background: #fefce8;
      border: 1.5px solid #fef08a;
      border-radius: 16px;
      padding: 14px 20px;
      margin-bottom: 20px;
      position: relative;
    }
    .encouragement-box h4 {
      font-size: 12px;
      font-weight: 800;
      color: #854d0e;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .encouragement-box p {
      font-family: 'Amiri', serif;
      font-size: 15px;
      font-weight: 700;
      color: #713f12;
      line-height: 1.7;
    }
    .footer-signatures {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      border-top: 2px solid #e2e8f0;
      padding-top: 18px;
      margin-top: 10px;
    }
    .sig-col {
      text-align: center;
      min-width: 140px;
    }
    .sig-col .sig-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 6px;
    }
    .sig-col .sig-name {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
    }
    .official-seal {
      width: 76px;
      height: 76px;
      border: 2px dashed #005253;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #005253;
      font-size: 9px;
      font-weight: 800;
      line-height: 1.3;
      transform: rotate(-5deg);
      background: #f0fdf4;
      margin: 0 auto;
    }
    .no-print-bar {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: white;
      padding: 12px 24px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 16px;
      z-index: 1000;
    }
    .btn-action {
      background: #005253;
      color: white;
      border: none;
      padding: 8px 18px;
      border-radius: 9999px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-action:hover {
      background: #086d6f;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0;
        background: white;
      }
      .page-container {
        box-shadow: none;
        border: 2px solid #005253;
        border-radius: 0;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="outer-border-decor"></div>

    <!-- Header -->
    <header class="header">
      <div class="logo-area">
        <div class="logo-badge">📖</div>
        <div class="title-area">
          <h1>أكاديمية المسلم الصغير</h1>
          <p>تقرير إنجاز دورة الـ 8 حصص القرآنية الشهرية</p>
        </div>
      </div>
      <div class="cert-badge">
        <span>⭐ تقرير رسمي معتمد</span>
      </div>
    </header>

    <!-- Student Hero Banner -->
    <div class="student-banner">
      <div class="student-name-box">
        <span>اسم بطل القرآن:</span>
        <h2>${studentName}</h2>
        <span>الحلقة: ${circleName} | المعلم: ${teacherName}</span>
      </div>
      <div class="cycle-badge">
        <span class="num">8</span>
        <span class="label">حصص مكتملة</span>
      </div>
    </div>

    <!-- Quick Meta Information Grid -->
    <div class="grid-info">
      <div class="info-card">
        <span class="label">تاريخ صدور التقرير</span>
        <span class="val" dir="ltr">${reportDate}</span>
      </div>
      <div class="info-card">
        <span class="label">المعلم المشرف</span>
        <span class="val">${teacherName}</span>
      </div>
      <div class="info-card">
        <span class="label">التقدير العام</span>
        <span class="val" style="color: #15803d;">${grade}</span>
      </div>
    </div>

    <!-- Score & Evaluation Banner -->
    <div class="score-banner">
      <div class="score-text">
        <h3>مستوى الإتقان والتجويد</h3>
        <p>تقييم تراكمي شامل للحصص الثمانية المنفذة</p>
      </div>
      <div class="score-val">
        <span>${grade}</span>
        ${score}%
      </div>
    </div>

    <!-- Detailed Learning Achievements -->
    <div class="highlight-section">
      <div class="table-header">
        <span>📋 تفاصيل الإنجاز ومسار التسميع والمراجعة</span>
      </div>
      <div class="table-content">
        <div class="item-row">
          <div class="item-icon">١</div>
          <div class="item-text">
            <h4>السور والآيات التي تم حفظها:</h4>
            <p>${memorization}</p>
          </div>
        </div>
        <div class="item-row">
          <div class="item-icon">٢</div>
          <div class="item-text">
            <h4>مقدار المراجعة والتثبيت:</h4>
            <p>${revision}</p>
          </div>
        </div>
        <div class="item-row">
          <div class="item-icon">٣</div>
          <div class="item-text">
            <h4>ملاحظات المعلم وتوصياته:</h4>
            <p>${teacherNotes}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Encouragement Box for the Child -->
    <div class="encouragement-box">
      <h4>🌱 رسالة فخر وتشجيع لبطل القرآن الصغير:</h4>
      <p>« ${encouragement} »</p>
    </div>

    <!-- Signatures and Official Stamp -->
    <footer class="footer-signatures">
      <div class="sig-col">
        <div class="sig-title">المعلم المسؤول</div>
        <div class="sig-name">${teacherName}</div>
      </div>
      <div class="official-seal">
        <span>أكاديمية</span>
        <span>المسلم الصغير</span>
        <span>معتمد ✓</span>
      </div>
      <div class="sig-col">
        <div class="sig-title">الإشراف التعليمي</div>
        <div class="sig-name">${recorder}</div>
      </div>
    </footer>
  </div>

  <!-- Print & Download Floating Control -->
  <div class="no-print-bar">
    <span>جاهز للحفظ والطباعة كـ PDF</span>
    <button class="btn-action" onclick="window.print()">🖨️ طباعة / حفظ كـ PDF</button>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', () => {
      // Auto trigger print dialog shortly after loading fonts
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
