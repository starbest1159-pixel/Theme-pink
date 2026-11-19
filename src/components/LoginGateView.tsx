import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { loginWithPassword, registerAccount } from '../services/seriesApi';
import { UserSession } from '../types/series';
import { validateAuthForm } from '../utils/catalogLogic';
import { OwnerSaleBanner } from './OwnerSaleBanner';
import { ResilientImage } from './ResilientImage';

interface LoginGateViewProps {
  onAuthenticated: (user: UserSession) => void;
  onCopiedLineUrl?: () => void;
}

export function LoginGateView({
  onAuthenticated,
  onCopiedLineUrl,
}: LoginGateViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');

    const result = validateAuthForm({
      mode,
      displayName,
      email,
      password,
      confirmPassword,
    });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const user =
        mode === 'register'
          ? await registerAccount({
              name: displayName.trim(),
              email: email.trim(),
              password,
            })
          : await loginWithPassword({
              email: email.trim(),
              password,
            });
      onAuthenticated(user);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="login-gate-view"
      className="relative min-h-screen flex flex-col justify-between overflow-x-clip bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
    >
      {/* Faded top watermark backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute top-0 left-0 right-0 z-0 w-full h-[210px] sm:h-[320px] overflow-hidden"
      >
        <img
          src="/assets/aistudio/IMG_20261119_232237_1e5698f2.png"
          alt=""
          className="w-full h-full object-cover object-top scale-[1.04] opacity-[0.26] dark:opacity-[0.16] blur-[0.5px] saturate-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/45 to-white dark:from-slate-950/25 dark:via-slate-950/60 dark:to-slate-950" />
      </div>

      {/* Main Centered Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-3.5 py-6 sm:px-6 sm:py-10">
        <div className="w-full max-w-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-xl shadow-rose-500/10 border border-rose-100 dark:border-slate-800 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Brand Panel (Desktop) */}
          <div className="hidden md:flex md:col-span-5 flex-col items-center justify-between p-7 bg-gradient-to-b from-rose-50 via-pink-50/70 to-rose-100/80 dark:from-slate-800 dark:to-rose-950/40 text-center">
            <div className="space-y-2.5 pt-1 flex flex-col items-center">
              <img
                src="/assets/bannlai/01-logo-bannlai-nobg.png"
                alt="Bannlai Series"
                className="h-14 w-auto object-contain drop-shadow-sm"
              />
              <h1 className="font-display text-base font-extrabold text-slate-900 dark:text-white">
                เฉพาะสมาชิกเท่านั้น
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                เข้าสู่ระบบเพื่อรับชมคลังซีรีส์จีนพากย์ไทยอัปเดตล่าสุดครบทุกตอน
              </p>
            </div>

            <ResilientImage
              src="/assets/bannlai/05-chibi-mascot-with-cat.png"
              alt="มาสคอต Bannlai Series"
              className="w-44 h-44 rounded-3xl object-cover shadow-md border-4 border-white dark:border-slate-700 my-4 bg-white"
            />

            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              พากย์ไทยเท่านั้น · คมชัดระดับ HD
            </p>
          </div>

          {/* Right Form Panel */}
          <div className="md:col-span-7 p-5 sm:p-8 space-y-4 sm:space-y-5">
            {/* Mobile Brand Header */}
            <div className="flex md:hidden flex-col items-center text-center space-y-1.5">
              <img
                src="/assets/bannlai/01-logo-bannlai-nobg.png"
                alt="Bannlai Series"
                className="h-11 w-auto object-contain"
              />
              <h1 className="font-display text-lg font-extrabold text-slate-900 dark:text-white">
                เข้าสู่ระบบเพื่อเข้าใช้งาน
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                คลังซีรีส์พากย์ไทยอัปเดตล่าสุด สำหรับสมาชิกเท่านั้น
              </p>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>ระบบสมาชิก Bannlai Series · พากย์ไทยเท่านั้น</span>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                  setServerError('');
                }}
                className={`h-10 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-[#FF1E6E] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                เข้าสู่ระบบ
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrors({});
                  setServerError('');
                }}
                className={`h-10 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-[#FF1E6E] shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                สมัครสมาชิก
              </button>
            </div>

            {serverError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300"
              >
                {serverError}
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5" noValidate>
              {mode === 'register' && (
                <div>
                  <label htmlFor="gate-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อผู้ใช้
                  </label>
                  <div className="relative">
                    <User
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      id="gate-name"
                      type="text"
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="กรอกชื่อผู้ใช้ของคุณ"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                    />
                  </div>
                  {errors.displayName && (
                    <p className="text-xs text-rose-600 mt-1">{errors.displayName}</p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="gate-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  อีเมล
                </label>
                <div className="relative">
                  <Mail
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="gate-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="gate-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="gate-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-600 mt-1">{errors.password}</p>
                )}
              </div>

              {mode === 'register' && (
                <div>
                  <label htmlFor="gate-confirm-password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="relative">
                    <Lock
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                      aria-hidden="true"
                    />
                    <input
                      id="gate-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-rose-600 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] hover:brightness-110 disabled:opacity-70 text-white text-sm font-bold shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>{mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกและเข้าใช้งาน'}</span>
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 pt-1">
              {mode === 'login' ? 'ยังไม่มีบัญชีสมาชิก? ' : 'มีบัญชีสมาชิกอยู่แล้ว? '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setErrors({});
                  setServerError('');
                }}
                className="font-bold text-[#FF1E6E] hover:underline cursor-pointer"
              >
                {mode === 'login' ? 'สมัครสมาชิกเลย' : 'เข้าสู่ระบบ'}
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Owner Sale Contact Footer on Gate Screen */}
      <footer className="relative z-10 border-t border-rose-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 pt-4 pb-5">
        <OwnerSaleBanner variant="footer" onCopied={onCopiedLineUrl} />
        <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
          Bannlai Series · ดูฟรี ครบทุกความบันเทิง (เฉพาะสมาชิกที่เข้าสู่ระบบ)
        </p>
      </footer>
    </div>
  );
}
