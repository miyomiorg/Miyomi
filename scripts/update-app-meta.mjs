import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LIST_APPS_URL = 'https://miyomi-api.supabase.co/functions/v1/list-apps';
const OUTPUT_FILE = path.join(__dirname, '../app-meta.json');

function extractRepo(url) {
    try {
        if (!url) return null;
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
        return null;
    } catch (e) {
        return null;
    }
}

async function fetchReleases(repo) {
    let page = 1;
    let allReleases = [];

    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    while (true) {
        try {
            const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`, { headers });

            if (!res.ok) {
                console.error(`  ⚠️  Failed to fetch releases: ${res.statusText}`);
                break;
            }

            const releases = await res.json();
            if (!releases || releases.length === 0) break;

            allReleases = allReleases.concat(releases);
            if (releases.length < 100) break;
            page++;
        } catch (error) {
            console.error(`  ⚠️  Error fetching releases:`, error);
            break;
        }
    }
    return allReleases;
}

function calculateDownloads(releases) {
    return releases
        .filter(r => !r.draft)
        .reduce((total, release) => {
            const releaseDownloads = release.assets.reduce((sum, asset) => sum + asset.download_count, 0);
            return total + releaseDownloads;
        }, 0);
}

function getLatestReleaseDate(releases) {
    if (!releases || releases.length === 0) return null;

    const validReleases = releases.filter(r => !r.draft && !r.prerelease);
    if (validReleases.length === 0) {
        const preReleases = releases.filter(r => !r.draft);
        if (preReleases.length === 0) return null;
        return preReleases[0].published_at;
    }

    return validReleases[0].published_at;
}

async function fetchAppsList() {
    console.log(`Fetching app list from ${LIST_APPS_URL}...`);
    try {
        const res = await fetch(LIST_APPS_URL);
        if (!res.ok) throw new Error(`Failed to fetch apps: ${res.statusText}`);
        return await res.json();
    } catch (error) {
        console.error("Error fetching app list:", error);
        process.exit(1);
    }
}

async function main() {
    try {
        const appsData = await fetchAppsList();
        const updates = [];

        console.log(`Processing ${appsData.length} apps...\n`);

        for (const app of appsData) {
            const repo = extractRepo(app.repo_url);
            if (!repo) {
                console.log(`⏭  ${app.name} (${app.slug}) — no valid GitHub URL, skipping`);
                continue;
            }

            console.log(`📦 ${app.name} (${repo})`);
            const releases = await fetchReleases(repo);

            const download_count = calculateDownloads(releases);
            const last_release_date = getLatestReleaseDate(releases);

            if (download_count > 0 || last_release_date) {
                updates.push({
                    slug: app.slug,
                    download_count,
                    last_release_date
                });
                console.log(
                    `  ✅ downloads: ${download_count || 'N/A'}, last_release_date: ${last_release_date || 'N/A'}\n`
                );
            } else {
                console.log(`  ⚠️  No release data found\n`);
            }
        }

        const outputData = { updates };
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2) + '\n');
        console.log(`\n✅ Wrote ${OUTPUT_FILE}`);
        console.log(`   ${updates.length} apps with metadata`);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
