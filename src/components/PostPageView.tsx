import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Settings,
  Share2,
  Copy,
  Printer,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ThumbsUp,
  Send,
  Download,
  AlertCircle,
  CheckCircle,
  Info,
  Tag,
  ArrowRight,
  FileCode,
  Sparkles,
  ExternalLink,
  Maximize2,
  Bookmark,
} from 'lucide-react';
import { Post, Comment, CategoryInfo } from '../types';
import { Sidebar } from './Sidebar';
import { AdSenseUnit } from './AdSenseUnit';
import { ReadingProgressBar } from './ReadingProgressBar';
import { useFavorites } from '../hooks/useFavorites';

export interface TocHeading {
  id: string;
  text: string;
  level: 'h2' | 'h3';
}

interface PostPageViewProps {
  post: Post;
  allPosts: Post[];
  categories: CategoryInfo[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  onSelectPost: (post: Post) => void;
  onBackToHome: () => void;
  onOpenSeoViewer: () => void;
  onOpenImage: (url: string, title?: string) => void;
  onOpenSpeedTest: () => void;
  onOpenRedirectTool: () => void;
  onSearchQuery: (q: string) => void;
}

export const PostPageView: React.FC<PostPageViewProps> = ({
  post,
  allPosts,
  categories,
  activeCategory,
  onSelectCategory,
  onSelectPost,
  onBackToHome,
  onOpenSeoViewer,
  onOpenImage,
  onOpenSpeedTest,
  onOpenRedirectTool,
  onSearchQuery,
}) => {
  const [fontSize, setFontSize] = useState(17);
  const [lineHeight, setLineHeight] = useState(2);
  const [showSettings, setShowSettings] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [activeCommentTab, setActiveCommentTab] = useState<'blogger' | 'facebook' | 'disqus'>('blogger');
  const [copiedLink, setCopiedLink] = useState(false);
  const [articlePage, setArticlePage] = useState(1);
  const { isFavorite, toggleFavorite } = useFavorites();
  const isPostSaved = isFavorite(post.id);

  // Comments state
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [newAuthor, setNewAuthor] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  // Scroll to top on post change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setComments(post.comments || []);
    setArticlePage(1);
  }, [post.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newCmt: Comment = {
      id: `comment-${Date.now()}`,
      author: newAuthor.trim() || 'زائر كريم',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      date: 'الآن',
      content: newCommentText.trim(),
    };

    setComments((prev) => [newCmt, ...prev]);
    setNewCommentText('');
    setNewAuthor('');
  };

  // Find previous and next posts
  const currentIndex = allPosts.findIndex((p) => p.id === post.id);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  // Related posts
  const relatedPosts = allPosts
    .filter((p) => p.id !== post.id && (p.category === post.category || p.categoryIndex === post.categoryIndex))
    .slice(0, 3);

  // Pagination support
  const totalArticlePages = post.content?.sections && post.content.sections.length > 1 ? 2 : 1;
  const currentSections =
    totalArticlePages === 1
      ? post.content?.sections || []
      : articlePage === 1
      ? post.content.sections.slice(0, Math.ceil(post.content.sections.length / 2))
      : post.content.sections.slice(Math.ceil(post.content.sections.length / 2));

  // Ensure the featured image is displayed only once in the article.
  // The featured image is already displayed prominently at the top in the dedicated lightbox card.
  // Any duplicate cover/first image embedded inside the article body (rawContent) is cleanly stripped.
  const sanitizedRawContent = useMemo(() => {
    if (!post.rawContent) return '';

    // 1. Client-side browser DOMParser for 100% clean DOM removal
    if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(post.rawContent, 'text/html');
        const firstImg = doc.querySelector('img');

        if (firstImg) {
          // Identify the closest container for this image
          const table = firstImg.closest('table.tr-caption-container');
          const separator = firstImg.closest('.separator');
          const figure = firstImg.closest('figure');
          const link = firstImg.closest('a');

          if (table) {
            table.remove();
          } else if (separator) {
            separator.remove();
          } else if (figure) {
            figure.remove();
          } else if (link) {
            const parent = link.parentElement;
            if (parent && parent.children.length === 1 && (parent.tagName === 'P' || parent.tagName === 'DIV')) {
              parent.remove();
            } else {
              link.remove();
            }
          } else {
            firstImg.remove();
          }

          return doc.body.innerHTML;
        }
      } catch (err) {
        console.warn('DOMParser failed to clean duplicate image, falling back to string parser:', err);
      }
    }

