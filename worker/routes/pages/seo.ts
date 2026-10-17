import { eq, or } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import type { Bindings } from '../../env';
import { createDb } from '../../lib/db.ts';
import { isUuid, type AppEnv } from '../../lib/http.ts';
import { apps, blogPosts, extensions, guides } from '../../db/schema.ts';

/**
 * SEO tag injection — port of functions/[[path]].ts + functions/_lib/seo.ts.
 * Serves the Vite-built index.html with per-route meta/OG/JSON-LD tags,
 * now resolved from D1 instead of Supabase.
 */
export const SITE_NAME = 'Miyomi';
export const DEFAULT_DESCRIPTION =
  'Miyomi is a community-run directory for discovering manga, anime, light novel apps, extension repositories, setup guides, and useful resources.';
const DEFAULT_OG_IMAGE = '/og-banner.png';

export interface SeoData {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  ogType: 'website' | 'article';
  robots?: string;
  jsonLd?: Record<string, unknown>;
  status?: number;
}

export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}

export function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trim() + '...';
}

function absoluteUrl(env: Bindings, path: string): string {
  const base = env.SITE_URL || 'https://miyomi.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/$/, '')}${cleanPath}`;
}

function absoluteImageUrl(env: Bindings, urlOrPath: string): string {
  if (!urlOrPath) return absoluteUrl(env, DEFAULT_OG_IMAGE);
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) return urlOrPath;
  return absoluteUrl(env, urlOrPath);
}

export function buildSeoTags(seo: SeoData): string {
  const { title, description, canonicalUrl, ogImage, ogType, robots, jsonLd } = seo;
  const et = escapeHtml(title);
  const ed = escapeHtml(description);
  const ei = escapeHtml(ogImage);
  const ec = escapeHtml(canonicalUrl);
  const tags = [
    `<title>${et}</title>`,
    `<meta name="description" content="${ed}" />`,
    `<link rel="canonical" href="${ec}" />`,
    `<meta name="robots" content="${escapeHtml(robots || 'index,follow,max-image-preview:large')}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${et}" />`,
    `<meta property="og:description" content="${ed}" />`,
    `<meta property="og:url" content="${ec}" />`,
    `<meta property="og:type" content="${escapeHtml(ogType)}" />`,
    `<meta property="og:image" content="${ei}" />`,
    `<meta property="og:image:alt" content="${et}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${et}" />`,
    `<meta name="twitter:description" content="${ed}" />`,
    `<meta name="twitter:image" content="${ei}" />`,
    `<meta name="theme-color" content="#0f172a" />`,
  ];
  if (jsonLd) {
    const jsonStr = JSON.stringify(jsonLd).replace(/<\/script/g, '<\\/script');
    tags.push(`<script type="application/ld+json">\n${jsonStr}\n</script>`);
  }
  return tags.join('\n    ');
}

export function injectSeoIntoHtml(html: string, seo: SeoData): string {
  const metaTags = buildSeoTags(seo);
  if (html.includes('<!--SEO_START-->') && html.includes('<!--SEO_END-->')) {
    return html.replace(/<!--SEO_START-->[\s\S]*<!--SEO_END-->/, metaTags);
  }
  return html.replace('</head>', `\n    ${metaTags}\n  </head>`);
}

export function getDefaultSeo(env: Bindings, pathname: string): SeoData {
  return {
    title: `${SITE_NAME} - Apps, Extensions, Guides & Anime/Manga Resources`,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: absoluteUrl(env, pathname),
    ogImage: absoluteImageUrl(env, DEFAULT_OG_IMAGE),
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: absoluteUrl(env, '/'),
      description: DEFAULT_DESCRIPTION,
    },
  };
}

