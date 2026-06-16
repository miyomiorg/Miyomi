import { createServerSupabase, type Env } from './_lib/supabase';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const baseUrl = env.SITE_URL || 'https://miyomi.app';

  try {
    const supabase = createServerSupabase(env);

    // Fetch dynamic paths
    const [
      { data: apps },
      { data: extensions },
      { data: guides }
    ] = await Promise.all([
      supabase.from('apps').select('slug, updated_at').eq('status', 'approved'),
      supabase.from('extensions').select('slug, updated_at').eq('status', 'approved'),
      supabase.from('guides').select('slug, updated_at').neq('status', 'draft')
    ]);

    const urls = [
      '/',
      '/software',
      '/extensions',
      '/guides',
      '/faq',
      '/about',
      '/donate',
      '/submit',
      '/privacy'
    ].map(path => ({
      loc: `${baseUrl}${path}`,
      lastmod: new Date().toISOString().split('T')[0]
    }));

    if (apps) {
      apps.forEach(app => {
        urls.push({
          loc: `${baseUrl}/software/${app.slug}`,
          lastmod: (app.updated_at ? new Date(app.updated_at) : new Date()).toISOString().split('T')[0]
        });
      });
    }

    if (extensions) {
      extensions.forEach(ext => {
        urls.push({
          loc: `${baseUrl}/extensions/${ext.slug}`,
          lastmod: (ext.updated_at ? new Date(ext.updated_at) : new Date()).toISOString().split('T')[0]
        });
      });
    }

    if (guides) {
      guides.forEach(guide => {
        urls.push({
          loc: `${baseUrl}/guides/${guide.slug}`,
          lastmod: (guide.updated_at ? new Date(guide.updated_at) : new Date()).toISOString().split('T')[0]
        });
      });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`).join('\n')}
</urlset>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      }
    });
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
};
