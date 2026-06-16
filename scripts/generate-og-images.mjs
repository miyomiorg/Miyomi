import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient, fetchApps, fetchExtensions, fetchGuides } from './og/fetchOgData.mjs';
import { renderCardTemplate } from './og/templates.mjs';
import { renderToPng } from './og/renderOgImage.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../dist/og');

async function main() {
  console.log('Starting OG image generation...');
  const supabase = getSupabaseClient();

  try {
    const [apps, extensions, guides] = await Promise.all([
      fetchApps(supabase),
      fetchExtensions(supabase),
      fetchGuides(supabase)
    ]);

    console.log(`Fetched ${apps.length} apps, ${extensions.length} extensions, ${guides.length} guides.`);

    // Generate App OG Images
    for (const app of apps) {
      if (app.og_image_url) continue; // Skip if it already has a custom OG image defined
      
      const data = {
        title: app.seo_title || app.name,
        description: app.seo_description || app.short_description || app.description || '',
        iconUrl: app.icon_url,
        downloadCount: app.download_count,
        likesCount: app.likes_count,
        updatedAt: app.updated_at,
        author: app.author
      };

      try {
        let satoriObj = renderCardTemplate(data, 'App');
        const outputPath = path.join(DIST_DIR, `apps/${app.slug}.png`);
        await renderToPng(satoriObj, outputPath);
        console.log(`✅ Generated OG for app: ${app.slug}`);
      } catch (e) {
        console.warn(`⚠️ Retrying without icon for app ${app.slug} due to error: ${e.message}`);
        try {
          data.iconUrl = null;
          let satoriObj = renderCardTemplate(data, 'App');
          const outputPath = path.join(DIST_DIR, `apps/${app.slug}.png`);
          await renderToPng(satoriObj, outputPath);
          console.log(`✅ Generated OG for app (no icon): ${app.slug}`);
        } catch (e2) {
          console.error(`❌ Failed OG for app ${app.slug}:`, e2.message);
        }
      }
    }

    // Generate Extension OG Images
    for (const ext of extensions) {
      if (ext.og_image_url) continue;
      
      const data = {
        title: ext.seo_title || ext.name,
        description: ext.seo_description || ext.short_description || ext.description || '',
        iconUrl: ext.icon_url,
        downloadCount: ext.download_count,
        likesCount: ext.likes_count,
        updatedAt: ext.updated_at,
        author: ext.author
      };

      try {
        let satoriObj = renderCardTemplate(data, 'Extension');
        const outputPath = path.join(DIST_DIR, `extensions/${ext.slug}.png`);
        await renderToPng(satoriObj, outputPath);
        console.log(`✅ Generated OG for extension: ${ext.slug}`);
      } catch (e) {
        console.warn(`⚠️ Retrying without icon for extension ${ext.slug} due to error: ${e.message}`);
        try {
          data.iconUrl = null;
          let satoriObj = renderCardTemplate(data, 'Extension');
          const outputPath = path.join(DIST_DIR, `extensions/${ext.slug}.png`);
          await renderToPng(satoriObj, outputPath);
          console.log(`✅ Generated OG for extension (no icon): ${ext.slug}`);
        } catch (e2) {
          console.error(`❌ Failed OG for extension ${ext.slug}:`, e2.message);
        }
      }
    }

    // Generate Guide OG Images
    for (const guide of guides) {
      if (guide.og_image_url) continue;
      
      let summary = guide.seo_description || guide.description || '';
      if (!summary && (guide.content_html || guide.content)) {
        summary = (guide.content_html || guide.content || '').replace(/<[^>]*>?/gm, '').slice(0, 150) + '...';
      }

      const data = {
        title: guide.seo_title || guide.title,
        description: summary,
        iconUrl: null, // guides typically don't have an icon_url directly
        updatedAt: guide.updated_at,
        author: guide.author_name || guide.author
      };

      try {
        const satoriObj = renderCardTemplate(data, 'Guide');
        const outputPath = path.join(DIST_DIR, `guides/${guide.slug}.png`);
        await renderToPng(satoriObj, outputPath);
        console.log(`✅ Generated OG for guide: ${guide.slug}`);
      } catch (e) {
        console.error(`❌ Failed OG for guide ${guide.slug}:`, e);
      }
    }

    console.log('🎉 OG image generation completed!');
  } catch (err) {
    console.error('Failed fetching data for OG image generation:', err);
    process.exit(1);
  }
}

main();
