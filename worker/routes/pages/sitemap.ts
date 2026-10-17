import { eq, ne } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import type { AppEnv } from '../../lib/http.ts';
import { apps, blogPosts, extensions, guides } from '../../db/schema.ts';

/**
 * GET /sitemap.xml — port of functions/sitemap.xml.ts (D1-backed).
 */
export const sitemapRouter = new Hono<AppEnv>();

const STATIC_PATHS = [
  '/',
  '/software',
  '/extensions',
  '/guides',
  '/blog',
  '/faq',
  '/about',
  '/donate',
  '/submit',
  '/privacy',
];

sitemapRouter.get('/sitemap.xml', async (c) => {
  try {
    const baseUrl = (c.env.SITE_URL || 'https://miyomi.app').replace(/\/$/, '');
    const db = createDb(c.env.DB);
    const [appRows, extRows, guideRows, blogRows] = await Promise.all([
      db.select({ slug: apps.slug, updatedAt: apps.updatedAt }).from(apps).where(eq(apps.status, 'approved')),
      db.select({ slug: extensions.slug, updatedAt: extensions.updatedAt }).from(extensions).where(eq(extensions.status, 'approved')),
      db.select({ slug: guides.slug, updatedAt: guides.updatedAt }).from(guides).where(ne(guides.status, 'draft')),
      db.select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt }).from(blogPosts).where(eq(blogPosts.status, 'published')),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const day = (iso: string | null) => (iso ? new Date(iso).toISOString().split('T')[0] : today);
    const urls: Array<{ loc: string; lastmod: string }> = STATIC_PATHS.map((path) => ({
      loc: `${baseUrl}${path}`,
      lastmod: today,
    }));
    for (const a of appRows) if (a.slug) urls.push({ loc: `${baseUrl}/software/${a.slug}`, lastmod: day(a.updatedAt) });
    for (const e of extRows) if (e.slug) urls.push({ loc: `${baseUrl}/extensions/${e.slug}`, lastmod: day(e.updatedAt) });
    for (const g of guideRows) if (g.slug) urls.push({ loc: `${baseUrl}/guides/${g.slug}`, lastmod: day(g.updatedAt) });
    for (const b of blogRows) if (b.slug) urls.push({ loc: `${baseUrl}/blog/${b.slug}`, lastmod: day(b.updatedAt) });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`,
  )
  .join('\n')}
</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[sitemap] generation failed:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
});
