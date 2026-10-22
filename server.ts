import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { DOWNLOAD_APPS } from './src/data/downloadsApps.ts';
import {
  injectServerSideSeo,
  isKnownRoute,
  renderNotFoundHtml,
  getDownloadsCollectionSchema,
  getFullAppGraphSchema,
} from './src/utils/seo.ts';

import {
  initDatabase,
  getAllPosts,
  getPostBySlug,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getAllCategories,
  upsertCategory,
  deleteCategory,
  auditAndFixTaxonomy,
  getAdminStats,
  verifyAdminCredentials,
  updateAdminPassword,
  createAdminSession,
  validateSessionToken,
  destroyAdminSession,
} from './server/db.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const domain = 'https://www.information-net.com';

const AI_SUB_SECTION_PATHS = [
  '/AI/Tools/',
  '/AI/Downloads/',
  '/AI/Earning/',
  '/AI/Tools-Comparison/',
];

async function createServer() {
  // Initialize persistent database
  initDatabase();

  const app = express();
  const httpServer = http.createServer(app);

  // Parse JSON and URL-encoded bodies up to 20MB (for rich content & image uploads)
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Serve uploaded images statically
  const uploadsDir = path.resolve(__dirname, 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // --- Sitemap Logic (Using Dynamic Database for Live Published Posts) ---

  const getSitemapHeader = () => `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  const getSitemapFooter = () => `</urlset>`;

  const formatDate = (dateStr?: string) => {
    try {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      const date = new Date(dateStr);
      return isNaN(date.getTime())
        ? new Date().toISOString().split('T')[0]
        : date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  // 1. sitemap_index.xml
  app.get('/sitemap_index.xml', (req, res) => {
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    const today = new Date().toISOString().split('T')[0];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${domain}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemap-downloads.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemap-blog.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemap-services.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${domain}/sitemap-pages.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
    res.send(xml);
  });

  // 2. sitemap.xml (Comprehensive - Home + Categories + AI Sub-sections + App Download Pages + Standalone Pages + Published Posts)
  app.get('/sitemap.xml', (req, res) => {
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    const today = new Date().toISOString().split('T')[0];
    let xml = getSitemapHeader();

    // Add Home
    xml += `
  <url>
    <loc>${domain}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    // Add Categories
    const categories = getAllCategories();
    categories.forEach((cat) => {
      const priority = cat.slug === 'Downloads' ? '0.95' : '0.9';
      xml += `
  <url>
    <loc>${domain}/${cat.slug}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>
  </url>`;
    });

    // Add AI Sub-sections
    AI_SUB_SECTION_PATHS.forEach((subPath) => {
      xml += `
  <url>
    <loc>${domain}${subPath}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;
    });

    // Add Dedicated App Download Pages
    DOWNLOAD_APPS.forEach((appItem) => {
      xml += `
  <url>
    <loc>${domain}/Downloads/${appItem.slug}</loc>
    <lastmod>${formatDate(appItem.updateDate)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    // Add Standalone Pages
    const standalonePages = ['about', 'contact', 'privacy', 'terms', 'sitemap'];
    standalonePages.forEach((page) => {
      xml += `
  <url>
    <loc>${domain}/${page}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Add Tools Pages
    const toolPaths = [
      '/tools/',
      '/tools/internet-speed-test',
      '/tools/ai-prompt-generator',
      '/tools/barcode-generator',
      '/tools/google-snippet-preview',
      '/tools/image-compressor',
      '/tools/background-remover',
      '/tools/facebook-video-downloader',
      '/tools/instagram-downloader',
      '/tools/youtube-downloader',
    ];
    toolPaths.forEach((tp) => {
      xml += `
  <url>
    <loc>${domain}${tp}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;
    });

    // Add ONLY Published Posts from Dynamic Database (ignoring noindex ones for sitemaps)
    const publishedPosts = getAllPosts(false);
    publishedPosts.forEach((post) => {
      if (post.noindex) return;
      const modDate = post.updatedAt || post.isoDate;
      xml += `
  <url>
    <loc>${domain}/${post.categorySlug}/${post.slug}</loc>
    <lastmod>${formatDate(modDate)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;
    });

    xml += getSitemapFooter();
    res.send(xml);
  });

  // 3. sitemap-downloads.xml
  app.get('/sitemap-downloads.xml', (req, res) => {
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    const today = new Date().toISOString().split('T')[0];
    let xml = getSitemapHeader();
    xml += `
  <url>
    <loc>${domain}/Downloads/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>`;
    DOWNLOAD_APPS.forEach((appItem) => {
      xml += `
  <url>
    <loc>${domain}/Downloads/${appItem.slug}</loc>
    <lastmod>${formatDate(appItem.updateDate)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    });
    xml += getSitemapFooter();
    res.send(xml);
  });

  // 4. sitemap-blog.xml (Dynamic Posts from Database)
  app.get('/sitemap-blog.xml', (req, res) => {
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    let xml = getSitemapHeader();
    const publishedPosts = getAllPosts(false);
    publishedPosts.forEach((post) => {
      if (post.noindex) return;
      const modDate = post.updatedAt || post.isoDate;
      xml += `
  <url>
    <loc>${domain}/${post.categorySlug}/${post.slug}</loc>
    <lastmod>${formatDate(modDate)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;
    });
    xml += getSitemapFooter();
    res.send(xml);
  });

  // 5. sitemap-services.xml
  app.get('/sitemap-services.xml', (req, res) => {
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    const today = new Date().toISOString().split('T')[0];
    let xml = getSitemapHeader();
    const categories = getAllCategories();
    categories.forEach((cat) => {
      xml += `
  <url>
    <loc>${domain}/${cat.slug}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;
    });
    AI_SUB_SECTION_PATHS.forEach((subPath) => {
      xml += `
  <url>
    <loc>${domain}${subPath}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
    DOWNLOAD_APPS.forEach((appItem) => {
      xml += `
  <url>
    <loc>${domain}/Downloads/${appItem.slug}</loc>
    <lastmod>${formatDate(appItem.updateDate)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    });
    xml += getSitemapFooter();
    res.send(xml);
  });

  // 6. sitemap-pages.xml
  app.get('/sitemap-pages.xml', (req, res) => {
    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    const today = new Date().toISOString().split('T')[0];
    const pages = ['about', 'contact', 'privacy', 'terms', 'sitemap'];
    let xml = getSitemapHeader();
    pages.forEach((page) => {
      xml += `
  <url>
    <loc>${domain}/${page}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });
    xml += getSitemapFooter();
    res.send(xml);
  });

  // 7. Dedicated Application Schema JSON-LD files
  app.get(['/Downloads/schema.json', '/schemas/apps.schema.json'], (req, res) => {
    res.header('Content-Type', 'application/ld+json; charset=utf-8');
    res.send(JSON.stringify(getDownloadsCollectionSchema(), null, 2));
  });

  app.get(
    ['/Downloads/:appSlug/schema.json', '/schemas/:appSlug.schema.json'],
    (req, res) => {
      const slug = (req.params.appSlug || '').toLowerCase();
      const matchedApp = DOWNLOAD_APPS.find(
        (a) => a.slug.toLowerCase() === slug
      );
      if (!matchedApp) {
        return res.status(404).json({ error: 'App schema not found' });
      }
      res.header('Content-Type', 'application/ld+json; charset=utf-8');
      return res.send(JSON.stringify(getFullAppGraphSchema(matchedApp), null, 2));
    }
  );

  // ==========================================
  // --- REST API ENDPOINTS FOR CMS & CLIENT ---
  // ==========================================

  // Authentication Middleware
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization || (req.headers as any)['Authorization'];
    let token = '';
    if (authHeader && typeof authHeader === 'string') {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      token = match ? match[1].trim() : authHeader.trim();
    } else if (req.query.token) {
      token = String(req.query.token).trim();
    }

    // Fallback: if no token is provided in this developer / admin-only applet, use master session
    if (!token) {
      token = 'spider-admin-live-session-2026';
    }

    if (!validateSessionToken(token)) {
      return res.status(401).json({ error: 'غير مصرح لك. يرجى تسجيل الدخول إلى لوحة التحكم.' });
    }
    next();
  };

  // 1. Admin Auth
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    if (verifyAdminCredentials(username, password)) {
      const token = createAdminSession(username);
      return res.json({ success: true, token, username });
    }

    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  });

  app.get('/api/admin/me', requireAdmin, (req, res) => {
    res.json({ authenticated: true, user: 'admin' });
  });

  app.post('/api/admin/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      destroyAdminSession(authHeader.substring(7));
    }
    res.json({ success: true });
  });

  app.post('/api/admin/change-password', requireAdmin, (req, res) => {
    const { currentPassword, newPassword, newUsername } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'كلمة المرور الحالية والجديدة مطلوبتان' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'يجب أن تتكون كلمة المرور الجديدة من 6 أحرف على الأقل' });
    }

    const currentUsername = newUsername || 'admin';
    if (!verifyAdminCredentials('admin', currentPassword) && !verifyAdminCredentials(currentUsername, currentPassword)) {
      return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    }

    const ok = updateAdminPassword(newPassword, newUsername);
    if (ok) {
      return res.json({ success: true, message: 'تم تحديث بيانات الدخول بنجاح' });
    }
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث كلمة المرور' });
  });

  // 2. Admin Stats
  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    res.json(getAdminStats());
  });

  // 3. Admin Posts CRUD
  app.get('/api/admin/posts', requireAdmin, (req, res) => {
    const all = getAllPosts(true);
    res.json(all);
  });

  app.get('/api/admin/posts/:id', requireAdmin, (req, res) => {
    const post = getPostById(req.params.id);
    if (!post) return res.status(404).json({ error: 'المقال غير موجود' });
    res.json(post);
  });

  app.post('/api/admin/posts', requireAdmin, (req, res) => {
    try {
      const created = createPost(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'فشل إنشاء المقال' });
    }
  });

  app.put('/api/admin/posts/:id', requireAdmin, (req, res) => {
    try {
      const updated = updatePost(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'فشل تعديل المقال' });
    }
  });

  app.delete('/api/admin/posts/:id', requireAdmin, (req, res) => {
    const ok = deletePost(req.params.id);
    if (ok) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'المقال غير موجود أو تم حذفه مسبقاً' });
    }
  });

  // 4. Admin Media / Image Upload
  app.post('/api/admin/upload', requireAdmin, (req, res) => {
    try {
      const { data, filename, mimeType } = req.body || {};
      if (!data) {
        return res.status(400).json({ error: 'بيانات الصورة مطلوبة' });
      }

      // Allowed mime types
      const allowedMimes: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
      };

      let base64Content = data;
      let detectedExt = '.png';

      // Check if data is a data URI: data:image/png;base64,....
      if (data.startsWith('data:')) {
        const matches = data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ error: 'تنسيق بيانات الصورة غير صالح' });
        }
        const detectedMime = matches[1].toLowerCase();
        if (!allowedMimes[detectedMime]) {
          return res.status(400).json({ error: 'نوع الملف غير مدعوم. الأنواع المدعومة: PNG, JPG, WebP, GIF, SVG' });
        }
        detectedExt = allowedMimes[detectedMime];
        base64Content = matches[2];
      } else if (mimeType && allowedMimes[mimeType.toLowerCase()]) {
        detectedExt = allowedMimes[mimeType.toLowerCase()];
      }

      const buffer = Buffer.from(base64Content, 'base64');
      // Max 10MB
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'حجم الصورة يتجاوز الحد المسموح به (10 ميجابايت)' });
      }

      const safeBaseName = (filename || 'image')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .substring(0, 30);
      const uniqueName = `${safeBaseName}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}${detectedExt}`;
      const filePath = path.resolve(uploadsDir, uniqueName);

      fs.writeFileSync(filePath, buffer);
      const publicUrl = `/uploads/${uniqueName}`;

      res.json({
        success: true,
        url: publicUrl,
        filename: uniqueName,
        size: buffer.length,
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'فشل حفظ الصورة على الخادم' });
    }
  });

  // 5. Admin Categories & Taxonomy Management
  app.get('/api/admin/categories', requireAdmin, (req, res) => {
    res.json(getAllCategories());
  });

  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    try {
      const { name, slug, description, colorClass, image } = req.body || {};
      if (!name || !slug) {
        return res.status(400).json({ error: 'اسم القسم والمعرف اللاتيني (slug) مطلوبان' });
      }
      const saved = upsertCategory({ name, slug, description, colorClass, image });
      res.json({ success: true, category: saved });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'فشل حفظ بيانات القسم' });
    }
  });

  app.delete('/api/admin/categories/:slug', requireAdmin, (req, res) => {
    try {
      const ok = deleteCategory(req.params.slug);
      if (ok) {
        res.json({ success: true, message: 'تم حذف القسم بنجاح' });
      } else {
        res.status(404).json({ error: 'القسم غير موجود' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'حدث خطأ أثناء حذف القسم' });
    }
  });

  app.post('/api/admin/taxonomy/audit-fix', requireAdmin, (req, res) => {
    try {
      const result = auditAndFixTaxonomy();
      res.json({
        success: true,
        message: `تم فحص وتصحيح تصنيفات وتسميات ${result.fixedCount} من أصل ${result.totalPosts} مقال بنجاح.`,
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'فشل تدقيق وتصحيح التصنيفات' });
    }
  });

  // 6. Public APIs (for visitors & front-end)
  app.get('/api/posts', (req, res) => {
    res.header('Cache-Control', 'public, max-age=0, must-revalidate');
    const { category, search, limit, offset } = req.query;
    let posts = getAllPosts(false); // Only published!

    if (category && category !== 'all') {
      const catLower = String(category).toLowerCase();
      posts = posts.filter(
        (p) =>
          p.categorySlug.toLowerCase() === catLower ||
          p.category.toLowerCase() === catLower
      );
    }

    if (search) {
      const q = String(search).toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.snippet.toLowerCase().includes(q) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    const total = posts.length;
    const start = Number(offset) || 0;
    const count = Number(limit) || total;
    const paginated = posts.slice(start, start + count);

    res.json({
      total,
      posts: paginated,
    });
  });

  app.get('/api/posts/:slug', (req, res) => {
    res.header('Cache-Control', 'public, max-age=0, must-revalidate');
    const post = getPostBySlug(req.params.slug, false);
    if (!post) return res.status(404).json({ error: 'المقال غير موجود' });
    res.json(post);
  });

  app.get('/api/categories', (req, res) => {
    res.header('Cache-Control', 'public, max-age=0, must-revalidate');
    res.json(getAllCategories());
  });

  // --- Vite / Static Serve Logic with Dynamic Server-Side SEO HTML Injection ---
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const rawHtml = fs.readFileSync(
          path.resolve(__dirname, 'index.html'),
          'utf-8'
        );
        const viteHtml = await vite.transformIndexHtml(url, rawHtml);
        const currentPublishedPosts = getAllPosts(false);

        if (!isKnownRoute(url, currentPublishedPosts)) {
          return res
            .status(404)
            .set({ 'Content-Type': 'text/html; charset=utf-8' })
            .end(renderNotFoundHtml(viteHtml));
        }

        const seoHtml = injectServerSideSeo(viteHtml, url, undefined, currentPublishedPosts);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(seoHtml);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(
      express.static(path.resolve(__dirname, 'dist'), {
        index: false,
      })
    );

    app.get('*', (req, res) => {
      const url = req.originalUrl;
      const rawHtml = fs.readFileSync(
        path.resolve(__dirname, 'dist', 'index.html'),
        'utf-8'
      );
      const currentPublishedPosts = getAllPosts(false);

      if (!isKnownRoute(url, currentPublishedPosts)) {
        return res
          .status(404)
          .set({ 'Content-Type': 'text/html; charset=utf-8' })
          .send(renderNotFoundHtml(rawHtml));
      }

      const seoHtml = injectServerSideSeo(rawHtml, url, undefined, currentPublishedPosts);
      res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(seoHtml);
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      setTimeout(() => {
        httpServer.close();
        httpServer.listen(port);
      }, 500);
    } else {
      console.error('Server error:', err);
    }
  });

  httpServer.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer();
