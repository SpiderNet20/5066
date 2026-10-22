import { Post, CategorySlugType } from '../types';

export interface GitHubCmsConfig {
  token: string;
  repo: string;
  branch: string;
  filePath: string;
  tokenSource: 'env' | 'localStorage' | 'none';
}

export interface GitHubFileResponse {
  posts: Post[];
  sha: string;
  size: number;
  htmlUrl?: string;
}

const STORAGE_KEYS = {
  TOKEN: 'spider_cms_github_token',
  REPO: 'spider_cms_github_repo',
  BRANCH: 'spider_cms_github_branch',
  PATH: 'spider_cms_github_path',
  LAST_SHA: 'spider_cms_github_last_sha',
  LAST_SYNC: 'spider_cms_github_last_sync',
};

export const DEFAULT_GITHUB_REPO = 'SpiderNet20/information-net';
export const DEFAULT_GITHUB_BRANCH = 'main';
export const DEFAULT_GITHUB_FILE_PATH = 'data/posts.json';

/**
 * 1. معالجة وحماية الترميز العربي (UTF-8 Safe Base64 Encoding & Decoding)
 * باستخدام TextEncoder و TextDecoder لتفادي مشاكل الحروف العربية المكسورة
 * مع معالجة الملفات الكبيرة على دفعات (Chunks) لمنع تجاوز الذاكرة (Call Stack Exceeded).
 */
export function encodeBase64Utf8(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const chunkSize = 0x8000; // 32KB chunks for safe String.fromCharCode
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export function decodeBase64Utf8(base64Str: string): string {
  // إزالة أي أسطر جديدة أو مسافات يضيفها GitHub API في سلسلة Base64
  const cleanedBase64 = base64Str.replace(/\s/g, '');
  const binary = atob(cleanedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}

/**
 * 2. قراءة وإدارة إعدادات الربط مع GitHub (Environment Variable + localStorage)
 */
export function getGitHubConfig(): GitHubCmsConfig {
  const envToken =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_GITHUB_TOKEN
      ? String(import.meta.env.VITE_GITHUB_TOKEN).trim()
      : '';

  if (typeof window === 'undefined') {
    return {
      token: envToken,
      repo: DEFAULT_GITHUB_REPO,
      branch: DEFAULT_GITHUB_BRANCH,
      filePath: DEFAULT_GITHUB_FILE_PATH,
      tokenSource: envToken ? 'env' : 'none',
    };
  }

  const localToken = (localStorage.getItem(STORAGE_KEYS.TOKEN) || '').trim();
  const repo = (localStorage.getItem(STORAGE_KEYS.REPO) || DEFAULT_GITHUB_REPO).trim();
  const branch = (localStorage.getItem(STORAGE_KEYS.BRANCH) || DEFAULT_GITHUB_BRANCH).trim();
  const filePath = (localStorage.getItem(STORAGE_KEYS.PATH) || DEFAULT_GITHUB_FILE_PATH)
    .trim()
    .replace(/^\/+/, '');

  const activeToken = localToken || envToken;
  const tokenSource: 'env' | 'localStorage' | 'none' = localToken
    ? 'localStorage'
    : envToken
      ? 'env'
      : 'none';

  return {
    token: activeToken,
    repo: repo || DEFAULT_GITHUB_REPO,
    branch: branch || DEFAULT_GITHUB_BRANCH,
    filePath: filePath || DEFAULT_GITHUB_FILE_PATH,
    tokenSource,
  };
}

export function saveGitHubConfig(config: {
  token?: string;
  repo?: string;
  branch?: string;
  filePath?: string;
}): GitHubCmsConfig {
  if (typeof window !== 'undefined') {
    if (config.token !== undefined) {
      const cleanToken = config.token.trim();
      if (cleanToken) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, cleanToken);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
    }
    if (config.repo !== undefined) {
      localStorage.setItem(STORAGE_KEYS.REPO, config.repo.trim() || DEFAULT_GITHUB_REPO);
    }
    if (config.branch !== undefined) {
      localStorage.setItem(STORAGE_KEYS.BRANCH, config.branch.trim() || DEFAULT_GITHUB_BRANCH);
    }
    if (config.filePath !== undefined) {
      localStorage.setItem(
        STORAGE_KEYS.PATH,
        config.filePath.trim().replace(/^\/+/, '') || DEFAULT_GITHUB_FILE_PATH
      );
    }
  }
  return getGitHubConfig();
}

export function getLastKnownSha(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.LAST_SHA);
}

