import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Image as ImageIcon,
  Layers,
  Settings,
  LogOut,
  ExternalLink,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  AlertTriangle,
  Send,
  Save,
  Menu,
  X,
  Sparkles,
  Sun,
  Moon,
  Clock,
  TrendingUp,
  Folder,
  Tag,
  Globe,
  Share2,
} from 'lucide-react';
import { Post, CategoryInfo, AdminStats } from '../../types';
import {
  adminGetAllPosts,
  adminDeletePost,
  adminUpdatePost,
  adminGetStats,
  adminLogout,
  fetchCategories,
} from '../../services/postsService';
import {
  getGitHubConfig,
  getLastKnownSha,
  hasGitHubToken,
} from '../../services/githubCmsService';
import { PostEditor } from './PostEditor';
import { PostPreviewModal } from './PostPreviewModal';
import { MediaManager } from './MediaManager';
import { CategoryManager } from './CategoryManager';
import { AdminSettings } from './AdminSettings';
import { GitBranch, RefreshCw, Key } from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
  onViewWebsite: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

type AdminTab = 'overview' | 'posts' | 'new' | 'media' | 'categories' | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onViewWebsite,
  darkMode,
  onToggleDarkMode,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Editor & Preview State
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [previewingPost, setPreviewingPost] = useState<Post | null>(null);

  // Delete Confirmation Modal
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile sidebar open
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load posts, categories, stats from server
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [postsData, catsData, statsData] = await Promise.all([
        adminGetAllPosts().catch((err) => {
          console.warn('[Admin] Fallback for adminGetAllPosts:', err);
          return [];
        }),
        fetchCategories().catch(() => []),
        adminGetStats().catch(() => null),
      ]);
      if (postsData && postsData.length > 0) setPosts(postsData);
      if (catsData && catsData.length > 0) setCategories(catsData);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // Status filter
      if (statusFilter === 'published' && p.status === 'draft') return false;
      if (statusFilter === 'draft' && (p.status || 'published') === 'published') return false;

      // Category filter
      if (categoryFilter !== 'all') {
        const catLower = categoryFilter.toLowerCase();
        if (
          p.categorySlug.toLowerCase() !== catLower &&
          p.category.toLowerCase() !== catLower
        ) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchSlug = p.slug.toLowerCase().includes(q);
        const matchCategory = p.category.toLowerCase().includes(q);
        const matchSnippet = p.snippet.toLowerCase().includes(q);
        const matchTag = p.tags && p.tags.some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchSlug || matchCategory || matchSnippet || matchTag;
      }

      return true;
    });
  }, [posts, statusFilter, categoryFilter, searchQuery]);

  // Handle post save success (create or update)
  const handleSavePostSuccess = (savedPost: Post) => {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === savedPost.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = savedPost;
        return copy;
      }
      return [savedPost, ...prev];
    });
    setEditingPost(null);
    setActiveTab('posts');
    showToast(
      savedPost.status === 'published'
        ? 'تم عمل Commit ونشر المقال في data/posts.json على GitHub بنجاح!'
        : 'تم حفظ المسودة في المستودع بنجاح'
    );
    // Reload stats
    adminGetStats().then(setStats).catch(() => {});
  };

  // Handle delete post
  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    try {
      await adminDeletePost(postToDelete.id);
      setPosts((prev) => prev.filter((p) => p.id !== postToDelete.id));
      setPostToDelete(null);
      showToast('تم حذف المقال بنجاح');
      adminGetStats().then(setStats).catch(() => {});
    } catch (err: any) {
      alert(err.message || 'فشل حذف المقال');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle publish / unpublish
  const handleToggleStatus = async (post: Post) => {
    const newStatus = post.status === 'draft' ? 'published' : 'draft';
    try {
      const updated = await adminUpdatePost(post.id, {
        status: newStatus,
      });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
      showToast(newStatus === 'published' ? 'تم نشر المقال على الموقع' : 'تم تحويل المقال إلى مسودة');
      adminGetStats().then(setStats).catch(() => {});
    } catch (err: any) {
      alert(err.message || 'فشل تغيير حالة المقال');
    }
  };

  // Handle logout
  const handleLogoutClick = async () => {
    await adminLogout();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#f3f4f8] dark:bg-[#0f1226] text-gray-800 dark:text-gray-100 font-['Tajawal',sans-serif] flex flex-col" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 px-4 py-3 bg-[#035dcd] text-white text-xs font-bold rounded-2xl shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white text-center mb-2">
              تأكيد حذف المقال
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6 leading-relaxed">
              هل أنت متأكد تماماً من رغبتك في حذف مقال <span className="font-bold text-gray-900 dark:text-white">"{postToDelete.title}"</span>؟
              <br />
              سيتم حذف المقال من ملف <code className="font-mono">data/posts.json</code> في مستودع GitHub مباشرةً وعمل Commit جديد.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeletePost}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDeleting ? 'جاري الحذف...' : 'نعم، احذف المقال'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-[#181c3c] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#141b3d] p-1 border border-blue-500/20 shadow-xs flex items-center justify-center">
              <img
                src="/logo-spider.png"
                alt="العنكبوت للمعلومات"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-sm font-black text-gray-900 dark:text-white tracking-wide">
                العنكبوت للمعلومات
              </span>
              <span className="text-[10px] text-[#035dcd] font-bold block">
                لوحة إدارة المحتوى CMS
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync / Fetch from GitHub Button */}
          <button
            type="button"
            onClick={() => {
              loadData();
              showToast('جاري جلب أحدث نسخة من data/posts.json على GitHub...');
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            title="إعادة جلب المقالات من مستودع GitHub"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#035dcd] ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">مزامنة GitHub</span>
          </button>

          {/* View Website Button */}
          <button
            type="button"
            onClick={onViewWebsite}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            title="الانتقال إلى وضع معاينة الموقع العام"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>معاينة الموقع</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title={darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogoutClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-semibold transition cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed lg:static inset-y-0 right-0 z-50 lg:z-auto w-64 bg-white dark:bg-[#181c3c] border-l border-gray-200 dark:border-gray-800 p-4 flex flex-col justify-between shrink-0 shadow-xl lg:shadow-none transition-transform duration-300 rounded-3xl ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="space-y-6">
            <div className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-md">
              <span className="text-[10px] font-semibold text-blue-200 block uppercase">المسؤول الحالي</span>
              <span className="text-sm font-bold block">admin (رئيس التحرير)</span>
            </div>

            {/* Nav Menu */}
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setEditingPost(null);
                  setActiveTab('posts');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'posts' && !editingPost
                    ? 'bg-[#035dcd] text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  <span>المقالات والمسودات</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === 'posts' && !editingPost
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {posts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingPost(null);
                  setActiveTab('new');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'new' || editingPost
                    ? 'bg-[#035dcd] text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>{editingPost ? 'تعديل المقال' : 'إضافة مقال جديد'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingPost(null);
                  setActiveTab('overview');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#035dcd] text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>نظرة عامة وإحصائيات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingPost(null);
                  setActiveTab('media');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'media'
                    ? 'bg-[#035dcd] text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>مكتبة الصور والوسائط</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingPost(null);
                  setActiveTab('categories');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-[#035dcd] text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>الأقسام والتصنيفات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingPost(null);
                  setActiveTab('settings');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-[#035dcd] text-white shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  <span>إعدادات GitHub والحماية</span>
                </div>
                {!hasGitHubToken() && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="يرجى ضبط التوكن" />
                )}
              </button>
            </nav>
          </div>

          {/* Quick Info footer */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>المستودع:</span>
              <span className="text-gray-700 dark:text-gray-200 font-mono text-[10px]" dir="ltr">
                {getGitHubConfig().repo}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>الفرع / المسار:</span>
              <span className="text-[#035dcd] dark:text-blue-400 font-mono text-[10px]" dir="ltr">
                {getGitHubConfig().branch}:data/posts.json
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>حالة التوكن:</span>
              {hasGitHubToken() ? (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  مفعل وجاهز للنشر
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className="text-amber-500 hover:underline font-bold cursor-pointer"
                >
                  أدخل التوكن من الإعدادات
                </button>
              )}
            </div>
            {getLastKnownSha() && (
              <div className="flex items-center justify-between">
                <span>آخر SHA:</span>
                <span className="font-mono text-[10px] text-gray-500" dir="ltr">
                  {getLastKnownSha()?.substring(0, 10)}
                </span>
              </div>
            )}
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {/* Post Editor View */}
          {(activeTab === 'new' || editingPost) ? (
            <PostEditor
              initialPost={editingPost}
              onSaveSuccess={handleSavePostSuccess}
              availableCategories={categories}
              onCancel={() => {
                setEditingPost(null);
                setActiveTab('posts');
              }}
              onPreview={(p) => setPreviewingPost(p)}
            />
          ) : activeTab === 'overview' ? (
            /* Overview Tab */
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#181c3c] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
                    إجمالي المقالات
                  </span>
                  <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">
                    {stats?.totalPosts ?? posts.length}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#181c3c] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-emerald-600 font-medium block">
                    المقالات المنشورة
                  </span>
                  <span className="text-2xl font-black text-emerald-600 mt-1 block">
                    {stats?.publishedPosts ?? posts.filter((p) => (p.status || 'published') === 'published').length}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#181c3c] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-amber-600 font-medium block">
                    المسودات غير المنشورة
                  </span>
                  <span className="text-2xl font-black text-amber-600 mt-1 block">
                    {stats?.draftPosts ?? posts.filter((p) => p.status === 'draft').length}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#181c3c] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs">
                  <span className="text-xs text-[#035dcd] font-medium block">
                    الأقسام الرئيسية
                  </span>
                  <span className="text-2xl font-black text-[#035dcd] mt-1 block">
                    {categories.length}
                  </span>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-gradient-to-r from-[#141b3d] to-[#1c2759] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">
                    جاهز لإضافة مقال أو شرح تقني جديد؟
                  </h2>
                  <p className="text-xs text-blue-200/80 leading-relaxed max-w-lg">
                    يتم نشر المقال فورياً في الخادم، ويظهر في الصفحة الرئيسية وقسمه المخصص ويُدرج في خريطة الموقع sitemap.xml دون الحاجة لإعادة بناء الكود!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPost(null);
                    setActiveTab('new');
                  }}
                  className="px-6 py-3 rounded-2xl bg-[#035dcd] hover:bg-[#0249a3] text-white font-bold text-xs shadow-lg shadow-blue-500/30 transition flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>كتابة مقال جديد</span>
                </button>
              </div>

              {/* Recent Articles */}
              <div className="bg-white dark:bg-[#181c3c] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xs">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                  أحدث المقالات المحدثة
                </h3>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {posts.slice(0, 5).map((post) => (
                    <div key={post.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={post.thumbnail}
                          alt={post.title}
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo-spider.png';
                          }}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {post.title}
                          </h4>
                          <span className="text-[11px] text-gray-400">
                            {post.category} • {post.date}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingPost(post)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#035dcd] hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewingPost(post)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          title="معاينة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'media' ? (
            <MediaManager />
          ) : activeTab === 'categories' ? (
            <CategoryManager
              categories={categories}
              posts={posts}
              onRefreshData={loadData}
              onSelectCategoryFilter={(catSlug) => {
                setCategoryFilter(catSlug);
                setActiveTab('posts');
              }}
            />
          ) : activeTab === 'settings' ? (
            <AdminSettings posts={posts} onRefreshData={loadData} />
          ) : (
            /* Posts Tab (Default List View) */
            <div className="space-y-6">
              {/* Token Alert Banner if no GitHub Token is set yet */}
              {!hasGitHubToken() && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        مفتاح GitHub Personal Access Token غير مضبوط بعد للنشر المباشر
                      </h3>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5">
                        تم جلب المقالات الحالية بنجاح من مستودع <code className="font-mono">SpiderNet20/information-net</code>. لتفعيل النشر والتعديل والحذف المباشر (Commit)، أدخل التوكن في الإعدادات.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shrink-0 self-start sm:self-center cursor-pointer"
                  >
                    إدخال التوكن الآن
                  </button>
                </div>
              )}
              {/* Header with Search & Filter Controls */}
              <div className="bg-white dark:bg-[#181c3c] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                      إدارة مقالات الموقع ({filteredPosts.length})
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      تعديل، نشر، حفظ مسودات، أو حذف المقالات من قاعدة البيانات
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingPost(null);
                      setActiveTab('new');
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#035dcd] hover:bg-[#0249a3] text-white text-xs font-bold shadow-md shadow-blue-600/20 transition self-start sm:self-auto cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>إضافة مقال جديد</span>
                  </button>
                </div>

                {/* Search & Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث بالعنوان، الرابط، أو الوسم..."
                      className="w-full px-3 py-2 pr-9 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 right-3" />
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        statusFilter === 'all'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                          : 'text-gray-500'
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('published')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        statusFilter === 'published'
                          ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-xs'
                          : 'text-gray-500'
                      }`}
                    >
                      منشورة
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('draft')}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        statusFilter === 'draft'
                          ? 'bg-white dark:bg-gray-700 text-amber-600 shadow-xs'
                          : 'text-gray-500'
                      }`}
                    >
                      مسودات
                    </button>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                    >
                      <option value="all">جميع الأقسام</option>
                      {categories.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.name} ({c.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Articles Table / Cards */}
              {isLoading ? (
                <div className="p-12 text-center text-xs text-gray-400">
                  <div className="w-6 h-6 border-2 border-[#035dcd] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>جاري تحميل المقالات من قاعدة البيانات...</span>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="bg-white dark:bg-[#181c3c] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
                  <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    لم يتم العثور على مقالات مطابقة
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    جرّب تغيير كلمات البحث أو الفلاتر أعلاه.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPosts.map((post) => {
                    const isDraft = post.status === 'draft';
                    return (
                      <div
                        key={post.id}
                        className="bg-white dark:bg-[#181c3c] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs hover:border-[#035dcd]/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        {/* Article Info */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          <img
                            src={post.thumbnail}
                            alt={post.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/logo-spider.png';
                            }}
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isDraft
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                }`}
                              >
                                {isDraft ? 'مسودة' : 'منشور'}
                              </span>

                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-[#035dcd] dark:text-blue-300">
                                {post.category}
                              </span>

                              {post.noindex && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-mono">
                                  noindex
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                              {post.title}
                            </h3>

                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" dir="ltr">
                              /{post.categorySlug}/{post.slug}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {post.date}
                              </span>
                              <span>•</span>
                              <span>الكاتب: {post.author?.name || 'العنكبوت'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-800 w-full md:w-auto justify-end">
                          {/* Toggle Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(post)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                              isDraft
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                            }`}
                            title={isDraft ? 'نشر المقال' : 'تحويل إلى مسودة'}
                          >
                            {isDraft ? 'نشر' : 'إلغاء النشر'}
                          </button>

                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewingPost(post)}
                            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#035dcd] transition cursor-pointer"
                            title="معاينة كاملة للمقال"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => setEditingPost(post)}
                            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-[#035dcd] transition cursor-pointer"
                            title="تعديل المقال"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setPostToDelete(post)}
                            className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 transition cursor-pointer"
                            title="حذف المقال نهائياً"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Post Preview Modal */}
      {previewingPost && (
        <PostPreviewModal
          post={previewingPost}
          allPosts={posts}
          categories={categories}
          onClose={() => setPreviewingPost(null)}
          onPublishNow={
            previewingPost.status === 'draft'
              ? () => handleToggleStatus(previewingPost)
              : undefined
          }
        />
      )}
    </div>
  );
};
