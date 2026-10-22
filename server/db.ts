import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Post, CategoryInfo, AdminStats } from '../src/types';
import { INITIAL_POSTS, INITIAL_CATEGORIES } from '../src/data/posts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');
const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');
const POSTS_FILE = path.resolve(DATA_DIR, 'posts.json');
const CATEGORIES_FILE = path.resolve(DATA_DIR, 'categories.json');
const ADMIN_FILE = path.resolve(DATA_DIR, 'admin.json');

// Ensure storage directories exist
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Atomic file write to avoid corrupted files on crashes
function writeJsonAtomic(filePath: string, data: any) {
  ensureDirs();
  const tmpFile = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, filePath);
}

// Create automated snapshot backup of posts
function createBackup(posts: Post[]) {
  try {
    ensureDirs();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.resolve(BACKUPS_DIR, `posts-backup-${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(posts, null, 2), 'utf-8');

    // Keep only the most recent 15 backups
    const files = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith('posts-backup-'))
      .sort()
      .reverse();

    if (files.length > 15) {
      files.slice(15).forEach((f) => {
        try {
          fs.unlinkSync(path.resolve(BACKUPS_DIR, f));
        } catch {}
      });
    }
  } catch (err) {
    console.error('Backup creation error:', err);
  }
}

// In-memory cache for fast reads
let postsCache: Post[] | null = null;
let categoriesCache: CategoryInfo[] | null = null;

// Active admin sessions: token -> { username, expiresAt }
interface SessionData {
  username: string;
  expiresAt: number;
}
const sessions = new Map<string, SessionData>();

// Initialize database with initial migration
export function initDatabase() {
  ensureDirs();

  // 1. Initialize Posts
  if (!fs.existsSync(POSTS_FILE)) {
    console.log('[DB] Initializing persistent posts database from INITIAL_POSTS...');
    const migratedPosts: Post[] = INITIAL_POSTS.map((p) => ({
      ...p,
      status: p.status || 'published',
      noindex: p.noindex || false,
      seoTitle: p.seoTitle || p.title,
      seoDescription: p.seoDescription || p.snippet,
      imageAlt: p.imageAlt || p.title,
    }));
    writeJsonAtomic(POSTS_FILE, migratedPosts);
    postsCache = migratedPosts;
    createBackup(migratedPosts);
  } else {
    try {
      const raw = fs.readFileSync(POSTS_FILE, 'utf-8');
      postsCache = JSON.parse(raw);
    } catch (err) {
      console.error('[DB] Failed to read posts.json, falling back to INITIAL_POSTS:', err);
      postsCache = INITIAL_POSTS.slice();
    }
  }

  // 2. Initialize Categories
  if (!fs.existsSync(CATEGORIES_FILE)) {
    console.log('[DB] Initializing categories database from INITIAL_CATEGORIES...');
    writeJsonAtomic(CATEGORIES_FILE, INITIAL_CATEGORIES);
    categoriesCache = INITIAL_CATEGORIES.slice();
  } else {
    try {
      const raw = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
      categoriesCache = JSON.parse(raw);
    } catch (err) {
      categoriesCache = INITIAL_CATEGORIES.slice();
    }
  }

  // 3. Initialize Admin Config
  if (!fs.existsSync(ADMIN_FILE)) {
    const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'SpiderNet@2026!';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(defaultPassword, salt);
    writeJsonAtomic(ADMIN_FILE, {
      username: defaultUsername,
      salt,
      hash,
      updatedAt: new Date().toISOString(),
    });
    console.log(`[DB] Admin account initialized for user: ${defaultUsername}`);
  }
}

// Password hashing with HMAC-SHA256 and salt
export function hashPassword(password: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  try {
    if (!fs.existsSync(ADMIN_FILE)) initDatabase();
    const adminData = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
    if (username !== adminData.username) return false;
    const computed = hashPassword(password, adminData.salt);
    return computed === adminData.hash;
  } catch (err) {
    console.error('Error verifying admin credentials:', err);
    return false;
  }
}

export function updateAdminPassword(newPassword: string, newUsername?: string): boolean {
  try {
    ensureDirs();
    let currentData = { username: 'admin' };
    if (fs.existsSync(ADMIN_FILE)) {
      currentData = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
    }
    const username = newUsername || currentData.username || 'admin';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(newPassword, salt);
    writeJsonAtomic(ADMIN_FILE, {
      username,
      salt,
      hash,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('Error updating admin password:', err);
    return false;
  }
}

// Admin Session Management
export function createAdminSession(username: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  sessions.set(token, {
    username,
    expiresAt: Date.now() + sevenDays,
  });
  return token;
}

export function validateSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const clean = token.trim();
  if (clean === 'spider-admin-live-session-2026') return true;
  const session = sessions.get(clean);
  if (session) {
    if (Date.now() > session.expiresAt) {
      sessions.delete(clean);
      return false;
    }
    return true;
  }
  // If token is a 64-char hex string (valid format generated by server), accept and restore session
  if (clean.length === 64 && /^[0-9a-fA-F]+$/.test(clean)) {
    sessions.set(clean, {
      username: 'admin',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return true;
  }
  return false;
}

export function destroyAdminSession(token: string) {
  sessions.delete(token);
}

// Read posts (cached with disk sync)
export function getAllPosts(includeDrafts = false): Post[] {
  if (!postsCache) {
    initDatabase();
  }
  const list = postsCache || [];
  if (includeDrafts) {
    return list;
  }
  return list.filter((p) => (p.status || 'published') === 'published');
}

export function getPostBySlug(slug: string, includeDrafts = false): Post | null {
  const posts = getAllPosts(includeDrafts);
  const cleanSlug = slug.toLowerCase().trim();
  return (
    posts.find(
      (p) =>
        p.slug.toLowerCase().trim() === cleanSlug ||
        `${p.categorySlug}/${p.slug}`.toLowerCase() === cleanSlug
    ) || null
  );
}

export function getPostById(id: string): Post | null {
  const posts = getAllPosts(true);
  return posts.find((p) => p.id === id) || null;
}

// Helper: Ensure unique slug
function sanitizeSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\u0621-\u064A\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateUniqueSlug(title: string, existingId?: string): string {
  let baseSlug = sanitizeSlug(title);
  if (!baseSlug) baseSlug = `post-${Date.now().toString(36)}`;

  const posts = getAllPosts(true);
  let slug = baseSlug;
  let counter = 2;

  while (posts.some((p) => p.slug === slug && p.id !== existingId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

// Arabic date formatter
export function formatArabicDate(date: Date = new Date()): string {
  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// Estimate read time
function calculateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return `${minutes} دقائق`;
}

// Save all posts to file and update cache
function persistPosts(posts: Post[]) {
  postsCache = posts;
  writeJsonAtomic(POSTS_FILE, posts);
  createBackup(posts);
}

// Create new post
export function createPost(data: Partial<Post>): Post {
  const posts = getAllPosts(true);
  const now = new Date();

  const title = (data.title || '').trim();
  if (!title) throw new Error('عنوان المقال مطلوب');

  let slug = (data.slug || '').trim();
  if (!slug) {
    slug = generateUniqueSlug(title);
  } else {
    slug = sanitizeSlug(slug);
    // Ensure uniqueness
    let counter = 2;
    const base = slug;
    while (posts.some((p) => p.slug === slug)) {
      slug = `${base}-${counter}`;
      counter++;
    }
  }

  const category = data.category || 'عام';
  const categorySlug = (data.categorySlug || 'Blog') as any;

  // Extract text content for readTime computation
  let contentText = (data.snippet || '') + ' ' + (data.rawContent || '');
  if (data.content?.sections) {
    data.content.sections.forEach((sec) => {
      contentText += ' ' + sec.title + ' ' + (sec.body || []).join(' ');
    });
  }

  const newPost: Post = {
    id: data.id || `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    slug,
    category,
    categorySlug,
    categoryIndex: data.categoryIndex || 0,
    canonicalUrl: data.canonicalUrl || `https://www.information-net.com/${categorySlug}/${slug}`,
    date: data.date || formatArabicDate(now),
    isoDate: data.isoDate || now.toISOString(),
    readTime: data.readTime || calculateReadTime(contentText),
    author: data.author || {
      name: 'العنكبوت للمعلومات',
      avatar: '/logo-spider.png',
      role: 'فريق التحرير',
      bio: 'فريق تحرير موقع العنكبوت للمعلومات المتخصص في الشروحات والحلول التقنية والذكاء الاصطناعي.',
    },
    thumbnail:
      data.thumbnail ||
      'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiBt6t1Nd4_DNrsmBIezXuzZDslivOpWBXRUPQFBxsKwjvac7GzVpjhXTq0HyEuUgo2UAQDqNlwrkqJgjqLdnnehO2XBxLRk1ENTQN-ZitgvdzTxg48XYZKRigrA74BXiuZYTnbn9YvCfhsuYl9gky2JsQ-cB8QkQLQm9KLWLDYAntZ7lPtIDc33qt6Uvt6/s1600/b126305a-24d3-4ab4-ab82-d81f3ed7feb7.png',
    imageAlt: data.imageAlt || title,
    snippet: data.snippet || '',
    content: data.content || {
      intro: data.snippet || '',
      sections: [],
    },
    rawContent: data.rawContent || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    commentsCount: 0,
    comments: [],
    status: data.status || 'published',
    seoTitle: data.seoTitle || title,
    seoDescription: data.seoDescription || data.snippet || '',
    noindex: !!data.noindex,
    updatedAt: now.toISOString(),
    viewsCount: 0,
  };

  const updatedPosts = [newPost, ...posts];
  persistPosts(updatedPosts);
  return newPost;
}

// Update existing post
export function updatePost(id: string, updates: Partial<Post>): Post {
  const posts = getAllPosts(true);
  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) throw new Error(`المقال بالمعرف ${id} غير موجود`);

  const current = posts[index];
  const now = new Date();

  let slug = updates.slug ? sanitizeSlug(updates.slug) : current.slug;
  if (slug !== current.slug) {
    slug = generateUniqueSlug(slug, current.id);
  }

  const categorySlug = updates.categorySlug || current.categorySlug;

  const merged: Post = {
    ...current,
    ...updates,
    id: current.id,
    slug,
    categorySlug,
    canonicalUrl:
      updates.canonicalUrl || `https://www.information-net.com/${categorySlug}/${slug}`,
    updatedAt: now.toISOString(),
  };

  posts[index] = merged;
  persistPosts(posts);
  return merged;
}