export function setLastKnownSha(sha: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.LAST_SHA, sha);
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
}

export function getLastSyncTimestamp(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
}

export function hasGitHubToken(): boolean {
  const { token } = getGitHubConfig();
  return Boolean(token && token.length > 10);
}

function buildGitHubHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * 3. مطابقة بنية بيانات المقال (Strict Post Schema Normalization)
 * يضمن مطابقة الحقول المطلوبة تماماً لهيكل مقالات موقع العنكبوت للمعلومات:
 * (id, title, slug, category, categorySlug, categoryIndex, canonicalUrl, date, isoDate,
 *  readTime, author, thumbnail, imageAlt, snippet, rawContent, tags, status, noindex)
 */
const CATEGORY_INDEX_MAP: Record<string, { name: string; index: number }> = {
  AI: { name: 'الذكاء الاصطناعي', index: 0 },
  Games: { name: 'الألعاب', index: 1 },
  Software: { name: 'البرامج', index: 2 },
  Business: { name: 'المال والأعمال', index: 3 },
  Education: { name: 'مقالات تعليمية', index: 4 },
  Blog: { name: 'المدونة', index: 4 },
  Downloads: { name: 'التحميلات', index: 5 },
};

export function normalizePostSchema(input: Partial<Post>, existingPost?: Post): Post {
  const nowIso = new Date().toISOString();
  const rawTitle = (input.title ?? existingPost?.title ?? 'مقال بدون عنوان').trim();

  const rawSlug = (
    input.slug ??
    existingPost?.slug ??
    rawTitle
      .toLowerCase()
      .replace(/[^\w\u0621-\u064A\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  ).trim() || `post-${Date.now()}`;

  const categorySlug: CategorySlugType =
    (input.categorySlug ?? existingPost?.categorySlug ?? 'Blog').trim() || 'Blog';

  const mappedCat = CATEGORY_INDEX_MAP[categorySlug];
  const category =
    (input.category ?? existingPost?.category ?? mappedCat?.name ?? 'المدونة').trim();
  const categoryIndex =
    typeof input.categoryIndex === 'number'
      ? input.categoryIndex
      : typeof existingPost?.categoryIndex === 'number'
        ? existingPost.categoryIndex
        : (mappedCat?.index ?? 4);

  const canonicalUrl =
    input.canonicalUrl?.trim() ||
    `https://www.information-net.com/${categorySlug}/${rawSlug}`;

  const isoDate = input.isoDate || existingPost?.isoDate || nowIso;
  const date =
    input.date ||
    existingPost?.date ||
    new Date(isoDate).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const rawContent = input.rawContent ?? existingPost?.rawContent ?? '';
  const plainWordsCount = rawContent
    .replace(/<[^>]*>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const readTime =
    input.readTime ||
    existingPost?.readTime ||
    `${Math.max(1, Math.ceil(plainWordsCount / 180))} دقائق للقراءة`;

  const author = {
    name: input.author?.name || existingPost?.author?.name || 'العنكبوت للمعلومات',
    avatar:
      input.author?.avatar ||
      existingPost?.author?.avatar ||
      'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgFNxsKntk30FgldPalXEJQNpVgnN8-5_pI6_DcFXnS9piY_8-Nbv6matlFMZgibcEVn3fki9THTMxKw7FZ647FE89goBLOkTAdf1iHIoC1QS8VsRhIsmNQVxd5j6lvfyY/s113/77d41520a3f07995b184797a3734bf44-removebg-preview.png',
    role: input.author?.role || existingPost?.author?.role || 'فريق التحرير التقني',
    bio:
      input.author?.bio ||
      existingPost?.author?.bio ||
      'المصدر العربي الشامل للتقنية، الألعاب، البرامج، والذكاء الاصطناعي.',
  };

  const thumbnail =
    (input.thumbnail ?? existingPost?.thumbnail ?? '/logo-spider.png').trim();
  const imageAlt = (input.imageAlt ?? existingPost?.imageAlt ?? rawTitle).trim();
  const snippet = (input.snippet ?? existingPost?.snippet ?? rawTitle).trim();
  const tags = Array.isArray(input.tags)
    ? input.tags
    : Array.isArray(existingPost?.tags)
      ? existingPost!.tags
      : [];
  const status: 'published' | 'draft' =
    input.status === 'draft' ? 'draft' : input.status === 'published' ? 'published' : (existingPost?.status || 'published');
  const noindex = typeof input.noindex === 'boolean' ? input.noindex : Boolean(existingPost?.noindex);

  const id = (input.id ?? existingPost?.id ?? `post-${rawSlug}`).trim();

  return {
    id,
    title: rawTitle,
    slug: rawSlug,
    category,
    categorySlug,
    categoryIndex,
    canonicalUrl,
    link: canonicalUrl,
    date,
    isoDate,
    modifiedIso: nowIso,
    readTime,
    author,
    thumbnail,
    ogImage: input.ogImage || thumbnail,
    imageAlt,
    snippet,
    seoTitle: (input.seoTitle || rawTitle).trim(),
    seoDescription: (input.seoDescription || snippet).trim(),
    keywords: Array.isArray(input.keywords) ? input.keywords : tags,
    tags,
    content: input.content || existingPost?.content || {
      intro: snippet,
      sections: [
        {
          id: 'section-main',
          title: rawTitle,
          body: [snippet],
        },
      ],
    },
    rawContent,
    status,
    noindex,
    updatedAt: nowIso,
    commentsCount: existingPost?.commentsCount ?? input.commentsCount ?? 0,
    comments: existingPost?.comments ?? input.comments ?? [],
    viewsCount: existingPost?.viewsCount ?? input.viewsCount ?? 0,
  };
}

/**
 * 4. دالة جلب المقالات الحالية من مستودع GitHub (GET request إلى contents/data/posts.json)
 * مع دعم فك تشفير Base64 بالترميز العربي UTF-8 ودعم الملفات التي تتجاوز 1MB عبر Git Blob API.
 */
export async function fetchPostsFromGitHub(): Promise<GitHubFileResponse> {
  const { token, repo, branch, filePath } = getGitHubConfig();
  const encodedPath = filePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  const url = `https://api.github.com/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: buildGitHubHeaders(token),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody.message || `فشل جلب ملف المقالات من GitHub (كود الحالة: ${res.status})`
    );
  }

  const data = await res.json();
  const sha: string = data.sha;
  let base64Content: string = data.content || '';

  // إذا كان حجم data/posts.json أكبر من 1MB، يعيد GitHub حقل content فارغاً مع sha؛
  // حينها نجلب المحتوى الكامل عبر Git Blobs API بنفس الـ SHA
  if (!base64Content && sha) {
    const blobUrl = `https://api.github.com/repos/${repo}/git/blobs/${encodeURIComponent(sha)}`;
    const blobRes = await fetch(blobUrl, {
      method: 'GET',
      headers: buildGitHubHeaders(token),
      cache: 'no-store',
    });
    if (!blobRes.ok) {
      const blobErr = await blobRes.json().catch(() => ({}));
      throw new Error(
        blobErr.message || `فشل جلب Blob المقالات من GitHub (كود: ${blobRes.status})`
      );
    }
    const blobData = await blobRes.json();
    base64Content = blobData.content || '';
  }

  const decodedJson = decodeBase64Utf8(base64Content);
  const parsed = JSON.parse(decodedJson);

  if (!Array.isArray(parsed)) {
    throw new Error('بنية ملف data/posts.json في المستودع ليست مصفوفة صالحة');
  }

  if (sha) {
    setLastKnownSha(sha);
  }

  return {
    posts: parsed as Post[],
    sha,
    size: data.size || decodedJson.length,
    htmlUrl: data.html_url,
  };
}

/**
 * 5. دالة حفظ ورفع مصفوفة المقالات إلى GitHub (PUT request إلى contents/data/posts.json)
 * تقوم بتحويل JSON إلى UTF-8 ثم Base64 وعمل Commit مباشر على الفرع main بنفس الـ SHA.
 */
export async function commitPostsToGitHub(
  posts: Post[],
  commitMessage: string,
  shaToUse?: string
): Promise<{ sha: string; commitUrl?: string }> {
  const { token, repo, branch, filePath } = getGitHubConfig();

  if (!token) {
    throw new Error(
      'لم يتم ضبط مفتاح GitHub Personal Access Token. يرجى إضافته من قسم الإعدادات أو في متغير VITE_GITHUB_TOKEN.'
    );
  }

  const encodedPath = filePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  let activeSha = shaToUse || getLastKnownSha();

  // إذا لم يتوفر SHA، نجلبه أولاً من المستودع
  if (!activeSha) {
    const current = await fetchPostsFromGitHub();
    activeSha = current.sha;
  }

  const jsonString = JSON.stringify(posts, null, 2);
  const base64Content = encodeBase64Utf8(jsonString);

  const putUrl = `https://api.github.com/repos/${repo}/contents/${encodedPath}`;

  const executePut = async (sha: string) => {
    return fetch(putUrl, {
      method: 'PUT',
      headers: buildGitHubHeaders(token),
      body: JSON.stringify({
        message: commitMessage,
        content: base64Content,
        sha,
        branch,
      }),
    });
  };

  let res = await executePut(activeSha);

  // في حال تغير الـ SHA على المستودع (409 Conflict أو 422)، نجلب أحدث SHA ونعيد المحاولة تلقائياً
  if (res.status === 409 || res.status === 422) {
    const latest = await fetchPostsFromGitHub();
    activeSha = latest.sha;
    res = await executePut(activeSha);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.message || `فشل حفظ التعديلات على GitHub (كود الحالة: ${res.status})`
    );
  }

  const resultData = await res.json();
  const newSha = resultData?.content?.sha || activeSha;
  setLastKnownSha(newSha);

  return {
    sha: newSha,
    commitUrl: resultData?.commit?.html_url,
  };
}

/**
 * 6. نشر مقال جديد (إدراج في بداية المصفوفة + Commit مباشر)
 */
export async function githubPublishNewPost(postData: Partial<Post>): Promise<Post> {
  const { posts, sha } = await fetchPostsFromGitHub();
  const newPost = normalizePostSchema(postData);

  // التحقق من عدم تكرار نفس الـ id أو الـ slug، أو تحديثه إن وجد
  const filteredExisting = posts.filter(
    (p) => p.id !== newPost.id && p.slug !== newPost.slug
  );

  // إدراج المقال الجديد في بداية مصفوفة المقالات
  const updatedPosts = [newPost, ...filteredExisting];

  await commitPostsToGitHub(
    updatedPosts,
    `نشر مقال جديد: ${newPost.title}`,
    sha
  );

  return newPost;
}

/**
 * 7. تعديل مقال قائم وإعادة حفظ الملف بنفس الـ SHA
 */
export async function githubUpdateExistingPost(
  id: string,
  postData: Partial<Post>
): Promise<Post> {
  const { posts, sha } = await fetchPostsFromGitHub();
  const targetIndex = posts.findIndex(
    (p) => p.id === id || p.slug === id || p.slug === postData.slug
  );

  if (targetIndex === -1) {
    // إذا لم يكن موجوداً في المستودع بعد، نقوم بإدراجه في البداية
    const createdPost = normalizePostSchema({ ...postData, id });
    const updatedPosts = [createdPost, ...posts];
    await commitPostsToGitHub(
      updatedPosts,
      `إضافة وتحديث مقال: ${createdPost.title}`,
      sha
    );
    return createdPost;
  }

  const existingPost = posts[targetIndex];
  const updatedPost = normalizePostSchema(
    { ...existingPost, ...postData, id: existingPost.id },
    existingPost
  );

  const updatedPosts = [...posts];
  updatedPosts[targetIndex] = updatedPost;

  await commitPostsToGitHub(
    updatedPosts,
    `تعديل مقال: ${updatedPost.title}`,
    sha
  );

  return updatedPost;
}

/**
 * 8. حذف مقال من المصفوفة وإعادة حفظ الملف بنفس الـ SHA
 */
export async function githubDeleteExistingPost(id: string): Promise<boolean> {
  const { posts, sha } = await fetchPostsFromGitHub();
  const postToDelete = posts.find((p) => p.id === id || p.slug === id);

  if (!postToDelete) {
    throw new Error('المقال المطلوب حذفه غير موجود في ملف data/posts.json على المستودع');
  }

  const updatedPosts = posts.filter((p) => p.id !== id && p.slug !== id);

  await commitPostsToGitHub(
    updatedPosts,
    `حذف مقال: ${postToDelete.title}`,
    sha
  );

  return true;
}

/**
 * 9. رفع صورة مباشرة إلى مستودع GitHub داخل مجلد public/uploads/
 */
export async function githubUploadImageFile(
  dataUriOrBase64: string,
  filename?: string
): Promise<{ url: string; filename: string }> {
  const { token, repo, branch } = getGitHubConfig();
  if (!token) {
    throw new Error('يلزم إدخال GitHub Token لرفع الصور مباشرة إلى المستودع');
  }

  const cleanBase64 = dataUriOrBase64.includes(',')
    ? dataUriOrBase64.split(',')[1]
    : dataUriOrBase64;

  const safeName =
    (filename || `image-${Date.now()}.png`)
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-') || `img-${Date.now()}.png`;

  const uniqueFilename = `${Date.now()}-${safeName}`;
  const uploadPath = `public/uploads/${uniqueFilename}`;
  const putUrl = `https://api.github.com/repos/${repo}/contents/${uploadPath}`;

  const res = await fetch(putUrl, {
    method: 'PUT',
    headers: buildGitHubHeaders(token),
    body: JSON.stringify({
      message: `رفع صورة مقال: ${uniqueFilename}`,
      content: cleanBase64.replace(/\s/g, ''),
      branch,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'فشل رفع الصورة إلى مستودع GitHub');
  }

  const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${uploadPath}`;
  return {
    url: rawUrl,
    filename: uniqueFilename,
  };
}

/**
 * 10. فحص واختبار الاتصال بمستودع GitHub
 */
export async function testGitHubConnection(): Promise<{
  success: boolean;
  repo: string;
  branch: string;
  filePath: string;
  sha: string;
  postsCount: number;
  authenticatedUser?: string;
  canPush?: boolean;
  error?: string;
}> {
  const { token, repo, branch, filePath } = getGitHubConfig();
  try {
    let authenticatedUser: string | undefined;
    let canPush = false;

    if (token) {
      const userRes = await fetch('https://api.github.com/user', {
        headers: buildGitHubHeaders(token),
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        authenticatedUser = userData.login;
      } else {
        return {
          success: false,
          repo,
          branch,
          filePath,
          sha: '',
          postsCount: 0,
          error: 'التوكن المدخل غير صالح أو منتهي الصلاحية (401 Unauthorized)',
        };
      }

      const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: buildGitHubHeaders(token),
      });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        canPush = Boolean(repoData.permissions?.push || repoData.permissions?.admin);
      }
    }

    const fileData = await fetchPostsFromGitHub();
    return {
      success: true,
      repo,
      branch,
      filePath,
      sha: fileData.sha,
      postsCount: fileData.posts.length,
      authenticatedUser,
      canPush,
    };
  } catch (err: any) {
    return {
      success: false,
      repo,
      branch,
      filePath,
      sha: '',
      postsCount: 0,
      error: err.message || 'تعذر الاتصال بـ GitHub REST API',
    };
  }
}
