import React, { useState, useRef } from 'react';
import {
  Save,
  Eye,
  Send,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  AlertTriangle,
  Info,
  CheckCircle,
  Minus,
  Sparkles,
  HelpCircle,
  Calendar,
  Globe,
  Tag,
  FileText,
  Clock,
  X,
  ExternalLink,
} from 'lucide-react';
import { Post, CategorySlugType, CategoryInfo } from '../../types';
import { adminCreatePost, adminUpdatePost, adminUploadImage } from '../../services/postsService';

interface PostEditorProps {
  initialPost?: Post | null;
  onSaveSuccess: (savedPost: Post) => void;
  onCancel: () => void;
  onPreview: (post: Post) => void;
  availableCategories?: CategoryInfo[];
}

const DEFAULT_CATEGORIES: { label: string; slug: CategorySlugType; index: number }[] = [
  { label: 'الذكاء الاصطناعي', slug: 'AI', index: 0 },
  { label: 'الألعاب', slug: 'Games', index: 1 },
  { label: 'البرامج', slug: 'Software', index: 2 },
  { label: 'الربح من الإنترنت', slug: 'Business', index: 3 },
  { label: 'مقالات تعليمية', slug: 'Education', index: 4 },
  { label: 'التحميلات', slug: 'Downloads', index: 5 },
  { label: 'المدونة', slug: 'Blog', index: 6 },
];

