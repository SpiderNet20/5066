import React, { useState, useEffect } from 'react';
import {
  Key,
  Download,
  Cloud,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  User,
  GitBranch,
  FolderGit2,
  FileJson,
  Eye,
  EyeOff,
  Send,
  ShieldCheck,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { adminChangePassword, getLocalAdminCredentials } from '../../services/postsService';
import {
  getGitHubConfig,
  saveGitHubConfig,
  testGitHubConnection,
  commitPostsToGitHub,
  getLastKnownSha,
  getLastSyncTimestamp,
  DEFAULT_GITHUB_REPO,
  DEFAULT_GITHUB_BRANCH,
  DEFAULT_GITHUB_FILE_PATH,
} from '../../services/githubCmsService';
import { Post } from '../../types';

interface AdminSettingsProps {
  posts: Post[];
  onRefreshData?: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ posts, onRefreshData }) => {
  // GitHub Configuration State
  const initialGhConfig = getGitHubConfig();
  const [ghToken, setGhToken] = useState(initialGhConfig.token);
  const [ghRepo, setGhRepo] = useState(initialGhConfig.repo || DEFAULT_GITHUB_REPO);
  const [ghBranch, setGhBranch] = useState(initialGhConfig.branch || DEFAULT_GITHUB_BRANCH);
  const [ghFilePath, setGhFilePath] = useState(
    initialGhConfig.filePath || DEFAULT_GITHUB_FILE_PATH
  );
  const [tokenSource, setTokenSource] = useState(initialGhConfig.tokenSource);
  const [showToken, setShowToken] = useState(false);

  const [ghStatus, setGhStatus] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    details?: string;
  } | null>(null);
  const [isTestingGh, setIsTestingGh] = useState(false);
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [lastSha, setLastSha] = useState<string | null>(getLastKnownSha());
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncTimestamp());

  // Password & PIN change state
  const localCreds = getLocalAdminCredentials();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPin, setNewPin] = useState(localCreds.pin || '2026');
  const [newUsername, setNewUsername] = useState(localCreds.username || 'admin');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const cfg = getGitHubConfig();
    setGhToken(cfg.token);
    setGhRepo(cfg.repo);
    setGhBranch(cfg.branch);
    setGhFilePath(cfg.filePath);
    setTokenSource(cfg.tokenSource);
    setLastSha(getLastKnownSha());
    setLastSync(getLastSyncTimestamp());
  }, []);

  // Save GitHub Config to localStorage
  const handleSaveGitHubConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveGitHubConfig({
      token: ghToken,
      repo: ghRepo || DEFAULT_GITHUB_REPO,
      branch: ghBranch || DEFAULT_GITHUB_BRANCH,
      filePath: ghFilePath || DEFAULT_GITHUB_FILE_PATH,
    });
    setTokenSource(updated.tokenSource);
    setGhRepo(updated.repo);
    setGhBranch(updated.branch);
    setGhFilePath(updated.filePath);
    setGhStatus({
      type: 'success',
      text: 'تم حفظ إعدادات التوكن والمستودع في المتصفح (localStorage) بنجاح.',
    });
    if (onRefreshData) {
      onRefreshData();
    }
  };

  // Test GitHub API v3 Connection & Fetch SHA
  const handleTestConnection = async () => {
    // Save current inputs before testing
    const updated = saveGitHubConfig({
      token: ghToken,
      repo: ghRepo || DEFAULT_GITHUB_REPO,
      branch: ghBranch || DEFAULT_GITHUB_BRANCH,
      filePath: ghFilePath || DEFAULT_GITHUB_FILE_PATH,
    });
    setTokenSource(updated.tokenSource);

    setIsTestingGh(true);
    setGhStatus(null);
    try {
      const res = await testGitHubConnection();
      if (res.success) {
        setLastSha(res.sha);
        setLastSync(getLastSyncTimestamp());
        setGhStatus({
          type: 'success',
          text: `تم الاتصال بنجاح بمستودع ${res.repo} (${res.branch})!`,
          details: `عدد المقالات في المستودع: ${res.postsCount} مقال | SHA الحالي: ${res.sha.substring(0, 12)}... ${
            res.authenticatedUser
              ? `| حساب GitHub: @${res.authenticatedUser} (${res.canPush ? 'صلاحية النشر والـ Commit مفعلة ✅' : 'قراءة فقط ⚠️'})`
              : '| وضع القراءة العامة (أدخل التوكن لتفعيل النشر والـ Commit)'
          }`,
        });
        if (onRefreshData) onRefreshData();
      } else {
        setGhStatus({
          type: 'error',
          text: res.error || 'فشل الاتصال بـ GitHub REST API',
        });
      }
    } catch (err: any) {
      setGhStatus({
        type: 'error',
        text: err.message || 'تعذر الاتصال بـ GitHub API',
      });
    } finally {
      setIsTestingGh(false);
    }
  };

  // Force Sync / Commit all current posts to GitHub
  const handleForcePushPosts = async () => {
    setIsPushingAll(true);
    setGhStatus(null);
    try {
      const res = await commitPostsToGitHub(
        posts,
        `مزامنة وتحديث ملف المقالات (${posts.length} مقال) من لوحة تحكم العنكبوت CMS`
      );
      setLastSha(res.sha);
      setLastSync(getLastSyncTimestamp());
      setGhStatus({
        type: 'success',
        text: `تم عمل Commit ورفع ${posts.length} مقال بنجاح إلى ${ghRepo}/${ghFilePath}!`,
        details: `SHA الجديد: ${res.sha}`,
      });
    } catch (err: any) {
      setGhStatus({
        type: 'error',
        text: err.message || 'فشل رفع المقالات إلى GitHub',
      });
    } finally {
      setIsPushingAll(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'كلمة المرور الجديدة وتأكيدها غير متطابقين' });
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'يجب أن لا تقل كلمة المرور الجديدة عن 6 أحرف' });
      return;
    }
    if (newPin && newPin.trim().length < 4) {
      setStatusMessage({ type: 'error', text: 'يجب أن يتكون رمز الحماية PIN من 4 خانات على الأقل' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const targetPassword = newPassword.trim() || localCreds.password;
      const res = await adminChangePassword(
        currentPassword,
        targetPassword,
        newUsername,
        newPin.trim()
      );
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message || 'تم تحديث كلمة المرور ورمز PIN بنجاح!',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'فشل تحديث بيانات الحماية' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'حدث خطأ غير متوقع' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Export JSON Database
  const handleExportDatabase = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(posts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `posts.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-['Tajawal',sans-serif]" dir="rtl">
      {/* 1. GitHub REST API v3 & Repository Connection Settings */}
      <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#035dcd]">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                إعدادات الربط المباشر مع مستودع GitHub (GitHub REST API v3)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                نشر وتعديل وحذف المقالات مباشرة في ملف <code className="font-mono text-[#035dcd] dark:text-blue-300">data/posts.json</code> بدون خادم خلفي
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span
              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                ghToken
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  ghToken ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {tokenSource === 'env'
                ? 'التوكن مفعل من VITE_GITHUB_TOKEN'
                : tokenSource === 'localStorage'
                  ? 'التوكن مفعل من localStorage'
                  : 'التوكن غير مدخل بعد'}
            </span>
          </div>
        </div>

        {ghStatus && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs space-y-1 border ${
              ghStatus.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {ghStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              )}
              <span>{ghStatus.text}</span>
            </div>
            {ghStatus.details && (
              <p className="text-[11px] opacity-90 pr-6 font-mono">{ghStatus.details}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSaveGitHubConfig} className="space-y-4">
          {/* GitHub Personal Access Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#035dcd]" />
                <span>مفتاح الوصول الشخصي (GitHub Personal Access Token - PAT)</span>
              </label>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-[#035dcd] dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>إنشاء توكن بصلاحية repo / contents</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={ghToken}
                onChange={(e) => setGhToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx أو github_pat_..."
                className="w-full px-3.5 py-2.5 pl-10 text-xs font-mono rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                title={showToken ? 'إخفاء التوكن' : 'إظهار التوكن'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              يقرأ تلقائياً من متغير البيئة <code className="font-mono">VITE_GITHUB_TOKEN</code>، أو يمكنك إدخاله هنا لحفظه محلياً في <code className="font-mono">localStorage</code>.
            </p>
          </div>

          {/* Repository, Branch & File Path */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                المستودع المستهدف (Owner/Repo)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ghRepo}
                  onChange={(e) => setGhRepo(e.target.value)}
                  placeholder="SpiderNet20/information-net"
                  className="w-full px-3 py-2.5 text-xs font-mono rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                الفرع (Branch)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ghBranch}
                  onChange={(e) => setGhBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2.5 text-xs font-mono rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                مسار ملف المقالات
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ghFilePath}
                  onChange={(e) => setGhFilePath(e.target.value)}
                  placeholder="data/posts.json"
                  className="w-full px-3 py-2.5 text-xs font-mono rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Last SHA & Sync Status Bar */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#035dcd]" />
              <span className="text-gray-500 dark:text-gray-400">آخر SHA مستلم للملف:</span>
              <code className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono text-[11px] text-gray-800 dark:text-gray-200" dir="ltr">
                {lastSha ? lastSha.substring(0, 16) + '...' : 'لم يتم الاستعلام بعد'}
              </code>
            </div>
            {lastSync && (
              <span className="text-[11px] text-gray-400">
                آخر مزامنة: {new Date(lastSync).toLocaleTimeString('ar-EG')}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-[#035dcd] hover:bg-[#0249a3] text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>حفظ إعدادات التوكن والمستودع</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingGh}
              className="py-2.5 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#035dcd] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isTestingGh ? 'animate-spin' : ''}`} />
              <span>{isTestingGh ? 'جاري فحص المستودع...' : 'اختبار الاتصال وجلب الـ SHA'}</span>
            </button>

            <button
              type="button"
              onClick={handleForcePushPosts}
              disabled={isPushingAll || !ghToken}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              title="عمل Commit مباشر لجميع المقالات الحالية إلى المستودع"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isPushingAll ? 'جاري الرفع والـ Commit...' : 'رفع ومزامنة المقالات الآن (Commit)'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Account Security, PIN & Password Change */}
      <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#035dcd]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              حماية لوحة التحكم (رمز PIN وكلمة المرور)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              تأمين شاشة الدخول لمنع الوصول غير المصرح به إلى اللوحة والتوكن عند فتح رابط الاستضافة المستقلة
            </p>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-700 dark:text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                اسم المستخدم للمسؤول
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 pr-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                  dir="ltr"
                />
                <User className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 right-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                رمز الدخول السريع (PIN Code)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  required
                  placeholder="2026"
                  className="w-full px-3 py-2.5 pr-10 text-xs font-mono rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                  dir="ltr"
                />
                <KeyRound className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 right-3" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              كلمة المرور الحالية أو رمز PIN الحالي (للتأكيد)
            </label>
            <div className="relative">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="أدخل كلمة المرور الحالية أو رمز PIN (الافتراضي: 2026)"
                className="w-full px-3 py-2.5 pr-10 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 right-3" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                كلمة المرور الجديدة (اختياري)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="اتركها فارغة للإبقاء على الحالية"
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="py-2.5 px-6 rounded-xl bg-[#035dcd] hover:bg-[#0249a3] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isChangingPassword ? 'جاري الحفظ...' : 'حفظ بيانات الحماية الجديدة'}
          </button>
        </form>
      </div>

      {/* 3. UTF-8 & Schema Architecture Info */}
      <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              بنية البيانات والترميز العربي (UTF-8 & Post Schema)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              توافق تام مع مستودع SpiderNet20/information-net
            </p>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <p>
            ✅ <strong>حماية الترميز العربي (UTF-8):</strong> يتم تشفير وفك تشفير محتوى <code className="font-mono">data/posts.json</code> عبر <code className="font-mono">TextEncoder</code> و <code className="font-mono">TextDecoder</code> لضمان عدم تكسر أي حرف عربي في Base64.
          </p>
          <p>
            ✅ <strong>تتبع الـ SHA التلقائي:</strong> تحتفظ اللوحة بآخر <code className="font-mono">SHA</code> مستلم من GitHub وتتحقق منه تلقائياً قبل كل عملية نشر أو تعديل أو حذف لمنع تعارض التعديلات (409 Conflict).
          </p>
          <p>
            ✅ <strong>مطابقة الـ Schema:</strong> يتم التحقق من كافة الحقول الإلزامية (<code className="font-mono text-[11px]">id, title, slug, category, categorySlug, categoryIndex, canonicalUrl, date, isoDate, readTime, author, thumbnail, imageAlt, snippet, rawContent, tags, status, noindex</code>) وإدراج المقال الجديد في بداية المصفوفة.
          </p>
        </div>
      </div>

      {/* 4. Database Export & Backup */}
      <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Download className="w-5 h-5 text-[#035dcd]" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              تنزيل ملف posts.json المباشر (نسخة احتياطية كاملة)
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            تحميل ملف <code className="font-mono">posts.json</code> الجاهز ({posts.length} مقال) بترميز UTF-8 مطابق لمسار <code className="font-mono">data/posts.json</code>
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportDatabase}
          className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-[#035dcd] hover:text-white text-gray-700 dark:text-gray-200 text-xs font-bold transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>تنزيل ملف posts.json</span>
        </button>
      </div>
    </div>
  );
};
