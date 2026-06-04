import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch all compatibility groups from the database.
 */
export async function fetchAllGroups() {
    const { data, error } = await (supabase as any).from('compatibility_groups').select('*').order('name');
    if (error) throw error;
    return data || [];
}

/**
 * Fetch group memberships for a specific app.
 */
export async function getGroupsForApp(appId: string): Promise<string[]> {
    const { data, error } = await (supabase as any)
        .from('app_group_memberships')
        .select('group_id')
        .eq('app_id', appId);
    if (error) throw error;
    return (data || []).map((r: any) => r.group_id);
}

/**
 * Fetch group memberships for a specific extension.
 */
export async function getGroupsForExtension(extId: string): Promise<string[]> {
    const { data, error } = await (supabase as any)
        .from('extension_group_memberships')
        .select('group_id')
        .eq('extension_id', extId);
    if (error) throw error;
    return (data || []).map((r: any) => r.group_id);
}

/**
 * Set group memberships for an app (replaces existing).
 */
export async function setAppGroups(appId: string, groupIds: string[]) {
    // Delete existing memberships
    await (supabase as any).from('app_group_memberships').delete().eq('app_id', appId);

    // Insert new memberships
    if (groupIds.length > 0) {
        const rows = groupIds.map(gid => ({ app_id: appId, group_id: gid }));
        const { error } = await (supabase as any).from('app_group_memberships').insert(rows);
        if (error) throw error;
    }
}

/**
 * Set group memberships for an extension (replaces existing).
 */
export async function setExtensionGroups(extId: string, groupIds: string[]) {
    // Delete existing memberships
    await (supabase as any).from('extension_group_memberships').delete().eq('extension_id', extId);

    // Insert new memberships
    if (groupIds.length > 0) {
        const rows = groupIds.map(gid => ({ extension_id: extId, group_id: gid }));
        const { error } = await (supabase as any).from('extension_group_memberships').insert(rows);
        if (error) throw error;
    }
}

/**
 * Get all extension names that share the same groups as an app.
 * Returns the union of extensions from all groups the app belongs to.
 */
export async function getExtensionsFromGroups(groupIds: string[]): Promise<string[]> {
    if (groupIds.length === 0) return [];

    // Get all extension IDs in those groups
    const { data: memberships, error: memErr } = await (supabase as any)
        .from('extension_group_memberships')
        .select('extension_id')
        .in('group_id', groupIds);
    if (memErr) throw memErr;

    const extIds = [...new Set((memberships || []).map((m: any) => m.extension_id))];
    if (extIds.length === 0) return [];

    // Get extension names
    const { data: exts, error: extErr } = await (supabase as any)
        .from('extensions')
        .select('name')
        .in('id', extIds);
    if (extErr) throw extErr;

    return (exts || []).map((e: any) => e.name);
}

/**
 * Get all app names that share the same groups as an extension.
 * Returns the union of apps from all groups the extension belongs to.
 */
export async function getAppsFromGroups(groupIds: string[]): Promise<string[]> {
    if (groupIds.length === 0) return [];

    // Get all app IDs in those groups
    const { data: memberships, error: memErr } = await (supabase as any)
        .from('app_group_memberships')
        .select('app_id')
        .in('group_id', groupIds);
    if (memErr) throw memErr;

    const appIds = [...new Set((memberships || []).map((m: any) => m.app_id))];
    if (appIds.length === 0) return [];

    // Get app names
    const { data: apps, error: appErr } = await (supabase as any)
        .from('apps')
        .select('name')
        .in('id', appIds);
    if (appErr) throw appErr;

    return (apps || []).map((a: any) => a.name);
}

/**
 * After saving an app, sync its compatible_with array to all extensions in its groups.
 * Also updates the app's own compatible_with with all extension names from its groups.
 */
export async function syncAppCompatibility(appId: string, appName: string, groupIds: string[], manualExtensions: string[]) {
    // 1. Get all extension names from group memberships
    const groupExtensions = await getExtensionsFromGroups(groupIds);

    // 2. Merge group-derived + manual selections (union, dedupe)
    const finalCompatWith = [...new Set([...manualExtensions, ...groupExtensions])];

    // 3. Update this app's compatible_with
    await (supabase as any).from('apps').update({ compatible_with: finalCompatWith }).eq('id', appId);

    // 4. For each extension in the groups, ensure this app is in their compatible_with
    if (groupIds.length > 0) {
        const { data: extMemberships } = await (supabase as any)
            .from('extension_group_memberships')
            .select('extension_id')
            .in('group_id', groupIds);

        const extIds = [...new Set((extMemberships || []).map((m: any) => m.extension_id))];

        for (const extId of extIds) {
            const { data: ext } = await (supabase as any)
                .from('extensions')
                .select('compatible_with')
                .eq('id', extId)
                .single();

            if (ext) {
                const currentCompat: string[] = ext.compatible_with || [];
                if (!currentCompat.includes(appName)) {
                    await (supabase as any)
                        .from('extensions')
                        .update({ compatible_with: [...currentCompat, appName] })
                        .eq('id', extId);
                }
            }
        }
    }
}

/**
 * After saving an extension, sync its compatible_with array to all apps in its groups.
 * Also updates the extension's own compatible_with with all app names from its groups.
 */
export async function syncExtensionCompatibility(extId: string, extName: string, groupIds: string[], manualApps: string[]) {
    // 1. Get all app names from group memberships
    const groupApps = await getAppsFromGroups(groupIds);

    // 2. Merge group-derived + manual selections (union, dedupe)
    const finalCompatWith = [...new Set([...manualApps, ...groupApps])];

    // 3. Update this extension's compatible_with
    await (supabase as any).from('extensions').update({ compatible_with: finalCompatWith }).eq('id', extId);

    // 4. For each app in the groups, ensure this extension is in their compatible_with
    if (groupIds.length > 0) {
        const { data: appMemberships } = await (supabase as any)
            .from('app_group_memberships')
            .select('app_id')
            .in('group_id', groupIds);

        const appIds = [...new Set((appMemberships || []).map((m: any) => m.app_id))];

        for (const appId of appIds) {
            const { data: app } = await (supabase as any)
                .from('apps')
                .select('compatible_with')
                .eq('id', appId)
                .single();

            if (app) {
                const currentCompat: string[] = app.compatible_with || [];
                if (!currentCompat.includes(extName)) {
                    await (supabase as any)
                        .from('apps')
                        .update({ compatible_with: [...currentCompat, extName] })
                        .eq('id', appId);
                }
            }
        }
    }
}
