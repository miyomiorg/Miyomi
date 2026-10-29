import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createDb } from '../../lib/db.ts';
import type { AppEnv } from '../../lib/http.ts';
import { guideIsPublic } from '../../lib/visibility.ts';
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
    const [appRows, extRows, guideRows, blogRows] = await db.batch([
      db.select({ slug: apps.slug, updatedAt: apps.updatedAt }).from(apps).where(eq(apps.status, 'approved')),
      db.select({ slug: extensions.slug, updatedAt: extensions.updatedAt }).from(extensions).where(eq(extensions.status, 'approved')),
      db.select({ slug: guides.slug, updatedAt: guides.updatedAt }).from(guides).where(guideIsPublic()),
      db.select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt }).from(blogPosts).where(eq(blogPosts.status, 'published')),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    // Legacy timestamps may be malformed; never let one row 500 the sitemap.
    const day = (iso: string | null) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : today);
    const xmlEscape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const slugPath = (slug: string) => xmlEscape(encodeURIComponent(slug));
    const urls: Array<{ loc: string; lastmod: string }> = STATIC_PATHS.map((path) => ({
      loc: `${baseUrl}${path}`,
      lastmod: today,
    }));
    for (const a of appRows) if (a.slug) urls.push({ loc: `${baseUrl}/software/${slugPath(a.slug)}`, lastmod: day(a.updatedAt) });
    for (const e of extRows) if (e.slug) urls.push({ loc: `${baseUrl}/extensions/${slugPath(e.slug)}`, lastmod: day(e.updatedAt) });
    for (const g of guideRows) if (g.slug) urls.push({ loc: `${baseUrl}/guides/${slugPath(g.slug)}`, lastmod: day(g.updatedAt) });
    for (const b of blogRows) if (b.slug) urls.push({ loc: `${baseUrl}/blog/${slugPath(b.slug)}`, lastmod: day(b.updatedAt) });

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
