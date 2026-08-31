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
    if (!appId) return [];
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
    if (!extId) return [];
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
    if (!appId) return;
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
    if (!extId) return;
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
    if (!groupIds || groupIds.length === 0) return [];

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

    return (exts || []).map((e: any) => e.name).filter(Boolean);
}

/**
 * Get all app names that share the same groups as an extension.
 * Returns the union of apps from all groups the extension belongs to.
 */
export async function getAppsFromGroups(groupIds: string[]): Promise<string[]> {
    if (!groupIds || groupIds.length === 0) return [];

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

    return (apps || []).map((a: any) => a.name).filter(Boolean);
}

/**
 * Fetch all unified compatible extension names for an app:
 * 1. Extensions explicitly listed in app.compatible_with
 * 2. Extensions in the same compatibility groups
 * 3. Extensions whose compatible_with lists this app (by name, slug, or id)
 */
export async function getUnifiedCompatibleExtensionsForApp(appId?: string, appName?: string, appSlug?: string): Promise<string[]> {
    const resultNames = new Set<string>();

    if (appId) {
        const { data: app } = await (supabase as any)
            .from('apps')
            .select('compatible_with')
            .eq('id', appId)
            .maybeSingle();
        (app?.compatible_with || []).forEach((name: string) => {
            if (name && typeof name === 'string') resultNames.add(name.trim());
        });

        const groupIds = await getGroupsForApp(appId);
        const groupExts = await getExtensionsFromGroups(groupIds);
        groupExts.forEach(name => {
            if (name && typeof name === 'string') resultNames.add(name.trim());
        });
    }

    if (appName || appSlug || appId) {
        const { data: allExts } = await (supabase as any)
            .from('extensions')
            .select('id, name, slug, compatible_with');

        if (allExts) {
            for (const ext of allExts) {
                const list: string[] = ext.compatible_with || [];
                const isMatching = list.some(item => 
                    (appName && item.toLowerCase() === appName.toLowerCase()) ||
                    (appSlug && item.toLowerCase() === appSlug.toLowerCase()) ||
                    (appId && item === appId)
                );
                if (isMatching && ext.name) {
                    resultNames.add(ext.name.trim());
                }
            }
        }
    }

    return Array.from(resultNames);
}

/**
 * Fetch all unified compatible app names for an extension:
 * 1. Apps explicitly listed in ext.compatible_with
 * 2. Apps in the same compatibility groups
 * 3. Apps whose compatible_with lists this extension (by name, slug, or id)
 */
export async function getUnifiedCompatibleAppsForExtension(extId?: string, extName?: string, extSlug?: string): Promise<string[]> {
    const resultNames = new Set<string>();

    if (extId) {
        const { data: ext } = await (supabase as any)
            .from('extensions')
            .select('compatible_with')
            .eq('id', extId)
            .maybeSingle();
        (ext?.compatible_with || []).forEach((name: string) => {
            if (name && typeof name === 'string') resultNames.add(name.trim());
        });

        const groupIds = await getGroupsForExtension(extId);
        const groupApps = await getAppsFromGroups(groupIds);
        groupApps.forEach(name => {
            if (name && typeof name === 'string') resultNames.add(name.trim());
        });
    }

    if (extName || extSlug || extId) {
        const { data: allApps } = await (supabase as any)
            .from('apps')
            .select('id, name, slug, compatible_with');

        if (allApps) {
            for (const app of allApps) {
                const list: string[] = app.compatible_with || [];
                const isMatching = list.some(item => 
                    (extName && item.toLowerCase() === extName.toLowerCase()) ||
                    (extSlug && item.toLowerCase() === extSlug.toLowerCase()) ||
                    (extId && item === extId)
                );
                if (isMatching && app.name) {
                    resultNames.add(app.name.trim());
                }
            }
        }
    }

    return Array.from(resultNames);
}

/**
 * After saving an app, sync its compatible_with array to all extensions in its groups and manual selections.
 * Also updates the app's own compatible_with with all extension names from its groups.
 */
