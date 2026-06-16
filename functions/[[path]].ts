/// <reference types="@cloudflare/workers-types" />
import { createServerSupabase, type Env } from './_lib/supabase';
import {
  buildSeoTags,
  injectSeoIntoHtml,
  getDefaultSeo,
  absoluteUrl,
  absoluteImageUrl,
  stripHtml,
  truncate,
  type SeoData,
  SITE_NAME
} from './_lib/seo';

// Exclude these from edge processing just in case they slip through _routes.json
function isAssetPath(path: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif|svg|ico|css|js|map|txt|json|webmanifest)$/i.test(path) || path.includes('/_assets/');
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (isAssetPath(pathname)) {
    return env.ASSETS.fetch(request);
  }

  // Fetch index.html template from assets.
  // We fetch the root '/' instead of '/index.html' because Cloudflare Pages' Clean URLs feature 
  // automatically responds with a 308 redirect from '/index.html' -> '/', causing an infinite redirect loop.
  const indexRequest = new Request(`${url.origin}/`, request);
  const indexResponse = await env.ASSETS.fetch(indexRequest);

  if (!indexResponse.ok) {
    return indexResponse;
  }

  const template = await indexResponse.text();
  let seo = getDefaultSeo(env, pathname);

  try {
    const supabase = createServerSupabase(env);
    
    // Resolve Route-Specific SEO
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length === 0) {
      // Home
      seo.title = `${SITE_NAME} - Apps, Extensions, Guides & Anime/Manga Resources`;
    } else if (parts[0] === 'software') {
      if (parts.length === 1) {
        // /software
        seo.title = `Apps - ${SITE_NAME}`;
        seo.description = `Discover manga, anime, light novel, and media apps indexed by the ${SITE_NAME} community.`;
        seo.jsonLd = {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": seo.title,
          "url": seo.canonicalUrl,
          "description": seo.description
        };
      } else if (parts.length === 2) {
        // /software/:slug
        const slug = parts[1];
        const { data } = await supabase
          .from('apps')
          .select('name, description, short_description, icon_url, seo_title, seo_description, og_image_url')
          .eq('status', 'approved')
          .eq('slug', slug)
          .maybeSingle();

        if (data) {
          seo.title = data.seo_title || `${data.name} - ${SITE_NAME}`;
          seo.description = data.seo_description || data.short_description || data.description || `View ${data.name} on ${SITE_NAME}.`;
          seo.ogImage = absoluteImageUrl(env, data.og_image_url || `/og/apps/${slug}.png`);
          seo.fallbackHtml = `<main><h1>${escapeHtml(data.name)}</h1><p>${escapeHtml(seo.description)}</p></main>`;
          seo.jsonLd = {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": data.name,
            "description": seo.description,
            "url": seo.canonicalUrl,
            "applicationCategory": "MultimediaApplication"
          };
        } else {
          seo.status = 404;
          seo.title = `Page Not Found - ${SITE_NAME}`;
          seo.robots = 'noindex,follow';
        }
      }
    } else if (parts[0] === 'extensions') {
      if (parts.length === 1) {
        // /extensions
        seo.title = `Extensions - ${SITE_NAME}`;
        seo.description = `Discover extension repositories and sources compatible with popular manga/anime apps.`;
        seo.jsonLd = {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": seo.title,
          "url": seo.canonicalUrl,
          "description": seo.description
        };
      } else if (parts.length === 2) {
        // /extensions/:slug
        const slug = parts[1];
        const { data } = await supabase
          .from('extensions')
          .select('name, description, short_description, icon_url, seo_title, seo_description, og_image_url')
          .eq('status', 'approved')
          .eq('slug', slug)
          .maybeSingle();

        if (data) {
          seo.title = data.seo_title || `${data.name} Extension - ${SITE_NAME}`;
          seo.description = data.seo_description || data.short_description || data.description || `View ${data.name} extension source on ${SITE_NAME}.`;
          seo.ogImage = absoluteImageUrl(env, data.og_image_url || `/og/extensions/${slug}.png`);
          seo.fallbackHtml = `<main><h1>${escapeHtml(data.name)}</h1><p>${escapeHtml(seo.description)}</p></main>`;
          seo.jsonLd = {
            "@context": "https://schema.org",
            "@type": "SoftwareSourceCode",
            "name": data.name,
            "description": seo.description,
            "url": seo.canonicalUrl
          };
        } else {
          seo.status = 404;
          seo.title = `Page Not Found - ${SITE_NAME}`;
          seo.robots = 'noindex,follow';
        }
      }
    } else if (parts[0] === 'guides') {
      if (parts.length === 1) {
        // /guides
        seo.title = `Guides - ${SITE_NAME}`;
        seo.description = `Step-by-step guides for apps, extensions, setup, installation, troubleshooting, and usage.`;
        seo.jsonLd = {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": seo.title,
          "url": seo.canonicalUrl,
          "description": seo.description
        };
      } else if (parts.length === 2) {
        // /guides/:slug
        const slug = parts[1];
        const { data } = await supabase
          .from('guides')
          .select('title, description, content_html, content, author, author_name, created_at, updated_at, seo_title, seo_description, og_image_url')
          .eq('slug', slug)
          .neq('status', 'draft')
          .maybeSingle();

        if (data) {
          const contentStr = data.content_html || data.content || '';
          const summary = truncate(stripHtml(contentStr), 150);

          seo.title = data.seo_title || `${data.title} - ${SITE_NAME} Guide`;
          seo.description = data.seo_description || data.description || summary || `Read ${data.title} on ${SITE_NAME} Guides.`;
          seo.ogImage = absoluteImageUrl(env, data.og_image_url || `/og/guides/${slug}.png`);
          seo.ogType = 'article';
          seo.fallbackHtml = `<main><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(seo.description)}</p></main>`;
          seo.jsonLd = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": data.title,
            "description": seo.description,
            "url": seo.canonicalUrl,
            "author": {
              "@type": "Person",
              "name": data.author_name || data.author || "Anonymous"
            },
            "datePublished": data.created_at,
            "dateModified": data.updated_at
          };
        } else {
          seo.status = 404;
          seo.title = `Page Not Found - ${SITE_NAME}`;
          seo.robots = 'noindex,follow';
        }
      }
    }

  } catch (error) {
    console.error('SEO resolve failed:', error);
  }

  // Helper inside functions/[[path]].ts to avoid missing import
  function escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const html = injectSeoIntoHtml(template, seo);

  return new Response(html, {
    status: seo.status || 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
