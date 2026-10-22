/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  ArrowRight,
  Sparkles,
  Flame,
  Gamepad2,
  Cpu,
  HelpCircle,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Columns,
  FileCode,
  Maximize2,
  ExternalLink,
  Layers,
  ArrowUp,
  Briefcase,
  Lightbulb,
  ShoppingBag,
  Megaphone,
  Bookmark,
} from 'lucide-react';

import { Post, CategoryInfo } from './types';
import { INITIAL_POSTS, INITIAL_CATEGORIES } from './data/posts';
import { Header } from './components/Header';
import { NewsTicker } from './components/NewsTicker';
import { FeaturedSlider } from './components/FeaturedSlider';
import { Sidebar } from './components/Sidebar';
import { PostPageView } from './components/PostPageView';
import { ImageLightbox } from './components/ImageLightbox';
import { SearchModal } from './components/SearchModal';
import { SpeedTestModal } from './components/SpeedTestModal';
import { RedirectToolModal } from './components/RedirectToolModal';
import { ContactModal } from './components/ContactModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PagesModal, PageType } from './components/PagesModal';
import { MobileDrawer } from './components/MobileDrawer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { SeoSchemaViewerModal } from './components/SeoSchemaViewerModal';
import { SitemapModal } from './components/SitemapModal';
import { HomeCategorySection } from './components/HomeCategorySection';
import { StandalonePageView } from './components/StandalonePageView';
import { DownloadsSectionView } from './components/DownloadsSectionView';
import { AppDownloadPageView } from './components/AppDownloadPageView';
import { DOWNLOAD_APPS, DownloadAppItem } from './data/downloadsApps';

import { AdSenseUnit } from './components/AdSenseUnit';
import { StandalonePageType } from './types';
import { applySeoMetadata } from './utils/seo';
import { useFavorites } from './hooks/useFavorites';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLogin } from './components/admin/AdminLogin';
import {
  fetchPublishedPosts,
  fetchCategories,
  isSessionUnlocked,
  setSessionUnlocked,
} from './services/postsService';

