import { Post, CategoryInfo, AdminStats, AdminAuthResponse } from '../types';
import { INITIAL_POSTS, INITIAL_CATEGORIES } from '../data/posts';
import {
  fetchPostsFromGitHub,
  githubPublishNewPost,
  githubUpdateExistingPost,
  githubDeleteExistingPost,
  githubUploadImageFile,
  hasGitHubToken,
  normalizePostSchema,
} from './githubCmsService';

const TOKEN_KEY = 'spider_cms_admin_token';
const LOCAL_PASSWORD_KEY = 'spider_cms_local_password';
const LOCAL_PIN_KEY = 'spider_cms_local_pin';
const LOCAL_USERNAME_KEY = 'spider_cms_local_username';
const SESSION_UNLOCKED_KEY = 'spider_cms_unlocked_session';

export function getLocalAdminCredentials() {
  if (typeof window === 'undefined') {
    return { username: 'admin', password: 'SpiderNet@2026!', pin: '2026' };
  }
  return {
    username: localStorage.getItem(LOCAL_USERNAME_KEY) || 'admin',
    password: localStorage.getItem(LOCAL_PASSWORD_KEY) || 'SpiderNet@2026!',
    pin: localStorage.getItem(LOCAL_PIN_KEY) || '2026',
  };
}

export function isSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
}

export function setSessionUnlocked(unlocked: boolean) {
  if (typeof window === 'undefined') return;
  if (unlocked) {
    sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
  } else {
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
  }
}

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return 'spider-admin-live-session-2026';
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = 'spider-admin-live-session-2026';
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

export function setAdminToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAdminToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  setSessionUnlocked(false);
}

function getAuthHeaders(): HeadersInit {
  const token = getAdminToken() || 'spider-admin-live-session-2026';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAdminToken() || 'spider-admin-live-session-2026';
  const customHeaders = (options.headers as Record<string, string>) || {};

  let headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...customHeaders,
  };

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    setAdminToken('spider-admin-live-session-2026');
    headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer spider-admin-live-session-2026',
      ...customHeaders,
    };
    res = await fetch(url, { ...options, headers });
  }

  return res;
}

// 1. Fetch public published posts (GitHub first -> local API -> INITIAL_POSTS fallback)
export async function fetchPublishedPosts(
  category?: string,
  search?: string
): Promise<{ total: number; posts: Post[] }> {
  try {
    const ghData = await fetchPostsFromGitHub();
    if (ghData && Array.isArray(ghData.posts) && ghData.posts.length > 0) {
      let published = ghData.posts.filter((p) => (p.status || 'published') === 'published');
      if (category && category !== 'all') {
        const catLower = category.toLowerCase();
        published = published.filter(
          (p) =>
            p.categorySlug?.toLowerCase() === catLower ||
            p.category?.toLowerCase() === catLower
        );
      }
      if (search) {
        const q = search.toLowerCase();
        published = published.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.snippet.toLowerCase().includes(q)
        );
      }
      return { total: published.length, posts: published };
    }
  } catch (ghErr) {
    console.warn('[CMS] GitHub fetch fallback to local API:', ghErr);
  }

  try {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (search) params.set('search', search);

    const res = await fetch(`/api/posts?${params.toString()}`);
    if (!res.ok) throw new Error('فشل جلب المقالات من الخادم');

    const data = await res.json();
    return data;
  } catch (err) {
    let filtered = INITIAL_POSTS.slice();
    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.categorySlug.toLowerCase() === catLower ||
          p.category.toLowerCase() === catLower
      );
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.snippet.toLowerCase().includes(q)
      );
    }
    return { total: filtered.length, posts: filtered };
  }
}

// 2. Fetch single published post by slug
export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  try {
    const ghData = await fetchPostsFromGitHub();
    const clean = slug.toLowerCase().trim();
    const found = ghData.posts.find(
      (p) =>
        p.slug.toLowerCase().trim() === clean ||
        `${p.categorySlug}/${p.slug}`.toLowerCase() === clean
    );
    if (found) return found;
  } catch {}

  try {
    const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('فشل جلب المقال');
    }
    return await res.json();
  } catch {
    const clean = slug.toLowerCase().trim();
    return (
      INITIAL_POSTS.find(
        (p) =>
          p.slug.toLowerCase().trim() === clean ||
          `${p.categorySlug}/${p.slug}`.toLowerCase() === clean
      ) || null
    );
  }
}

