import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, X } from 'lucide-react';
import { UserSession } from '../types/series';
import { validateAuthForm } from '../utils/catalogLogic';
import { ResilientImage } from './ResilientImage';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: UserSession) => void;
}

export function AuthModal({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [noticeMessage, setNoticeMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNoticeMessage('');
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
    const cleanEmail = email.trim();
    const resolvedName =
      mode === 'register'
        ? displayName.trim()
        : cleanEmail.split('@')[0] || 'Bannlai User';

    onSuccess({
      name: resolvedName === 'user' ? 'Bannlai User' : resolvedName,
      email: cleanEmail,
      isVip: true,
      vipExpiryLabel: '31 ธ.ค. 2569',
      provider: 'email',
    });
  };

  const handleSocialLogin = (provider: 'google' | 'line') => {
    onSuccess({
      name: provider === 'google' ? 'Bannlai User' : 'LINE Member',
      email: provider === 'google' ? 'user@bannlai.com' : 'line.member@bannlai.com',
      isVip: true,
      vipExpiryLabel: '31 ธ.ค. 2569',
      provider,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-rose-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12">
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Left Mascot Visual Panel matching Screenshot 2 */}
        <div className="hidden md:flex md:col-span-5 flex-col items-center justify-between p-6 bg-gradient-to-b from-rose-50 via-pink-50 to-rose-100 dark:from-slate-800 dark:to-rose-950/50 text-center">
          <div className="space-y-2 pt-2 flex flex-col items-center">
            <img
              src="/assets/bannlai/01-logo-bannlai-series.png"
              alt="Bannlai Series"
              className="h-14 w-auto object-contain rounded-xl dark:bg-white/95 dark:px-2"
            />
            <p className="text-sm font-bold text-slate-800 dark:text-rose-100">
              เข้าสู่ระบบเพื่อรับชมแบบเต็มรูปแบบ
            </p>
          </div>

          <ResilientImage
            src="/assets/bannlai/05-chibi-mascot-with-cat.png"
            alt="มาสคอต Bannlai Series"
            className="w-48 h-48 rounded-3xl object-cover shadow-lg border-4 border-white dark:border-slate-700 my-4 bg-white"
          />

          <p className="text-xs text-slate-500 dark:text-slate-300">
            ดูฟรี ครบทุกความบันเทิง · ซับไทยคมชัด 1080p
          </p>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-8 space-y-5">
          <h2 id="auth-modal-title" className="sr-only">
            {mode === 'login' ? 'เข้าสู่ระบบ Bannlai Series' : 'สมัครสมาชิก Bannlai Series'}
          </h2>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrors({});
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

          {noticeMessage && (
            <div
              role="status"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs font-medium text-[#FF1E6E]"
            >
              {noticeMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="sr-only">
                  ชื่อผู้ใช้
                </label>
                <div className="relative">
                  <User
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="ชื่อผู้ใช้ของคุณ"
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                  />
                </div>
                {errors.displayName && (
                  <p className="text-xs text-rose-600 mt-1">{errors.displayName}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="sr-only">
                อีเมลของคุณ
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="อีเมลของคุณ"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#FF1E6E]"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-600 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="auth-password" className="sr-only">
                รหัสผ่านของคุณ
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านของคุณ"
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
                <label htmlFor="auth-confirm-password" className="sr-only">
                  ยืนยันรหัสผ่าน
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
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

            {mode === 'login' && (
              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-[#FF1E6E] rounded"
                  />
                  <span>จดจำฉันไว้</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setNoticeMessage(
                      'กรอกอีเมลของคุณและรหัสผ่านอย่างน้อย 6 ตัวอักษร หรือเลือกเข้าสู่ระบบด้วย Google / LINE ด้านล่าง'
                    )
                  }
                  className="text-[#FF1E6E] font-semibold hover:underline cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] hover:brightness-110 text-white text-sm font-bold shadow-md shadow-rose-500/25 cursor-pointer transition-all"
            >
              {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกเลย'}
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <span className="border-t border-slate-200 dark:border-slate-700 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-xs text-slate-400">
              หรือ
            </span>
            <span className="border-t border-slate-200 dark:border-slate-700 w-full" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="font-extrabold text-blue-600">G</span>
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin('line')}
              className="h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="px-1.5 py-0.5 rounded bg-[#06C755] text-white text-[10px] font-extrabold">
                LINE
              </span>
              <span>LINE</span>
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            {mode === 'login' ? 'ยังไม่มีบัญชี? ' : 'มีบัญชีอยู่แล้ว? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setErrors({});
              }}
              className="font-bold text-[#FF1E6E] hover:underline cursor-pointer"
            >
              {mode === 'login' ? 'สมัครสมาชิกเลย' : 'เข้าสู่ระบบ'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
