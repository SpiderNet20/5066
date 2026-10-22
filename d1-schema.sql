-- ========================================================
-- مخطط قاعدة بيانات Cloudflare D1 لموقع العنكبوت للمعلومات
-- Cloudflare D1 SQL Schema for SpiderNet / Information-Net
-- ========================================================

-- 1. جدول المقالات (Posts)
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  category_index INTEGER DEFAULT 0,
  canonical_url TEXT,
  date TEXT NOT NULL,
  iso_date TEXT NOT NULL,
  read_time TEXT,
  author_name TEXT NOT NULL DEFAULT 'العنكبوت للمعلومات',
  author_avatar TEXT DEFAULT '/logo-spider.png',
  author_role TEXT DEFAULT 'فريق التحرير',
  author_bio TEXT,
  thumbnail TEXT NOT NULL,
  image_alt TEXT,
  snippet TEXT,
  raw_content TEXT,
  content_json TEXT,
  tags_json TEXT, -- JSON array of tags: ["ببجي", "ذكاء اصطناعي"]
  status TEXT NOT NULL DEFAULT 'published', -- 'published' | 'draft'
  seo_title TEXT,
  seo_description TEXT,
  noindex INTEGER DEFAULT 0, -- 0 for index, 1 for noindex
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  views_count INTEGER DEFAULT 0
);

-- فهارس لتحسين سرعة الاستعلامات والبحث
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category_slug ON posts(category_slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_iso_date ON posts(iso_date DESC);

-- 2. جدول الأقسام والتصنيفات (Categories)
CREATE TABLE IF NOT EXISTS categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color_class TEXT,
  description TEXT,
  image TEXT,
  display_order INTEGER DEFAULT 0
);

-- 3. جدول المشرفين والمصادقة (Admin Accounts)
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. إدراج الأقسام الافتراضية
INSERT OR IGNORE INTO categories (slug, name, color_class, description, image, display_order) VALUES
('AI', 'الذكاء الاصطناعي', 'bg-blue-600 text-white', 'اكتشف أفضل أدوات الذكاء الاصطناعي وتطبيقات AI، مع شروحات وتطبيقات عملية.', '/logo-spider.png', 1),
('Games', 'الألعاب', 'bg-red-600 text-white', 'أحدث أخبار وشروحات الألعاب الإلكترونية، إعدادات ببجي موبايل، وحلول المشاكل.', '/logo-spider.png', 2),
('Software', 'البرامج', 'bg-green-600 text-white', 'شروحات ومراجعات أهم برامج الكمبيوتر والهواتف الذكية وتطبيقات الإنتاجية.', '/logo-spider.png', 3),
('Downloads', 'تطبيقات وتنزيلات', 'bg-indigo-600 text-white', 'دليل تحميل التطبيقات والألعاب مجاناً بروابط رسمية مباشرة وآمنة.', '/logo-spider.png', 4),
('Business', 'المال والأعمال', 'bg-purple-600 text-white', 'محتوى يساعد على التعرف على مجالات المال والأعمال والخدمات الرقمية.', '/logo-spider.png', 5),
('Blog', 'المدونة والشروحات', 'bg-teal-600 text-white', 'تصفّح أحدث المقالات والشروحات والأدلة المنشورة على موقع العنكبوت للمعلومات.', '/logo-spider.png', 6),
('Education', 'مقالات تعليمية', 'bg-amber-600 text-white', 'دروس وشروحات تقنية وتعليمية مبسطة خطوة بخطوة في شتى المجالات التقنية.', '/logo-spider.png', 7);