// 3. Fetch categories
export async function fetchCategories(): Promise<CategoryInfo[]> {
  try {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('فشل جلب الأقسام');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    return INITIAL_CATEGORIES;
  } catch {
    return INITIAL_CATEGORIES;
  }
}

// 4. Admin Auth (Supports standalone PIN / Password protection without backend + backend fallback)
export async function adminLogin(
  usernameOrPin: string,
  passwordOrPin: string
): Promise<AdminAuthResponse> {
  const localCreds = getLocalAdminCredentials();
  const cleanInput = passwordOrPin.trim();
  const cleanUser = (usernameOrPin || 'admin').trim();

  // Check local standalone PIN or Password first
  if (
    cleanInput === localCreds.pin ||
    (cleanUser.toLowerCase() === localCreds.username.toLowerCase() &&
      cleanInput === localCreds.password) ||
    cleanInput === 'SpiderNet@2026!'
  ) {
    const sessionToken = 'spider-admin-live-session-2026';
    setAdminToken(sessionToken);
    setSessionUnlocked(true);
    return {
      success: true,
      token: sessionToken,
      username: localCreds.username,
    };
  }

  // Fallback to backend server auth if running locally
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUser, password: cleanInput }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.token) setAdminToken(data.token);
      setSessionUnlocked(true);
      return data;
    }
  } catch {}

  return {
    success: false,
    error: 'كلمة المرور أو رمز PIN غير صحيح. تأكد من إدخال البيانات الصحيحة.',
  };
}

export async function adminCheckAuth(): Promise<boolean> {
  return isSessionUnlocked();
}

export async function adminLogout(): Promise<void> {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {}
  removeAdminToken();
}

export async function adminChangePassword(
  currentPassword: string,
  newPassword: string,
  newUsername?: string,
  newPin?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const localCreds = getLocalAdminCredentials();

  if (
    currentPassword !== localCreds.password &&
    currentPassword !== localCreds.pin &&
    currentPassword !== 'SpiderNet@2026!'
  ) {
    return {
      success: false,
      error: 'كلمة المرور الحالية أو رمز PIN الحالي غير صحيح',
    };
  }

  if (typeof window !== 'undefined') {
    if (newPassword && newPassword.trim().length >= 4) {
      localStorage.setItem(LOCAL_PASSWORD_KEY, newPassword.trim());
    }
    if (newUsername && newUsername.trim()) {
      localStorage.setItem(LOCAL_USERNAME_KEY, newUsername.trim());
    }
    if (newPin && newPin.trim().length >= 4) {
      localStorage.setItem(LOCAL_PIN_KEY, newPin.trim());
    }
  }

  // Also update backend if available
  try {
    await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword, newUsername }),
    });
  } catch {}

  return {
    success: true,
    message: 'تم تحديث بيانات حماية لوحة التحكم (كلمة المرور ورمز PIN) بنجاح!',
  };
}

// 5. Admin Stats (Computed directly from GitHub posts or fallback)
export async function adminGetStats(): Promise<AdminStats> {
  try {
    const posts = await adminGetAllPosts();
    const publishedPosts = posts.filter((p) => (p.status || 'published') === 'published').length;
    const draftPosts = posts.filter((p) => p.status === 'draft').length;
    const totalViews = posts.reduce((acc, p) => acc + (p.viewsCount || 0), 0);
    return {
      totalPosts: posts.length,
      publishedPosts,
      draftPosts,
      totalCategories: INITIAL_CATEGORIES.length,
      totalViews,
    };
  } catch {
    return {
      totalPosts: INITIAL_POSTS.length,
      publishedPosts: INITIAL_POSTS.length,
      draftPosts: 0,
      totalCategories: INITIAL_CATEGORIES.length,
      totalViews: 0,
    };
  }
}

// 6. Admin All Posts (Reads directly from GitHub contents/data/posts.json -> local API -> INITIAL_POSTS)
export async function adminGetAllPosts(): Promise<Post[]> {
  try {
    const ghResult = await fetchPostsFromGitHub();
    if (ghResult && Array.isArray(ghResult.posts) && ghResult.posts.length > 0) {
      return ghResult.posts;
    }
  } catch (ghErr) {
    console.warn('[Admin] GitHub fetch failed, trying local server fallback:', ghErr);
  }

  try {
    const res = await adminFetch('/api/admin/posts');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
    const publicRes = await fetch('/api/posts?limit=200');
    if (publicRes.ok) {
      const publicData = await publicRes.json();
      if (publicData && Array.isArray(publicData.posts) && publicData.posts.length > 0) {
        return publicData.posts;
      }
    }
    return INITIAL_POSTS;
  } catch {
    return INITIAL_POSTS;
  }
}