export const PostEditor: React.FC<PostEditorProps> = ({
  initialPost,
  onSaveSuccess,
  onCancel,
  onPreview,
  availableCategories,
}) => {
  const isEditing = !!initialPost?.id;

  const categoryOptions = React.useMemo(() => {
    if (availableCategories && availableCategories.length > 0) {
      return availableCategories.map((c, i) => ({
        label: c.name,
        slug: c.slug as CategorySlugType,
        index: i,
      }));
    }
    return DEFAULT_CATEGORIES;
  }, [availableCategories]);

  // Form Fields
  const [title, setTitle] = useState(initialPost?.title || '');
  const [slug, setSlug] = useState(initialPost?.slug || '');
  const [autoSlug, setAutoSlug] = useState(!initialPost?.slug);
  const [categorySlug, setCategorySlug] = useState<CategorySlugType>(
    initialPost?.categorySlug || 'Blog'
  );
  const [categoryName, setCategoryName] = useState(
    initialPost?.category || 'المدونة والشروحات'
  );
  const [snippet, setSnippet] = useState(initialPost?.snippet || '');
  const [contentHtml, setContentHtml] = useState(
    initialPost?.rawContent ||
      (initialPost?.content?.sections
        ? initialPost.content.sections
            .map(
              (s) =>
                `<h2>${s.title}</h2>\n` +
                s.body.map((b) => `<p>${b}</p>`).join('\n') +
                (s.note ? `\n<div class="note-${s.note.type}"><p>${s.note.text}</p></div>` : '')
            )
            .join('\n\n')
        : '')
  );
  const [thumbnail, setThumbnail] = useState(
    initialPost?.thumbnail ||
      'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiBt6t1Nd4_DNrsmBIezXuzZDslivOpWBXRUPQFBxsKwjvac7GzVpjhXTq0HyEuUgo2UAQDqNlwrkqJgjqLdnnehO2XBxLRk1ENTQN-ZitgvdzTxg48XYZKRigrA74BXiuZYTnbn9YvCfhsuYl9gky2JsQ-cB8QkQLQm9KLWLDYAntZ7lPtIDc33qt6Uvt6/s1600/b126305a-24d3-4ab4-ab82-d81f3ed7feb7.png'
  );
  const [imageAlt, setImageAlt] = useState(initialPost?.imageAlt || initialPost?.title || '');
  const [tags, setTags] = useState<string[]>(initialPost?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<'published' | 'draft'>(
    initialPost?.status || 'published'
  );

  // Advanced SEO Fields
  const [seoTitle, setSeoTitle] = useState(initialPost?.seoTitle || initialPost?.title || '');
  const [seoDescription, setSeoDescription] = useState(
    initialPost?.seoDescription || initialPost?.snippet || ''
  );
  const [noindex, setNoindex] = useState<boolean>(!!initialPost?.noindex);

  // Author & Date
  const [authorName, setAuthorName] = useState(initialPost?.author?.name || 'العنكبوت للمعلومات');
  const [authorRole, setAuthorRole] = useState(initialPost?.author?.role || 'فريق التحرير');
  const [authorAvatar, setAuthorAvatar] = useState(initialPost?.author?.avatar || '/logo-spider.png');
  const [isoDate, setIsoDate] = useState(
    initialPost?.isoDate
      ? initialPost.isoDate.substring(0, 16)
      : new Date().toISOString().substring(0, 16)
  );

  // Editor modes: 'visual' or 'html'
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-generate slug from title
  const generateSlugFromTitle = (t: string) => {
    return t
      .toLowerCase()
      .trim()
      .replace(/[^\w\u0621-\u064A\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (autoSlug) {
      setSlug(generateSlugFromTitle(val));
    }
    if (!seoTitle || seoTitle === title) {
      setSeoTitle(val);
    }
  };

  const handleCategoryChange = (slugVal: CategorySlugType) => {
    setCategorySlug(slugVal);
    const found = categoryOptions.find((c) => c.slug === slugVal);
    if (found) {
      setCategoryName(found.label);
    }
  };

  // Add / Remove Tags
  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Image upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP, GIF, SVG)');
      return;
    }

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await adminUploadImage(base64Data, file.name, file.type);
        setThumbnail(res.url);
        if (!imageAlt) {
          setImageAlt(title || file.name);
        }
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message || 'فشل رفع الصورة');
      setIsUploadingImage(false);
    }
  };

  // Insert Rich Formatting into Content Textarea
  const insertFormatting = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = contentHtml.substring(start, end) || defaultText;
    const replacement = before + selected + after;

    const updated = contentHtml.substring(0, start) + replacement + contentHtml.substring(end);
    setContentHtml(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  // Construct current post object for saving or previewing
  const buildCurrentPostObject = (targetStatus: 'published' | 'draft'): Post => {
    const cleanSlug = (slug || generateSlugFromTitle(title)).trim();
    const matchedCategory = categoryOptions.find((c) => c.slug === categorySlug);
    const categoryIndex = matchedCategory ? matchedCategory.index : 0;
    const fullIsoDate = isoDate.includes('T') ? new Date(isoDate).toISOString() : new Date().toISOString();

    return {
      id: initialPost?.id || `post-${Date.now()}`,
      title: title.trim(),
      slug: cleanSlug,
      category: categoryName,
      categorySlug: categorySlug,
      categoryIndex: categoryIndex,
      canonicalUrl: `https://www.information-net.com/${categorySlug}/${cleanSlug}`,
      date: initialPost?.date || new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }),
      isoDate: fullIsoDate,
      readTime: initialPost?.readTime || `${Math.max(1, Math.ceil(contentHtml.split(/\s+/).length / 180))} دقائق`,
      author: {
        name: authorName,
        avatar: authorAvatar,
        role: authorRole,
        bio: initialPost?.author?.bio || 'فريق تحرير موقع العنكبوت للمعلومات المتخصص في الشروحات والحلول التقنية والذكاء الاصطناعي.',
      },
      thumbnail: thumbnail.trim(),
      imageAlt: imageAlt.trim() || title.trim(),
      snippet: snippet.trim(),
      content: {
        intro: snippet.trim(),
        sections: initialPost?.content?.sections || [],
      },
      rawContent: contentHtml,
      tags: tags,
      commentsCount: initialPost?.commentsCount || 0,
      comments: initialPost?.comments || [],
      status: targetStatus,
      seoTitle: (seoTitle || title).trim(),
      seoDescription: (seoDescription || snippet).trim(),
      noindex: noindex,
      updatedAt: new Date().toISOString(),
    };
  };

  const handleSave = async (targetStatus: 'published' | 'draft') => {
    if (!title.trim()) {
      setErrorMessage('عنوان المقال مطلوب');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!snippet.trim() && !contentHtml.trim()) {
      setErrorMessage('ملخص المقال أو محتواه مطلوب');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const postData = buildCurrentPostObject(targetStatus);
      let saved: Post;
      if (isEditing && initialPost?.id) {
        saved = await adminUpdatePost(initialPost.id, postData);
      } else {
        saved = await adminCreatePost(postData);
      }
      onSaveSuccess(saved);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ المقال');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerPreview = () => {
    const postPreview = buildCurrentPostObject(status);
    onPreview(postPreview);
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 font-['Tajawal',sans-serif]" dir="rtl">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-30 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="إلغاء والعودة"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {isEditing ? 'تعديل المقال' : 'إضافة مقال جديد'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isEditing ? `المعرف: ${initialPost?.id}` : 'نشر وتحديث المحتوى المباشر على الموقع'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status selector */}
          <div className="flex items-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setStatus('published')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                status === 'published'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              منشور
            </button>
            <button
              type="button"
              onClick={() => setStatus('draft')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                status === 'draft'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              مسودة
            </button>
          </div>

          {/* Preview Button */}
          <button
            type="button"
            onClick={handleTriggerPreview}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#035dcd]" />
            <span>معاينة المقال</span>
          </button>

          {/* Save Draft */}
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ كمسودة</span>
          </button>

          {/* Publish / Update Button */}
          <button
            type="button"
            onClick={() => handleSave(status)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#035dcd] hover:bg-[#0249a3] rounded-xl shadow-md shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isEditing ? 'تحديث المقال' : 'نشر المقال الآن'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Title & Slug Card */}
          <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                عنوان المقال <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="أدخل عنوان المقال الجذاب..."
                className="w-full px-4 py-3 text-lg font-semibold rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#035dcd]/30 focus:border-[#035dcd]"
              />
            </div>

            {/* Permanent Slug Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#035dcd]" />
                  <span>الرابط الدائم (Slug)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAutoSlug(false);
                    setSlug(generateSlugFromTitle(title));
                  }}
                  className="text-xs text-[#035dcd] hover:underline"
                >
                  إعادة توليد من العنوان
                </button>
              </div>
              <div className="flex items-center rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 overflow-hidden" dir="ltr">
                <span className="px-3 py-2 text-xs text-gray-400 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 select-none">
                  /{categorySlug}/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setSlug(e.target.value);
                  }}
                  placeholder="post-slug"
                  className="flex-1 px-3 py-2.5 text-xs text-gray-800 dark:text-gray-200 bg-transparent focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                الرابط الذي سيظهر للمستخدمين ومحركات البحث.
              </p>
            </div>
          </div>

          {/* 2. Snippet / Summary */}
          <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-900 dark:text-white">
                ملخص المقال (Snippet / Intro)
              </label>
              <span className="text-xs text-gray-400">
                {snippet.length} حرف
              </span>
            </div>
            <textarea
              rows={3}
              value={snippet}
              onChange={(e) => {
                setSnippet(e.target.value);
                if (!seoDescription || seoDescription === snippet) {
                  setSeoDescription(e.target.value);
                }
              }}
              placeholder="ملخص قصير وموجز يظهر في بطاقات المقالات وقوائم البحث..."
              className="w-full px-4 py-3 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#035dcd]/30 focus:border-[#035dcd]"
            />
          </div>

          {/* 3. Rich Content Editor */}
          <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  محتوى المقال الكامل
                </h3>
                <p className="text-xs text-gray-400">
                  يدعم التنسيق البصري وعناوين H2/H3 وكود HTML مباشر
                </p>
              </div>

              {/* Mode switch */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEditorMode('visual')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    editorMode === 'visual'
                      ? 'bg-white dark:bg-gray-700 text-[#035dcd] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                  }`}
                >
                  محرر مرئي منسق
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('html')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    editorMode === 'html'
                      ? 'bg-white dark:bg-gray-700 text-[#035dcd] shadow-xs'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                  }`}
                >
                  كود HTML مباشر
                </button>
              </div>
            </div>

            {/* Visual Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => insertFormatting('<strong>', '</strong>', 'نص عريض')}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="نص عريض (Bold)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('<em>', '</em>', 'نص مائل')}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="نص مائل (Italic)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

              <button
                type="button"
                onClick={() => insertFormatting('\n<h2>', '</h2>\n', 'عنوان رئيسي')}
                className="px-2 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300"
                title="عنوان رئيسي H2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n<h3>', '</h3>\n', 'عنوان فرعي')}
                className="px-2 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300"
                title="عنوان فرعي H3"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n<p>', '</p>\n', 'فقرة نصية جديدة')}
                className="px-2 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300"
                title="فقرة نصية"
              >
                P
              </button>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

              <button
                type="button"
                onClick={() =>
                  insertFormatting(
                    '\n<ul>\n  <li>',
                    '</li>\n  <li>عنصر ثانٍ</li>\n</ul>\n',
                    'عنصر أول'
                  )
                }
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="قائمة نقطية"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  insertFormatting(
                    '\n<ol>\n  <li>',
                    '</li>\n  <li>خطوة ثانية</li>\n</ol>\n',
                    'خطوة أولى'
                  )
                }
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="قائمة رقمية"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  insertFormatting('\n<blockquote>', '</blockquote>\n', 'اقتباس أو معلومة هامة')
                }
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="اقتباس"
              >
                <Quote className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

              {/* Special Note Boxes */}
              <button
                type="button"
                onClick={() =>
                  insertFormatting(
                    '\n<div class="p-4 my-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border-r-4 border-[#035dcd] text-blue-900 dark:text-blue-200 text-sm font-medium">\n  <p>💡 ',
                    '</p>\n</div>\n',
                    'ملاحظة هامة للقراء'
                  )
                }
                className="px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 text-[11px] font-semibold text-[#035dcd]"
                title="ملاحظة زرقاء"
              >
                ملاحظة
              </button>
              <button
                type="button"
                onClick={() =>
                  insertFormatting(
                    '\n<div class="p-4 my-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-r-4 border-amber-500 text-amber-900 dark:text-amber-200 text-sm font-medium">\n  <p>⚠️ ',
                    '</p>\n</div>\n',
                    'تنبيه وتحذير تقني'
                  )
                }
                className="px-2 py-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900 text-[11px] font-semibold text-amber-600"
                title="تنبيه أصفر"
              >
                تنبيه
              </button>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

              <button
                type="button"
                onClick={() => {
                  const url = prompt('أدخل رابط URL:', 'https://');
                  if (url) {
                    insertFormatting(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#035dcd] underline">`, '</a>', 'نص الرابط');
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="إدراج رابط"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const imgUrl = prompt('أدخل رابط الصورة المباشر:', 'https://');
                  if (imgUrl) {
                    insertFormatting(
                      `\n<figure class="my-6 text-center">\n  <img src="${imgUrl}" alt="${title}" class="rounded-2xl max-w-full mx-auto shadow-md" />\n  <figcaption class="text-xs text-gray-400 mt-2">`,
                      '</figcaption>\n</figure>\n',
                      'وصف توضيحي للصورة'
                    );
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="إدراج صورة داخل المقال"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  insertFormatting('\n<pre class="bg-gray-900 text-gray-100 p-4 rounded-xl text-left font-mono text-xs overflow-x-auto" dir="ltr"><code>', '</code></pre>\n', '// code snippet')
                }
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="كتلة برمجية (Code block)"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n<hr class="my-6 border-gray-200 dark:border-gray-700" />\n')}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                title="فاصل أفقي"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Textarea */}
            <div>
              <textarea
                ref={contentTextareaRef}
                rows={16}
                value={contentHtml}
                onChange={(e) => setContentHtml(e.target.value)}
                placeholder="اكتب محتوى المقال هنا... استخدم الأزرار أعلاه لتنسيق العناوين والاقتباسات والفقرات."
                className="w-full px-4 py-3 text-sm font-sans rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#035dcd]/30 focus:border-[#035dcd] leading-relaxed font-mono"
              />
            </div>
          </div>
        </div>

        {/* Sidebar Column (1 col) - Metadata, Media & SEO */}
        <div className="space-y-6">
          {/* 1. Category & Tags */}
          <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#035dcd]" />
              <span>التصنيف والوسوم</span>
            </h3>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                التصنيف الرئيسي
              </label>
              <select
                value={categorySlug}
                onChange={(e) => handleCategoryChange(e.target.value as CategorySlugType)}
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.label} ({cat.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                الوسوم (Tags)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="أضف وسماً واضغط Enter..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 text-xs font-semibold bg-[#035dcd] text-white rounded-xl hover:bg-[#0249a3] transition cursor-pointer"
                >
                  إضافة
                </button>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[11px] font-medium text-blue-700 dark:text-blue-300"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <p className="text-[11px] text-gray-400">لا توجد وسوم مضافة بعد.</p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Featured Image & Alt */}
          <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#035dcd]" />
              <span>الصورة البارزة (Thumbnail)</span>
            </h3>

            {/* Thumbnail Preview */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={imageAlt || title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/logo-spider.png';
                  }}
                />
              ) : (
                <ImageIcon className="w-10 h-10 text-gray-400" />
              )}
              {isUploadingImage && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs gap-2 backdrop-blur-xs">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري رفع الصورة...</span>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#035dcd]" />
                <span>رفع صورة من الجهاز</span>
              </button>
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                رابط الصورة المباشر
              </label>
              <input
                type="text"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
                dir="ltr"
              />
            </div>

            {/* Alt Text */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                النص البديل للصورة (Alt Text)
              </label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="وصف دقيق للصورة لمحركات البحث..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                هام جداً لـ Google Images وسيو المقال.
              </p>
            </div>
          </div>

          {/* 3. Advanced SEO Card */}
          <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>إعدادات سيو المقال (SEO)</span>
            </h3>

            {/* Custom SEO Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  عنوان SEO مخصص (Meta Title)
                </label>
                <span className="text-[11px] text-gray-400">{seoTitle.length}/60</span>
              </div>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder={title || 'العنوان الذي يظهر في جوجل...'}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
              />
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  وصف الميتا (Meta Description)
                </label>
                <span className="text-[11px] text-gray-400">{seoDescription.length}/160</span>
              </div>
              <textarea
                rows={3}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder={snippet || 'الوصف المختصر في نتائج البحث...'}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
              />
            </div>

            {/* Google Search Result Preview */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400">
                معاينة نتيجة جوجل:
              </span>
              <div className="text-[11px] text-gray-500 truncate" dir="ltr">
                https://www.information-net.com/{categorySlug}/{slug || 'post-slug'}
              </div>
              <div className="text-sm font-semibold text-blue-700 dark:text-blue-400 truncate">
                {seoTitle || title || 'عنوان المقال في العنكبوت للمعلومات'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {seoDescription || snippet || 'الوصف التعريفي للمقال يظهر هنا في نتائج بحث جوجل.'}
              </div>
            </div>

            {/* Indexing Status Switch */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-900 dark:text-white block">
                    حالة الفهرسة (Robots)
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    {noindex ? 'منع محركات البحث (noindex)' : 'السماح بالفهرسة (index, follow)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNoindex(!noindex)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition cursor-pointer ${
                    noindex ? 'bg-red-500 justify-end' : 'bg-emerald-500 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Publication Date & Author */}
          <div className="bg-white dark:bg-[#1f244a] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#035dcd]" />
              <span>تاريخ النشر والكاتب</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                تاريخ وتوقيت النشر
              </label>
              <input
                type="datetime-local"
                value={isoDate}
                onChange={(e) => setIsoDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                اسم الكاتب
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                المسمى الوظيفي للكاتب
              </label>
              <input
                type="text"
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-[#035dcd]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
