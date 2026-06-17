import type { Env } from './supabase';

export const SITE_NAME = 'Miyomi';

export const DEFAULT_DESCRIPTION =
  'Miyomi is a community-run directory for discovering manga, anime, light novel apps, extension repositories, setup guides, and useful resources.';

export const DEFAULT_OG_IMAGE = '/og-banner.png';

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

export function absoluteUrl(env: Env, path: string): string {
  const base = env.SITE_URL || 'https://miyomi.app';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base.replace(/\/$/, '')}${cleanPath}`;
}

export function absoluteImageUrl(env: Env, urlOrPath: string): string {
  if (!urlOrPath) return absoluteUrl(env, DEFAULT_OG_IMAGE);
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  return absoluteUrl(env, urlOrPath);
}

export function buildSeoTags(seo: SeoData): string {
  const { title, description, canonicalUrl, ogImage, ogType, robots } = seo;

  const escapedTitle = escapeHtml(title);
  const escapedDesc = escapeHtml(description);
  const escapedImg = escapeHtml(ogImage);
  const escapedCanonical = escapeHtml(canonicalUrl);

  const tags = [
    `<title>${escapedTitle}</title>`,
    `<meta name="description" content="${escapedDesc}" />`,
    `<link rel="canonical" href="${escapedCanonical}" />`,
    `<meta name="robots" content="${escapeHtml(robots || 'index,follow,max-image-preview:large')}" />`,
    
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${escapedTitle}" />`,
    `<meta property="og:description" content="${escapedDesc}" />`,
    `<meta property="og:url" content="${escapedCanonical}" />`,
    `<meta property="og:type" content="${escapeHtml(ogType)}" />`,
    `<meta property="og:image" content="${escapedImg}" />`,
    `<meta property="og:image:alt" content="${escapedTitle}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapedTitle}" />`,
    `<meta name="twitter:description" content="${escapedDesc}" />`,
    `<meta name="twitter:image" content="${escapedImg}" />`,
    `<meta name="theme-color" content="#0f172a" />`
  ];

  if (seo.jsonLd) {
    // Stringify JSON, making sure to escape closing script tags if present
    const jsonStr = JSON.stringify(seo.jsonLd).replace(/<\/script/g, '<\\/script');
    tags.push(`<script type="application/ld+json">\n${jsonStr}\n</script>`);
  }

  return tags.join('\n    ');
}

export function injectSeoIntoHtml(html: string, seo: SeoData): string {
  // Inject Meta
  const metaTags = buildSeoTags(seo);
  let updatedHtml = html;
  
  if (updatedHtml.includes('<!--SEO_START-->') && updatedHtml.includes('<!--SEO_END-->')) {
    updatedHtml = updatedHtml.replace(/<!--SEO_START-->[\s\S]*<!--SEO_END-->/, metaTags);
  } else {
    updatedHtml = updatedHtml.replace('</head>', `\n    ${metaTags}\n  </head>`);
  }

  return updatedHtml;
}

export function getDefaultSeo(env: Env, pathname: string): SeoData {
  return {
    title: `${SITE_NAME} - Apps, Extensions, Guides & Anime/Manga Resources`,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: absoluteUrl(env, pathname),
    ogImage: absoluteImageUrl(env, DEFAULT_OG_IMAGE),
    ogType: 'website',
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": SITE_NAME,
      "url": absoluteUrl(env, '/'),
      "description": DEFAULT_DESCRIPTION
    }
  };
}
