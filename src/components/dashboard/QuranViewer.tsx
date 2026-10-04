import React, { useState, useEffect } from 'react';
import { SURAH_LIST, getSurahByPage, getJuzByPage } from '../../utils/quranData';

export const QuranViewer: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const saved = localStorage.getItem('last_quran_page');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [inputPage, setInputPage] = useState<string>(currentPage.toString());
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const currentSurah = getSurahByPage(currentPage);
  const currentJuz = getJuzByPage(currentPage);

  useEffect(() => {
    setInputPage(currentPage.toString());
    setImgLoading(true);
    setImgError(false);
    localStorage.setItem('last_quran_page', currentPage.toString());
  }, [currentPage]);

  const handleNextPage = () => {
    if (currentPage < 604) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleSurahChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const surahNum = parseInt(e.target.value, 10);
    const surah = SURAH_LIST.find((s) => s.number === surahNum);
    if (surah) {
      setCurrentPage(surah.startPage);
    }
  };

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= 604) {
      setCurrentPage(pageNum);
    } else {
      setInputPage(currentPage.toString());
    }
  };

  // Madinah Mushaf page URLs with reliable high-res image sources
  const pageImageSrc = `https://raw.githubusercontent.com/Ghamdi99/Quran-Pages-PNG/master/pages/${currentPage}.png`;
  const fallbackSrc = `https://cdn.islamic.network/quran/images/high-resolution/${currentPage}.png`;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden flex flex-col" dir="rtl">
      {/* Top Quran Navigation Bar */}
      <div className="p-3.5 sm:p-4 bg-[#F4F9FA] border-b border-gray-200/80 flex flex-wrap items-center justify-between gap-3">
        {/* Surah and Juz Selector */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
            <span className="material-symbols-outlined text-[#1A7B88] text-lg">menu_book</span>
            <select
              value={currentSurah.number}
              onChange={handleSurahChange}
              className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              {SURAH_LIST.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. سورة {s.name} (ص {s.startPage})
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-[#125862] bg-[#EAF5F7] px-2.5 py-1.5 rounded-xl border border-[#1A7B88]/20">
            <span>الجزء {currentJuz}</span>
            <span>•</span>
            <span>{currentSurah.type === 'meccan' ? 'مكية' : 'مدنية'}</span>
          </div>
        </div>

        {/* Page Jump & Navigation Controls */}
        <div className="flex items-center gap-2">
          {/* Previous Page (In RTL: previous page is higher number or left button) */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-[#EAF5F7] hover:text-[#125862] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
            title="الصفحة السابقة"
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>

          {/* Quick Page Input */}
          <form onSubmit={handlePageSubmit} className="flex items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">صفحة:</span>
            <input
              type="number"
              min={1}
              max={604}
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              className="w-14 h-8 text-center text-xs font-bold font-mono bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1A7B88]"
            />
            <span className="text-xs text-gray-400 font-mono">/ 604</span>
          </form>

          {/* Next Page */}
          <button
            onClick={handleNextPage}
            disabled={currentPage >= 604}
            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-[#EAF5F7] hover:text-[#125862] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
            title="الصفحة التالية"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 border-r border-gray-200 pr-2 mr-1">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#1A7B88] text-xs"
              title="تكبير"
            >
              +
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
              className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:text-[#1A7B88] text-xs"
              title="تصغير"
            >
              -
            </button>
          </div>
        </div>
      </div>

      {/* Main Quran Page Canvas */}
      <div className="relative min-h-[550px] sm:min-h-[680px] bg-[#FAF8F5] flex items-center justify-center p-2 sm:p-6 overflow-auto">
        {imgLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FAF8F5]/80 backdrop-blur-2xs z-10 gap-2">
            <div className="w-8 h-8 border-3 border-[#1A7B88] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-[#125862]">جاري تحميل الصفحة {currentPage}...</span>
          </div>
        )}

        {imgError ? (
          <div className="text-center p-8 flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-amber-500">wifi_off</span>
            <p className="text-sm font-bold text-gray-800">تعذر تحميل صورة الصفحة</p>
            <p className="text-xs text-gray-500">يرجى التحقق من الاتصال بالإنترنت والنقر لإعادة المحاولة</p>
            <button
              onClick={() => {
                setImgError(false);
                setImgLoading(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#1A7B88] text-white text-xs font-bold hover:bg-[#125862] transition-colors"
            >
              إعادة التحميل
            </button>
          </div>
        ) : (
          <div
            className="transition-transform duration-200 ease-out max-w-full"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          >
            <img
              src={pageImageSrc}
              alt={`مصحف المدينة - صفحة ${currentPage}`}
              onLoad={() => setImgLoading(false)}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== fallbackSrc) {
                  target.src = fallbackSrc;
                } else {
                  setImgLoading(false);
                  setImgError(true);
                }
              }}
              className="max-h-[80vh] sm:max-h-[85vh] w-auto mx-auto rounded-lg shadow-sm border border-amber-900/10"
              style={{ filter: 'contrast(1.02)' }}
            />
          </div>
        )}
      </div>

      {/* Bottom Page Indicator and Fast Buttons */}
      <div className="p-3 bg-[#F4F9FA] border-t border-gray-200/80 flex items-center justify-between text-xs text-gray-600">
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 font-bold text-[#125862] hover:text-[#1A7B88] disabled:opacity-40 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
          <span>الصفحة السابقة</span>
        </button>

        <span className="font-bold text-gray-800">
          سورة {currentSurah.name} • صفحة {currentPage} من 604
        </span>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= 604}
          className="flex items-center gap-1 font-bold text-[#125862] hover:text-[#1A7B88] disabled:opacity-40 cursor-pointer"
        >
          <span>الصفحة التالية</span>
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
      </div>
    </div>
  );
};