export async function syncAppCompatibility(appId: string, appName: string, groupIds: string[], manualExtensions: string[]) {
    // 1. Get all extension names from group memberships
    const groupExtensions = await getExtensionsFromGroups(groupIds);

    // 2. Merge group-derived + manual selections (union, dedupe)
    const finalCompatWith = [...new Set([...(manualExtensions || []), ...groupExtensions])].filter(Boolean);

    // 3. Update this app's compatible_with
    await (supabase as any).from('apps').update({ compatible_with: finalCompatWith }).eq('id', appId);

    // 4. Fetch the app's slug if available for comprehensive matching
    const { data: appRow } = await (supabase as any).from('apps').select('slug').eq('id', appId).maybeSingle();
    const appSlug = appRow?.slug || '';

    // 5. Bidirectional sync: fetch all extensions to ensure two-way link
    const { data: allExts } = await (supabase as any).from('extensions').select('id, name, slug, compatible_with');
    if (!allExts || allExts.length === 0) return;

    for (const ext of allExts) {
        const currentCompat: string[] = ext.compatible_with || [];
        const isLinkedToThisApp = finalCompatWith.some((entry: string) =>
            entry.toLowerCase() === ext.name.toLowerCase() ||
            (ext.slug && entry.toLowerCase() === ext.slug.toLowerCase()) ||
            entry === ext.id
        );

        const hasAppName = currentCompat.some((a: string) => 
            a.toLowerCase() === appName.toLowerCase() ||
            (appSlug && a.toLowerCase() === appSlug.toLowerCase()) ||
            a === appId
        );

        if (isLinkedToThisApp && !hasAppName) {
            // Add app name to extension's compatible_with
            await (supabase as any)
                .from('extensions')
                .update({ compatible_with: [...currentCompat, appName] })
                .eq('id', ext.id);
        } else if (!isLinkedToThisApp && hasAppName) {
            // App was unlinked, remove it from extension's compatible_with
            const updated = currentCompat.filter((a: string) => 
                a.toLowerCase() !== appName.toLowerCase() &&
                (!appSlug || a.toLowerCase() !== appSlug.toLowerCase()) &&
                a !== appId
            );
            await (supabase as any)
                .from('extensions')
                .update({ compatible_with: updated })
                .eq('id', ext.id);
        }
    }
}

/**
 * After saving an extension, sync its compatible_with array to all apps in its groups and manual selections.
 * Also updates the extension's own compatible_with with all app names from its groups.
 */
export async function syncExtensionCompatibility(extId: string, extName: string, groupIds: string[], manualApps: string[]) {
    // 1. Get all app names from group memberships
    const groupApps = await getAppsFromGroups(groupIds);

    // 2. Merge group-derived + manual selections (union, dedupe)
    const finalCompatWith = [...new Set([...(manualApps || []), ...groupApps])].filter(Boolean);

    // 3. Update this extension's compatible_with
    await (supabase as any).from('extensions').update({ compatible_with: finalCompatWith }).eq('id', extId);

    // 4. Fetch extension's slug if available
    const { data: extRow } = await (supabase as any).from('extensions').select('slug').eq('id', extId).maybeSingle();
    const extSlug = extRow?.slug || '';

    // 5. Bidirectional sync: fetch all apps to ensure two-way link
    const { data: allApps } = await (supabase as any).from('apps').select('id, name, slug, compatible_with');
    if (!allApps || allApps.length === 0) return;

    for (const app of allApps) {
        const currentCompat: string[] = app.compatible_with || [];
        const isLinkedToThisExt = finalCompatWith.some((entry: string) =>
            entry.toLowerCase() === app.name.toLowerCase() ||
            (app.slug && entry.toLowerCase() === app.slug.toLowerCase()) ||
            entry === app.id
        );

        const hasExtName = currentCompat.some((e: string) => 
            e.toLowerCase() === extName.toLowerCase() ||
            (extSlug && e.toLowerCase() === extSlug.toLowerCase()) ||
            e === extId
        );

        if (isLinkedToThisExt && !hasExtName) {
            // Add extension name to app's compatible_with
            await (supabase as any)
                .from('apps')
                .update({ compatible_with: [...currentCompat, extName] })
                .eq('id', app.id);
        } else if (!isLinkedToThisExt && hasExtName) {
            // Extension was unlinked, remove it from app's compatible_with
            const updated = currentCompat.filter((e: string) => 
                e.toLowerCase() !== extName.toLowerCase() &&
                (!extSlug || e.toLowerCase() !== extSlug.toLowerCase()) &&
                e !== extId
            );
            await (supabase as any)
                .from('apps')
                .update({ compatible_with: updated })
                .eq('id', app.id);
        }
    }
}