export default function App() {
  const { isFavorite, toggleFavorite } = useFavorites();

  // Dynamic posts & categories state from server / GitHub (with INITIAL_POSTS fallback)
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [categories, setCategories] = useState<CategoryInfo[]>(INITIAL_CATEGORIES);
  const postsRef = React.useRef<Post[]>(posts);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  // Conditional Preview Gate: Hide public website & browsing views until "معاينة الموقع" is explicitly clicked
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // Admin routing & PIN/Password auth state
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => isSessionUnlocked());

  // Fetch published posts and categories on mount
  const refreshPublicPosts = () => {
    fetchPublishedPosts()
      .then((res) => {
        if (res && res.posts && res.posts.length > 0) {
          setPosts(res.posts);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshPublicPosts();

    fetchCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
        }
      })
      .catch(() => {});
  }, []);

  // Theme state with localStorage sync
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('mode') === 'dark';
  });

  // Navigation & Category state ('all' or 'AI' | 'Games' | 'Software' | 'Business' | 'Education')
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeAiSubTag, setActiveAiSubTag] = useState<string>('AI');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedDownloadApp, setSelectedDownloadApp] = useState<DownloadAppItem | null>(null);

  // Article Feed View Style (matching SeoPlus BlogStylePosts: 1=wide classic, 2=grid, 3=compact)
  const [feedLayout, setFeedLayout] = useState<'classic' | 'grid' | 'compact'>('classic');

  // Modals & Tools state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSpeedTestOpen, setIsSpeedTestOpen] = useState(false);
  const [isRedirectToolOpen, setIsRedirectToolOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSeoViewerOpen, setIsSeoViewerOpen] = useState(false);
  const [isSitemapOpen, setIsSitemapOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);
  const [activePage, setActivePage] = useState<PageType | null>(null);
  const [standalonePage, setStandalonePage] = useState<StandalonePageType | null>(null);


  // Pagination / Load More
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // AI Sub-Tags configuration (Main section /AI/ with nested /AI/Tools/, /AI/Downloads/, /AI/Earning/, /AI/Tools-Comparison/)
  const AI_SUB_TAGS = [
    {
      label: 'الذكاء الاصطناعي AI',
      slug: 'AI',
      path: '/AI/',
      icon: Sparkles,
      postSlugs: [
        'get-google-gemini-students-free-ai-pro',
        'october-war-video-ai',
        'chatgpt-prompts',
        'google-ai-review',
        'best-free-ai-video-creation-sites',
        'artificial-intelligence-will-change-our-lives',
        'bing-ai-chat',
        'profit-chatgpt-open-ai',
      ],
    },
    {
      label: 'أدوات AI',
      slug: 'Tools',
      path: '/AI/Tools/',
      icon: Cpu,
      postSlugs: [
        'october-war-video-ai',
        'chatgpt-prompts',
        'best-free-ai-video-creation-sites',
        'get-google-gemini-students-free-ai-pro',
        'bing-ai-chat',
      ],
    },
    {
      label: 'تحميلات AI',
      slug: 'Downloads',
      path: '/AI/Downloads/',
      icon: FileCode,
      postSlugs: [
        'get-google-gemini-students-free-ai-pro',
        'bing-ai-chat',
      ],
    },
    {
      label: 'الربح AI',
      slug: 'Earning',
      path: '/AI/Earning/',
      icon: Flame,
      postSlugs: [
        'profit-chatgpt-open-ai',
      ],
    },
    {
      label: 'مقارنات AI',
      slug: 'Tools-Comparison',
      path: '/AI/Tools-Comparison/',
      icon: Layers,
      postSlugs: [
        'google-ai-review',
        'best-free-ai-video-creation-sites',
        'artificial-intelligence-will-change-our-lives',
      ],
    },
  ];

  // Helper to normalize category slugs to the 4 main sections
  const normalizeCategorySlug = (cat: string) => {
    if (!cat || cat === 'all' || cat === 'الكل') return 'all';
    if (
      cat === 'Downloads' ||
      cat === 'Software' ||
      cat === 'التحميلات' ||
      cat === 'البرامج'
    ) {
      return 'Downloads';
    }
    if (
      cat === 'AI' ||
      cat === 'الذكاء الاصطناعي' ||
      AI_SUB_TAGS.some(
        (t) =>
          t.slug.toLowerCase() === cat.toLowerCase() ||
          t.label === cat ||
          t.label.replace(/\s*AI$/i, '') === cat ||
          `ai-${t.slug}`.toLowerCase() === cat.toLowerCase() ||
          `ai/${t.slug}`.toLowerCase() === cat.toLowerCase()
      )
    ) {
      return 'AI';
    }
    if (cat === 'Business' || cat === 'المال والأعمال' || cat === 'الربح من الإنترنت') return 'Business';
    if (
      cat === 'Blog' ||
      cat === 'المدونة' ||
      cat === 'Education' ||
      cat === 'مقالات تعليمية' ||
      cat === 'Games' ||
      cat === 'الألعاب'
    ) {
      return 'Blog';
    }
    return cat;
  };

  // Helper to get existing posts belonging to each of the 4 main sections without altering post URLs
  const getSectionPosts = (sectionSlug: string, aiSubTag: string = 'AI'): Post[] => {
    const norm = normalizeCategorySlug(sectionSlug);
    if (norm === 'all') return posts;
    if (norm === 'Downloads') {
      return posts.filter(
        (p) =>
          p.categorySlug === 'Software' ||
          p.categorySlug === 'Downloads' ||
          p.category === 'التحميلات'
      );
    }
    if (norm === 'Blog') {
      return [
        ...posts.filter((p) => p.categorySlug === 'Education'),
        ...posts.filter((p) => p.categorySlug === 'Games'),
      ];
    }
    if (norm === 'AI' && aiSubTag && aiSubTag !== 'AI') {
      const matchedSubTag = AI_SUB_TAGS.find(
        (t) =>
          t.slug.toLowerCase() === aiSubTag.toLowerCase() ||
          t.label === aiSubTag ||
          t.label.replace(/\s*AI$/i, '') === aiSubTag
      );
      if (matchedSubTag) {
        const baseLabel = matchedSubTag.label.replace(/\s*AI$/i, '');
        return posts.filter(
          (p) =>
            (p.categorySlug === 'AI' || p.category === 'AI') &&
            (p.tags.includes(matchedSubTag.label) ||
              p.tags.includes(baseLabel) ||
              matchedSubTag.postSlugs.includes(p.slug))
        );
      }
    }
    return posts.filter(
      (p) => p.categorySlug === norm || p.category === norm
    );
  };

  // Clear Arabic labels for internal navigation links to existing articles
  const ARTICLE_NAV_LABELS: Record<string, string> = {
    'get-google-gemini-students-free-ai-pro': 'اشتراك Google Gemini للطلاب وتفعيل AI Pro مجاناً',
    'chatgpt-prompts': 'أسرار وأكواد ChatGPT المخفية للاستخدام الاحترافي',
    'google-ai-review': 'مراجعة وتجربة أدوات جوجل للذكاء الاصطناعي Google AI',
    'best-free-ai-video-creation-sites': 'أفضل مواقع إنشاء فيديوهات بالذكاء الاصطناعي مجاناً',
    'bing-ai-chat': 'شرح دردشة Bing AI من مايكروسوفت وطريقة استخدامها',
    'profit-chatgpt-open-ai': 'طرق الربح من ChatGPT وتقنيات OpenAI',
    'october-war-video-ai': 'طريقة عمل فيديوهات حرب أكتوبر بالذكاء الاصطناعي',
    'artificial-intelligence-will-change-our-lives': 'مستقبل الذكاء الاصطناعي وكيف سيغير حياتنا',
    'best-high-cpc-niches-adsense': 'أفضل المجالات للربح من جوجل أدسنس وأعلى التخصصات ربحاً',
    'highest-adsense-keywords': 'أفضل الكلمات المفتاحية للربح من أدسنس وأكثر المجالات ربحاً',
    'profit-from-amazon': 'الربح من أمازون: أفضل طرق كسب المال من سوق Amazon',
    'new-jobs-with-great-pay': 'أفضل الوظائف العالمية برواتب مجزية وفرص العمل الحديثة',
    'telegram-channels-for-making-money': 'أفضل قنوات الربح من تيليجرام وطرق تحقيق الدخل',
    '1xbet-website-problem': 'حل مشكلة إغلاق موقع 1xBet على الكمبيوتر والمتصفح',
    'scooter-maintenance': 'طريقة صيانة بطارية السكوتر والدراجات الكهربائية في المنزل',
    'best-power-banks-guide': 'دليل اختيار أفضل شاحن متنقل (باور بانك) للهواتف والسفر',
    'qatar-travel-guide': 'دليل السياحة في قطر: أفضل الأماكن للعائلات والأفراد',
    'hidden-places-saudi-arabia': 'أماكن سياحية مخفية في السعودية: 20 وجهة تستحق الزيارة',
    'how-to-boost-4g-mobile-signal': 'كيفية زيادة سرعة الإنترنت وتقوية إشارة الجيل الرابع 4G',
    'reasons-for-ban-pubg-mobile': 'أسباب حظر حساب ببجي موبايل وكيفية فك الباند مجاناً',
    'best-5-entertainment-games-kwait': 'أفضل 5 ألعاب تسلية وترفيه للهاتف في الكويت',
    'best-free-game-recharge-sites': 'أفضل المواقع الموثوقة لشحن رصيد الألعاب مجاناً',
    'earning-from-pubg-mobile': 'طرق الربح من ببجي موبايل وكسب أموال حقيقية',
    'best-earning-games-libya': 'أفضل 5 ألعاب للربح من الإنترنت في ليبيا',
    'best-travel-apps-qatar': 'تحميل أفضل تطبيقات السياحة والمواصلات والفنادق في قطر',
    'download-quran-offline-free': 'تحميل تطبيق القرآن الكريم بدون إنترنت للآيفون والأندرويد',
    'threads-instagram': 'تنزيل وشرح استخدام تطبيق ثريدز Threads انستغرام الجديد',
    'download-pinterest-videos': 'أفضل أداة لتحميل فيديوهات وصور Pinterest مجاناً',
    'download-1xbet-app-new-update': 'تحديث تطبيق 1xBet الجديد: المميزات وطرق الاستخدام الذكي',
  };

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('mode', 'dark');
      document.body.classList.add('dark');
      localStorage.setItem('mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('mode', 'light');
      document.body.classList.remove('dark');
      localStorage.setItem('mode', 'light');
    }
  }, [darkMode]);

  // Dynamic SEO & Schema.org JSON-LD Injection
  useEffect(() => {
    applySeoMetadata(selectedPost, activeCategory, standalonePage, selectedDownloadApp);
  }, [selectedPost, activeCategory, standalonePage, selectedDownloadApp]);

  // Parse current URL (supports clean /Blog/, /Downloads/slug, or /AI/slug paths, plus backward-compatible hashes)
  const parseUrlToState = () => {
    let rawPath = window.location.pathname || '/';
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();

    // If pathname is root '/' but there is an old hash (e.g. #Games/ or #AI/slug), prefer the hash
    let target = rawPath;
    if ((rawPath === '/' || !rawPath) && rawHash) {
      target = '/' + rawHash;
    }

    const clean = target.replace(/^\/+|\/+$/g, '').trim();

    if (!clean) {
      return { post: null, downloadApp: null, category: 'all', aiSubTag: 'AI', standalone: null, isAdmin: false, cleanPath: '/' };
    }

    // Check Admin CMS Route (/admin or /admin/*)
    if (clean === 'admin' || clean.startsWith('admin/')) {
      return {
        post: null,
        downloadApp: null,
        category: 'all',
        aiSubTag: 'AI',
        standalone: null,
        isAdmin: true,
        cleanPath: '/admin',
      };
    }

    const standalonePages: StandalonePageType[] = ['about', 'contact', 'privacy', 'terms', 'sitemap'];
    const matchedStandalone = standalonePages.find(
      (p) => p.toLowerCase() === clean.toLowerCase()
    );
    if (matchedStandalone) {
      return { post: null, downloadApp: null, category: 'all', aiSubTag: 'AI', standalone: matchedStandalone, isAdmin: false, cleanPath: `/${matchedStandalone}` };
    }

    if (/^sitemap([_-][a-z]+)?\.xml$/i.test(clean)) {
      return {
        post: null,
        downloadApp: null,
        category: 'all',
        aiSubTag: 'AI',
        standalone: 'sitemap' as StandalonePageType,
        isAdmin: false,
        cleanPath: `/${clean}`,
      };
    }

    const cleanParts = clean.split('/');

    // Check dedicated app download pages: /Downloads/<appSlug>
    if (
      cleanParts.length === 2 &&
      (cleanParts[0].toLowerCase() === 'downloads' || cleanParts[0].toLowerCase() === 'software')
    ) {
      const matchedDownloadApp = DOWNLOAD_APPS.find(
        (app) => app.slug.toLowerCase() === cleanParts[1].toLowerCase()
      );
      if (matchedDownloadApp) {
        return {
          post: null,
          downloadApp: matchedDownloadApp,
          category: 'Downloads',
          aiSubTag: 'AI',
          standalone: null,
          isAdmin: false,
          cleanPath: `/Downloads/${matchedDownloadApp.slug}`,
        };
      }
    }

    // Check AI sub-tags (e.g. /AI/, /AI/Tools/, /AI/Downloads/, /AI/Earning/, /AI/Tools-Comparison/, or legacy /AI-Tools/)
    const potentialAiSubTag =
      cleanParts.length === 2 && cleanParts[0].toLowerCase() === 'ai'
        ? cleanParts[1]
        : clean.replace(/^ai-/i, '');
    const matchedAiSubTag = AI_SUB_TAGS.find(
      (t) =>
        (cleanParts[0].toLowerCase() === 'ai' || clean.toLowerCase().startsWith('ai-')) &&
        t.slug.toLowerCase() === potentialAiSubTag.toLowerCase()
    );
    if (matchedAiSubTag) {
      return {
        post: null,
        downloadApp: null,
        category: 'AI',
        aiSubTag: matchedAiSubTag.slug,
        standalone: null,
        isAdmin: false,
        cleanPath: matchedAiSubTag.path,
      };
    }

    const officialCategories = ['AI', 'Games', 'Software', 'Downloads', 'Business', 'Blog', 'Education'];

    // 1. Direct official category match (e.g. /Blog/ or /AI/ or /Downloads/)
    const matchedCat = officialCategories.find(
      (c) => c.toLowerCase() === clean.toLowerCase()
    );
    if (matchedCat) {
      const normCat = normalizeCategorySlug(matchedCat);
      return { post: null, downloadApp: null, category: normCat, aiSubTag: 'AI', standalone: null, isAdmin: false, cleanPath: `/${normCat}/` };
    }

    // 2. Check if path is {category}/{slug} or just {slug}
    const parts = clean.split('/');
    const postSlug = parts.length > 1 ? parts[1] : parts[0];
    const categoryPart = parts.length > 1 ? parts[0] : null;

    // Search in dynamic posts (or INITIAL_POSTS fallback)
    const currentList = postsRef.current && postsRef.current.length > 0 ? postsRef.current : INITIAL_POSTS;
    const foundPost = currentList.find(
      (p) => p.slug === postSlug || p.slug === clean
    );
    if (foundPost) {
      return {
        post: foundPost,
        downloadApp: null,
        category: normalizeCategorySlug(foundPost.categorySlug),
        aiSubTag: 'AI',
        standalone: null,
        isAdmin: false,
        cleanPath: `/${foundPost.categorySlug}/${foundPost.slug}`,
      };
    }

    // If first segment was an official category but post slug was not found, fallback to category
    if (categoryPart) {
      const catCheck = officialCategories.find(
        (c) => c.toLowerCase() === categoryPart.toLowerCase()
      );
      if (catCheck) {
        const normCat = normalizeCategorySlug(catCheck);
        return { post: null, downloadApp: null, category: normCat, aiSubTag: 'AI', standalone: null, isAdmin: false, cleanPath: `/${normCat}/` };
      }
    }

    return { post: null, downloadApp: null, category: 'all', aiSubTag: 'AI', standalone: null, isAdmin: false, cleanPath: '/' };
  };

  // Initial Deep-Link URL listener & Back/Forward button popstate support
  useEffect(() => {
    const handlePopState = () => {
      const { post, downloadApp, category, aiSubTag, standalone, cleanPath, isAdmin } = parseUrlToState() as any;
      setIsAdminRoute(!!isAdmin);
      setSelectedPost(post);
      setSelectedDownloadApp(downloadApp);
      setActiveCategory(category);
      setActiveAiSubTag(aiSubTag);
      setStandalonePage(standalone);

      // Clean legacy hash or non-standard slashes
      if (window.location.hash || window.location.pathname !== cleanPath) {
        window.history.replaceState(null, '', cleanPath);
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  // Currently active Category object
  const currentCategoryInfo = useMemo(() => {
    const norm = normalizeCategorySlug(activeCategory);
    return categories.find(
      (c) => c.slug === norm || c.name === activeCategory
    ) || INITIAL_CATEGORIES.find((c) => c.slug === norm);
  }, [activeCategory, categories]);

  // Filtered posts based on active category and AI sub-tag
  const filteredPosts = useMemo(() => {
    return getSectionPosts(activeCategory, activeAiSubTag);
  }, [activeCategory, activeAiSubTag, posts]);

  const displayedPosts = filteredPosts.slice(0, visibleCount);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 3);
      setIsLoadingMore(false);
    }, 600);
  };

  // Category change handler with clean path URL (/Blog/, /AI/, /Business/, /Downloads/ or AI sub-tags)
  const handleSelectCategory = (cat: string) => {
    setIsAdminRoute(false);
    const isMainDownloads =
      cat === 'Downloads' ||
      cat === 'Software' ||
      cat === 'التحميلات' ||
      cat === 'البرامج';

    const matchedAiSubTag = !isMainDownloads
      ? AI_SUB_TAGS.find(
          (t) =>
            t.slug !== 'AI' &&
            (t.slug.toLowerCase() === cat.toLowerCase() ||
              t.label === cat ||
              t.label.replace(/\s*AI$/i, '') === cat ||
              `ai-${t.slug}`.toLowerCase() === cat.toLowerCase() ||
              `ai/${t.slug}`.toLowerCase() === cat.toLowerCase())
        )
      : undefined;
    if (matchedAiSubTag) {
      handleSelectAiSubTag(matchedAiSubTag.slug);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const norm = normalizeCategorySlug(cat);
    setActiveCategory(norm);
    setActiveAiSubTag('AI');
    setSelectedPost(null);
    setSelectedDownloadApp(null);
    setStandalonePage(null);
    setVisibleCount(6);

    const targetPath = norm === 'all' ? '/' : `/${norm}/`;
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, '', targetPath);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // AI Sub-Tag selection handler (keeps fixed nested English URLs: /AI/, /AI/Tools/, /AI/Downloads/, /AI/Earning/, /AI/Tools-Comparison/)
  const handleSelectAiSubTag = (subTagSlug: string) => {
    setIsAdminRoute(false);
    const matched = AI_SUB_TAGS.find(
      (t) =>
        t.slug === subTagSlug ||
        t.label === subTagSlug ||
        t.label.replace(/\s*AI$/i, '') === subTagSlug
    );
    const resolvedSlug = matched ? matched.slug : 'AI';
    const targetPath = matched ? matched.path : '/AI/';
    setActiveCategory('AI');
    setActiveAiSubTag(resolvedSlug);
    setSelectedPost(null);
    setSelectedDownloadApp(null);
    setStandalonePage(null);
    setVisibleCount(8);

    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // Dedicated Download App selection handler (/Downloads/<slug>)
  const handleSelectDownloadApp = (appSlug: string) => {
    setIsAdminRoute(false);
    const foundApp = DOWNLOAD_APPS.find(
      (a) => a.slug.toLowerCase() === appSlug.toLowerCase()
    );
    if (!foundApp) return;

    setSelectedDownloadApp(foundApp);
    setSelectedPost(null);
    setStandalonePage(null);
    setActiveCategory('Downloads');

    const targetPath = `/Downloads/${foundApp.slug}`;
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, '', targetPath);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Post selection handler with clean path URL (preserves original /{categorySlug}/{slug})
  const handleSelectPost = (post: Post) => {
    setIsAdminRoute(false);
    setSelectedPost(post);
    setSelectedDownloadApp(null);
    setStandalonePage(null);
    setActiveCategory(normalizeCategorySlug(post.categorySlug));

    const targetPath = `/${post.categorySlug}/${post.slug}`;
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, '', targetPath);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Back to home / category handler
  const handleBackToHome = () => {
    setIsAdminRoute(false);
    setSelectedPost(null);
    setSelectedDownloadApp(null);
    setStandalonePage(null);
    const norm = normalizeCategorySlug(activeCategory);
    const targetPath = norm !== 'all' ? `/${norm}/` : '/';
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to Admin CMS (Exit Preview Mode)
  const handleNavigateToAdmin = () => {
    setIsPreviewMode(false);
    setIsAdminRoute(true);
    setSelectedPost(null);
    setSelectedDownloadApp(null);
    setStandalonePage(null);
    if (window.location.pathname !== '/admin') {
      window.history.pushState(null, '', '/admin');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Enter Public Website Preview Mode explicitly
  const handleEnterPreviewMode = () => {
    refreshPublicPosts();
    setIsPreviewMode(true);
    setIsAdminRoute(false);
    window.history.pushState(null, '', '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Standalone Page handler
  const handleOpenStandalonePage = (pageType: StandalonePageType) => {
    setIsAdminRoute(false);
    setStandalonePage(pageType);
    setSelectedPost(null);
    setSelectedDownloadApp(null);
    const targetPath = `/${pageType}`;
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Standalone Admin CMS & Preview Gate (Default View unless Preview Mode is explicitly activated)
  if (!isPreviewMode || isAdminRoute) {
    if (isAdminLoggedIn) {
      return (
        <AdminDashboard
          onLogout={() => {
            setSessionUnlocked(false);
            setIsAdminLoggedIn(false);
          }}
          onViewWebsite={handleEnterPreviewMode}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      );
    }

    return (
      <AdminLogin
        onLoginSuccess={() => {
          setSessionUnlocked(true);
          setIsAdminLoggedIn(true);
        }}
        onBackToSite={handleEnterPreviewMode}
      />
    );
  }

  // 2. Main Public Website View (Rendered only when Preview Mode is explicitly active)
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f7] dark:bg-[#1b1e38] text-[#34495e] dark:text-gray-100 transition-colors duration-300 pb-16 lg:pb-0">
      
      {/* 1. Main Header */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenSpeedTest={() => setIsSpeedTestOpen(true)}
        onOpenRedirectTool={() => setIsRedirectToolOpen(true)}
        onOpenStandalonePage={handleOpenStandalonePage}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}

      />

      {/* 2. Container Site Wrapper */}
      <main
        className={
          !standalonePage && !selectedPost && !selectedDownloadApp && activeCategory === 'Downloads'
            ? 'flex-1 w-full pb-20 lg:pb-0'
            : 'flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 pb-20 lg:pb-4'
        }
      >
        
        {/* Standalone Full Page View (About, Contact, Privacy, Terms, Sitemap) */}
        {standalonePage ? (
          <StandalonePageView
            pageType={standalonePage}
            posts={posts}
            categories={categories}
            onSelectPost={handleSelectPost}
            onSelectCategory={handleSelectCategory}
            onGoHome={handleBackToHome}
            onNavigatePage={handleOpenStandalonePage}
          />
        ) : selectedDownloadApp ? (
          <AppDownloadPageView
            app={selectedDownloadApp}
            allPosts={posts}
            onSelectApp={handleSelectDownloadApp}
            onBackToDownloads={() => handleSelectCategory('Downloads')}
            onBackToHome={() => handleSelectCategory('all')}
            onSelectPost={handleSelectPost}
            onOpenLightbox={(url, title) => setLightboxImage({ url, title })}
            onOpenSeoViewer={() => setIsSeoViewerOpen(true)}
          />
        ) : selectedPost ? (
          <PostPageView
            post={selectedPost}
            allPosts={posts}
            categories={categories}
            activeCategory={activeCategory}
            onSelectCategory={(cat) => handleSelectCategory(cat)}
            onSelectPost={handleSelectPost}
            onBackToHome={handleBackToHome}
            onOpenSeoViewer={() => setIsSeoViewerOpen(true)}
            onOpenImage={(url, title) => setLightboxImage({ url, title })}
            onOpenSpeedTest={() => setIsSpeedTestOpen(true)}
            onOpenRedirectTool={() => setIsRedirectToolOpen(true)}
            onSearchQuery={() => setIsSearchOpen(true)}
          />
        ) : activeCategory === 'Downloads' ? (
          <DownloadsSectionView
            posts={filteredPosts}
            allPosts={posts}
            onSelectPost={handleSelectPost}
            onSelectApp={handleSelectDownloadApp}
            onOpenSeoViewer={() => setIsSeoViewerOpen(true)}
          />
        ) : (
          /* Homepage View / Category Feeds */
          <>
            {/* News Ticker Bar (Sp-shreet) */}
            <NewsTicker
              posts={posts}
              onSelectPost={handleSelectPost}
            />

            {/* Featured Slider / Hero Grid (shown when on homepage) */}
            {activeCategory === 'all' && (
              <FeaturedSlider
                posts={posts}
                onSelectPost={handleSelectPost}
              />
            )}

            {/* Interactive Category Banner - Full width directly below NewsTicker on Category Pages */}
            {activeCategory !== 'all' && currentCategoryInfo && (
              <div className="mb-10">
                <div className="relative bg-gradient-to-l from-[#035dcd] to-blue-700 rounded-[2rem] overflow-hidden shadow-xl border border-blue-400/20">
                  {/* Background Image for /Business/ and /AI/ */}
                  {(currentCategoryInfo.slug === 'Business' || currentCategoryInfo.slug === 'AI') && (
                    <>
                      <img
                        src={
                          currentCategoryInfo.slug === 'Business'
                            ? 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgZ8lEC62o2325188_wn1PQbdDnb02xy0sjyd8XoaMozU2O9FrKdVs_Pm-p0qJe9gGabHosZCsuZs0GTw2By_JkDOWgph0gAZxJYT8l-r4gW6QyHia54l3bnO-cfSIv2lgKOxGkGZ6S3Ri0RRZ5nx16IxB6RxOvagNB2mZJo5mWj6pb7-KgOvNnoUdVJQ4/s2149/%D9%86%D9%85%D9%88%20%D9%85%D8%A7%D9%84%D9%8A%20%D9%85%D8%B4%D8%B1%D9%82%20%D9%81%D9%88%D9%82%20%D9%83%D9%88%D9%85%D8%A9%20%D8%B9%D9%85%D9%84%D8%A7%D8%AA.jpg'
                            : 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgxn60hpX1pcksR4nMAaBKINsveCgSmiVLuoMeU7yokzV1y_B43svp51NTpscL77pP0u3WHmv-hTKUbQU2XDcGqx6ud8exG2cqpRiZZGTiJKyb-WBKgHZp5hR2JosZjfOTAqCqkO8HXxv7AHP2dJmfA085T7IP__HJdqw1b2j7Fs26ICP5TltAAS8K1vxQ/s1600/%D8%AA%D8%B5%D9%85%D9%8A%D9%85%20%D8%A8%D8%AF%D9%88%D9%86%20%D8%B9%D9%86%D9%88%D8%A7%D9%86%20%285%29.png'
                        }
                        alt={currentCategoryInfo.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-l from-slate-950/85 via-[#035dcd]/75 to-slate-950/70" />
                    </>
                  )}

                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 p-7 sm:p-12">
                    {/* Text, Description & Spaced Navigation Area */}
                    <div className="flex-1 text-right w-full">
                      {/* Breadcrumb */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-blue-100/90 mb-4 font-bold">
                        <div className="flex items-center gap-2">
                          <a
                            href="/"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSelectCategory('all');
                            }}
                            className="hover:text-white transition-colors cursor-pointer"
                          >
                            الرئيسية
                          </a>
                          <span>/</span>
                          <a
                            href={`/${currentCategoryInfo.slug}/`}
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentCategoryInfo.slug === 'AI') {
                                handleSelectAiSubTag('AI');
                              } else {
                                handleSelectCategory(currentCategoryInfo.slug);
                              }
                            }}
                            className="text-white hover:underline cursor-pointer"
                          >
                            {currentCategoryInfo.name}
                          </a>
                          {currentCategoryInfo.slug === 'AI' && activeAiSubTag !== 'AI' && (
                            <>
                              <span>/</span>
                              <span className="text-amber-300">
                                {AI_SUB_TAGS.find((t) => t.slug === activeAiSubTag)?.label}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Section Title */}
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
                        {currentCategoryInfo.name}
                      </h1>

                      {/* Section Description directly below Title with clear, harmonious typography */}
                      <p className="text-white/95 text-base sm:text-lg lg:text-xl font-medium leading-loose max-w-3xl">
                        {currentCategoryInfo.description}
                      </p>

                      {/* Extra spacing between Description and Internal Navigation Area */}
                      <nav
                        aria-label={`التنقل الداخلي في قسم ${currentCategoryInfo.name}`}
                        className="mt-8 sm:mt-10 pt-6 border-t border-white/20"
                      >
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                          {currentCategoryInfo.slug === 'AI'
                            ? AI_SUB_TAGS.map((tag) => {
                                const TagIcon = tag.icon;
                                const isActive = activeAiSubTag === tag.slug;
                                return (
                                  <a
                                    key={tag.slug}
                                    href={tag.path}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleSelectAiSubTag(tag.slug);
                                    }}
                                    className={`group px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all backdrop-blur-sm flex items-center gap-2.5 shadow-sm cursor-pointer ${
                                      isActive
                                        ? 'bg-white text-[#035dcd] border-white shadow-md scale-[1.02]'
                                        : 'bg-white/15 hover:bg-white text-white hover:text-[#035dcd] border-white/25'
                                    }`}
                                  >
                                    <TagIcon
                                      className={`w-4 h-4 transition-colors shrink-0 ${
                                        isActive
                                          ? 'text-[#035dcd]'
                                          : 'text-amber-300 group-hover:text-[#035dcd]'
                                      }`}
                                    />
                                    <span>{tag.label}</span>
                                  </a>
                                );
                              })
                            : (currentCategoryInfo.slug === 'Business'
                                ? [
                                    {
                                      label: 'العمل الحر',
                                      icon: Briefcase,
                                      slug: 'telegram-channels-for-making-money',
                                    },
                                    {
                                      label: 'أفكار',
                                      icon: Lightbulb,
                                      slug: 'new-jobs-with-great-pay',
                                    },
                                    {
                                      label: 'التجارة الإلكترونية',
                                      icon: ShoppingBag,
                                      slug: 'profit-from-amazon',
                                    },
                                    {
                                      label: 'التسويق',
                                      icon: Megaphone,
                                      slug: 'best-high-cpc-niches-adsense',
                                    },
                                  ]
                                : currentCategoryInfo.slug === 'Blog'
                                  ? [
                                      {
                                        label: 'شروحات الشبكات والإنترنت',
                                        icon: Cpu,
                                        slug: 'how-to-boost-4g-mobile-signal',
                                      },
                                      {
                                        label: 'أدلة الأجهزة والصيانة',
                                        icon: Layers,
                                        slug: 'scooter-maintenance',
                                      },
                                      {
                                        label: 'أدلة السفر والسياحة',
                                        icon: Sparkles,
                                        slug: 'qatar-travel-guide',
                                      },
                                      {
                                        label: 'شروحات وحلول الألعاب',
                                        icon: Gamepad2,
                                        slug: 'reasons-for-ban-pubg-mobile',
                                      },
                                    ]
                                  : [
                                      {
                                        label: 'تطبيقات السفر والمواصلات',
                                        icon: Sparkles,
                                        slug: 'best-travel-apps-qatar',
                                      },
                                      {
                                        label: 'تطبيق القرآن الكريم بدون نت',
                                        icon: FileCode,
                                        slug: 'download-quran-offline-free',
                                      },
                                      {
                                        label: 'تطبيق ثريدز Threads',
                                        icon: Users,
                                        slug: 'threads-instagram',
                                      },
                                      {
                                        label: 'أدوات تحميل الفيديو والصور',
                                        icon: ExternalLink,
                                        slug: 'download-pinterest-videos',
                                      },
                                    ]
                              ).map((item) => {
                                const TagIcon = item.icon;
                                const targetPost = posts.find(
                                  (p) => p.slug === item.slug
                                );
                                const href = targetPost
                                  ? `/${targetPost.categorySlug}/${targetPost.slug}`
                                  : `/${currentCategoryInfo.slug}/`;
                                return (
                                  <a
                                    key={item.label}
                                    href={href}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (targetPost) {
                                        handleSelectPost(targetPost);
                                      }
                                    }}
                                    className="group px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white text-white hover:text-[#035dcd] border border-white/25 text-xs sm:text-sm font-bold transition-all backdrop-blur-sm flex items-center gap-2.5 shadow-sm cursor-pointer"
                                  >
                                    <TagIcon className="w-4 h-4 text-amber-300 group-hover:text-[#035dcd] transition-colors shrink-0" />
                                    <span>{item.label}</span>
                                  </a>
                                );
                              })}
                        </div>
                      </nav>
                    </div>
                  </div>
                </div>

                {/* AdSense Unit immediately after banner */}
                <div className="mt-8">
                  <AdSenseUnit
                    key={`ad-cat-top-${activeCategory}-${activeAiSubTag}`}
                    slotType="top"
                    postId={`cat-top-${activeCategory}-${activeAiSubTag}`}
                  />
                </div>
              </div>
            )}

            {/* Main Content Layout: Two Columns (Main Content + Sidebar) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 items-start mt-6 w-full max-w-full">
              
              {/* Main Content Column (Spans 2 columns on desktop) */}
              <div className="lg:col-span-2 w-full space-y-8 overflow-visible">
                
                {/* CASE A: HOMEPAGE (activeCategory === 'all') */}
                {activeCategory === 'all' ? (
                  <div className="space-y-8">
                    {/* Category Overview Grid (4 Main Sections) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {INITIAL_CATEGORIES.map((cat) => {
                        const catPostsCount = getSectionPosts(cat.slug).length;
                        return (
                          <a
                            key={cat.slug}
                            href={`/${cat.slug}/`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleSelectCategory(cat.slug);
                            }}
                            className="group relative h-36 rounded-2xl overflow-hidden cursor-pointer border border-gray-100 dark:border-[#2f366b] shadow-sm hover:shadow-md transition-all block"
                          >
                            <img
                              src={cat.image}
                              alt={cat.name}
                              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent flex flex-col justify-end p-4 text-right">
                              <h3 className="text-white font-black text-base mb-1 group-hover:text-blue-400 transition-colors">
                                {cat.name}
                              </h3>
                              <p className="text-gray-200 text-xs leading-relaxed line-clamp-2 opacity-95 group-hover:opacity-100 transition-opacity">
                                {cat.description}
                              </p>
                            </div>
                            <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-blue-600/85 backdrop-blur-sm text-white text-[10px] font-bold">
                              {catPostsCount} مقال
                            </div>
                          </a>
                        );
                      })}
                    </div>

                    {/* The 4 Dedicated Sections in order */}
                    {INITIAL_CATEGORIES.map((cat, idx) => {
                      const catPosts = getSectionPosts(cat.slug);
                      return (
                        <React.Fragment key={cat.slug}>
                          <HomeCategorySection
                            category={cat}
                            posts={catPosts}
                            onSelectCategory={handleSelectCategory}
                            onSelectPost={handleSelectPost}
                            onOpenImage={(url, title) => setLightboxImage({ url, title })}
                          />
                          {idx === 1 && (
                            <AdSenseUnit
                              key="ad-home-after-section-2"
                              slotType="middle"
                              postId="home-after-section-2"
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                ) : (
                  /* CASE B: DEDICATED SECTION VIEW (AI, Business, Blog, Software) */
                  <div className="space-y-6">

                      {/* View Layout Switcher (SeoPlus BlogStylePosts) - Hidden on mobile as requested */}
                      <div className="hidden sm:flex p-5 rounded-2xl bg-white dark:bg-[#252a54] border border-gray-100 dark:border-[#2f366b] shadow-sm flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-gray-400 font-medium">
                          عرض مقالات القسم حسب التنسيق المفضل لديك:
                        </span>

                        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#1e2348] border border-gray-200 dark:border-[#384180] text-xs">
                          <button
                            onClick={() => setFeedLayout('classic')}
                            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                              feedLayout === 'classic'
                                ? 'bg-[#035dcd] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                            title="عرض كلاسيكي عريض (سيو بلس)"
                          >
                            <Columns className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline font-bold">عريض</span>
                          </button>

                          <button
                            onClick={() => setFeedLayout('grid')}
                            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                              feedLayout === 'grid'
                                ? 'bg-[#035dcd] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                            title="عرض شبكي (Grid)"
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline font-bold">شبكة</span>
                          </button>

                          <button
                            onClick={() => setFeedLayout('compact')}
                            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                              feedLayout === 'compact'
                                ? 'bg-[#035dcd] text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                            title="عرض مضغوط وموجز"
                          >
                            <List className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline font-bold">موجز</span>
                          </button>
                        </div>
                      </div>


                    {/* Section Articles Feed */}
                    {displayedPosts.length === 0 ? (
                      <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#252a54] border border-gray-100 dark:border-[#2f366b]">
                        <p className="text-gray-500 font-bold">لا توجد مقالات حالياً في هذا القسم</p>
                        <button
                          onClick={() => handleSelectCategory('all')}
                          className="mt-3 px-4 py-2 rounded-xl bg-[#035dcd] text-white text-xs font-bold"
                        >
                          العودة للرئيسية
                        </button>
                      </div>
                    ) : feedLayout === 'classic' ? (
                      /* Style 1: Wide Classic Cards */
                      <div className="space-y-4">
                        {displayedPosts.map((post) => (
                          <article
                            key={post.id}
                            className="group bg-white dark:bg-[#252a54] rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 dark:border-[#2f366b] transition-all flex flex-col sm:flex-row items-stretch"
                          >
                            <div
                              onClick={() => handleSelectPost(post)}
                              className="relative sm:w-72 sm:min-w-[280px] h-48 sm:h-auto overflow-hidden shrink-0 bg-gray-200 cursor-pointer"
                            >
                              <img
                                src={post.thumbnail}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5">
                                <span className={`text-xs font-bold text-white px-2.5 py-1 rounded shadow-md cat-badge-${post.categoryIndex}`}>
                                  {post.category}
                                </span>
                                {post.categorySlug === 'AI' &&
                                  post.tags
                                    .filter((t) => t !== 'الذكاء الاصطناعي' && t !== 'AI')
                                    .map((subLabel) => (
                                      <span
                                        key={subLabel}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectCategory(subLabel);
                                        }}
                                        className="text-[11px] font-bold text-white bg-slate-900/80 hover:bg-[#035dcd] backdrop-blur-xs px-2.5 py-1 rounded shadow-md transition-colors cursor-pointer"
                                      >
                                        {subLabel}
                                      </span>
                                    ))}
                              </div>

                              <button
                                onClick={(e) => toggleFavorite(post.id, e)}
                                className={`absolute top-3 left-3 p-1.5 rounded-lg backdrop-blur-xs transition-all cursor-pointer ${
                                  isFavorite(post.id)
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-black/60 text-white hover:bg-[#035dcd]'
                                }`}
                                title={isFavorite(post.id) ? 'إزالة من المفضلات' : 'إضافة إلى المفضلات'}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${isFavorite(post.id) ? 'fill-white' : ''}`} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxImage({ url: post.thumbnail, title: post.title });
                                }}
                                className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#035dcd]"
                                title="تكبير الصورة"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-between text-right">
                              <div
                                onClick={() => handleSelectPost(post)}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-[#035dcd]" /> {post.date}
                                  </span>
                                  <span>• {post.readTime}</span>
                                </div>

                                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug group-hover:text-[#035dcd] dark:group-hover:text-blue-400 transition-colors">
                                  {post.title}
                                </h3>

                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-2 leading-relaxed">
                                  {post.snippet}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2f366b] flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <img
                                    src={post.author.avatar}
                                    alt={post.author.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {post.author.name}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleSelectPost(post)}
                                  className="px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[#035dcd] dark:text-blue-300 text-xs font-bold group-hover:bg-[#035dcd] group-hover:text-white transition-colors cursor-pointer"
                                >
                                  اقرأ المقال بالكامل ←
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : feedLayout === 'grid' ? (
                      /* Style 2: Grid Layout */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {displayedPosts.map((post) => (
                          <article
                            key={post.id}
                            className="group bg-white dark:bg-[#252a54] rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 dark:border-[#2f366b] transition-all flex flex-col"
                          >
                            <div
                              onClick={() => handleSelectPost(post)}
                              className="relative h-48 overflow-hidden bg-gray-200 cursor-pointer"
                            >
                              <img
                                src={post.thumbnail}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5">
                                <span className={`text-xs font-bold text-white px-2.5 py-1 rounded shadow-md cat-badge-${post.categoryIndex}`}>
                                  {post.category}
                                </span>
                                {post.categorySlug === 'AI' &&
                                  post.tags
                                    .filter((t) => t !== 'الذكاء الاصطناعي' && t !== 'AI')
                                    .map((subLabel) => (
                                      <span
                                        key={subLabel}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelectCategory(subLabel);
                                        }}
                                        className="text-[11px] font-bold text-white bg-slate-900/80 hover:bg-[#035dcd] backdrop-blur-xs px-2.5 py-1 rounded shadow-md transition-colors cursor-pointer"
                                      >
                                        {subLabel}
                                      </span>
                                    ))}
                              </div>
                              <button
                                onClick={(e) => toggleFavorite(post.id, e)}
                                className={`absolute top-3 left-3 p-1.5 rounded-lg backdrop-blur-xs transition-all cursor-pointer ${
                                  isFavorite(post.id)
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-black/60 text-white hover:bg-[#035dcd]'
                                }`}
                                title={isFavorite(post.id) ? 'إزالة من المفضلات' : 'إضافة إلى المفضلات'}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${isFavorite(post.id) ? 'fill-white' : ''}`} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxImage({ url: post.thumbnail, title: post.title });
                                }}
                                className="absolute bottom-2 left-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#035dcd]"
                                title="تكبير الصورة"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="p-4 flex-1 flex flex-col justify-between text-right">
                              <div
                                onClick={() => handleSelectPost(post)}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1.5">
                                  <Clock className="w-3 h-3 text-[#035dcd]" />
                                  <span>{post.date}</span>
                                </div>

                                <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#035dcd] dark:group-hover:text-blue-400 transition-colors">
                                  {post.title}
                                </h3>

                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-2 leading-relaxed">
                                  {post.snippet}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2f366b] flex items-center justify-between text-xs">
                                <span className="text-gray-400">{post.readTime}</span>
                                <button
                                  onClick={() => handleSelectPost(post)}
                                  className="font-bold text-[#035dcd] dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                  عرض بالكامل ←
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      /* Style 3: Compact List Layout */
                      <div className="space-y-3">
                        {displayedPosts.map((post) => (
                          <article
                            key={post.id}
                            className="group bg-white dark:bg-[#252a54] rounded-xl p-3 shadow-sm hover:shadow-md border border-gray-100 dark:border-[#2f366b] transition-all flex items-center gap-3.5 text-right"
                          >
                            <div
                              onClick={() => handleSelectPost(post)}
                              className="relative w-28 h-20 rounded-lg overflow-hidden shrink-0 bg-gray-200 cursor-pointer"
                            >
                              <img
                                src={post.thumbnail}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-1">
                                <Clock className="w-3 h-3 text-[#035dcd]" />
                                <span>{post.date}</span>
                              </div>

                              <h3
                                onClick={() => handleSelectPost(post)}
                                className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#035dcd] dark:group-hover:text-blue-400 transition-colors leading-snug cursor-pointer"
                              >
                                {post.title}
                              </h3>

                              <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                                <span>{post.readTime}</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => toggleFavorite(post.id, e)}
                                    className={`p-1 rounded transition-colors cursor-pointer ${
                                      isFavorite(post.id)
                                        ? 'text-amber-500'
                                        : 'text-gray-400 hover:text-[#035dcd]'
                                    }`}
                                    title={isFavorite(post.id) ? 'إزالة من المفضلات' : 'إضافة إلى المفضلات'}
                                  >
                                    <Bookmark className={`w-3.5 h-3.5 ${isFavorite(post.id) ? 'fill-amber-500' : ''}`} />
                                  </button>
                                  <button
                                    onClick={() => handleSelectPost(post)}
                                    className="text-[#035dcd] dark:text-blue-400 font-bold hover:underline cursor-pointer"
                                  >
                                    قراءة ←
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {/* Load More Button */}
                    {visibleCount < filteredPosts.length && (
                      <div className="pt-6 text-center">
                        <button
                          onClick={handleLoadMore}
                          disabled={isLoadingMore}
                          className="px-8 py-3 rounded-xl bg-[#035dcd] hover:bg-[#02479e] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isLoadingMore ? 'جاري تحميل المزيد من المقالات...' : 'تحميل المزيد من المشاركات'}
                        </button>
                      </div>
                    )}

                    {/* Bottom AdSense Unit for Category & Sub-section Pages */}
                    <AdSenseUnit
                      key={`ad-cat-bot-${activeCategory}-${activeAiSubTag}`}
                      slotType="bottom"
                      postId={`cat-bot-${activeCategory}-${activeAiSubTag}`}
                    />
                  </div>
                )}

              </div>

              {/* Sidebar Column */}
              <div className="lg:col-span-1">
                <Sidebar
                  categories={categories}
                  posts={posts}
                  activeCategory={activeCategory}
                  onSelectCategory={handleSelectCategory}
                  onSelectPost={handleSelectPost}
                  onOpenSpeedTest={() => setIsSpeedTestOpen(true)}
                  onOpenRedirectTool={() => setIsRedirectToolOpen(true)}
                  onOpenSeoViewer={() => setIsSeoViewerOpen(true)}
                  onSearchQuery={() => setIsSearchOpen(true)}
                />
              </div>

            </div>
          </>
        )}

      </main>

      {/* 3. Footer */}
      <Footer
        onOpenStandalonePage={handleOpenStandalonePage}
        onOpenSpeedTest={() => setIsSpeedTestOpen(true)}
        onSelectCategory={handleSelectCategory}
        onOpenAdmin={handleNavigateToAdmin}
      />

      {/* 4. Mobile Quick Bottom Navigation */}
      <MobileBottomNav
        onGoHome={() => handleSelectCategory('all')}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* 5. Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeCategory={activeCategory}
        onSelectCategory={handleSelectCategory}
        onOpenStandalonePage={handleOpenStandalonePage}
        onOpenSpeedTest={() => setIsSpeedTestOpen(true)}
        onOpenRedirectTool={() => setIsRedirectToolOpen(true)}
        posts={posts}
        onSelectPost={handleSelectPost}
        onOpenAdmin={handleNavigateToAdmin}
      />

      {/* 6. Modals */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        posts={posts}
        onSelectPost={handleSelectPost}
      />

      <SpeedTestModal
        isOpen={isSpeedTestOpen}
        onClose={() => setIsSpeedTestOpen(false)}
      />

      <RedirectToolModal
        isOpen={isRedirectToolOpen}
        onClose={() => setIsRedirectToolOpen(false)}
      />

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      <PagesModal
        pageType={activePage}
        onClose={() => setActivePage(null)}
      />

      {/* SEO & Schema.org JSON-LD Inspector Modal */}
      <SeoSchemaViewerModal
        isOpen={isSeoViewerOpen}
        onClose={() => setIsSeoViewerOpen(false)}
        post={selectedPost}
        downloadApp={selectedDownloadApp}
        activeCategory={activeCategory}
      />

      {/* Sitemap.xml Modal Explorer */}
      <SitemapModal
        isOpen={isSitemapOpen}
        onClose={() => setIsSitemapOpen(false)}
        posts={posts}
        onSelectPost={handleSelectPost}
      />



      {/* Fullscreen High-Resolution Image Lightbox */}
      <ImageLightbox
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.url || ''}
        imageTitle={lightboxImage?.title}
      />

      {/* PWA Offline Mode Connectivity Indicator */}
      <OfflineIndicator />

      {/* Floating Preview Mode Control Bar to return to Admin CMS */}
      <div className="fixed bottom-20 lg:bottom-6 left-4 z-50 flex items-center gap-2 bg-[#141b3d]/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-blue-500/30" dir="rtl">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-bold text-blue-100">وضع معاينة الموقع</span>
        <button
          type="button"
          onClick={handleNavigateToAdmin}
          className="mr-2 px-3 py-1 rounded-xl bg-[#035dcd] hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
        >
          العودة للوحة التحكم CMS ←
        </button>
      </div>

    </div>
  );
}
