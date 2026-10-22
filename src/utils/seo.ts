import { Post } from '../types';
import { DownloadAppItem, DOWNLOAD_APPS } from '../data/downloadsApps';
import { INITIAL_POSTS, INITIAL_CATEGORIES } from '../data/posts';

export interface SeoConfig {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  logoUrl: string;
}

export const DEFAULT_SEO_CONFIG: SeoConfig = {
  siteName: 'العنكبوت للمعلومات',
  siteUrl: 'https://www.information-net.com',
  siteDescription:
    'موقع العنكبوت للمعلومات information-net هو مدونة تعليمية شاملة تغطي الألعاب، البرامج، الكتب، التكنولوجيا، الذكاء الاصطناعي، الشروحات، وببجي موبايل.',
  logoUrl: 'https://www.information-net.com/logo-spider.png',
};

export function getOrganizationSchema(config: SeoConfig = DEFAULT_SEO_CONFIG) {
  return {
    '@type': 'Organization',
    '@id': `${config.siteUrl}/#organization`,
    name: 'العنكبوت للمعلومات',
    alternateName: 'information-net',
    url: `${config.siteUrl}/`,
    logo: {
      '@type': 'ImageObject',
      '@id': `${config.siteUrl}/#logo`,
      url: 'https://www.information-net.com/logo-spider.png',
      contentUrl: 'https://www.information-net.com/logo-spider.png',
      width: 256,
      height: 256,
    },
  };
}

/**
 * Generates the Schema.org WebSite JSON-LD without SearchAction
 */
export function getWebSiteSchema(config: SeoConfig = DEFAULT_SEO_CONFIG) {
  return {
    '@type': 'WebSite',
    '@id': `${config.siteUrl}/#website`,
    name: config.siteName,
    url: `${config.siteUrl}/`,
    inLanguage: 'ar',
    publisher: {
      '@id': `${config.siteUrl}/#organization`,
    },
  };
}

export function getWebPageSchema(
  url: string,
  name: string,
  description: string,
  pageType: 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ContactPage' = 'WebPage',
  breadcrumbId?: string,
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  return {
    '@type': pageType,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    isPartOf: {
      '@id': `${config.siteUrl}/#website`,
    },
    inLanguage: 'ar',
    ...(breadcrumbId ? { breadcrumb: { '@id': breadcrumbId } } : {}),
  };
}

function countWordsInHtml(htmlOrText: string): number {
  const plain = String(htmlOrText || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return 0;
  return plain.split(' ').length;
}

/**
 * Generates Schema.org SoftwareApplication / MobileApplication JSON-LD for dedicated App Download Pages
 * (Without aggregateRating)
 */
export function getSoftwareAppSchema(
  app: DownloadAppItem,
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  const appUrl = `${config.siteUrl}/Downloads/${app.slug}`;
  const iconUrl = app.icon.startsWith('http')
    ? app.icon
    : `${config.siteUrl}${app.icon}`;

  return {
    '@type': ['SoftwareApplication', 'MobileApplication'],
    '@id': `${appUrl}#software`,
    name: app.arabicName,
    alternateName: app.name,
    operatingSystem: 'Android, iOS',
    applicationCategory:
      app.filterKey === 'games' ? 'GameApplication' : 'SocialNetworkingApplication',
    softwareVersion: app.version,
    fileSize: app.size,
    datePublished: app.updateDate,
    dateModified: app.updateDate,
    inLanguage: 'ar',
    isAccessibleForFree: true,
    url: appUrl,
    downloadUrl: app.googlePlayUrl,
    installUrl: app.googlePlayUrl,
    image: iconUrl,
    screenshot: app.screenshots.map((s) => ({
      '@type': 'ImageObject',
      url: s.url,
      caption: s.caption,
    })),
    description: app.fullDescription.join(' '),
    publisher: {
      '@id': `${config.siteUrl}/#organization`,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: app.googlePlayUrl,
    },
  };
}

/**
 * Generates Schema.org CollectionPage + ItemList + BreadcrumbList for /Downloads/
 */
export function getDownloadsCollectionSchema(
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  const pageUrl = `${config.siteUrl}/Downloads/`;
  const pageTitle = `تطبيقات العنكبوت - دليل تحميل التطبيقات والألعاب مجاناً | ${config.siteName}`;
  const pageDesc =
    'اكتشف أفضل التطبيقات والألعاب للأندرويد والآيفون مثل ببجي موبايل ودوري كرة القدم 2026 بروابط رسمية مباشرة وآمنة.';
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(config),
      getWebSiteSchema(config),
      getWebPageSchema(
        pageUrl,
        pageTitle,
        pageDesc,
        'CollectionPage',
        breadcrumbId,
        config
      ),
      {
        '@type': 'ItemList',
        '@id': `${pageUrl}#itemlist`,
        name: 'قائمة تطبيقات وألعاب متجر العنكبوت',
        numberOfItems: DOWNLOAD_APPS.length,
        itemListElement: DOWNLOAD_APPS.map((app, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: app.arabicName,
          url: `${config.siteUrl}/Downloads/${app.slug}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'الرئيسية',
            item: `${config.siteUrl}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'التحميلات',
            item: pageUrl,
          },
        ],
      },
    ],
  };
}