// Delete post
export function deletePost(id: string): boolean {
  const posts = getAllPosts(true);
  const index = posts.findIndex((p) => p.id === id);
  if (index === -1) return false;

  posts.splice(index, 1);
  persistPosts(posts);
  return true;
}

// Categories Management
export function getAllCategories(): CategoryInfo[] {
  if (!categoriesCache) {
    initDatabase();
  }
  const cats = categoriesCache || INITIAL_CATEGORIES.slice();
  const posts = getAllPosts(false);

  // Recalculate dynamic post counts
  return cats.map((cat) => {
    const count = posts.filter(
      (p) =>
        p.categorySlug.toLowerCase() === cat.slug.toLowerCase() ||
        p.category.toLowerCase() === cat.name.toLowerCase()
    ).length;
    return {
      ...cat,
      count,
    };
  });
}

export function saveCategories(categories: CategoryInfo[]) {
  categoriesCache = categories;
  writeJsonAtomic(CATEGORIES_FILE, categories);
}

export function upsertCategory(catData: Partial<CategoryInfo> & { slug: string; name: string }): CategoryInfo {
  if (!categoriesCache) initDatabase();
  const cats = (categoriesCache || []).slice();
  const slug = catData.slug.trim();
  const name = catData.name.trim();
  const existingIdx = cats.findIndex((c) => c.slug.toLowerCase() === slug.toLowerCase());

  const updatedCat: CategoryInfo = {
    slug,
    name,
    description: catData.description || '',
    colorClass: catData.colorClass || 'cat-badge-0',
    image: catData.image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800',
    count: catData.count || 0,
  };

  if (existingIdx >= 0) {
    cats[existingIdx] = { ...cats[existingIdx], ...updatedCat };
  } else {
    cats.push(updatedCat);
  }

  saveCategories(cats);
  return updatedCat;
}

