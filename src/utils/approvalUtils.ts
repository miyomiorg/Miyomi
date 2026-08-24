import { supabase } from '@/integrations/supabase/client';
import { Database, Tables } from '@/integrations/supabase/types';
import { setAppGroups, syncAppCompatibility, setExtensionGroups, syncExtensionCompatibility } from '@/utils/compatSync';
import { upsertContributor } from '@/utils/contributors';
import { detectGitProvider } from '@/utils/gitProviders';

export function generateSlug(name: string): string {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s.-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Valid columns for the `apps` table in PostgreSQL.
 * Any property not in this set is stripped or packaged into metadata.
 */
const VALID_APP_COLUMNS = new Set<string>([
  'id',
  'name',
  'slug',
  'description',
  'short_description',
  'author',
  'category',
  'version',
  'status',
  'platforms',
  'tags',
  'content_types',
  'compatible_with',
  'repo_url',
  'download_url',
  'website_url',
  'discord_url',
  'icon_url',
  'icon_color',
  'accent_color',
  'fork_of',
  'upstream_url',
  'social_urls',
  'tutorials',
  'download_count',
  'likes_count',
  'last_release_date',
  'og_image_url',
  'seo_title',
  'seo_description',
  'metadata',
]);

/**
 * Valid columns for the `extensions` table in PostgreSQL.
 * Any property not in this set is stripped or packaged into metadata.
 */
const VALID_EXTENSION_COLUMNS = new Set<string>([
  'id',
  'name',
  'slug',
  'description',
  'short_description',
  'author',
  'category',
  'language',
  'status',
  'platforms',
  'tags',
  'types',
  'compatible_with',
  'repo_url',
  'source_url',
  'website_url',
  'discord_url',
  'icon_url',
  'icon_color',
  'accent_color',
  'auto_url',
  'manual_url',
  'region',
  'info',
  'social_urls',
  'tutorials',
  'download_count',
  'likes_count',
  'last_updated',
  'og_image_url',
  'seo_title',
  'seo_description',
  'metadata',
]);

/**
 * Prepare a strictly typed, sanitized database payload for `apps`.
 */
export function prepareAppDbPayload(raw: any, isUpdate = false): {
  payload: Database['public']['Tables']['apps']['Insert'] | Database['public']['Tables']['apps']['Update'];
  groupIds: string[];
  manualCompat: string[];
} {
  const data = raw ? { ...raw } : {};
  const groupIds: string[] = data._selectedGroupIds || [];
  const manualCompat: string[] = data.compatible_with || [];

  // Extract non-column metadata fields
  const gitProvider = data.git_provider || (data.repo_url ? detectGitProvider(data.repo_url).toLowerCase() : null);
  const devStatus = data.development_status || data.dev_status || null;

  // Build clean metadata
  const existingMeta = (typeof data.metadata === 'object' && data.metadata !== null) ? data.metadata : {};
  const cleanMetadata: Record<string, any> = { ...existingMeta };
  if (gitProvider) cleanMetadata.git_provider = gitProvider;
  if (devStatus) cleanMetadata.dev_status = devStatus;

  // Normalize social_urls & discord_url
  const socialUrls = Array.isArray(data.social_urls)
    ? data.social_urls.filter((u: string) => u && typeof u === 'string' && u.trim())
    : [];
  const discordUrl = data.discord_url || socialUrls[0] || null;

  const rawPayload: Record<string, any> = {
    name: data.name,
    slug: data.slug ? data.slug : (isUpdate ? undefined : (generateSlug(data.name) || null)),
    short_description: data.short_description || null,
    description: data.description || null,
    author: data.author || null,
    category: data.category || null,
    version: data.version || null,
    status: isUpdate ? (data.status || 'approved') : 'approved',
    platforms: Array.isArray(data.platforms) && data.platforms.length ? data.platforms : null,
    tags: Array.isArray(data.tags) && data.tags.length ? data.tags : null,
    content_types: Array.isArray(data.content_types) && data.content_types.length
      ? data.content_types
      : (Array.isArray(data.types) && data.types.length ? data.types : null),
    compatible_with: manualCompat.length ? manualCompat : null,
    repo_url: data.repo_url || data.url || null,
    download_url: data.download_url || null,
    website_url: data.website_url || null,
    discord_url: discordUrl,
    icon_url: data.icon_url || null,
    icon_color: data.icon_color || null,
    accent_color: data.accent_color || null,
    fork_of: data.fork_of || data.parent_app_slug || null,
    upstream_url: data.upstream_url || null,
    social_urls: socialUrls,
    tutorials: Array.isArray(data.tutorials) ? data.tutorials : [],
    download_count: typeof data.download_count === 'number' ? data.download_count : 0,
    likes_count: typeof data.likes_count === 'number' ? data.likes_count : 0,
    last_release_date: data.last_release_date || null,
    og_image_url: data.og_image_url || null,
    seo_title: data.seo_title || null,
    seo_description: data.seo_description || null,
    metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : null,
  };

  if (isUpdate) {
    delete rawPayload.id;
  }

  // Filter strictly by VALID_APP_COLUMNS
  const payload: any = {};
  for (const key of Object.keys(rawPayload)) {
    if (VALID_APP_COLUMNS.has(key) && rawPayload[key] !== undefined) {
      payload[key] = rawPayload[key];
    }
  }

  return { payload, groupIds, manualCompat };
}

/**
 * Prepare a strictly typed, sanitized database payload for `extensions`.
 */
export function prepareExtensionDbPayload(raw: any, isUpdate = false): {
  payload: Database['public']['Tables']['extensions']['Insert'] | Database['public']['Tables']['extensions']['Update'];
  groupIds: string[];
  manualCompat: string[];
} {
  const data = raw ? { ...raw } : {};
  const groupIds: string[] = data._selectedGroupIds || [];
  const manualCompat: string[] = data.compatible_with || [];

  // Handle install_urls -> store in metadata.install_urls
  const rawInstallUrls = Array.isArray(data.install_urls)
    ? data.install_urls
    : (Array.isArray(data.metadata?.install_urls) ? data.metadata.install_urls : []);
  
  const validInstallUrls = rawInstallUrls.filter((u: any) => u && typeof u.url === 'string' && u.url.trim());
  const firstAuto = validInstallUrls.find((u: any) => u.type === 'auto');
  const firstCopy = validInstallUrls.find((u: any) => u.type === 'copy');

  const autoUrl = data.auto_url || firstAuto?.url || null;
  const manualUrl = data.manual_url || firstCopy?.url || null;

  // Build clean metadata
  const existingMeta = (typeof data.metadata === 'object' && data.metadata !== null) ? data.metadata : {};
  const gitProvider = data.git_provider || (data.repo_url ? detectGitProvider(data.repo_url).toLowerCase() : null);

  const cleanMetadata: Record<string, any> = { ...existingMeta };
  if (validInstallUrls.length > 0) cleanMetadata.install_urls = validInstallUrls;
  if (gitProvider) cleanMetadata.git_provider = gitProvider;

  // Normalize social_urls & discord_url
  const socialUrls = Array.isArray(data.social_urls)
    ? data.social_urls.filter((u: string) => u && typeof u === 'string' && u.trim())
    : [];
  const discordUrl = data.discord_url || socialUrls[0] || null;

  const rawPayload: Record<string, any> = {
    name: data.name,
    slug: data.slug ? data.slug : (isUpdate ? undefined : (generateSlug(data.name) || null)),
    short_description: data.short_description || null,
    description: data.description || null,
    author: data.author || null,
    category: data.category || null,
    language: data.language || null,
    status: isUpdate ? (data.status || 'approved') : 'approved',
    platforms: Array.isArray(data.platforms) && data.platforms.length ? data.platforms : null,
    tags: Array.isArray(data.tags) && data.tags.length ? data.tags : null,
    types: Array.isArray(data.types) && data.types.length
      ? data.types
      : (Array.isArray(data.content_types) && data.content_types.length ? data.content_types : null),
    compatible_with: manualCompat.length ? manualCompat : null,
    repo_url: data.repo_url || data.url || null,
    source_url: data.source_url || null,
    website_url: data.website_url || null,
    discord_url: discordUrl,
    icon_url: data.icon_url || null,
    icon_color: data.icon_color || null,
    accent_color: data.accent_color || null,
    auto_url: autoUrl,
    manual_url: manualUrl,
    region: data.region || null,
    info: data.info || null,
    social_urls: socialUrls,
    tutorials: Array.isArray(data.tutorials) ? data.tutorials : [],
    download_count: typeof data.download_count === 'number' ? data.download_count : 0,
    likes_count: typeof data.likes_count === 'number' ? data.likes_count : 0,
    last_updated: data.last_updated || null,
    og_image_url: data.og_image_url || null,
    seo_title: data.seo_title || null,
    seo_description: data.seo_description || null,
    metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : null,
  };

  if (isUpdate) {
    delete rawPayload.id;
  }

  // Filter strictly by VALID_EXTENSION_COLUMNS
  const payload: any = {};
  for (const key of Object.keys(rawPayload)) {
    if (VALID_EXTENSION_COLUMNS.has(key) && rawPayload[key] !== undefined) {
      payload[key] = rawPayload[key];
    }
  }

  return { payload, groupIds, manualCompat };
}

/**
 * Approve a submission record (apps, extensions, or guides).
 * Inserts the live entity, syncs groups, records contributor profile, and removes submission.
 */
export async function approveSubmissionRecord(
  sub: Tables<'submissions'>,
  editedData?: any
): Promise<{ success: boolean; targetTable: string; targetId?: string; name: string; error?: string }> {
  const data = editedData || sub.submitted_data || {};
  const submissionType = sub.submission_type;

  if (submissionType === 'guide') {
    const slug = generateSlug(data.title || '');
    const guidePayload = {
      title: data.title,
      slug,
      category: data.category || 'General',
      description: data.description || null,
      content: data.content || '',
      author: sub.author || data.author || 'Community',
    };

    const { data: insertedGuide, error: guideErr } = await (supabase.from('guides') as any)
      .insert(guidePayload)
      .select()
      .single();

    if (guideErr) {
      if (guideErr.code === '23505') {
        const retrySlug = `${slug}-${Math.floor(Math.random() * 10000)}`;
        const { data: retryGuide, error: retryErr } = await (supabase.from('guides') as any)
          .insert({ ...guidePayload, slug: retrySlug })
          .select()
          .single();
        if (retryErr) throw retryErr;
        await (supabase.from('submissions') as any).delete().eq('id', sub.id);
        return { success: true, targetTable: 'guides', targetId: retryGuide?.id, name: data.title };
      }
      throw guideErr;
    }

    await (supabase.from('submissions') as any).delete().eq('id', sub.id);
    return { success: true, targetTable: 'guides', targetId: insertedGuide?.id, name: data.title };
  }

  const targetTable = submissionType === 'app' ? 'apps' : 'extensions';
  const { payload, groupIds, manualCompat } = submissionType === 'app'
    ? prepareAppDbPayload(data, false)
    : prepareExtensionDbPayload(data, false);

  const { data: insertedData, error: insertError } = await (supabase.from(targetTable) as any)
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false, targetTable, name: data.name, error: `Slug conflict: '${payload.slug}' already exists.` };
    }
    throw insertError;
  }

  // Handle compatibility groups & cross-sync
  if (insertedData) {
    if (submissionType === 'app') {
      await setAppGroups(insertedData.id, groupIds);
      await syncAppCompatibility(insertedData.id, insertedData.name, groupIds, manualCompat);
    } else {
      await setExtensionGroups(insertedData.id, groupIds);
      await syncExtensionCompatibility(insertedData.id, insertedData.name, groupIds, manualCompat);
    }

    // Save contributor profile
    await upsertContributor(
      sub.submitter_name,
      sub.submitter_email,
      sub.submitter_contact,
      { type: submissionType as 'app' | 'extension', id: insertedData.id, name: data.name }
    ).catch(console.error);
  }

  await (supabase.from('submissions') as any).delete().eq('id', sub.id);
  return { success: true, targetTable, targetId: insertedData?.id, name: data.name };
}