export function getCategoryGraphSchema(
  categorySlug: string,
  catName: string,
  catDesc: string,
  catUrl: string,
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  if (categorySlug.toLowerCase() === 'downloads') {
    return getDownloadsCollectionSchema(config);
  }
  const catPosts = INITIAL_POSTS.filter(
    (p) => p.categorySlug.toLowerCase() === categorySlug.toLowerCase()
  );
  const breadcrumbId = `${catUrl}#breadcrumb`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(config),
      getWebSiteSchema(config),
      getWebPageSchema(
        catUrl,
        `${catName} | ${config.siteName}`,
        catDesc,
        'CollectionPage',
        breadcrumbId,
        config
      ),
      {
        '@type': 'ItemList',
        '@id': `${catUrl}#itemlist`,
        name: catName,
        numberOfItems: catPosts.length,
        itemListElement: catPosts.map((p, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: p.title,
          url: p.canonicalUrl || `${config.siteUrl}/${p.categorySlug}/${p.slug}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'الرئيسية',
            item: `${config.siteUrl}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: catName,
            item: catUrl,
          },
        ],
      },
    ],
  };
}

export const HOME_PAGE_TITLE = 'مدونة تقنية وتعليمية شاملة | العنكبوت للمعلومات';

export function formatArticleTitle(
  postTitle: string,
  siteName: string = DEFAULT_SEO_CONFIG.siteName
): string {
  const combined = `${postTitle} | ${siteName}`;
  return combined.length > 60 ? postTitle : combined;
}

export function formatMetaDescription(
  snippet: string,
  intro?: string,
  rawContent?: string
): string {
  const stripHtml = (s: string) =>
    String(s || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  let cleanSnippet = stripHtml(snippet).replace(/\.{2,}$/, '').trim();
  const cleanIntro = stripHtml(intro || '').replace(/\.{2,}$/, '').trim();
  const cleanRaw = stripHtml(rawContent || '');

  let sourceText = cleanSnippet;
  if (cleanSnippet.length < 50) {
    sourceText = cleanIntro.length >= 50 ? cleanIntro : cleanRaw || cleanIntro || cleanSnippet;
  } else if (cleanRaw.length >= 160 && snippet.trim().endsWith('...')) {
    sourceText = cleanRaw;
  }

  if (sourceText.length <= 160) {
    return sourceText;
  }

  // Truncate at a word boundary so final length (with "...") is between 150 and 160 chars
  const maxBase = 157;
  const minBase = 147;
  const slice = sourceText.slice(0, maxBase);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace >= minBase) {
    return `${slice.slice(0, lastSpace).trim()}...`;
  }
  return `${sourceText.slice(0, 155).trim()}...`;
}

/**
 * Generates the BlogPosting Schema.org JSON-LD node
 */
export function getArticleSchema(
  post: Post,
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  const postUrl =
    post.canonicalUrl || `${config.siteUrl}/${post.categorySlug}/${post.slug}`;
  const headline =
    post.title.length > 110
      ? `${post.title.slice(0, 107).trim()}...`
      : post.title;
  const modifiedDate =
    (post as { modifiedIso?: string }).modifiedIso || post.isoDate;
  const desc = formatMetaDescription(
    post.snippet,
    post.content?.intro,
    post.rawContent
  );
  const wordCount = countWordsInHtml(
    post.rawContent ||
      [
        post.content.intro,
        ...(post.content.sections || []).map((s) => `${s.title} ${s.body.join(' ')}`),
      ].join(' ')
  );

  return {
    '@type': 'BlogPosting',
    '@id': `${postUrl}#article`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${postUrl}#webpage`,
    },
    headline,
    description: desc,
    image: {
      '@type': 'ImageObject',
      url: post.thumbnail,
    },
    datePublished: post.isoDate,
    dateModified: modifiedDate,
    author: {
      '@id': `${config.siteUrl}/#organization`,
      '@type': 'Organization',
      name: 'العنكبوت للمعلومات',
    },
    publisher: {
      '@id': `${config.siteUrl}/#organization`,
    },
    articleSection: post.category,
    keywords: post.tags.join(', '),
    inLanguage: 'ar',
    wordCount,
  };
}

/**
 * Generates BreadcrumbList Schema.org JSON-LD for an article
 */
export function getBreadcrumbSchema(
  post: Post,
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  const postUrl =
    post.canonicalUrl || `${config.siteUrl}/${post.categorySlug}/${post.slug}`;
  return {
    '@type': 'BreadcrumbList',
    '@id': `${postUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: config.siteName,
        item: `${config.siteUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: post.category,
        item: `${config.siteUrl}/${post.categorySlug}/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };
}

export function getArticleGraphSchema(
  post: Post,
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  const postUrl =
    post.canonicalUrl || `${config.siteUrl}/${post.categorySlug}/${post.slug}`;
  const breadcrumb = getBreadcrumbSchema(post, config);
  const desc = formatMetaDescription(
    post.snippet,
    post.content?.intro,
    post.rawContent
  );
  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(config),
      getWebSiteSchema(config),
      getWebPageSchema(
        postUrl,
        formatArticleTitle(post.title, config.siteName),
        desc,
        'WebPage',
        `${postUrl}#breadcrumb`,
        config
      ),
      getArticleSchema(post, config),
      breadcrumb,
    ],
  };
}

