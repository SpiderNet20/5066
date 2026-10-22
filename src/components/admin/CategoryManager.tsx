import React, { useState } from 'react';
import {
  Layers,
  Folder,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Tag,
  Sparkles,
} from 'lucide-react';
import { CategoryInfo, Post } from '../../types';
import {
  adminSaveCategory,
  adminDeleteCategory,
  adminAuditAndFixTaxonomy,
} from '../../services/postsService';

interface CategoryManagerProps {
  categories: CategoryInfo[];
  posts: Post[];
  onSelectCategoryFilter: (categorySlug: string) => void;
  onRefreshData?: () => void;
}

const AVAILABLE_COLORS = [
  { label: 'أزرق سماوي', value: 'cat-badge-0' },
  { label: 'بنفسجي داكن', value: 'cat-badge-1' },
  { label: 'أزرق عصري', value: 'cat-badge-2' },
  { label: 'أخضر زمردي', value: 'cat-badge-3' },
  { label: 'برتقالي مرجاني', value: 'cat-badge-4' },
  { label: 'تركواز لامع', value: 'cat-badge-5' },
  { label: 'وردي أرجواني', value: 'cat-badge-6' },
  { label: 'ذهبي عنبري', value: 'cat-badge-7' },
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  posts,
  onSelectCategoryFilter,
  onRefreshData,
}) => {
  const [editingCategory, setEditingCategory] = useState<CategoryInfo | null>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('cat-badge-2');
  const [formImage, setFormImage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Audit state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    fixedCount: number;
    totalPosts: number;
    details: string[];
    message: string;
  } | null>(null);

  const openEditModal = (cat: CategoryInfo) => {
    setIsNewCategory(false);
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDesc(cat.description || '');
    setFormColor(cat.colorClass || 'cat-badge-2');
    setFormImage(cat.image || '');
    setFeedbackMsg(null);
  };

  const openNewModal = () => {
    setIsNewCategory(true);
    setEditingCategory({
      name: '',
      slug: '',
      description: '',
      colorClass: 'cat-badge-2',
      image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
      count: 0,
    });
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormColor('cat-badge-2');
    setFormImage('https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800');
    setFeedbackMsg(null);
  };

  const closeModal = () => {
    setEditingCategory(null);
    setIsNewCategory(false);
    setFeedbackMsg(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim()) {
      setFeedbackMsg({ type: 'error', text: 'يرجى إدخال اسم القسم والمعرف اللاتيني (Slug)' });
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      await adminSaveCategory({
        name: formName.trim(),
        slug: formSlug.trim(),
        description: formDesc.trim(),
        colorClass: formColor,
        image: formImage.trim(),
      });
      setFeedbackMsg({ type: 'success', text: 'تم حفظ وتحديث بيانات القسم بنجاح' });
      if (onRefreshData) onRefreshData();
      setTimeout(() => {
        closeModal();
      }, 900);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'فشل حفظ بيانات القسم' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (slug: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف القسم (${slug})؟`)) {
      return;
    }
    try {
      await adminDeleteCategory(slug);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'فشل حذف القسم');
    }
  };

  const handleAuditAndFix = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const res = await adminAuditAndFixTaxonomy();
      setAuditResult(res);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تدقيق التصنيفات');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6 font-['Tajawal',sans-serif]" dir="rtl">
      {/* Top Banner & Audit Actions */}
      <div className="bg-gradient-to-r from-blue-900/40 via-[#1f244a] to-blue-900/30 border border-blue-500/30 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">نظام التصنيفات والتسميات المعتمدة</span>
          </div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#035dcd]" />
            <span>إدارة الأقسام وتصحيح التسميات (information-net)</span>
          </h2>
          <p className="text-xs text-blue-200/80 leading-relaxed max-w-2xl">
            هنا يتم ضبط ومزامنة كافة الأقسام الرئيسية والفرعية لموقع العنكبوت للمعلومات، مع أداة فحص ذكية لتدقيق وتوحيد تصنيفات جميع المقالات وفق المعايير الرسمية المحدثة للموقع.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAuditAndFix}
            disabled={isAuditing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            title="فحص وتصحيح تلقائي لتسميات وتصنيفات جميع المقالات"
          >
            <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'جاري الفحص والتصحيح...' : 'تدقيق وتصحيح تسميات المقالات'}</span>
          </button>

          <button
            type="button"
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#035dcd] hover:bg-blue-600 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة قسم جديد</span>
          </button>
        </div>
      </div>

      {/* Audit Result Alert */}
      {auditResult && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{auditResult.message}</span>
          </div>
          {auditResult.details && auditResult.details.length > 0 && (
            <div className="text-xs text-emerald-700 dark:text-emerald-300/90 font-mono bg-white/60 dark:bg-black/30 p-3 rounded-xl max-h-40 overflow-y-auto space-y-1" dir="ltr">
              {auditResult.details.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => {
          const categoryPosts = posts.filter(
            (p) =>
              p.categorySlug.toLowerCase() === cat.slug.toLowerCase() ||
              p.category.toLowerCase() === cat.name.toLowerCase()
          );
          const publishedCount = categoryPosts.filter((p) => (p.status || 'published') === 'published').length;
          const draftCount = categoryPosts.filter((p) => p.status === 'draft').length;

          return (
            <div
              key={cat.slug}
              className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:border-[#035dcd] transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${cat.colorClass || 'bg-blue-600 text-white'}`}>
                    {cat.slug}
                  </span>
                  <div className="flex items-center gap-1.5 opacity-90">
                    <button
                      type="button"
                      onClick={() => openEditModal(cat)}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-500 transition cursor-pointer"
                      title="تعديل بيانات القسم"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Disallow deleting core categories */}
                    {!['AI', 'Games', 'Software', 'Business', 'Education', 'Downloads', 'Blog'].includes(cat.slug) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.slug)}
                        className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition cursor-pointer"
                        title="حذف هذا القسم"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-[#035dcd]" />
                  <span>{cat.name}</span>
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                  {cat.description || 'تغطية تقنية شاملة وشروحات متخصصة في هذا القسم وفق تصنيفات information-net.'}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800/80">
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-gray-500 dark:text-gray-400">إجمالي المقالات:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{categoryPosts.length}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-3">
                  <span>منشور: <strong className="text-emerald-600">{publishedCount}</strong></span>
                  <span>مسودات: <strong className="text-amber-600">{draftCount}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCategoryFilter(cat.slug)}
                    className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-[#035dcd] hover:text-white text-gray-700 dark:text-gray-200 transition text-center cursor-pointer"
                  >
                    عرض مقالات القسم
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="py-2 px-3 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-[#035dcd] dark:text-blue-300 transition cursor-pointer"
                  >
                    تعديل
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1f3d] border border-gray-200 dark:border-gray-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-right">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#035dcd]" />
                <span>{isNewCategory ? 'إضافة قسم جديد للموقع' : `تعديل بيانات القسم (${editingCategory.slug})`}</span>
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedbackMsg && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedbackMsg.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-300'
                }`}
              >
                {feedbackMsg.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  اسم القسم بالعربية <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: الذكاء الاصطناعي، الألعاب..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#035dcd]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  المعرف اللاتيني في الرابط (Slug) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="مثال: AI, Games, Software..."
                  required
                  dir="ltr"
                  disabled={!isNewCategory}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#035dcd] disabled:opacity-60 disabled:cursor-not-allowed font-mono"
                />
                {!isNewCategory && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    المعرف اللاتيني (Slug) ثابت للحفاظ على بنية الروابط وعناوين URL القديمة في محركات البحث.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  وصف القسم
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="وصف تعريفي بمحتوى القسم يظهر في بطاقات الأقسام ومحركات البحث..."
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-[#035dcd] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  لون الشارة التمييزية (Badge Color)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormColor(c.value)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold text-white transition cursor-pointer border-2 ${c.value} ${
                        formColor === c.value ? 'border-white ring-2 ring-blue-500' : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  رابط صورة غلاف القسم (Image URL)
                </label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-[#035dcd]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-[#035dcd] hover:bg-blue-600 text-white transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
