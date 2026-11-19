import { X } from 'lucide-react';

interface FullScreenLoaderProps {
  visible: boolean;
  label?: string;
  canCancel?: boolean;
  onCancel?: () => void;
}

export function FullScreenLoader({
  visible,
  label = 'กำลังโหลดข้อมูล...',
  canCancel = true,
  onCancel,
}: FullScreenLoaderProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="fullscreen-loader"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 bg-white/92 dark:bg-slate-950/92 backdrop-blur-md transition-opacity"
    >
      {/* Subtle themed watermark backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 overflow-hidden"
      >
        <img
          src="/assets/aistudio/IMG_20261119_232237_1e5698f2.png"
          alt=""
          className="w-full h-full object-cover opacity-[0.10] dark:opacity-[0.08] blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-rose-50/75 to-white/90 dark:from-slate-950/85 dark:via-rose-950/35 dark:to-slate-950/92" />
      </div>

      {/* Centered Sakura Loading Card */}
      <div className="relative z-10 w-full max-w-[280px] sm:max-w-[320px] rounded-3xl bg-white/95 dark:bg-slate-900/95 border-2 border-rose-200/90 dark:border-rose-900/60 shadow-2xl shadow-rose-500/20 p-5 sm:p-6 flex flex-col items-center text-center gap-3.5">
        <img
          src="/assets/bannlai/01-logo-bannlai-nobg.png"
          alt="Bannlai Series"
          className="h-9 sm:h-11 w-auto object-contain select-none"
        />

        {/* Animated ring framing user's loading mascot */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute -inset-2 rounded-3xl border-[3px] border-rose-200 dark:border-rose-900/60 border-t-[#FF1E6E] border-r-[#FF6BA6] animate-spin"
          />
          <div className="relative w-28 h-24 sm:w-32 sm:h-28 rounded-2xl overflow-hidden bg-rose-50 dark:bg-slate-800 border border-rose-200/80 shadow-inner">
            <img
              src="/assets/bannlai/13-loading-mascot.png"
              alt="กำลังโหลด"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="space-y-1.5 w-full">
          <p className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {label}
          </p>
          {/* Indeterminate sakura loading bar */}
          <div className="w-full h-1.5 rounded-full bg-rose-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#FF7EB3] via-[#FF1E6E] to-[#E6005C] animate-pulse mx-auto" />
          </div>
        </div>

        {canCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-0.5 h-8 sm:h-9 px-4 rounded-full border border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/70 text-[#D40052] dark:text-rose-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ยกเลิก</span>
          </button>
        )}
      </div>
    </div>
  );
}