export function getAppBreadcrumbSchema(
  app: DownloadAppItem,
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  const appUrl = `${config.siteUrl}/Downloads/${app.slug}`;
  return {
    '@type': 'BreadcrumbList',
    '@id': `${appUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'الرئيسية',
        item: `${config.siteUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'التحميلات - تطبيقات أندرويد',
        item: `${config.siteUrl}/Downloads/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: app.arabicName,
        item: appUrl,
      },
    ],
  };
}

export function getAppFaqSchema(app: DownloadAppItem) {
  if (!app.faqs || app.faqs.length === 0) return null;
  return {
    '@type': 'FAQPage',
    '@id': `https://www.information-net.com/Downloads/${app.slug}#faq`,
    mainEntity: app.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function getFullAppGraphSchema(
  app: DownloadAppItem,
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  const appUrl = `${config.siteUrl}/Downloads/${app.slug}`;
  const appTitle = `${app.h1Title} | ${config.siteName}`;
  const appDesc = app.fullDescription[0] || app.shortDescription;
  const softwareLd = getSoftwareAppSchema(app, config);
  const breadcrumbLd = getAppBreadcrumbSchema(app, config);
  const faqLd = getAppFaqSchema(app);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(config),
      getWebSiteSchema(config),
      getWebPageSchema(
        appUrl,
        appTitle,
        appDesc,
        'WebPage',
        `${appUrl}#breadcrumb`,
        config
      ),
      softwareLd,
      breadcrumbLd,
      ...(faqLd ? [faqLd] : []),
    ],
  };
}

export function getHomeGraphSchema(config: SeoConfig = DEFAULT_SEO_CONFIG) {
  const homeUrl = `${config.siteUrl}/`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(config),
      getWebSiteSchema(config),
      getWebPageSchema(
        homeUrl,
        HOME_PAGE_TITLE,
        config.siteDescription,
        'WebPage',
        undefined,
        config
      ),
    ],
  };
}