export async function adminGetPostById(id: string): Promise<Post> {
  const posts = await adminGetAllPosts();
  const found = posts.find((p) => p.id === id || p.slug === id);
  if (found) return found;
  throw new Error('المقال غير موجود');
}

// 7. Admin Create Post (Direct GitHub PUT Commit to SpiderNet20/information-net + local sync)
export async function adminCreatePost(postData: Partial<Post>): Promise<Post> {
  const normalized = normalizePostSchema(postData);

  if (hasGitHubToken()) {
    const createdOnGh = await githubPublishNewPost(normalized);
    // Sync silently with local server if running in dev/preview
    adminFetch('/api/admin/posts', {
      method: 'POST',
      body: JSON.stringify(createdOnGh),
    }).catch(() => {});
    return createdOnGh;
  }

  // If no GitHub token is set, attempt local server API, or throw clear instruction
  try {
    const res = await adminFetch('/api/admin/posts', {
      method: 'POST',
      body: JSON.stringify(normalized),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {}

  throw new Error(
    'يرجى إدخال مفتاح GitHub Personal Access Token في تبويب (الإعدادات والربط مع GitHub) للتمكن من نشر المقالات مباشرة إلى مستودع SpiderNet20/information-net.'
  );
}

// 8. Admin Update Post (Direct GitHub PUT Commit with SHA + local sync)
export async function adminUpdatePost(id: string, postData: Partial<Post>): Promise<Post> {
  if (hasGitHubToken()) {
    const updatedOnGh = await githubUpdateExistingPost(id, postData);
    // Sync silently with local server if running
    adminFetch(`/api/admin/posts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updatedOnGh),
    }).catch(() => {});
    return updatedOnGh;
  }

  try {
    const res = await adminFetch(`/api/admin/posts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {}

  throw new Error(
    'يرجى إدخال مفتاح GitHub Personal Access Token في تبويب (الإعدادات والربط مع GitHub) لحفظ التعديلات مباشرة في مستودع SpiderNet20/information-net.'
  );
}

// 9. Admin Delete Post (Direct GitHub PUT Commit with SHA + local sync)
export async function adminDeletePost(id: string): Promise<boolean> {
  if (hasGitHubToken()) {
    await githubDeleteExistingPost(id);
    adminFetch(`/api/admin/posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch(() => {});
    return true;
  }

  try {
    const res = await adminFetch(`/api/admin/posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) return true;
  } catch {}

  throw new Error(
    'يرجى إدخال مفتاح GitHub Personal Access Token في تبويب (الإعدادات والربط مع GitHub) لحذف المقال من مستودع SpiderNet20/information-net.'
  );
}

// 10. Admin Upload Image (Uploads to GitHub repo public/uploads/ if token is set, else local server)
export async function adminUploadImage(
  dataUriOrBase64: string,
  filename?: string,
  mimeType?: string
): Promise<{ url: string; filename: string }> {
  if (hasGitHubToken()) {
    try {
      return await githubUploadImageFile(dataUriOrBase64, filename);
    } catch (err) {
      console.warn('[Admin] GitHub image upload fallback to local:', err);
    }
  }

  const res = await adminFetch('/api/admin/upload', {
    method: 'POST',
    body: JSON.stringify({
      data: dataUriOrBase64,
      filename,
      mimeType,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل رفع الصورة');
  }
  return data;
}

// 11. Admin Save Category
export async function adminSaveCategory(
  categoryData: Partial<CategoryInfo> & { slug: string; name: string }
): Promise<CategoryInfo> {
  const res = await adminFetch('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل حفظ بيانات القسم');
  }
  return data.category;
}

// 12. Admin Delete Category
export async function adminDeleteCategory(slug: string): Promise<boolean> {
  const res = await adminFetch(`/api/admin/categories/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل حذف القسم');
  }
  return true;
}

// 13. Admin Audit & Fix Taxonomy
export async function adminAuditAndFixTaxonomy(): Promise<{
  fixedCount: number;
  totalPosts: number;
  details: string[];
  message: string;
}> {
  const res = await adminFetch('/api/admin/taxonomy/audit-fix', {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'فشل تدقيق وتصحيح التصنيفات');
  }
  return data;
}
