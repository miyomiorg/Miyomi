// scripts/generate-og-images.mjs
// Build-time OG generator for Miyomi.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getSupabaseClient, fetchApps, fetchExtensions, fetchGuides } from './og/fetchOgData.mjs';
import { renderCardTemplate } from './og/templates.mjs';
import { renderToPng } from './og/renderOgImage.mjs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist', 'og');

const SITE_URL = (process.env.SITE_URL || 'https://miyomi.app').replace(/\/$/, '');
const PUBLIC_HOST = SITE_URL.replace(/^https?:\/\//, '');

function toDataUri(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.svg'
    ? 'image/svg+xml'
    : ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : 'image/png';
  const buffer = fs.readFileSync(filePath);
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function pickExisting(paths) {
  return paths.find((p) => fs.existsSync(p)) || null;
}

const logoPath = pickExisting([
  path.resolve(ROOT_DIR, 'public/logo.png'),
]);

const mascotHugPath = pickExisting([
  path.resolve(ROOT_DIR, 'public/hugme.png'),
  path.resolve(ROOT_DIR, 'public/inaread.png'),
]);

const mascotPolicePath = pickExisting([
  path.resolve(ROOT_DIR, 'public/polic.png'),
]);

const logoUrl = toDataUri(logoPath);
const mascotHugUrl = toDataUri(mascotHugPath);
const mascotPoliceUrl = toDataUri(mascotPolicePath) || mascotHugUrl;

if (!logoUrl) {
  console.warn(`⚠️ Miyomi logo not found at: ${path.resolve(ROOT_DIR, 'public/logo.png')}`);
}
if (!mascotHugUrl) {
  console.warn(`⚠️ Mascot not found at: ${path.resolve(ROOT_DIR, 'public/hugme.png')}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stripHtml(value = '') {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function summaryFromGuide(guide) {
  const direct = guide.seo_description || guide.description;
  if (direct) return stripHtml(direct);
  return stripHtml(guide.content_html || guide.content || '').slice(0, 160);
}

function getSafeIconUrl(url) {
  if (!url) return null;
  let cleanUrl = url.trim();

  if (cleanUrl.includes('googleusercontent.com') && cleanUrl.endsWith('-rw')) {
    cleanUrl = cleanUrl.replace(/-rw$/, '');
  }

  if (cleanUrl.toLowerCase().endsWith('.webp') || cleanUrl.toLowerCase().endsWith('.avif')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=png`;
  }

  return cleanUrl;
}

function normaliseRowBase(row, routePath, type) {
  return {
    logoUrl,
    mascotUrl: type === 'Guide' ? mascotPoliceUrl : mascotHugUrl,
    pageUrl: `${PUBLIC_HOST}${routePath}`,
    accentColor: row.theme_color || row.accent_color || '#22a8ff',
    secondaryColor: row.secondary_color || '#7c5cff',
    iconUrl: getSafeIconUrl(row.icon_url),
    downloadCount: row.download_count || row.downloads || 0,
    likesCount: row.likes_count || row.like_count || row.likes || 0,
    updatedAt: row.updated_at || row.created_at || null,
    author: row.author_name || row.author || row.developer || row.maintainer || 'Community',
    language: row.language || 'Multi',
    category: row.category || 'General',
  };
}

async function generateOne({ item, type, outputDir, routePath, data }) {
  if (item.og_image_url) {
    console.log(`⏩ Skipped ${type} ${item.slug}: custom og_image_url exists`);
    return;
  }

  const outputPath = path.join(outputDir, `${item.slug}.png`);

  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      const satoriObj = renderCardTemplate(data, type);
      await renderToPng(satoriObj, outputPath);
      console.log(`✅ Generated ${type} OG: ${item.slug}`);
      return;
    } catch (e) {
      attempt++;
      console.warn(`⚠️ Attempt ${attempt} failed for ${type} ${item.slug}: ${e.message}`);

      if (attempt < maxAttempts && data.iconUrl && !data.iconUrl.includes('wsrv.nl')) {
        console.warn(`🔄 Retrying with image proxy for ${item.slug}...`);
        data.iconUrl = `https://wsrv.nl/?url=${encodeURIComponent(data.iconUrl)}&output=png`;
      } else if (attempt >= maxAttempts) {
        console.warn(`⚠️ Using fallback logo for ${type} ${item.slug}`);
        try {
          const fallbackData = { ...data, iconUrl: data.logoUrl };
          const satoriObj = renderCardTemplate(fallbackData, type);
          await renderToPng(satoriObj, outputPath);
          console.log(`✅ Generated ${type} OG with fallback icon: ${item.slug}`);
        } catch (e2) {
          console.error(`❌ Failed ${type} OG ${item.slug} completely: ${e2.message}`);
        }
      }
    }
  }
}

async function main() {
  console.log('Starting Miyomi OG image generation...');

  ensureDir(path.join(DIST_DIR, 'apps'));
  ensureDir(path.join(DIST_DIR, 'extensions'));
  ensureDir(path.join(DIST_DIR, 'guides'));

  const supabase = getSupabaseClient();

  try {
    const [apps, extensions, guides] = await Promise.all([
      fetchApps(supabase),
      fetchExtensions(supabase),
      fetchGuides(supabase),
    ]);

    console.log(`Fetched ${apps.length} apps, ${extensions.length} extensions, ${guides.length} guides.`);

    for (const app of apps) {
      const routePath = `/software/${app.slug}`;
      await generateOne({
        item: app,
        type: 'App',
        outputDir: path.join(DIST_DIR, 'apps'),
        routePath,
        data: {
          ...normaliseRowBase(app, routePath, 'App'),
          title: app.seo_title || app.name || 'Miyomi App',
          description: app.seo_description || app.short_description || app.description || 'Discover this app on Miyomi.',
        },
      });
    }

    for (const ext of extensions) {
      const routePath = `/extensions/${ext.slug}`;
      await generateOne({
        item: ext,
        type: 'Extension',
        outputDir: path.join(DIST_DIR, 'extensions'),
        routePath,
        data: {
          ...normaliseRowBase(ext, routePath, 'Extension'),
          title: ext.seo_title || ext.name || 'Miyomi Extension',
          description: ext.seo_description || ext.short_description || ext.description || 'Discover this extension on Miyomi.',
        },
      });
    }

    for (const guide of guides) {
      const routePath = `/guides/${guide.slug}`;
      await generateOne({
        item: guide,
        type: 'Guide',
        outputDir: path.join(DIST_DIR, 'guides'),
        routePath,
        data: {
          ...normaliseRowBase(guide, routePath, 'Guide'),
          iconUrl: null,
          title: guide.seo_title || guide.title || 'Miyomi Guide',
          description: summaryFromGuide(guide) || 'Read this guide on Miyomi.',
          downloadCount: 0,
        },
      });
    }

    console.log('🎉 OG image generation completed.');
  } catch (err) {
    console.error('❌ Failed fetching data for OG image generation:', err);
    process.exit(1);
  }
}

main();