export function getStandalonePageGraphSchema(
  pageKey: string,
  title: string,
  description: string,
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  const pageUrl = `${config.siteUrl}/${pageKey}`;
  const sp = pageKey.toLowerCase();
  const pageType: 'AboutPage' | 'ContactPage' | 'WebPage' =
    sp === 'about'
      ? 'AboutPage'
      : sp === 'contact'
      ? 'ContactPage'
      : 'WebPage';
  const breadcrumbId = `${pageUrl}#breadcrumb`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(config),
      getWebSiteSchema(config),
      getWebPageSchema(
        pageUrl,
        `${title} | ${config.siteName}`,
        description,
        pageType,
        breadcrumbId,
        config
      ),
      {
        '@type': 'BreadcrumbList',
        '@id': breadcrumbId,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'الرئيسية',
            item: `${config.siteUrl}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: title,
            item: pageUrl,
          },
        ],
      },
    ],
  };
}

/**
 * Updates head metadata and updates the single #ssr-schema JSON-LD script on the client
 */
export function applySeoMetadata(
  post: Post | null,
  activeCategory: string = 'all',
  standalonePage: string | null = null,
  selectedDownloadApp: DownloadAppItem | null = null,
  config: SeoConfig = DEFAULT_SEO_CONFIG
) {
  if (typeof document === 'undefined') return;

  const currentUrl =
    typeof window !== 'undefined' ? window.location.href : config.siteUrl;

  updateMeta('property', 'og:locale', 'ar_AR');

  if (selectedDownloadApp) {
    const appTitle = formatArticleTitle(selectedDownloadApp.h1Title, config.siteName);
    const appDesc = formatMetaDescription(
      selectedDownloadApp.fullDescription[0] || selectedDownloadApp.shortDescription
    );
    const appUrl = `${config.siteUrl}/Downloads/${selectedDownloadApp.slug}`;
    const appImage = selectedDownloadApp.icon.startsWith('http')
      ? selectedDownloadApp.icon
      : `${config.siteUrl}${selectedDownloadApp.icon}`;

    document.title = appTitle;
    updateMeta('name', 'description', appDesc);

    updateMeta('property', 'og:title', appTitle);
    updateMeta('property', 'og:description', appDesc);
    updateMeta('property', 'og:image', appImage);
    updateMeta('property', 'og:image:alt', selectedDownloadApp.arabicName);
    updateMeta('property', 'og:type', 'website');
    updateMeta('property', 'og:url', appUrl);

    updateMeta('name', 'twitter:title', appTitle);
    updateMeta('name', 'twitter:description', appDesc);
    updateMeta('name', 'twitter:image', appImage);
    updateMeta('name', 'twitter:card', 'summary_large_image');

    updateCanonical(appUrl);
    injectSingleSchema(getFullAppGraphSchema(selectedDownloadApp, config));
    return;
  }

  if (post) {
    const computedTitle = formatArticleTitle(post.seoTitle || post.title, config.siteName);
    const computedDesc = formatMetaDescription(
      post.seoDescription || post.snippet,
      post.content?.intro,
      post.rawContent
    );
    const modifiedDate =
      (post as { modifiedIso?: string }).modifiedIso || post.updatedAt || post.isoDate;

    document.title = computedTitle;
    updateMeta('name', 'description', computedDesc);

    if (post.noindex) {
      updateMeta('name', 'robots', 'noindex, nofollow');
    } else {
      updateMeta('name', 'robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    }

    updateMeta('property', 'og:title', computedTitle);
    updateMeta('property', 'og:description', computedDesc);
    updateMeta('property', 'og:image', post.thumbnail);
    updateMeta('property', 'og:image:alt', post.imageAlt || post.title);
    updateMeta('property', 'og:type', 'article');
    updateMeta('property', 'og:url', currentUrl);
    updateMeta('property', 'article:section', post.category);
    updateMeta('property', 'article:published_time', post.isoDate);
    updateMeta('property', 'article:modified_time', modifiedDate);
    updateMeta('property', 'article:author', post.author.name);
    updateArticleTags(post.tags);

    updateMeta('name', 'twitter:title', computedTitle);
    updateMeta('name', 'twitter:description', computedDesc);
    updateMeta('name', 'twitter:image', post.thumbnail);
    updateMeta('name', 'twitter:card', 'summary_large_image');

    updateCanonical(
      post.canonicalUrl ||
        `${config.siteUrl}/${post.categorySlug}/${post.slug}`
    );

    injectSingleSchema(getArticleGraphSchema(post, config));
  } else if (activeCategory && activeCategory !== 'all') {
    const matchedCat = INITIAL_CATEGORIES.find(
      (c) => c.slug.toLowerCase() === activeCategory.toLowerCase()
    );
    const categoryNames: Record<string, string> = {
      AI: 'الذكاء الاصطناعي',
      Business: 'المال والأعمال',
      Blog: 'المدونة',
      Downloads: 'تطبيقات العنكبوت - دليل تحميل التطبيقات والألعاب مجاناً',
      Software: 'البرامج',
      Games: 'الألعاب',
      Education: 'مقالات تعليمية',
    };
    const categoryDescriptions: Record<string, string> = {
      AI: 'اكتشف أفضل أدوات الذكاء الاصطناعي وتطبيقات AI، مع شروحات بسيطة للمبتدئين، وروابط تحميل البرامج، ومقارنة أفضل الأدوات، وطرق الربح من الذكاء الاصطناعي.',
      Business:
        'محتوى يساعد الزائر على التعرّف على مجالات المال والأعمال والخدمات الرقمية وأدوات الإنتاجية ذات الصلة.',
      Blog: 'تصفّح أحدث المقالات والشروحات والأدلة المنشورة على موقع العنكبوت للمعلومات.',
      Downloads:
        'دليل تحميل التطبيقات والألعاب مجاناً للاندرويد والأيفون: حمّل ببجي موبايل PUBG MOBILE، دوري كرة القدم 2026، واتساب مسنجر، وفري فاير بروابط رسمية مباشرة وآمنة.',
      Software:
        'شروحات ومراجعات أهم برامج الكمبيوتر والهواتف الذكية، أدوات النظام، وتطبيقات الإنتاجية والحماية.',
      Games:
        'أحدث أخبار وشروحات الألعاب الإلكترونية، إعدادات ببجي موبايل، الحساسية، التحديثات، وحلول مشاكل الألعاب على الهواتف والكمبيوتر.',
      Education:
        'دروس وشروحات تقنية وتعليمية مبسطة خطوة بخطوة في مجالات البرمجة، الإنترنت، الأنظمة، والمهارات الرقمية.',
    };
    const canonicalSlug = matchedCat ? matchedCat.slug : activeCategory;
    const catName =
      activeCategory === 'Downloads'
        ? categoryNames.Downloads
        : matchedCat?.name || categoryNames[activeCategory] || activeCategory;
    const catDesc = formatMetaDescription(
      activeCategory === 'Downloads'
        ? categoryDescriptions.Downloads
        : matchedCat?.description ||
            categoryDescriptions[activeCategory] ||
            `تصفح أحدث وأبرز مقالات وشروحات قسم ${catName} في موقع العنكبوت للمعلومات.`
    );
    const catUrl = `${config.siteUrl}/${canonicalSlug}/`;
    const catFullTitle = formatArticleTitle(catName, config.siteName);

    document.title = catFullTitle;
    updateMeta('name', 'description', catDesc);

    updateMeta('property', 'og:title', catFullTitle);
    updateMeta('property', 'og:description', catDesc);
    updateMeta('property', 'og:image', config.logoUrl);
    updateMeta('property', 'og:image:alt', catName);
    updateMeta('property', 'og:type', 'website');
    updateMeta('property', 'og:url', catUrl);

    updateMeta('name', 'twitter:title', catFullTitle);
    updateMeta('name', 'twitter:description', catDesc);
    updateMeta('name', 'twitter:image', config.logoUrl);

    updateCanonical(catUrl);
    injectSingleSchema(
      getCategoryGraphSchema(canonicalSlug, catName, catDesc, catUrl, config)
    );
  } else if (standalonePage) {
    const pageTitles: Record<string, string> = {
      about: 'من نحن - نبذة عن الموقع ورسالتنا',
      contact: 'اتصل بنا - قنوات التواصل ونموذج المراسلة',
      privacy: 'سياسة الخصوصية - معايير الأمان وحماية البيانات',
      terms: 'اتفاقية المستخدم - شروط الاستخدام وحقوق الملكية',
      sitemap: 'خريطة الموقع - فهرس المقالات والأقسام',
    };
    const pageDescriptions: Record<string, string> = {
      about:
        'تعرف على موقع العنكبوت للمعلومات، رسالتنا التقنية، وفريق العمل الذي يسعى لتقديم أفضل المحتوى العربي.',
      contact:
        'تواصل معنا عبر قنواتنا الرسمية أو نموذج الاتصال المباشر للاستفسارات والاقتراحات.',
      privacy:
        'نحن نلتزم بأقصى معايير الخصوصية وحماية بيانات الزوار وفقاً للمعايير الدولية وجوجل أدسنس.',
      terms:
        'شروط استخدام موقع العنكبوت للمعلومات وحدود حقوق الملكية الفكرية للمحتوى المنشور.',
      sitemap:
        'تصفح كافة أقسام ومقالات موقع العنكبوت للمعلومات من خلال الفهرس الديناميكي الشامل.',
    };

    const title = pageTitles[standalonePage] || 'صفحة مستقلة';
    const desc = formatMetaDescription(
      pageDescriptions[standalonePage] || config.siteDescription
    );
    const pageUrl = `${config.siteUrl}/${standalonePage}`;
    const fullTitle = formatArticleTitle(title, config.siteName);

    document.title = fullTitle;
    updateMeta('name', 'description', desc);

    updateMeta('property', 'og:title', fullTitle);
    updateMeta('property', 'og:description', desc);
    updateMeta('property', 'og:image', config.logoUrl);
    updateMeta('property', 'og:image:alt', title);
    updateMeta('property', 'og:type', 'website');
    updateMeta('property', 'og:url', pageUrl);

    updateMeta('name', 'twitter:title', fullTitle);
    updateMeta('name', 'twitter:description', desc);
    updateMeta('name', 'twitter:image', config.logoUrl);

    updateCanonical(pageUrl);
    injectSingleSchema(
      getStandalonePageGraphSchema(standalonePage, title, desc, config)
    );
  } else {
    const homeDesc = formatMetaDescription(config.siteDescription);
    document.title = HOME_PAGE_TITLE;
    updateMeta('name', 'description', homeDesc);

    updateMeta('property', 'og:title', HOME_PAGE_TITLE);
    updateMeta('property', 'og:description', homeDesc);
    updateMeta('property', 'og:image', config.logoUrl);
    updateMeta('property', 'og:image:alt', config.siteName);
    updateMeta('property', 'og:type', 'website');
    updateMeta('property', 'og:url', `${config.siteUrl}/`);

    updateMeta('name', 'twitter:title', HOME_PAGE_TITLE);
    updateMeta('name', 'twitter:description', homeDesc);
    updateMeta('name', 'twitter:image', config.logoUrl);

    updateCanonical(`${config.siteUrl}/`);
    injectSingleSchema(getHomeGraphSchema(config));
  }
}

export function isKnownRoute(path: string, customPosts?: Post[]): boolean {
  const pathname = (path || '/').split('?')[0].split('#')[0];
  const clean = pathname.replace(/^\/+|\/+$/g, '').trim();

  if (!clean) {
    return true;
  }

  const postsToCheck = customPosts && customPosts.length > 0 ? customPosts : INITIAL_POSTS;
  const parts = clean.split('/');
  if (parts.some((p) => !p)) {
    return false;
  }

  if (parts.length === 1) {
    const seg = parts[0].toLowerCase();

    // Recognize admin route
    if (seg === 'admin') {
      return true;
    }

    // Recognize tools route
    if (seg === 'tools') {
      return true;
    }

    const standalonePages = ['about', 'contact', 'privacy', 'terms', 'sitemap'];
    if (standalonePages.includes(seg)) {
      return true;
    }

    if (INITIAL_CATEGORIES.some((c) => c.slug.toLowerCase() === seg)) {
      return true;
    }

    if (postsToCheck.some((p) => p.categorySlug.toLowerCase() === seg)) {
      return true;
    }

    // Direct single slug match
    if (postsToCheck.some((p) => p.slug.toLowerCase() === seg)) {
      return true;
    }

    return false;
  }

  if (parts.length >= 2) {
    const seg0 = parts[0].toLowerCase();
    const seg1 = parts[1].toLowerCase();

    // Recognize nested admin routes
    if (seg0 === 'admin') {
      return true;
    }

    // Recognize nested tools routes
    if (seg0 === 'tools') {
      return true;
    }

    if (
      seg0 === 'downloads' &&
      DOWNLOAD_APPS.some((a) => a.slug.toLowerCase() === seg1)
    ) {
      return true;
    }

    const aiSubRoutes = ['tools', 'downloads', 'earning', 'tools-comparison'];
    if (seg0 === 'ai' && aiSubRoutes.includes(seg1)) {
      return true;
    }

    if (
      postsToCheck.some(
        (p) =>
          p.categorySlug.toLowerCase() === seg0 &&
          p.slug.toLowerCase() === seg1
      ) ||
      postsToCheck.some((p) => p.slug.toLowerCase() === seg1)
    ) {
      return true;
    }

    return false;
  }

  return false;
}

export function renderNotFoundHtml(html: string): string {
  const notFoundTitle = 'الصفحة غير موجودة | العنكبوت للمعلومات';
  const notFoundDesc = 'عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.';
  let html404 = html;

  if (/<title>[\s\S]*?<\/title>/i.test(html404)) {
    html404 = html404.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(notFoundTitle)}</title>`
    );
  } else {
    html404 = html404.replace(
      /<head>/i,
      `<head>\n    <title>${escapeHtml(notFoundTitle)}</title>`
    );
  }

  html404 = html404.replace(
    /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(notFoundDesc)}" />`
  );

  if (/<meta\s+name=["']robots["'][^>]*>/i.test(html404)) {
    html404 = html404.replace(
      /<meta\s+name=["']robots["'][^>]*>/i,
      `<meta name="robots" content="noindex, follow" />`
    );
  } else {
    html404 = html404.replace(
      '</head>',
      `    <meta name="robots" content="noindex, follow" />\n  </head>`
    );
  }

  html404 = html404.replace(
    /<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi,
    ''
  );
  html404 = html404.replace(
    /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    ''
  );

  html404 = html404.replace(
    /<div\s+id=["']root["']\s*>[\s\S]*?<\/div>/i,
    `<div id="root"><main dir="rtl" lang="ar" style="max-width:800px;margin:0 auto;padding:32px;text-align:center;"><h1>الصفحة غير موجودة</h1><p>${escapeHtml(notFoundDesc)}</p><p><a href="/">العودة إلى الصفحة الرئيسية</a></p></main></div>`
  );

  return html404;
}

export function getRouteHttpStatus(requestPath: string): number {
  return isKnownRoute(requestPath) ? 200 : 404;
}

/**
 * Server-Side SEO Injector: transforms index.html per URL route so Googlebot & crawlers
 * see exact <title>, <meta name="description">, <link rel="canonical">, OpenGraph,
 * a single <script id="ssr-schema" type="application/ld+json"> with @graph,
 * and semantic crawlable HTML without waiting for client-side JavaScript execution.
 */
export function injectServerSideSeo(
  rawHtml: string,
  requestPath: string,
  config: SeoConfig = DEFAULT_SEO_CONFIG,
  customPosts?: Post[]
): string {
  const postsToCheck = customPosts && customPosts.length > 0 ? customPosts : INITIAL_POSTS;
  if (!isKnownRoute(requestPath, postsToCheck)) {
    return renderNotFoundHtml(rawHtml);
  }
  const clean = (requestPath || '/').split('?')[0].replace(/^\/+|\/+$/g, '').trim();
  const parts = clean ? clean.split('/') : [];

  let title = HOME_PAGE_TITLE;
  let description = formatMetaDescription(config.siteDescription);
  let canonical = `${config.siteUrl}/`;
  let ogImage = `${config.siteUrl}/og-image.png`;
  let ogImageAlt = config.siteName;
  let ogType = 'website';
  let extraHeadMeta = '';
  let schemaGraph: object = getHomeGraphSchema(config);
  let ssrContentHtml = '';

  // 0. Check if Admin Route (/admin or /admin/*)
  if (parts.length >= 1 && parts[0].toLowerCase() === 'admin') {
    title = formatArticleTitle('لوحة التحكم وإدارة المحتوى', config.siteName);
    description = 'لوحة إدارة المقالات والمحتوى لموقع العنكبوت للمعلومات';
    canonical = `${config.siteUrl}/admin`;
    let html = rawHtml;
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
    html = html.replace(
      /<meta\s+name=["']robots["'][^>]*\/?>/i,
      '<meta name="robots" content="noindex, nofollow" />'
    );
    return html;
  }

  // 1. Check if /Downloads/<appSlug>
  if (parts.length === 2 && parts[0].toLowerCase() === 'downloads') {
    const appSlug = parts[1].toLowerCase();
    const matchedApp = DOWNLOAD_APPS.find((a) => a.slug.toLowerCase() === appSlug);
    if (matchedApp) {
      title = formatArticleTitle(matchedApp.h1Title, config.siteName);
      description = formatMetaDescription(
        matchedApp.fullDescription[0] || matchedApp.shortDescription
      );
      canonical = `${config.siteUrl}/Downloads/${matchedApp.slug}`;
      ogImage = matchedApp.icon.startsWith('http')
        ? matchedApp.icon
        : `${config.siteUrl}${matchedApp.icon}`;
      ogImageAlt = matchedApp.arabicName;
      schemaGraph = getFullAppGraphSchema(matchedApp, config);

      const renderedSectionsHtml = (matchedApp.articleSections || [])
        .map((sec) => {
          const pHtml = (sec.paragraphs || [])
            .map((p) => `<p>${escapeHtml(p)}</p>`)
            .join('\n');
          const subHtml = (sec.subSections || [])
            .map(
              (sub) =>
                `<h3>${escapeHtml(sub.subHeading)}</h3>\n<p>${escapeHtml(sub.text)}</p>`
            )
            .join('\n');
          const ulHtml =
            sec.bullets && sec.bullets.length > 0
              ? `<ul>${sec.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>`
              : '';
          return `<h2>${escapeHtml(sec.heading)}</h2>\n${pHtml}\n${subHtml}\n${ulHtml}`;
        })
        .join('\n');

      const renderedFaqsHtml =
        matchedApp.faqs && matchedApp.faqs.length > 0
          ? `<h2>الأسئلة الشائعة حول ${escapeHtml(matchedApp.arabicName)}</h2>\n` +
            matchedApp.faqs
              .map(
                (faq) =>
                  `<h3>${escapeHtml(faq.question)}</h3>\n<p>${escapeHtml(faq.answer)}</p>`
              )
              .join('\n')
          : '';

      ssrContentHtml = `
        <article dir="rtl" lang="ar" style="max-width:1100px;margin:0 auto;padding:16px;">
          <nav aria-label="Breadcrumb"><a href="/">الرئيسية</a> &rsaquo; <a href="/Downloads/">التطبيقات أندرويد</a> &rsaquo; <span>${escapeHtml(matchedApp.breadcrumbCategory)}</span></nav>
          <h1>${escapeHtml(matchedApp.h1Title)}</h1>
          <p><strong>المطور:</strong> ${escapeHtml(matchedApp.developer)} | <strong>التقييم:</strong> ${escapeHtml(matchedApp.rating)} (${escapeHtml(matchedApp.reviewsCountText)}) | <strong>التحميلات:</strong> ${escapeHtml(matchedApp.downloads)} | <strong>الإصدار:</strong> ${escapeHtml(matchedApp.version)} | <strong>الحجم:</strong> ${escapeHtml(matchedApp.size)}</p>
          ${matchedApp.fullDescription.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')}
          ${renderedSectionsHtml}
          ${renderedFaqsHtml}
          <p><a href="${escapeHtml(matchedApp.googlePlayUrl)}" rel="noopener noreferrer">تحميل ${escapeHtml(matchedApp.arabicName)} من متجر Google Play الرسمي</a></p>
          <h2>تطبيقات مشابهة</h2>
          <ul>
            ${DOWNLOAD_APPS.map((a) => `<li><a href="/Downloads/${a.slug}">${escapeHtml(a.h1Title)}</a> - ${escapeHtml(a.shortDescription)}</li>`).join('')}
          </ul>
        </article>
      `;
    }
  }
  // 2. Check if /Downloads/
  else if (parts.length === 1 && parts[0].toLowerCase() === 'downloads') {
    const dlHeading = 'تطبيقات العنكبوت - دليل تحميل التطبيقات والألعاب مجاناً';
    title = formatArticleTitle(dlHeading, config.siteName);
    description = formatMetaDescription(
      'دليل تحميل التطبيقات والألعاب مجاناً للاندرويد والأيفون: حمّل ببجي موبايل PUBG MOBILE، دوري كرة القدم 2026، واتساب مسنجر، وفري فاير بروابط رسمية مباشرة وآمنة.'
    );
    canonical = `${config.siteUrl}/Downloads/`;
    ogImageAlt = dlHeading;
    schemaGraph = getDownloadsCollectionSchema(config);
    ssrContentHtml = `
      <section dir="rtl" lang="ar" style="max-width:1100px;margin:0 auto;padding:16px;">
        <h1>تطبيقات العنكبوت - دليل تحميل التطبيقات وألعاب مجانا</h1>
        <p>اكتشف أفضل التطبيقات والألعاب للاندرويد والأيفون، بجودة عالية وروابط مباشرة وآمنة.</p>
        <h2>أحدث التطبيقات والألعاب المتوفرة للتحميل</h2>
        <ul>
          ${DOWNLOAD_APPS.map(
            (a) =>
              `<li>
                <h3><a href="/Downloads/${a.slug}">${escapeHtml(a.arabicName)}</a></h3>
                <p>${escapeHtml(a.shortDescription)}</p>
                <p>التقييم: ${escapeHtml(a.rating)} | عمليات التنزيل: ${escapeHtml(a.downloads)} | الإصدار: ${escapeHtml(a.version)} | الحجم: ${escapeHtml(a.size)}</p>
                <a href="${escapeHtml(a.googlePlayUrl)}">الرابط الرسمي على Google Play</a>
              </li>`
          ).join('\n')}
        </ul>
      </section>
    `;
  }
  // 3. Check if category or AI sub-section (/AI/, /AI/Tools/, /Business/, /Blog/, /Games/, /Education/, /Software/)
  else if (
    parts.length >= 1 &&
    ['ai', 'business', 'blog', 'games', 'education', 'software'].includes(parts[0].toLowerCase()) &&
    !INITIAL_POSTS.some(
      (p) => p.slug.toLowerCase() === (parts[1] || parts[0]).toLowerCase()
    )
  ) {
    const catKey = parts[0].toLowerCase();
    const matchedCat = INITIAL_CATEGORIES.find(
      (c) => c.slug.toLowerCase() === catKey
    );
    if (catKey === 'ai' && parts[1]) {
      const sub = parts[1];
      const subPath = `/AI/${sub}/`;
      const subName = `الذكاء الاصطناعي - ${sub}`;
      title = formatArticleTitle(subName, config.siteName);
      description = formatMetaDescription(
        matchedCat?.description ||
          'اكتشف أفضل أدوات الذكاء الاصطناعي وتطبيقات AI، مع شروحات بسيطة للمبتدئين، وروابط تحميل البرامج، ومقارنة أفضل الأدوات، وطرق الربح من الذكاء الاصطناعي.'
      );
      canonical = `${config.siteUrl}${subPath}`;
      ogImageAlt = subName;
      schemaGraph = getCategoryGraphSchema(
        'AI',
        subName,
        description,
        canonical,
        config
      );
      const catPosts = INITIAL_POSTS.filter(
        (p) => p.categorySlug.toLowerCase() === 'ai'
      );
      ssrContentHtml = `
        <section dir="rtl" lang="ar" style="max-width:1100px;margin:0 auto;padding:16px;">
          <h1>${escapeHtml(subName)}</h1>
          <p>${escapeHtml(description)}</p>
          <ul>
            ${catPosts.map((p) => `<li><a href="/${p.categorySlug}/${p.slug}">${escapeHtml(p.title)}</a></li>`).join('\n')}
          </ul>
        </section>
      `;
    } else if (matchedCat) {
      title = formatArticleTitle(matchedCat.name, config.siteName);
      description = formatMetaDescription(matchedCat.description);
      canonical = `${config.siteUrl}/${matchedCat.slug}/`;
      ogImageAlt = matchedCat.name;
      schemaGraph = getCategoryGraphSchema(
        matchedCat.slug,
        matchedCat.name,
        description,
        canonical,
        config
      );
      const catPosts = INITIAL_POSTS.filter(
        (p) => p.categorySlug.toLowerCase() === matchedCat.slug.toLowerCase()
      );
      ssrContentHtml = `
        <section dir="rtl" lang="ar" style="max-width:1100px;margin:0 auto;padding:16px;">
          <h1>${escapeHtml(matchedCat.name)}</h1>
          <p>${escapeHtml(matchedCat.description)}</p>
          <ul>
            ${catPosts.map((p) => `<li><a href="/${p.categorySlug}/${p.slug}">${escapeHtml(p.title)}</a></li>`).join('\n')}
          </ul>
        </section>
      `;
    }
  }
  // 4. Check if standalone page (/about, /contact, /privacy, /terms, /sitemap)
  else if (
    parts.length === 1 &&
    ['about', 'contact', 'privacy', 'terms', 'sitemap'].includes(
      parts[0].toLowerCase()
    )
  ) {
    const sp = parts[0].toLowerCase();
    const pageTitles: Record<string, string> = {
      about: 'من نحن - نبذة عن الموقع ورسالتنا',
      contact: 'اتصل بنا - قنوات التواصل ونموذج المراسلة',
      privacy: 'سياسة الخصوصية - معايير الأمان وحماية البيانات',
      terms: 'اتفاقية المستخدم - شروط الاستخدام وحقوق الملكية',
      sitemap: 'خريطة الموقع - فهرس المقالات والأقسام',
    };
    const pageDescriptions: Record<string, string> = {
      about:
        'تعرف على موقع العنكبوت للمعلومات، رسالتنا التقنية، وفريق العمل الذي يسعى لتقديم أفضل المحتوى العربي.',
      contact:
        'تواصل معنا عبر قنواتنا الرسمية أو نموذج الاتصال المباشر للاستفسارات والاقتراحات.',
      privacy:
        'نحن نلتزم بأقصى معايير الخصوصية وحماية بيانات الزوار وفقاً للمعايير الدولية وجوجل أدسنس.',
      terms:
        'شروط استخدام موقع العنكبوت للمعلومات وحدود حقوق الملكية الفكرية للمحتوى المنشور.',
      sitemap:
        'تصفح كافة أقسام ومقالات موقع العنكبوت للمعلومات من خلال الفهرس الديناميكي الشامل.',
    };
    const spTitle = pageTitles[sp] || sp;
    const spDesc = formatMetaDescription(
      pageDescriptions[sp] || config.siteDescription
    );
    title = formatArticleTitle(spTitle, config.siteName);
    description = spDesc;
    canonical = `${config.siteUrl}/${sp}`;
    ogImageAlt = spTitle;
    schemaGraph = getStandalonePageGraphSchema(sp, spTitle, spDesc, config);
    ssrContentHtml = `
      <section dir="rtl" lang="ar" style="max-width:960px;margin:0 auto;padding:16px;">
        <h1>${escapeHtml(spTitle)}</h1>
        <p>${escapeHtml(spDesc)}</p>
      </section>
    `;
  }
  // 5. Check if Article Post (/{categorySlug}/{slug})
  else if (parts.length >= 1) {
    const candidateSlug = parts.length > 1 ? parts[1] : parts[0];
    const matchedPost = postsToCheck.find(
      (p) =>
        p.slug.toLowerCase() === candidateSlug.toLowerCase() ||
        p.slug.toLowerCase() === clean.toLowerCase()
    );
    if (matchedPost) {
      title = formatArticleTitle(matchedPost.seoTitle || matchedPost.title, config.siteName);
      description = formatMetaDescription(
        matchedPost.seoDescription || matchedPost.snippet,
        matchedPost.content?.intro,
        matchedPost.rawContent
      );
      canonical =
        matchedPost.canonicalUrl ||
        `${config.siteUrl}/${matchedPost.categorySlug}/${matchedPost.slug}`;
      ogImage = matchedPost.thumbnail;
      ogImageAlt = matchedPost.imageAlt || matchedPost.title;
      ogType = 'article';
      const modifiedDate =
        (matchedPost as { modifiedIso?: string }).modifiedIso ||
        matchedPost.updatedAt ||
        matchedPost.isoDate;
      const articleTagMetas = (matchedPost.tags || [])
        .map(
          (tag) =>
            `<meta property="article:tag" content="${escapeHtml(tag)}" />`
        )
        .join('\n    ');
      
      const robotMeta = matchedPost.noindex
        ? '<meta name="robots" content="noindex, nofollow" />'
        : '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />';

      extraHeadMeta = [
        robotMeta,
        `<meta property="article:published_time" content="${escapeHtml(matchedPost.isoDate)}" />`,
        `<meta property="article:modified_time" content="${escapeHtml(modifiedDate)}" />`,
        `<meta property="article:section" content="${escapeHtml(matchedPost.category)}" />`,
        articleTagMetas,
      ]
        .filter(Boolean)
        .join('\n    ');

      schemaGraph = getArticleGraphSchema(matchedPost, config);
      ssrContentHtml = `
        <article dir="rtl" lang="ar" style="max-width:960px;margin:0 auto;padding:16px;">
          <h1>${escapeHtml(matchedPost.title)}</h1>
          <p>${escapeHtml(description)}</p>
        </article>
      `;
    }
  }

  let html = rawHtml;
  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${escapeHtml(ogType)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />\n    <meta property="og:image:alt" content="${escapeHtml(ogImageAlt)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
  );
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`
  );

  // Strip any existing ld+json scripts and inject a single <script id="ssr-schema" type="application/ld+json">
  html = html.replace(
    /<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/gi,
    ''
  );
  const singleSchemaScript = `<script id="ssr-schema" type="application/ld+json">${JSON.stringify(schemaGraph)}</script>`;
  html = html.replace(
    '</head>',
    `    ${extraHeadMeta ? `${extraHeadMeta}\n    ` : ''}${singleSchemaScript}\n  </head>`
  );

  // Inject semantic crawlable initial HTML inside <div id="root"> so crawlers see real content immediately
  if (ssrContentHtml) {
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root">${ssrContentHtml}</div>`
    );
  }

  return html;
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function updateMeta(attr: 'name' | 'property', key: string, value: string) {
  let element = document.querySelector(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', value);
}

function updateArticleTags(tags: string[]) {
  document
    .querySelectorAll('meta[property="article:tag"]')
    .forEach((el) => el.remove());
  (tags || []).forEach((tag) => {
    const meta = document.createElement('meta');
    meta.setAttribute('property', 'article:tag');
    meta.setAttribute('content', tag);
    document.head.appendChild(meta);
  });
}

function updateCanonical(url: string) {
  let element = document.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', url);
}

function injectSingleSchema(data: object) {
  // Remove any legacy duplicate ld+json scripts except #ssr-schema
  const allLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  allLdScripts.forEach((el) => {
    if (el.id !== 'ssr-schema') {
      el.remove();
    }
  });

  let script = document.getElementById('ssr-schema') as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'ssr-schema';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}
