import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';

export const OWNER_LINE_URL = 'https://line.me/ti/p/WcaaMN5ptg';
export const SYSTEM_SALE_PRICE = '3,400 บาท';

interface OwnerSaleBannerProps {
  variant?: 'footer' | 'card';
  onCopied?: () => void;
}

export function OwnerSaleBanner({
  variant = 'footer',
  onCopied,
}: OwnerSaleBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLineUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(OWNER_LINE_URL);
      } else {
        const tempInput = document.createElement('textarea');
        tempInput.value = OWNER_LINE_URL;
        tempInput.setAttribute('readonly', '');
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (variant === 'card') {
    return (
      <section
        aria-label="เจ้าของผลงานและติดต่อซื้อทั้งระบบ"
        className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-rose-100/80 dark:border-slate-800 p-4 sm:p-6 space-y-3 sm:space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-semibold text-[#FF1E6E]">
              เจ้าของผลงาน · ปล่อยขายทั้งระบบ
            </p>
            <h2 className="font-display text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
              ปล่อยขายทั้งระบบ{' '}
              <span className="text-[#FF1E6E] tabular-nums">{SYSTEM_SALE_PRICE}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              สนใจรับระบบครบชุด ติดต่อเจ้าของผลงานโดยตรงผ่าน LINE
            </p>
            <a
              href={OWNER_LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline break-all"
            >
              {OWNER_LINE_URL}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 sm:pt-0">
            <a
              href={OWNER_LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-[#06C755] hover:bg-[#05b24c] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>ติดต่อทาง LINE</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => void handleCopyLineUrl()}
              className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>คัดลอกลิงก์</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      aria-label="เจ้าของผลงานและข้อมูลจำหน่ายระบบ"
      className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-4 sm:pb-5 mb-4 sm:mb-5 border-b border-rose-100/80 dark:border-slate-800/80"
    >
      <div className="rounded-2xl bg-rose-50/70 dark:bg-slate-800/60 border border-rose-200/70 dark:border-slate-700/80 px-3.5 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              เจ้าของผลงาน
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-[#FF1E6E] tabular-nums">
              ปล่อยขายทั้งระบบ {SYSTEM_SALE_PRICE}
            </span>
          </div>
          <a
            href={OWNER_LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:underline truncate"
          >
            LINE: {OWNER_LINE_URL}
          </a>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={OWNER_LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 sm:h-9 px-3.5 sm:px-4 rounded-full bg-[#06C755] hover:bg-[#05b24c] text-white text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <span>แอด LINE เจ้าของผลงาน</span>
            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => void handleCopyLineUrl()}
            aria-label="คัดลอกลิงก์ LINE เจ้าของผลงาน"
            className="h-8 sm:h-9 px-3 rounded-full border border-rose-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>คัดลอกแล้ว</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                <span>คัดลอกลิงก์</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
