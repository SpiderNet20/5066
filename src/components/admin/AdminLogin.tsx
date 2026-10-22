import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Globe,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import { adminLogin, getLocalAdminCredentials } from '../../services/postsService';
import { DEFAULT_GITHUB_REPO, DEFAULT_GITHUB_BRANCH } from '../../services/githubCmsService';

interface AdminLoginProps {
  onLoginSuccess: (username: string) => void;
  onBackToSite?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToSite }) => {
  const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin');
  const [pinCode, setPinCode] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localCreds = getLocalAdminCredentials();
  const isDefaultPin = localCreds.pin === '2026';

  const performLogin = async (usr: string, secret: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await adminLogin(usr.trim(), secret.trim());
      if (res.success && res.token) {
        onLoginSuccess(res.username || usr);
      } else {
        setError(res.error || 'كلمة المرور أو رمز الحماية PIN غير صحيح');
      }
    } catch (err: any) {
      setError(err.message || 'تعذر التحقق من بيانات الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'pin') {
      if (!pinCode.trim()) {
        setError('يرجى إدخال رمز الحماية PIN');
        return;
      }
      performLogin('admin', pinCode);
    } else {
      if (!password.trim()) {
        setError('يرجى إدخال كلمة المرور');
        return;
      }
      performLogin(username, password);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#090d1d] via-[#111936] to-[#0a0f24] text-white flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden font-['Tajawal',sans-serif]"
      dir="rtl"
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#035dcd]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-3xl p-7 sm:p-9 shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-18 h-18 mx-auto mb-3.5 rounded-2xl bg-[#161f42] border border-blue-500/30 p-2.5 shadow-lg flex items-center justify-center">
            <img
              src="/logo-spider.png"
              alt="العنكبوت للمعلومات"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            لوحة تحكم العنكبوت للمعلومات
          </h1>
          <p className="text-xs text-blue-200/75 mt-1">
            نظام إدارة المحتوى المستقل المرتبط بـ GitHub REST API v3
          </p>

          {/* Target Repo Badge */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-950/60 border border-blue-500/25 text-[11px] text-blue-200 font-mono" dir="ltr">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
            <span>{DEFAULT_GITHUB_REPO}</span>
            <span className="text-blue-400">({DEFAULT_GITHUB_BRANCH})</span>
          </div>
        </div>

        {/* Auth Mode Switcher (PIN vs Password) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/30 border border-white/10 mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('pin');
              setError(null);
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              authMode === 'pin'
                ? 'bg-[#035dcd] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>رمز الحماية السريع (PIN)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setError(null);
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              authMode === 'password'
                ? 'bg-[#035dcd] text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>كلمة المرور الكاملة</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'pin' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-300">
                  أدخل رمز الحماية (PIN) لفتح اللوحة
                </label>
                {isDefaultPin && (
                  <button
                    type="button"
                    onClick={() => setPinCode('2026')}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    الافتراضي: 2026 (تعبئة)
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-3.5 pr-11 pl-11 rounded-xl bg-white/10 border border-white/15 text-white text-center tracking-[0.5em] font-mono text-lg placeholder-gray-500 focus:outline-none focus:border-[#035dcd] focus:ring-2 focus:ring-[#035dcd]/30 transition"
                  placeholder="••••"
                  dir="ltr"
                />
                <KeyRound className="w-5 h-5 text-blue-400 absolute top-1/2 -translate-y-1/2 right-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 left-3.5 text-gray-400 hover:text-gray-200 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2 text-center">
                يحمي هذا القفل لوحة التحكم ومفتاح GitHub Token المخزن من الوصول غير المصرح به.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-white/10 border border-white/15 text-white placeholder-gray-400 focus:outline-none focus:border-[#035dcd] focus:ring-2 focus:ring-[#035dcd]/30 transition text-sm"
                    placeholder="admin"
                    dir="ltr"
                  />
                  <User className="w-5 h-5 text-gray-400 absolute top-1/2 -translate-y-1/2 right-3.5" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    كلمة المرور
                  </label>
                  <button
                    type="button"
                    onClick={() => setPassword('SpiderNet@2026!')}
                    className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                  >
                    تعبئة الافتراضية
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-11 pl-11 rounded-xl bg-white/10 border border-white/15 text-white placeholder-gray-400 focus:outline-none focus:border-[#035dcd] focus:ring-2 focus:ring-[#035dcd]/30 transition text-sm"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                  <Lock className="w-5 h-5 text-gray-400 absolute top-1/2 -translate-y-1/2 right-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 left-3.5 text-gray-400 hover:text-gray-200 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#035dcd] hover:bg-[#0249a3] text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري التحقق وفتح اللوحة...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>فتح لوحة التحكم وإدارة GitHub CMS</span>
              </>
            )}
          </button>

          {onBackToSite && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onBackToSite}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-blue-200 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Globe className="w-4 h-4 text-blue-400" />
                <span>معاينة الموقع العام (Preview Mode)</span>
              </button>
            </div>
          )}
        </form>

        {/* Security Notice */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>حماية محلية للتوكن مع دعم الترميز العربي UTF-8 الكامل</span>
          </p>
        </div>
      </div>
    </div>
  );
};