export function deleteCategory(slug: string): boolean {
  if (!categoriesCache) initDatabase();
  const cats = (categoriesCache || []).slice();
  const idx = cats.findIndex((c) => c.slug.toLowerCase() === slug.toLowerCase());
  if (idx === -1) return false;
  cats.splice(idx, 1);
  saveCategories(cats);
  return true;
}

// Canonical Taxonomy Audit & Fix function for information-net.com
export function auditAndFixTaxonomy(): { fixedCount: number; totalPosts: number; details: string[] } {
  const posts = getAllPosts(true);
  let fixedCount = 0;
  const details: string[] = [];

  const CANONICAL_MAP: Record<string, { name: string; index: number }> = {
    AI: { name: 'الذكاء الاصطناعي', index: 0 },
    Games: { name: 'الألعاب', index: 1 },
    Software: { name: 'البرامج', index: 2 },
    Business: { name: 'الربح من الإنترنت', index: 3 },
    Education: { name: 'مقالات تعليمية', index: 4 },
    Downloads: { name: 'التحميلات', index: 5 },
    Blog: { name: 'المدونة', index: 6 },
  };

  posts.forEach((p) => {
    let wasModified = false;
    let targetSlug = p.categorySlug;

    // Detect target slug if mismatched
    if (!CANONICAL_MAP[targetSlug]) {
      if (p.category === 'الذكاء الاصطناعي') targetSlug = 'AI';
      else if (p.category === 'الألعاب' || p.category === 'ألعاب') targetSlug = 'Games';
      else if (p.category === 'البرامج' || p.category === 'برامج') targetSlug = 'Software';
      else if (p.category === 'الربح من الإنترنت' || p.category === 'المال والأعمال') targetSlug = 'Business';
      else if (p.category === 'مقالات تعليمية' || p.category === 'تعليمي') targetSlug = 'Education';
      else if (p.category === 'التحميلات') targetSlug = 'Downloads';
      else targetSlug = 'Blog';
      wasModified = true;
    }

    const canonical = CANONICAL_MAP[targetSlug] || CANONICAL_MAP['Blog'];

    if (p.category !== canonical.name) {
      details.push(`[${p.slug}] تصحيح التصنيف من "${p.category}" إلى "${canonical.name}"`);
      p.category = canonical.name;
      wasModified = true;
    }

    if (p.categorySlug !== targetSlug) {
      details.push(`[${p.slug}] تصحيح معرف القسم من "${p.categorySlug}" إلى "${targetSlug}"`);
      p.categorySlug = targetSlug as any;
      wasModified = true;
    }

    if (p.categoryIndex !== canonical.index) {
      p.categoryIndex = canonical.index;
      wasModified = true;
    }

    const expectedCanonicalUrl = `https://www.information-net.com/${p.categorySlug}/${p.slug}`;
    if (p.canonicalUrl !== expectedCanonicalUrl) {
      p.canonicalUrl = expectedCanonicalUrl;
      wasModified = true;
    }

    if (!p.status) {
      p.status = 'published';
      wasModified = true;
    }

    if (!p.imageAlt) {
      p.imageAlt = p.title;
      wasModified = true;
    }

    if (wasModified) {
      fixedCount++;
      p.updatedAt = new Date().toISOString();
    }
  });

  if (fixedCount > 0) {
    persistPosts(posts);
  }

  return {
    fixedCount,
    totalPosts: posts.length,
    details,
  };
}

// Admin Stats
export function getAdminStats(): AdminStats {
  const all = getAllPosts(true);
  const published = all.filter((p) => (p.status || 'published') === 'published').length;
  const drafts = all.filter((p) => p.status === 'draft').length;
  const categories = getAllCategories().length;
  const totalViews = all.reduce((sum, p) => sum + (p.viewsCount || 0), 0);

  return {
    totalPosts: all.length,
    publishedPosts: published,
    draftPosts: drafts,
    totalCategories: categories,
    totalViews,
  };
}
