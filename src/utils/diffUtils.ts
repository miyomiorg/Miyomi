import { detectGitProvider } from '@/utils/gitProviders';

export function isEmptyValue(val: any): boolean {
  if (val === null || val === undefined || val === '') return true;
  if (Array.isArray(val) && val.length === 0) return true;
  if (typeof val === 'object' && Object.keys(val).length === 0) return true;
  return false;
}

/**
 * Normalizes an entity field value for consistent diff comparison between original snapshot and submitted/form data.
 */
export function normalizeFieldValue(field: string, data: any): any {
  if (!data) return '';

  switch (field) {
    case 'git_provider': {
      const explicit = data.git_provider || data.metadata?.git_provider;
      if (explicit) return explicit.toLowerCase();
      const repoUrl = data.repo_url || data.source_url || '';
      return repoUrl ? detectGitProvider(repoUrl).toLowerCase() : 'github';
    }
    case 'dev_status':
    case 'development_status': {
      return data.dev_status || data.development_status || data.metadata?.dev_status || data.metadata?.development_status || 'active';
    }
    case 'fork_of':
    case 'parent_app_slug': {
      return (data.fork_of || data.parent_app_slug || '').trim();
    }
    case 'upstream_url': {
      return (data.upstream_url || data.metadata?.upstream_url || '').trim();
    }
    case 'last_updated_at':
    case 'last_release_date':
    case 'last_updated': {
      const dateStr = data.last_release_date || data.last_updated_at || data.last_updated || '';
      return typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
    }
    case 'social_urls': {
      const socials = Array.isArray(data.social_urls) && data.social_urls.length > 0
        ? data.social_urls.filter((u: any) => u && typeof u === 'string' && u.trim())
        : (data.discord_url ? [data.discord_url.trim()] : []);
      return socials;
    }
    case 'discord_url': {
      const discord = data.discord_url || (Array.isArray(data.social_urls) ? data.social_urls[0] : '') || '';
      return typeof discord === 'string' ? discord.trim() : '';
    }
    case 'platforms':
    case 'tags':
    case 'types':
    case 'content_types':
    case 'compatible_with': {
      const arr = data[field] || (field === 'content_types' ? data.types : (field === 'types' ? data.content_types : []));
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    }
    default: {
      const val = data[field];
      if (typeof val === 'string') return val.trim();
      return val;
    }
  }
}

/**
 * Compares a field between original snapshot and current form data.
 * Returns formatted string representing the old value if there is a real diff, or `undefined` if values are identical.
 */
export function getFieldDiff(field: string, originalData: any, form: any): string | undefined {
  if (!originalData || !form) return undefined;

  const oldVal = normalizeFieldValue(field, originalData);
  const newVal = normalizeFieldValue(field, form);

  // Both empty -> no diff
  if (isEmptyValue(oldVal) && isEmptyValue(newVal)) return undefined;

  // Compare arrays
  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    if (oldVal.length === newVal.length && oldVal.every((v, i) => v === newVal[i])) {
      return undefined;
    }
    if (oldVal.length === 0) return '(empty)';
    return oldVal.join(', ');
  }

  // General JSON equality
  if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
    if (isEmptyValue(oldVal)) return '(empty)';
    if (typeof oldVal === 'object') return JSON.stringify(oldVal);
    return String(oldVal);
  }

  return undefined;
}
