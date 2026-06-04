import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Fetching apps and extensions...');
    const { data: apps } = await supabase.from('apps').select('id, name, compatible_with');
    const { data: extensions } = await supabase.from('extensions').select('id, name, compatible_with');

    if (!apps || !extensions) {
        console.error('Failed to fetch data');
        return;
    }

    console.log(`Found ${apps.length} apps and ${extensions.length} extensions.`);

    // 1. Create a few common groups based on popular apps
    const groupNames = ['Mihon Family', 'Aniyomi Family', 'Stremio Ecosystem', 'Cloudstream Ecosystem', 'Tachiyomi Family'];
    const groups: Record<string, any> = {};

    for (const name of groupNames) {
        let color = '#6366F1';
        if (name.includes('Mihon')) color = '#EAB308';
        if (name.includes('Aniyomi')) color = '#EC4899';
        if (name.includes('Stremio')) color = '#8B5CF6';
        if (name.includes('Cloudstream')) color = '#14B8A6';

        // Check if exists
        const { data: existing } = await supabase.from('compatibility_groups').select('*').eq('name', name).maybeSingle();
        if (existing) {
            groups[name] = existing;
            console.log(`Group already exists: ${name}`);
        } else {
            const { data: newGroup, error } = await supabase
                .from('compatibility_groups')
                .insert({ name, description: `Ecosystem for ${name}`, color })
                .select()
                .single();
            if (error) {
                console.error(`Failed to create group ${name}`, error);
            } else {
                groups[name] = newGroup;
                console.log(`Created group: ${name}`);
            }
        }
    }

    // 2. Helper to assign an app to a group
    const assignApp = async (appName: string, groupName: string) => {
        const app = apps.find(a => a.name.toLowerCase() === appName.toLowerCase());
        const group = groups[groupName];
        if (app && group) {
            await supabase.from('app_group_memberships').upsert({ app_id: app.id, group_id: group.id }, { onConflict: 'app_id,group_id' });
            console.log(`Assigned app ${app.name} to ${groupName}`);
        }
    };

    // 3. Helper to assign extensions to a group based on their compatible_with matching the appName
    const assignExtensions = async (appNameMatches: string[], groupName: string) => {
        const group = groups[groupName];
        if (!group) return;

        const lowerMatches = appNameMatches.map(m => m.toLowerCase());
        
        for (const ext of extensions) {
            const compat: string[] = ext.compatible_with || [];
            const isMatch = compat.some(appName => lowerMatches.includes(appName.toLowerCase()));
            
            if (isMatch) {
                await supabase.from('extension_group_memberships').upsert({ extension_id: ext.id, group_id: group.id }, { onConflict: 'extension_id,group_id' });
                console.log(`Assigned extension ${ext.name} to ${groupName}`);
            }
        }
    };

    // 4. Run assignments
    await assignApp('Mihon', 'Mihon Family');
    await assignApp('Tachiyomi SY', 'Mihon Family');
    await assignApp('Tachiyomi J2K', 'Mihon Family');
    await assignApp('Yokai', 'Mihon Family');
    await assignApp('Komikku', 'Mihon Family');
    await assignExtensions(['Mihon', 'Tachiyomi SY', 'Tachiyomi J2K', 'Yokai', 'Komikku', 'Tachiyomi AT', 'Tachiyomi AZ'], 'Mihon Family');

    await assignApp('Aniyomi', 'Aniyomi Family');
    await assignApp('Anikku', 'Aniyomi Family');
    await assignApp('Animetail', 'Aniyomi Family');
    await assignApp('Animiru', 'Aniyomi Family');
    await assignApp('Tadami', 'Aniyomi Family');
    await assignExtensions(['Aniyomi', 'Anikku', 'Animetail', 'Animiru', 'Tadami'], 'Aniyomi Family');

    await assignApp('Stremio', 'Stremio Ecosystem');
    await assignExtensions(['Stremio', 'NuvioMobile', 'DodoStream'], 'Stremio Ecosystem');

    await assignExtensions(['cloudstream', 'cloudstream3'], 'Cloudstream Ecosystem');

    console.log('Migration complete!');
}

migrate().catch(console.error);