    // 2. High-precision fallback
    const html = post.rawContent;
    const imgIndex = html.indexOf('<img');
    if (imgIndex === -1) return html;

    const before = html.substring(0, imgIndex);
    const after = html.substring(imgIndex);

    const figureIdx = before.lastIndexOf('<figure');
    const tableIdx = before.lastIndexOf('<table');
    const divSeparatorIdx =
      before.lastIndexOf('<div class="separator"') !== -1
        ? before.lastIndexOf('<div class="separator"')
        : before.lastIndexOf("<div class='separator'");
    const aIdx = before.lastIndexOf('<a');

    if (figureIdx !== -1 && figureIdx > before.lastIndexOf('</figure>')) {
      const endFigure = after.indexOf('</figure>');
      if (endFigure !== -1) {
        return html.substring(0, figureIdx) + after.substring(endFigure + 9);
      }
    }

    if (divSeparatorIdx !== -1 && divSeparatorIdx > before.lastIndexOf('</div>')) {
      const endDiv = after.indexOf('</div>');
      if (endDiv !== -1) {
        return html.substring(0, divSeparatorIdx) + after.substring(endDiv + 6);
      }
    }

    if (tableIdx !== -1 && tableIdx > before.lastIndexOf('</table>')) {
      const endTable = after.indexOf('</table>');
      if (endTable !== -1) {
        return html.substring(0, tableIdx) + after.substring(endTable + 8);
      }
    }

    if (aIdx !== -1 && aIdx > before.lastIndexOf('</a>')) {
      const endA = after.indexOf('</a>');
      if (endA !== -1) {
        return html.substring(0, aIdx) + after.substring(endA + 4);
      }
    }

    const endImg = after.indexOf('>');
    if (endImg !== -1) {
      return before + after.substring(endImg + 1);
    }