/** Resolve per-route SEO data from D1 (port of the [[path]] handler logic) */
async function resolveSeo(env: Bindings, pathname: string, slug: string | null): Promise<SeoData> {
  const seo = getDefaultSeo(env, pathname);
  if (!slug) return seo;
  const db = createDb(env.DB);

  try {
    if (pathname.startsWith('/software/')) {
      const ref = slug;
      const [real] = isUuid(ref)
        ? await db.select().from(apps).where(or(eq(apps.id, ref), eq(apps.slug, ref))).limit(1)
        : await db.select().from(apps).where(eq(apps.slug, ref)).limit(1);
      if (real && real.status === 'approved') {
        seo.title = real.seoTitle || `${real.name} - ${SITE_NAME}`;
        seo.description = real.seoDescription || real.shortDescription || real.description || `View ${real.name} on ${SITE_NAME}.`;
        seo.ogImage = absoluteImageUrl(env, real.ogImageUrl || `/og/apps/${ref}.png`);
        seo.jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: real.name,
          description: seo.description,
          url: seo.canonicalUrl,
          applicationCategory: 'MultimediaApplication',
        };
      } else {
        seo.status = 404;
        seo.title = `Page Not Found - ${SITE_NAME}`;
        seo.robots = 'noindex,follow';
      }
    } else if (pathname.startsWith('/extensions/')) {
      const ref = slug;
      const [real] = isUuid(ref)
        ? await db.select().from(extensions).where(or(eq(extensions.id, ref), eq(extensions.slug, ref))).limit(1)
        : await db.select().from(extensions).where(eq(extensions.slug, ref)).limit(1);
      if (real && real.status === 'approved') {
        seo.title = real.seoTitle || `${real.name} Extension - ${SITE_NAME}`;
        seo.description = real.seoDescription || real.shortDescription || real.description || `View ${real.name} extension source on ${SITE_NAME}.`;
        seo.ogImage = absoluteImageUrl(env, real.ogImageUrl || `/og/extensions/${ref}.png`);
        seo.jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'SoftwareSourceCode',
          name: real.name,
          description: seo.description,
          url: seo.canonicalUrl,
        };
      } else {
        seo.status = 404;
        seo.title = `Page Not Found - ${SITE_NAME}`;
        seo.robots = 'noindex,follow';
      }
    } else if (pathname.startsWith('/guides/')) {
      const ref = slug;
      const [real] = isUuid(ref)
        ? await db.select().from(guides).where(or(eq(guides.id, ref), eq(guides.slug, ref))).limit(1)
        : await db.select().from(guides).where(eq(guides.slug, ref)).limit(1);
      if (real && real.status !== 'draft') {
        const contentStr = real.contentHtml || real.content || '';
        const summary = truncate(stripHtml(contentStr), 150);
        seo.title = real.seoTitle || `${real.title} - ${SITE_NAME} Guide`;
        seo.description = real.seoDescription || real.description || summary || `Read ${real.title} on ${SITE_NAME} Guides.`;
        seo.ogImage = absoluteImageUrl(env, real.ogImageUrl || `/og/guides/${ref}.png`);
        seo.ogType = 'article';
        seo.jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: real.title,
          description: seo.description,
          url: seo.canonicalUrl,
          author: { '@type': 'Person', name: real.authorName || real.author || 'Anonymous' },
          datePublished: real.createdAt,
          dateModified: real.updatedAt,
        };
      } else {
        seo.status = 404;
        seo.title = `Page Not Found - ${SITE_NAME}`;
        seo.robots = 'noindex,follow';
      }
    } else if (pathname.startsWith('/blog/')) {
      const ref = slug;
      const [real] = isUuid(ref)
        ? await db.select().from(blogPosts).where(or(eq(blogPosts.id, ref), eq(blogPosts.slug, ref))).limit(1)
        : await db.select().from(blogPosts).where(eq(blogPosts.slug, ref)).limit(1);
      if (real && real.status === 'published') {
        const contentStr = real.excerpt || stripHtml(real.content || '');
        const summary = truncate(contentStr, 150);
        seo.title = real.seoTitle || `${real.title} - ${SITE_NAME} Blog`;
        seo.description = real.seoDescription || summary || `Read ${real.title} on the ${SITE_NAME} Blog.`;
        seo.ogImage = absoluteImageUrl(env, real.ogImageUrl || real.thumbnailUrl || `/og/blog/${ref}.png`);
        seo.ogType = 'article';
        seo.jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: real.title,
          description: seo.description,
          url: seo.canonicalUrl,
          author: { '@type': 'Person', name: real.authorName || 'Miyomi Admin' },
          datePublished: real.createdAt,
          dateModified: real.updatedAt,
        };
      } else {
        seo.status = 404;
        seo.title = `Page Not Found - ${SITE_NAME}`;
        seo.robots = 'noindex,follow';
      }
    }
  } catch (error) {
    console.error('[seo] resolve failed:', error);
  }
  return seo;
}

/** Serve index.html with injected SEO for the given pathname */
async function serveSeoPage(c: Context<AppEnv>, pathname: string, slug: string | null): Promise<Response> {
  const env = c.env;
  const indexRequest = new Request(`${new URL(c.req.url).origin}/`);
  const indexResponse = await env.ASSETS.fetch(indexRequest);
  if (!indexResponse.ok) return indexResponse;
  const template = await indexResponse.text();
  const seo = await resolveSeo(env, pathname, slug);
  const html = injectSeoIntoHtml(template, seo);
  return new Response(html, {
    status: seo.status || 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

/** Hono router with all SEO-processed page routes */
export const seoRouter = new Hono<AppEnv>();

const staticPages = ['', 'software', 'extensions', 'guides', 'blog', 'faq', 'about', 'donate', 'submit', 'privacy'];

for (const p of staticPages) {
  seoRouter.get(p === '' ? '/' : `/${p}`, (c) => serveSeoPage(c, c.req.path, null));
}

seoRouter.get('/software/:slug', (c) => serveSeoPage(c, c.req.path, c.req.param('slug')));
seoRouter.get('/extensions/:slug', (c) => serveSeoPage(c, c.req.path, c.req.param('slug')));
seoRouter.get('/guides/:slug', (c) => serveSeoPage(c, c.req.path, c.req.param('slug')));
seoRouter.get('/blog/:slug', (c) => serveSeoPage(c, c.req.path, c.req.param('slug')));