/**
 * Approve an edit suggestion record (apps, extensions, or guides).
 * Sanitizes fields, preserves live stats, updates live entity, syncs groups, and removes suggestion.
 */
export async function approveEditSuggestionRecord(
  suggestion: Tables<'public_edit_suggestions'>,
  editedData?: any
): Promise<{ success: boolean; targetTable: string; name: string; error?: string }> {
  const data = editedData || suggestion.submitted_data || {};
  const targetType = suggestion.target_type;
  const targetId = suggestion.target_id;

  if (targetType === 'guide') {
    const payload: Record<string, any> = {
      title: data.title,
      category: data.category,
      description: data.description || null,
      content: data.content,
      author: data.author || null,
    };
    if (data.slug) payload.slug = data.slug;

    const { error: guideErr } = await (supabase.from('guides') as any).update(payload).eq('id', targetId);
    if (guideErr) throw guideErr;

    await (supabase.from('public_edit_suggestions') as any).delete().eq('id', suggestion.id);
    return { success: true, targetTable: 'guides', name: data.title || 'Guide' };
  }

  const targetTable = targetType === 'app' ? 'apps' : 'extensions';
  const { payload, groupIds, manualCompat } = targetType === 'app'
    ? prepareAppDbPayload(data, true)
    : prepareExtensionDbPayload(data, true);

  // Preserve live counters if present in snapshot or not explicitly edited
  const orig = (suggestion.original_data_snapshot as any) || {};
  if (orig.likes_count !== undefined && data.likes_count === undefined) {
    (payload as any).likes_count = orig.likes_count;
  }
  if (orig.download_count !== undefined && data.download_count === undefined) {
    (payload as any).download_count = orig.download_count;
  }

  const { error: updateError } = await (supabase.from(targetTable) as any)
    .update(payload)
    .eq('id', targetId);

  if (updateError) throw updateError;

  // Sync groups if provided
  if (groupIds.length > 0 || manualCompat.length > 0) {
    if (targetType === 'app') {
      await setAppGroups(targetId, groupIds);
      await syncAppCompatibility(targetId, (payload as any).name || data.name, groupIds, manualCompat);
    } else {
      await setExtensionGroups(targetId, groupIds);
      await syncExtensionCompatibility(targetId, (payload as any).name || data.name, groupIds, manualCompat);
    }
  }

  await (supabase.from('public_edit_suggestions') as any).delete().eq('id', suggestion.id);
  return { success: true, targetTable, name: (payload as any).name || data.name || 'item' };
}
