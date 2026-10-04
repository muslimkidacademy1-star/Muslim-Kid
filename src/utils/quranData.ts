export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  startPage: number;
  ayahsCount: number;
  type: 'meccan' | 'medinan';
}

export const SURAH_LIST: SurahMeta[] = [
  { number: 1, name: 'الفاتحة', englishName: 'Al-Fatihah', startPage: 1, ayahsCount: 7, type: 'meccan' },
  { number: 2, name: 'البقرة', englishName: 'Al-Baqarah', startPage: 2, ayahsCount: 286, type: 'medinan' },
  { number: 3, name: 'آل عمران', englishName: 'Ali \'Imran', startPage: 50, ayahsCount: 200, type: 'medinan' },
  { number: 4, name: 'النساء', englishName: 'An-Nisa', startPage: 77, ayahsCount: 176, type: 'medinan' },
  { number: 5, name: 'المائدة', englishName: 'Al-Ma\'idah', startPage: 106, ayahsCount: 120, type: 'medinan' },
  { number: 6, name: 'الأنعام', englishName: 'Al-An\'am', startPage: 128, ayahsCount: 165, type: 'meccan' },
  { number: 7, name: 'الأعراف', englishName: 'Al-A\'raf', startPage: 151, ayahsCount: 206, type: 'meccan' },
  { number: 8, name: 'الأنفال', englishName: 'Al-Anfal', startPage: 177, ayahsCount: 75, type: 'medinan' },
  { number: 9, name: 'التوبة', englishName: 'At-Tawbah', startPage: 187, ayahsCount: 129, type: 'medinan' },
  { number: 10, name: 'يونس', englishName: 'Yunus', startPage: 208, ayahsCount: 109, type: 'meccan' },
  { number: 11, name: 'هود', englishName: 'Hud', startPage: 221, ayahsCount: 123, type: 'meccan' },
  { number: 12, name: 'يوسف', englishName: 'Yusuf', startPage: 235, ayahsCount: 111, type: 'meccan' },
  { number: 13, name: 'الرعد', englishName: 'Ar-Ra\'d', startPage: 249, ayahsCount: 43, type: 'medinan' },
  { number: 14, name: 'إبراهيم', englishName: 'Ibrahim', startPage: 255, ayahsCount: 52, type: 'meccan' },
  { number: 15, name: 'الحجر', englishName: 'Al-Hijr', startPage: 262, ayahsCount: 99, type: 'meccan' },
  { number: 16, name: 'النحل', englishName: 'An-Nahl', startPage: 267, ayahsCount: 128, type: 'meccan' },
  { number: 17, name: 'الإسراء', englishName: 'Al-Isra', startPage: 282, ayahsCount: 111, type: 'meccan' },
  { number: 18, name: 'الكهف', englishName: 'Al-Kahf', startPage: 293, ayahsCount: 110, type: 'meccan' },
  { number: 19, name: 'مريم', englishName: 'Maryam', startPage: 305, ayahsCount: 98, type: 'meccan' },
  { number: 20, name: 'طه', englishName: 'Ta-Ha', startPage: 312, ayahsCount: 135, type: 'meccan' },
  { number: 21, name: 'الأنبياء', englishName: 'Al-Anbiya', startPage: 322, ayahsCount: 112, type: 'meccan' },
  { number: 22, name: 'الحج', englishName: 'Al-Hajj', startPage: 332, ayahsCount: 78, type: 'medinan' },
  { number: 23, name: 'المؤمنون', englishName: 'Al-Mu\'minun', startPage: 342, ayahsCount: 118, type: 'meccan' },
  { number: 24, name: 'النور', englishName: 'An-Nur', startPage: 350, ayahsCount: 64, type: 'medinan' },
  { number: 25, name: 'الفرقان', englishName: 'Al-Furqan', startPage: 359, ayahsCount: 77, type: 'meccan' },
  { number: 26, name: 'الشعراء', englishName: 'Ash-Shu\'ara', startPage: 367, ayahsCount: 227, type: 'meccan' },
  { number: 27, name: 'النمل', englishName: 'An-Naml', startPage: 377, ayahsCount: 93, type: 'meccan' },
  { number: 28, name: 'القصص', englishName: 'Al-Qasas', startPage: 385, ayahsCount: 88, type: 'meccan' },
  { number: 29, name: 'العنكبوت', englishName: 'Al-\'Ankabut', startPage: 396, ayahsCount: 69, type: 'meccan' },
  { number: 30, name: 'الروم', englishName: 'Ar-Rum', startPage: 404, ayahsCount: 60, type: 'meccan' },
  { number: 31, name: 'لقمان', englishName: 'Luqman', startPage: 411, ayahsCount: 34, type: 'meccan' },
  { number: 32, name: 'السجدة', englishName: 'As-Sajdah', startPage: 415, ayahsCount: 30, type: 'meccan' },
  { number: 33, name: 'الأحزاب', englishName: 'Al-Ahzab', startPage: 418, ayahsCount: 73, type: 'medinan' },
  { number: 34, name: 'سبأ', englishName: 'Saba', startPage: 428, ayahsCount: 54, type: 'meccan' },
  { number: 35, name: 'فاطر', englishName: 'Fatir', startPage: 434, ayahsCount: 45, type: 'meccan' },
  { number: 36, name: 'يس', englishName: 'Ya-Sin', startPage: 440, ayahsCount: 83, type: 'meccan' },
  { number: 37, name: 'الصافات', englishName: 'As-Saffat', startPage: 446, ayahsCount: 182, type: 'meccan' },
  { number: 38, name: 'ص', englishName: 'Sad', startPage: 453, ayahsCount: 88, type: 'meccan' },
  { number: 39, name: 'الزمر', englishName: 'Az-Zumar', startPage: 458, ayahsCount: 75, type: 'meccan' },
  { number: 40, name: 'غافر', englishName: 'Ghafir', startPage: 467, ayahsCount: 85, type: 'meccan' },
  { number: 41, name: 'فصلت', englishName: 'Fussilat', startPage: 477, ayahsCount: 54, type: 'meccan' },
  { number: 42, name: 'الشورى', englishName: 'Ash-Shura', startPage: 483, ayahsCount: 53, type: 'meccan' },
  { number: 43, name: 'الزخرف', englishName: 'Az-Zukhruf', startPage: 489, ayahsCount: 89, type: 'meccan' },
  { number: 44, name: 'الدخان', englishName: 'Ad-Dukhan', startPage: 496, ayahsCount: 59, type: 'meccan' },
  { number: 45, name: 'الجاثية', englishName: 'Al-Jathiyah', startPage: 499, ayahsCount: 37, type: 'meccan' },
  { number: 46, name: 'الأحقاف', englishName: 'Al-Ahqaf', startPage: 502, ayahsCount: 35, type: 'meccan' },
  { number: 47, name: 'محمد', englishName: 'Muhammad', startPage: 507, ayahsCount: 38, type: 'medinan' },
  { number: 48, name: 'الفتح', englishName: 'Al-Fath', startPage: 511, ayahsCount: 29, type: 'medinan' },
  { number: 49, name: 'الحجرات', englishName: 'Al-Hujurat', startPage: 515, ayahsCount: 18, type: 'medinan' },
  { number: 50, name: 'ق', englishName: 'Qaf', startPage: 518, ayahsCount: 45, type: 'meccan' },
  { number: 51, name: 'الذاريات', englishName: 'Adh-Dhariyat', startPage: 520, ayahsCount: 60, type: 'meccan' },
  { number: 52, name: 'الطور', englishName: 'At-Tur', startPage: 523, ayahsCount: 49, type: 'meccan' },
  { number: 53, name: 'النجم', englishName: 'An-Najm', startPage: 526, ayahsCount: 62, type: 'meccan' },
  { number: 54, name: 'القمر', englishName: 'Al-Qamar', startPage: 528, ayahsCount: 55, type: 'meccan' },
  { number: 55, name: 'الرحمن', englishName: 'Ar-Rahman', startPage: 531, ayahsCount: 78, type: 'medinan' },
  { number: 56, name: 'الواقعة', englishName: 'Al-Waqi\'ah', startPage: 534, ayahsCount: 96, type: 'meccan' },
  { number: 57, name: 'الحديد', englishName: 'Al-Hadid', startPage: 537, ayahsCount: 29, type: 'medinan' },
  { number: 58, name: 'المجادلة', englishName: 'Al-Mujadilah', startPage: 542, ayahsCount: 22, type: 'medinan' },
  { number: 59, name: 'الحشر', englishName: 'Al-Hashr', startPage: 545, ayahsCount: 24, type: 'medinan' },
  { number: 60, name: 'الممتحنة', englishName: 'Al-Mumtahanah', startPage: 549, ayahsCount: 13, type: 'medinan' },
  { number: 61, name: 'الصف', englishName: 'As-Saff', startPage: 551, ayahsCount: 14, type: 'medinan' },
  { number: 62, name: 'الجمعة', englishName: 'Al-Jumu\'ah', startPage: 553, ayahsCount: 11, type: 'medinan' },
  { number: 63, name: 'المنافقون', englishName: 'Al-Munafiqun', startPage: 554, ayahsCount: 11, type: 'medinan' },
  { number: 64, name: 'التغابن', englishName: 'At-Taghabun', startPage: 556, ayahsCount: 18, type: 'medinan' },
  { number: 65, name: 'الطلاق', englishName: 'At-Talaq', startPage: 558, ayahsCount: 12, type: 'medinan' },
  { number: 66, name: 'التحريم', englishName: 'At-Tahrim', startPage: 560, ayahsCount: 12, type: 'medinan' },
  { number: 67, name: 'الملك', englishName: 'Al-Mulk', startPage: 562, ayahsCount: 30, type: 'meccan' },
  { number: 68, name: 'القلم', englishName: 'Al-Qalam', startPage: 564, ayahsCount: 52, type: 'meccan' },
  { number: 69, name: 'الحاقة', englishName: 'Al-Haqqah', startPage: 566, ayahsCount: 52, type: 'meccan' },
  { number: 70, name: 'المعارج', englishName: 'Al-Ma\'arij', startPage: 568, ayahsCount: 44, type: 'meccan' },
  { number: 71, name: 'نوح', englishName: 'Nuh', startPage: 570, ayahsCount: 28, type: 'meccan' },
  { number: 72, name: 'الجن', englishName: 'Al-Jinn', startPage: 572, ayahsCount: 28, type: 'meccan' },
  { number: 73, name: 'المزمل', englishName: 'Al-Muzzammil', startPage: 574, ayahsCount: 20, type: 'meccan' },
  { number: 74, name: 'المدثر', englishName: 'Al-Muddaththir', startPage: 575, ayahsCount: 56, type: 'meccan' },
  { number: 75, name: 'القيامة', englishName: 'Al-Qiyamah', startPage: 577, ayahsCount: 40, type: 'meccan' },
  { number: 76, name: 'الإنسان', englishName: 'Al-Insan', startPage: 578, ayahsCount: 31, type: 'medinan' },
  { number: 77, name: 'المرسلات', englishName: 'Al-Mursalat', startPage: 580, ayahsCount: 50, type: 'meccan' },
  { number: 78, name: 'النبأ', englishName: 'An-Naba', startPage: 582, ayahsCount: 40, type: 'meccan' },
  { number: 79, name: 'النازعات', englishName: 'An-Nazi\'at', startPage: 583, ayahsCount: 46, type: 'meccan' },
  { number: 80, name: 'عبس', englishName: '\'Abasa', startPage: 585, ayahsCount: 42, type: 'meccan' },
  { number: 81, name: 'التكوير', englishName: 'At-Takwir', startPage: 586, ayahsCount: 29, type: 'meccan' },
  { number: 82, name: 'الانفطار', englishName: 'Al-Infitar', startPage: 587, ayahsCount: 19, type: 'meccan' },
  { number: 83, name: 'المطففين', englishName: 'Al-Mutaffifin', startPage: 587, ayahsCount: 36, type: 'meccan' },
  { number: 84, name: 'الانشقاق', englishName: 'Al-Inshiqaq', startPage: 589, ayahsCount: 25, type: 'meccan' },
  { number: 85, name: 'البروج', englishName: 'Al-Buruj', startPage: 590, ayahsCount: 22, type: 'meccan' },
  { number: 86, name: 'الطارق', englishName: 'At-Tariq', startPage: 591, ayahsCount: 17, type: 'meccan' },
  { number: 87, name: 'الأعلى', englishName: 'Al-A\'la', startPage: 591, ayahsCount: 19, type: 'meccan' },
  { number: 88, name: 'الغاشية', englishName: 'Al-Ghashiyah', startPage: 592, ayahsCount: 26, type: 'meccan' },
  { number: 89, name: 'الفجر', englishName: 'Al-Fajr', startPage: 593, ayahsCount: 30, type: 'meccan' },
  { number: 90, name: 'البلد', englishName: 'Al-Balad', startPage: 594, ayahsCount: 20, type: 'meccan' },
  { number: 91, name: 'الشمس', englishName: 'Ash-Shams', startPage: 595, ayahsCount: 15, type: 'meccan' },
  { number: 92, name: 'الليل', englishName: 'Al-Layl', startPage: 595, ayahsCount: 21, type: 'meccan' },
  { number: 93, name: 'الضحى', englishName: 'Ad-Duha', startPage: 596, ayahsCount: 11, type: 'meccan' },
  { number: 94, name: 'الشرح', englishName: 'Ash-Sharh', startPage: 596, ayahsCount: 8, type: 'meccan' },
  { number: 95, name: 'التين', englishName: 'At-Tin', startPage: 597, ayahsCount: 8, type: 'meccan' },
  { number: 96, name: 'العلق', englishName: 'Al-\'Alaq', startPage: 597, ayahsCount: 19, type: 'meccan' },
  { number: 97, name: 'القدر', englishName: 'Al-Qadr', startPage: 598, ayahsCount: 5, type: 'meccan' },
  { number: 98, name: 'البينة', englishName: 'Al-Bayyinah', startPage: 598, ayahsCount: 8, type: 'medinan' },
  { number: 99, name: 'الزلزلة', englishName: 'Az-Zalzalah', startPage: 599, ayahsCount: 8, type: 'medinan' },
  { number: 100, name: 'العاديات', englishName: 'Al-\'Adiyat', startPage: 599, ayahsCount: 11, type: 'meccan' },
  { number: 101, name: 'القارعة', englishName: 'Al-Qari\'ah', startPage: 600, ayahsCount: 11, type: 'meccan' },
  { number: 102, name: 'التكاثر', englishName: 'At-Takathur', startPage: 600, ayahsCount: 8, type: 'meccan' },
  { number: 103, name: 'العصر', englishName: 'Al-\'Asr', startPage: 601, ayahsCount: 3, type: 'meccan' },
  { number: 104, name: 'الهمزة', englishName: 'Al-Humazah', startPage: 601, ayahsCount: 9, type: 'meccan' },
  { number: 105, name: 'الفيل', englishName: 'Al-Fil', startPage: 601, ayahsCount: 5, type: 'meccan' },
  { number: 106, name: 'قريش', englishName: 'Quraysh', startPage: 602, ayahsCount: 4, type: 'meccan' },
  { number: 107, name: 'الماعون', englishName: 'Al-Ma\'un', startPage: 602, ayahsCount: 7, type: 'meccan' },
  { number: 108, name: 'الكوثر', englishName: 'Al-Kawthar', startPage: 602, ayahsCount: 3, type: 'meccan' },
  { number: 109, name: 'الكافرون', englishName: 'Al-Kafirun', startPage: 603, ayahsCount: 6, type: 'meccan' },
  { number: 110, name: 'النصر', englishName: 'An-Nasr', startPage: 603, ayahsCount: 3, type: 'medinan' },
  { number: 111, name: 'المسد', englishName: 'Al-Masad', startPage: 603, ayahsCount: 5, type: 'meccan' },
  { number: 112, name: 'الإخلاص', englishName: 'Al-Ikhlas', startPage: 604, ayahsCount: 4, type: 'meccan' },
  { number: 113, name: 'الفلق', englishName: 'Al-Falaq', startPage: 604, ayahsCount: 5, type: 'meccan' },
  { number: 114, name: 'الناس', englishName: 'An-Nas', startPage: 604, ayahsCount: 6, type: 'meccan' },
];

export function getSurahByPage(pageNumber: number): SurahMeta {
  const surahs = [...SURAH_LIST].reverse();
  const surah = surahs.find((s) => pageNumber >= s.startPage);
  return surah || SURAH_LIST[0];
}

export function getJuzByPage(pageNumber: number): number {
  // Approximate Juz boundaries for Madinah Mushaf (20 pages per juz)
  if (pageNumber <= 1) return 1;
  const juz = Math.min(30, Math.ceil((pageNumber - 1) / 20));
  return Math.max(1, juz);
}

export function getQuranPageImageUrl(pageNumber: number): string {
  const padded = pageNumber.toString().padStart(3, '0');
  // High quality Madinah Mushaf hosted on Islamic Network CDN
  return `https://cdn.islamic.network/quran/images/high-resolution/${pageNumber}.png`;
}