    return html;
  }, [post.rawContent]);

  // Automatically extract ONLY h2 and h3 headings and inject navigation anchor IDs
  const { processedHtml, tocHeadings } = useMemo(() => {
    if (!sanitizedRawContent) {
      const headings: TocHeading[] = [];
      if (post.content?.sections) {
        post.content.sections.forEach((sec, idx) => {
          headings.push({
            id: sec.id || `section-${idx}`,
            text: sec.title,
            level: 'h2',
          });
        });
      }
      return { processedHtml: '', tocHeadings: headings };
    }

    if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitizedRawContent, 'text/html');
        // Extract ONLY h2 and h3 elements
        const headingElements = doc.querySelectorAll('h2, h3');
        const headings: TocHeading[] = [];

        headingElements.forEach((el, index) => {
          const text = el.textContent?.trim() || '';
          if (!text) return;

          const level = el.tagName.toLowerCase() as 'h2' | 'h3';
          const id = `toc-${level}-${index}`;

          el.setAttribute('id', id);
          el.classList.add('scroll-mt-24', 'transition-all', 'duration-300');

          headings.push({
            id,
            text,
            level,
          });
        });

        return {
          processedHtml: doc.body.innerHTML,
          tocHeadings: headings,
        };
      } catch (err) {
        console.warn('Failed to parse headings with DOMParser:', err);
      }
    }

    // High-performance regex fallback
    const headings: TocHeading[] = [];
    let index = 0;
    const processedHtml = sanitizedRawContent.replace(
      /<(h2|h3)([^>]*)>(.*?)<\/\1>/gi,
      (match, tag, attrs, inner) => {
        const level = tag.toLowerCase() as 'h2' | 'h3';
        const cleanText = inner.replace(/<[^>]*>/g, '').trim();
        if (!cleanText) return match;

        const id = `toc-${level}-${index++}`;
        headings.push({ id, text: cleanText, level });

        let cleanAttrs = attrs;
        if (/id=["'][^"']*["']/i.test(cleanAttrs)) {
          cleanAttrs = cleanAttrs.replace(/id=["'][^"']*["']/i, `id="${id}"`);
        } else {
          cleanAttrs = ` id="${id}" ${cleanAttrs}`;
        }

        return `<${tag}${cleanAttrs} class="scroll-mt-24 transition-all duration-300">${inner}</${tag}>`;
      }
    );

    return { processedHtml, tocHeadings: headings };
  }, [sanitizedRawContent, post.content]);

  // Split processed HTML content after the second paragraph for in-article ad placement
  const splitRawContent = useMemo(() => {
    const htmlToSplit = processedHtml || sanitizedRawContent;
    if (!htmlToSplit) return null;

    const lower = htmlToSplit.toLowerCase();
    const pTag = '</p>';
    const firstP = lower.indexOf(pTag);

    if (firstP === -1) {
      return { before: htmlToSplit, after: '' };
    }

    const secondP = lower.indexOf(pTag, firstP + pTag.length);
    if (secondP === -1) {
      return {
        before: htmlToSplit.substring(0, firstP + pTag.length),
        after: htmlToSplit.substring(firstP + pTag.length),
      };
    }

    const splitIdx = secondP + pTag.length;
    return {
      before: htmlToSplit.substring(0, splitIdx),
      after: htmlToSplit.substring(splitIdx),
    };
  }, [processedHtml, sanitizedRawContent]);

  // Smooth scroll and highlight heading on TOC click
  const handleScrollToHeading = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('heading-active-target');
      setTimeout(() => {
        el.classList.remove('heading-active-target');
      }, 2000);
    }
  };

  return (
    <div className="w-full text-right animate-in fade-in duration-300">
      {/* Scroll-linked progress bar at the top of the screen */}
      <ReadingProgressBar targetId="article-body" postTitle={post.title} />
      
      {/* 1. Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-start w-full max-w-full">
        
        {/* Left/Main Column: Complete Article */}
        <div className="lg:col-span-2 w-full space-y-4 sm:space-y-6 overflow-visible">
          
          <article className="bg-white dark:bg-[#252a54] rounded-2xl shadow-sm border border-gray-100 dark:border-[#2f366b] overflow-visible p-4 sm:p-8">
            
            {/* Top Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-gray-100 dark:border-[#2f366b] mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/${post.categorySlug}/`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectCategory(post.categorySlug);
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold text-white cat-badge-${post.categoryIndex} hover:opacity-90 transition-opacity cursor-pointer`}
                >
                  {post.category}
                </a>
                {post.categorySlug === 'AI' &&
                  post.tags
                    .filter((tag) => tag !== 'الذكاء الاصطناعي' && tag !== 'AI')
                    .map((subTag) => {
                      const aiSubTagPaths: Record<string, string> = {
                        'أدوات': '/AI/Tools/',
                        'تحميلات': '/AI/Downloads/',
                        'الربح': '/AI/Earning/',
                        'مقارنات': '/AI/Tools-Comparison/',
                      };
                      const subHref = aiSubTagPaths[subTag] || '/AI/';
                      return (
                        <a
                          key={subTag}
                          href={subHref}
                          onClick={(e) => {
                            e.preventDefault();
                            onSelectCategory(subTag);
                          }}
                          className="px-3 py-1 rounded text-xs font-bold bg-blue-50 dark:bg-[#1e2348] text-[#035dcd] dark:text-blue-300 border border-blue-200/70 dark:border-[#384180] hover:bg-[#035dcd] hover:text-white transition-colors cursor-pointer"
                        >
                          {subTag}
                        </a>
                      );
                    })}
              </div>

              {/* Action Controls: Save to Favorites & Reading Settings */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => toggleFavorite(post.id, e)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isPostSaved
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-gray-50 dark:bg-[#1f244a] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#384180] hover:border-[#035dcd] hover:text-[#035dcd] dark:hover:text-blue-400'
                  }`}
                  title={isPostSaved ? 'إزالة المقال من المفضلات' : 'حفظ المقال في المفضلات'}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isPostSaved ? 'fill-white' : ''}`} />
                  <span>{isPostSaved ? 'محفوظ في المفضلة' : 'حفظ في المفضلة'}</span>
                </button>

                <button
                  onClick={() => setShowSettings((prev) => !prev)}
                  className="p-1.5 rounded-xl bg-gray-50 dark:bg-[#1f244a] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#384180] hover:text-[#035dcd] transition-colors cursor-pointer"
                  title="إعدادات القراءة والخط"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reading Settings Drawer (SeoPlus .PostSittings) */}
            {showSettings && (
              <div className="p-4 mb-6 bg-blue-50/70 dark:bg-[#1e2348] rounded-xl border border-blue-100 dark:border-[#2f366b] flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">حجم الخط:</span>
                    <div className="flex items-center gap-1 bg-white dark:bg-[#252a54] rounded-lg border border-gray-200 dark:border-[#384180] p-1">
                      <button
                        onClick={() => setFontSize((f) => Math.max(14, f - 1))}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-[#035dcd]">
                        {fontSize}px
                      </span>
                      <button
                        onClick={() => setFontSize((f) => Math.min(28, f + 1))}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">تباعد الأسطر:</span>
                    <div className="flex items-center gap-1 bg-white dark:bg-[#252a54] rounded-lg border border-gray-200 dark:border-[#384180] p-1">
                      <button
                        onClick={() => setLineHeight((l) => Math.max(1.6, Math.round((l - 0.2) * 10) / 10))}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-[#035dcd]">
                        {lineHeight}
                      </span>
                      <button
                        onClick={() => setLineHeight((l) => Math.min(2.8, Math.round((l + 0.2) * 10) / 10))}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFontSize(17);
                    setLineHeight(2);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
                >
                  استعادة الافتراضي
                </button>
              </div>
            )}

            {/* Featured Image - Prominent display at the top of the article */}
            <div className="mb-8 relative group overflow-hidden rounded-2xl border border-gray-100 dark:border-[#2f366b] shadow-md">
              <img
                src={post.thumbnail}
                alt={post.title}
                className="w-full h-auto max-h-[520px] object-cover cursor-pointer transition-transform duration-700 group-hover:scale-105"
                onClick={() => onOpenImage(post.thumbnail, post.title)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            {/* Title (SeoPlus h1.topic-title) */}
            <h1 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white leading-snug mb-5">
              {post.title}
            </h1>

            {/* 1. إعلان أول المقال */}
            <AdSenseUnit key={`ad-top-${post.id}`} slotType="top" postId={post.id} />

            {/* Table of Contents (محتوى المقال - فهرس العناوين: h2 و h3 فقط) */}
            {tocHeadings.length > 0 && (
              <div className="my-6 rounded-2xl border border-gray-200 dark:border-[#384180] bg-gray-50/90 dark:bg-[#1f244a] overflow-hidden shadow-xs">
                <button
                  onClick={() => setIsTocOpen(!isTocOpen)}
                  className="w-full flex items-center justify-between px-5 py-3.5 font-bold text-sm text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-[#2a3160] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#035dcd] shadow-[0_0_8px_rgba(3,93,205,0.6)]" />
                    <span className="font-extrabold text-sm sm:text-base">محتوى المقال (فهرس العناوين)</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#035dcd] dark:text-blue-300">
                      {tocHeadings.length} {tocHeadings.length === 1 ? 'عنوان' : 'عناوين'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#035dcd] dark:text-blue-400 font-semibold">
                    <span>{isTocOpen ? 'إخفاء الفهرس' : 'عرض الفهرس'}</span>
                    {isTocOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isTocOpen && (
                  <div className="p-5 pt-3 border-t border-gray-200 dark:border-[#2f366b]">
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      {tocHeadings.map((heading, idx) => (
                        <li
                          key={heading.id}
                          className={`transition-all duration-150 ${
                            heading.level === 'h3'
                              ? 'pr-6 sm:pr-8 text-xs sm:text-sm text-gray-600 dark:text-gray-400'
                              : 'font-bold text-gray-900 dark:text-white'
                          }`}
                        >
                          <a
                            href={`#${heading.id}`}
                            onClick={(e) => handleScrollToHeading(e, heading.id)}
                            className="group flex items-start gap-2 hover:text-[#035dcd] dark:hover:text-blue-400 transition-colors cursor-pointer py-0.5"
                          >
                            {heading.level === 'h2' ? (
                              <span className="shrink-0 w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-[#035dcd] dark:text-blue-300 text-[11px] font-black flex items-center justify-center mt-0.5 group-hover:bg-[#035dcd] group-hover:text-white transition-colors">
                                {idx + 1}
                              </span>
                            ) : (
                              <span className="shrink-0 w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 mt-2 group-hover:bg-[#035dcd] dark:group-hover:bg-blue-400 transition-colors" />
                            )}
                            <span className="leading-relaxed group-hover:underline decoration-[#035dcd]/40 underline-offset-4">
                              {heading.text}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Article Content Area */}
            <div
              id="article-body"
              className="article-text-body space-y-6 text-gray-800 dark:text-gray-200 leading-relaxed"
              style={{ fontSize: `${fontSize}px`, lineHeight: `${lineHeight}em` }}
            >
              {post.rawContent && splitRawContent ? (
                <>
                  <div
                    className="article-raw-html overflow-x-auto"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'IMG') {
                        const img = target as HTMLImageElement;
                        onOpenImage(img.src, post.title);
                      }
                    }}
                    dangerouslySetInnerHTML={{ __html: splitRawContent.before }}
                  />

                  {/* 2. إعلان وسط المقال */}
                  <AdSenseUnit key={`ad-mid-${post.id}`} slotType="middle" postId={post.id} />

                  {splitRawContent.after && (
                    <div
                      className="article-raw-html overflow-x-auto"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'IMG') {
                          const img = target as HTMLImageElement;
                          onOpenImage(img.src, post.title);
                        }
                      }}
                      dangerouslySetInnerHTML={{ __html: splitRawContent.after }}
                    />
                  )}
                </>
              ) : (
                <>
                  {articlePage === 1 && (
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300 border-r-4 border-[#035dcd] pr-4 bg-blue-50/40 dark:bg-[#1f244a] py-3 rounded-l-lg">
                      {post.content.intro}
                    </p>
                  )}

                  {currentSections.map((sec, secIdx) => (
                    <React.Fragment key={sec.id}>
                      <section id={sec.id} className="scroll-mt-20 pt-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                          <span className="w-1.5 h-6 bg-[#035dcd] rounded-full inline-block" />
                          <span>{sec.title}</span>
                        </h2>

                        <div className="space-y-3">
                          {sec.body.map((para, pIdx) => (
                            <p key={pIdx}>{para}</p>
                          ))}
                        </div>

                        {/* Note Callout (SeoPlus .note) */}
                        {sec.note && (
                          <div
                            className={`my-4 p-4 rounded-xl flex items-start gap-3 border text-sm ${
                              sec.note.type === 'warn'
                                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200'
                                : sec.note.type === 'success'
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200'
                                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-200'
                            }`}
                          >
                            {sec.note.type === 'warn' ? (
                              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            ) : sec.note.type === 'success' ? (
                              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-5 h-5 shrink-0 mt-0.5" />
                            )}
                            <div>{sec.note.text}</div>
                          </div>
                        )}

                        {/* Code snippet with copy area (SeoPlus .areacode) */}
                        {sec.code && (
                          <div className="my-5 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-900 text-gray-100 shadow-inner">
                            <div className="px-4 py-2 bg-gray-800 flex items-center justify-between text-xs text-gray-300 border-b border-gray-700">
                              <span className="font-mono text-blue-400">&lt;/&gt; كود المشاركة</span>
                              <button
                                onClick={() => {
                                  if (sec.code) navigator.clipboard.writeText(sec.code);
                                }}
                                className="hover:text-white transition-colors"
                              >
                                أضغط لنسخ المحتويات
                              </button>
                            </div>
                            <div className="p-4 font-mono text-xs direction-ltr text-left overflow-x-auto">
                              <code>{sec.code}</code>
                            </div>
                          </div>
                        )}

                        {/* SeoPlus Slide Buttons */}
                        {sec.downloadUrl && (
                          <div className="my-8 text-center flex flex-wrap items-center justify-center gap-4">
                            <a
                              href={sec.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative inline-flex items-center justify-between px-6 py-3.5 w-60 rounded-full border-2 border-[#0099cc] bg-white dark:bg-[#1f244a] text-[#0099cc] hover:bg-[#0099cc] hover:text-white transition-all duration-300 shadow-md font-bold text-sm"
                            >
                              <span>تحميل التحديث المباشر</span>
                              <div className="w-8 h-8 rounded-full bg-[#0099cc] text-white group-hover:bg-white group-hover:text-[#0099cc] flex items-center justify-center transition-all">
                                <Download className="w-4 h-4" />
                              </div>
                            </a>

                            <a
                              href={sec.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative inline-flex items-center justify-between px-6 py-3.5 w-60 rounded-full border-2 border-[#efa666] bg-white dark:bg-[#1f244a] text-[#efa666] hover:bg-[#efa666] hover:text-white transition-all duration-300 shadow-md font-bold text-sm"
                            >
                              <span>رابط بديل وسريع</span>
                              <div className="w-8 h-8 rounded-full bg-[#efa666] text-white group-hover:bg-white group-hover:text-[#efa666] flex items-center justify-center transition-all">
                                <ExternalLink className="w-4 h-4" />
                              </div>
                            </a>
                          </div>
                        )}
                      </section>

                      {secIdx === 0 && (
                        <AdSenseUnit key={`ad-mid-sec-${post.id}`} slotType="middle" postId={post.id} />
                      )}
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>

            {/* SeoPlus Multi-page Article Navigation (↚ PageBreak) */}
            {totalArticlePages > 1 && (
              <div className="my-8 p-4 rounded-xl bg-gray-50 dark:bg-[#1e2348] border border-gray-200 dark:border-[#2f366b] flex items-center justify-between">
                <button
                  onClick={() => setArticlePage(1)}
                  disabled={articlePage === 1}
                  className="px-4 py-2 rounded-lg bg-[#035dcd] text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>الصفحة السابقة</span>
                </button>

                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  صفحة {articlePage} من {totalArticlePages}
                </span>

                <button
                  onClick={() => setArticlePage(2)}
                  disabled={articlePage === 2}
                  className="px-4 py-2 rounded-lg bg-[#035dcd] text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>الصفحة التالية</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Tags Pills (SeoPlus .post-tags) */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[#2f366b] flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 ml-2">
                <Tag className="w-3.5 h-3.5" /> الأقسام والوسوم:
              </span>
              {post.tags.map((tag) => {
                const cleanTag = tag.replace(/\s*AI$/i, '').trim();
                const aiTagPaths: Record<string, string> = {
                  'الذكاء الاصطناعي': '/AI/',
                  'أدوات': '/AI/Tools/',
                  'تحميلات': '/AI/Downloads/',
                  'الربح': '/AI/Earning/',
                  'مقارنات': '/AI/Tools-Comparison/',
                };
                const tagHref =
                  post.categorySlug === 'AI' && aiTagPaths[cleanTag]
                    ? aiTagPaths[cleanTag]
                    : `/${post.categorySlug}/`;
                const displayTag =
                  post.categorySlug === 'AI' && !/\s*AI$/i.test(tag)
                    ? `${tag} AI`
                    : tag;
                return (
                  <a
                    key={tag}
                    href={tagHref}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectCategory(cleanTag);
                    }}
                    className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#1e2348] text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-[#035dcd] hover:text-white transition-colors cursor-pointer"
                  >
                    #{displayTag}
                  </a>
                );
              })}

              <button
                onClick={(e) => toggleFavorite(post.id, e)}
                className={`mr-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isPostSaved
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-blue-50 dark:bg-[#1e2348] text-[#035dcd] dark:text-blue-300 hover:bg-[#035dcd] hover:text-white'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isPostSaved ? 'fill-white' : ''}`} />
                <span>{isPostSaved ? 'محفوظ في المفضلات' : 'أضف إلى المفضلات'}</span>
              </button>
            </div>

            {/* Next / Previous Post Navigation (SeoPlus .page-navigation) */}
            <div className="my-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-gray-100 dark:border-[#2f366b] py-6">
              {prevPost ? (
                <div
                  onClick={() => onSelectPost(prevPost)}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-[#1f244a] hover:bg-blue-50/60 dark:hover:bg-[#2d325a] border border-gray-100 dark:border-[#2f366b] cursor-pointer transition-all group"
                >
                  <div className="w-9 h-9 rounded-full bg-[#035dcd] text-white flex items-center justify-center shrink-0">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 block font-semibold">المقال السابق</span>
                    <h5 className="text-xs font-bold text-gray-800 dark:text-white truncate group-hover:text-[#035dcd]">
                      {prevPost.title}
                    </h5>
                  </div>
                </div>
              ) : <div />}

              {nextPost ? (
                <div
                  onClick={() => onSelectPost(nextPost)}
                  className="flex items-center justify-end gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-[#1f244a] hover:bg-blue-50/60 dark:hover:bg-[#2d325a] border border-gray-100 dark:border-[#2f366b] cursor-pointer transition-all group text-left"
                >
                  <div className="min-w-0 text-right">
                    <span className="text-[10px] text-gray-400 block font-semibold">المقال التالي</span>
                    <h5 className="text-xs font-bold text-gray-800 dark:text-white truncate group-hover:text-[#035dcd]">
                      {nextPost.title}
                    </h5>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#035dcd] text-white flex items-center justify-center shrink-0">
                    <ChevronLeft className="w-5 h-5" />
                  </div>
                </div>
              ) : <div />}
            </div>

            {/* Related Posts (SeoPlus .RelatedPosts) */}
            {relatedPosts.length > 0 && (
              <div className="mt-8">
                <div className="headline-seo pb-3 mb-5 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    مقالات قد تهمك في نفس القسم
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedPosts.map((rPost) => {
                    const rSaved = isFavorite(rPost.id);
                    return (
                      <div
                        key={rPost.id}
                        onClick={() => onSelectPost(rPost)}
                        className="group cursor-pointer rounded-xl overflow-hidden bg-gray-50 dark:bg-[#1f244a] border border-gray-100 dark:border-[#2f366b] hover:shadow-lg transition-all"
                      >
                        <div className="relative h-32 overflow-hidden bg-gray-200">
                          <img
                            src={rPost.thumbnail}
                            alt={rPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            onClick={(e) => toggleFavorite(rPost.id, e)}
                            className={`absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-xs transition-all cursor-pointer ${
                              rSaved
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-black/50 text-white hover:bg-[#035dcd]'
                            }`}
                            title={rSaved ? 'إزالة من المفضلات' : 'إضافة إلى المفضلات'}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${rSaved ? 'fill-white' : ''}`} />
                          </button>
                        </div>
                        <div className="p-3">
                          <h4 className="text-xs font-bold text-gray-800 dark:text-white line-clamp-2 group-hover:text-[#035dcd] transition-colors">
                            {rPost.title}
                          </h4>
                          <span className="text-[10px] text-gray-400 mt-2 block">
                            {rPost.date}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. إعلان آخر المقال (يُوضع قبل قسم التعليقات مباشرة) */}
            <AdSenseUnit key={`ad-bottom-${post.id}`} slotType="bottom" postId={post.id} />

            {/* Multi-Tab Comments Section */}
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-[#2f366b]">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#035dcd]" />
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                    التعليقات ({comments.length})
                  </h3>
                </div>

                {/* Tabs Switcher: Blogger, Facebook, Disqus */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-100 dark:bg-[#1e2348] text-xs">
                  <button
                    onClick={() => setActiveCommentTab('blogger')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      activeCommentTab === 'blogger'
                        ? 'bg-[#fc9644] text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                    }`}
                  >
                    تعليقات Blogger
                  </button>
                  <button
                    onClick={() => setActiveCommentTab('facebook')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      activeCommentTab === 'facebook'
                        ? 'bg-[#1877F2] text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                    }`}
                  >
                    تعليقات Facebook
                  </button>
                  <button
                    onClick={() => setActiveCommentTab('disqus')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                      activeCommentTab === 'disqus'
                        ? 'bg-[#2e9fff] text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                    }`}
                  >
                    تعليقات Disqus
                  </button>
                </div>
              </div>

              {/* Tab 1: Blogger Real Interactive Form */}
              {activeCommentTab === 'blogger' && (
                <div className="space-y-6">
                  {/* Add Comment Form */}
                  <form
                    onSubmit={handleAddComment}
                    className="p-5 rounded-2xl bg-gray-50 dark:bg-[#1f244a] border border-gray-100 dark:border-[#2f366b] space-y-3"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      <span>إضافة تعليق جديد على هذا المقال:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newAuthor}
                        onChange={(e) => setNewAuthor(e.target.value)}
                        placeholder="اسمك الكريم (اختياري)..."
                        className="w-full px-3.5 py-2 rounded-xl text-xs border border-gray-200 dark:border-[#384180] bg-white dark:bg-[#252a54] text-gray-800 dark:text-white focus:outline-none focus:border-[#035dcd]"
                      />
                    </div>
                    <textarea
                      required
                      rows={3}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="اكتب تعليقك أو استفسارك هنا بكل احترام..."
                      className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-gray-200 dark:border-[#384180] bg-white dark:bg-[#252a54] text-gray-800 dark:text-white focus:outline-none focus:border-[#035dcd] resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-[#035dcd] hover:bg-[#02479e] text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 -rotate-90" />
                        <span>نشر التعليق</span>
                      </button>
                    </div>
                  </form>

                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.length === 0 ? (
                      <p className="text-center py-6 text-xs text-gray-400">
                        كن أول من يعلق على هذا المقال!
                      </p>
                    ) : (
                      comments.map((cmt) => (
                        <div
                          key={cmt.id}
                          className="p-4 rounded-xl bg-white dark:bg-[#1f244a] border border-gray-100 dark:border-[#2f366b] flex items-start gap-3 shadow-sm"
                        >
                          <img
                            src={cmt.avatar}
                            alt={cmt.author}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-xs text-gray-900 dark:text-white">
                                {cmt.author}
                              </span>
                              <span className="text-[10px] text-gray-400">{cmt.date}</span>
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                              {cmt.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Facebook Comments Simulator */}
              {activeCommentTab === 'facebook' && (
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#1f244a] border border-gray-100 dark:border-[#2f366b] text-center text-xs text-gray-500">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]">
                    <ThumbsUp className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1">
                    إضافة تعليقات Facebook الاجتماعية مفعّلة
                  </p>
                  <p className="text-gray-400">
                    يمكن للمستخدمين تسجيل الدخول بحساب Facebook وكتابة التعليق مباشرة ومشاركته على يومياتهم.
                  </p>
                </div>
              )}

              {/* Tab 3: Disqus Simulator */}
              {activeCommentTab === 'disqus' && (
                <div className="p-6 rounded-2xl bg-gray-50 dark:bg-[#1f244a] border border-gray-100 dark:border-[#2f366b] text-center text-xs text-gray-500">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#2e9fff]/10 flex items-center justify-center text-[#2e9fff]">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1">
                    منظومة تعليقات Disqus العالمية
                  </p>
                  <p className="text-gray-400">
                    تدعم التفاعل السريع، التصويت الإيجابي/السلبي، وإشعارات البريد الفورية.
                  </p>
                </div>
              )}
            </div>

          </article>
        </div>

        {/* Right/Sidebar Column: SeoPlus Sidebar */}
        <div className="lg:col-span-1">
          <Sidebar
            categories={categories}
            posts={allPosts}
            activeCategory={activeCategory}
            onSelectCategory={onSelectCategory}
            onSelectPost={onSelectPost}
            onOpenSpeedTest={onOpenSpeedTest}
            onOpenRedirectTool={onOpenRedirectTool}
            onOpenSeoViewer={onOpenSeoViewer}
            onSearchQuery={onSearchQuery}
          />
        </div>

      </div>

    </div>
  );
};
