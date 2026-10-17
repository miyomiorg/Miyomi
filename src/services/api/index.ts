/**
 * Typed client for the Miyomi Hono API.
 *
 * One function per endpoint, grouped by domain. All functions return the
 * unwrapped `data` payload (or throw {@link ApiError}).
 *
 * Content rows are returned in snake_case (matching `Tables<'...'>`).
 */
import { http } from './http';
import type { Tables } from '@/types/db';
import type {
  AnalyticsData,
  ContributorRow,
  DashboardData,
  LikesStats,
  LoginResult,
  ModeratorPermission,
  ModeratorPermissionRow,
  Page,
  SessionInfo,
  TwoFactorSetup,
} from './types';

// ── Public: content ─────────────────────────────────────────────────

export const appsApi = {
  list: () => http.get<Tables<'apps'>[]>('/apps'),
  get: (idOrSlug: string) => http.get<Tables<'apps'>>(`/apps/${encodeURIComponent(idOrSlug)}`),
  compatible: (idOrSlug: string) =>
    http.get<string[]>(`/apps/${encodeURIComponent(idOrSlug)}/compatible`),
};

export const extensionsApi = {
  list: () => http.get<Tables<'extensions'>[]>('/extensions'),
  get: (idOrSlug: string) => http.get<Tables<'extensions'>>(`/extensions/${encodeURIComponent(idOrSlug)}`),
  compatible: (idOrSlug: string) =>
    http.get<string[]>(`/extensions/${encodeURIComponent(idOrSlug)}/compatible`),
};

export const guidesApi = {
  list: (category?: string) =>
    http.get<Tables<'guides'>[]>(`/guides${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  get: (idOrSlug: string) => http.get<Tables<'guides'>>(`/guides/${encodeURIComponent(idOrSlug)}`),
};

export const blogApi = {
  list: () => http.get<Tables<'blog_posts'>[]>('/blog'),
  get: (idOrSlug: string) => http.get<Tables<'blog_posts'>>(`/blog/${encodeURIComponent(idOrSlug)}`),
};

export const faqsApi = {
  list: () => http.get<Tables<'faqs'>[]>('/faqs'),
};

// ── Public: misc ────────────────────────────────────────────────────

export const settingsApi = {
  public: () => http.get<Record<string, any>>('/settings/public'),
};

export const noticesApi = {
  list: () => http.get<Tables<'notices'>[]>('/notices'),
};

export const themesApi = {
  list: () => http.get<Tables<'themes'>[]>('/themes'),
};

export const donationsApi = {
  list: () => http.get<Tables<'donations'>[]>('/donations'),
  settings: () => http.get<Tables<'donation_settings'>[]>('/donation-settings'),
};

export const groupsApi = {
  list: () => http.get<Array<Tables<'compatibility_groups'> & { app_count?: number; extension_count?: number }>>('/groups'),
};

export const contributorsApi = {
  list: () => http.get<ContributorRow[]>('/contributors'),
};

// ── Public: likes ───────────────────────────────────────────────────

export const likesApi = {
  /** Full registry keyed by item id: { [itemId]: { count, loved } } */
  registry: (fingerprint: string) =>
    http.get<Record<string, { count: number; loved: boolean }>>(
      `/likes/registry?fingerprint=${encodeURIComponent(fingerprint)}`,
    ),
  /** Toggle a like; returns the server-confirmed state. */
  like: (body: { itemId: string; itemType: 'app' | 'extension'; fingerprint: string; device?: Record<string, unknown> }) =>
    http.post<{ loved: boolean; count: number; total: number; liked: boolean }>('/likes', body),
  status: (itemId: string, itemType: string, fingerprint: string) =>
    http.get<{ liked: boolean; total: number }>(
      `/likes/status?itemId=${encodeURIComponent(itemId)}&itemType=${encodeURIComponent(itemType)}&fingerprint=${encodeURIComponent(fingerprint)}`,
    ),
};

// ── Public: submissions ─────────────────────────────────────────────

export const submitApi = {
  submission: (body: Record<string, unknown>) =>
    http.post<{ id: string }>('/submissions', body),
  editSuggestion: (body: Record<string, unknown>) =>
    http.post<{ id: string }>('/edit-suggestions', body),
  checkDuplicate: (params: { type?: 'app' | 'extension'; name?: string; repoUrl?: string }) => {
    const q = new URLSearchParams();
    if (params.type) q.set('type', params.type);
    if (params.name) q.set('name', params.name);
    if (params.repoUrl) q.set('repoUrl', params.repoUrl);
    return http.get<{
      name_match: { id: string; name: string; slug: string | null; kind: 'app' | 'extension' } | null;
      repo_match: { id: string; name: string; slug: string | null; kind: 'app' | 'extension' } | null;
      submissions: Array<{ status: string; admin_notes: string | null }>;
    }>(`/submissions/check?${q.toString()}`);
  },
  report: (body: Record<string, unknown>) =>
    http.post<{ id: string }>('/reports', body),
  feedback: (body: Record<string, unknown>) =>
    http.post<{ id: string }>('/feedback', body),
};

// ── Auth ────────────────────────────────────────────────────────────

export const authApi = {
  login: (body: { email: string; password: string; remember?: boolean; turnstileToken?: string; totpCode?: string; device?: Record<string, unknown> }) =>
    // Aggregate DTO (staged login responses) — keep loginStage/pendingToken keys intact.
    http.post<LoginResult>('/admin/auth/login', body, { preserveKeys: true }),
  completeLogin: (body: { pendingToken: string; code: string; remember?: boolean; device?: Record<string, unknown> }) =>
    http.post<SessionInfo & { token: string }>('/admin/auth/login/complete', body, { preserveKeys: true }),
  logout: () => http.post<null>('/admin/auth/logout'),
  me: () => http.get<SessionInfo>('/admin/auth/me'),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    http.post<null>('/admin/auth/change-password', body),
  recordSession: (body: { device?: Record<string, unknown> }) =>
    http.post<null>('/admin/auth/sessions', body),
  // 2FA is one-way: it can be enabled / reset (re-enrol), never disabled.
  enroll2fa: () =>
    http.post<{ enrollToken: string; setup: TwoFactorSetup }>('/admin/auth/2fa/enroll', undefined, { preserveKeys: true }),
  verifyEnroll: (body: { enrollToken: string; code: string; currentPassword: string }) =>
    http.post<{ enabled: boolean }>('/admin/auth/2fa/enroll/verify', body, { preserveKeys: true }),
};

// ── Admin: dashboard ────────────────────────────────────────────────

export const dashboardApi = {
  // Aggregate DTO, not a database row: keep counts/recentApps/stats keys intact.
  get: () => http.get<DashboardData>('/admin/dashboard', { preserveKeys: true }),
};

// ── Admin: analytics ────────────────────────────────────────────────

export const analyticsApi = {
  // Aggregate DTO from Cloudflare GraphQL: keep camelCase keys intact.
  overview: (days: 7 | 14 | 30 = 7) =>
    http.get<AnalyticsData>(`/admin/analytics?days=${days}`, { preserveKeys: true }),
};

// ── Admin: content CRUD ─────────────────────────────────────────────

function contentApi<T>(kind: 'apps' | 'extensions' | 'guides' | 'blog') {
  const base = `/admin/${kind}`;
  return {
    list: (params?: { status?: string; search?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.search) q.set('search', params.search);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      const qs = q.toString();
      return http.get<Page<T>>(`${base}${qs ? `?${qs}` : ''}`);
    },
    get: (idOrSlug: string) => http.get<T>(`${base}/${encodeURIComponent(idOrSlug)}`),
    create: (body: Record<string, unknown>) => http.post<{ id: string }>(base, body),
    update: (idOrSlug: string, body: Record<string, unknown>) =>
      http.put<null>(`${base}/${encodeURIComponent(idOrSlug)}`, body),
    setStatus: (idOrSlug: string, status: string) =>
      http.patch<null>(`${base}/${encodeURIComponent(idOrSlug)}/status`, { status }),
    remove: (idOrSlug: string) => http.delete<null>(`${base}/${encodeURIComponent(idOrSlug)}`),
  };
}

export const adminAppsApi = contentApi<Tables<'apps'>>('apps');
export const adminExtensionsApi = contentApi<Tables<'extensions'>>('extensions');
export const adminGuidesApi = contentApi<Tables<'guides'>>('guides');
export const adminBlogApi = contentApi<Tables<'blog_posts'>>('blog');

// ── Admin: submissions ──────────────────────────────────────────────

export const adminSubmissionsApi = {
  list: (params?: { status?: string; type?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.type) q.set('type', params.type);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return http.get<Page<Tables<'submissions'>>>(`/admin/submissions${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => http.get<Tables<'submissions'>>(`/admin/submissions/${id}`),
  approve: (id: string, editedData?: Record<string, unknown>) =>
    http.post<{ target_table: string; target_id?: string; name: string }>(
      `/admin/submissions/${id}/approve`,
      editedData ? { editedData } : {},
    ),
  reject: (id: string, adminNotes?: string) =>
    http.post<null>(`/admin/submissions/${id}/reject`, { adminNotes }),
  update: (id: string, body: Record<string, unknown>) =>
    http.patch<null>(`/admin/submissions/${id}`, body),
  remove: (id: string) => http.delete<null>(`/admin/submissions/${id}`),
  clear: (status?: string) =>
    http.delete<null>(`/admin/submissions${status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''}`),
};

// ── Admin: reviews (reports / feedback / edit suggestions) ─────────

export const adminReportsApi = {
  list: (params?: { status?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return http.get<Page<Tables<'reports'> & { target_name: string }>>(`/admin/reports${qs ? `?${qs}` : ''}`);
  },
  update: (id: string, body: { status: string; adminNote?: string }) =>
    http.patch<null>(`/admin/reports/${id}`, body),
  remove: (id: string) => http.delete<null>(`/admin/reports/${id}`),
};

export const adminFeedbackApi = {
  list: (params?: { status?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return http.get<Page<Tables<'feedbacks'>>>(`/admin/feedback${qs ? `?${qs}` : ''}`);
  },
  update: (id: string, body: { status: string; adminNote?: string }) =>
    http.patch<null>(`/admin/feedback/${id}`, body),
  remove: (id: string) => http.delete<null>(`/admin/feedback/${id}`),
  clear: () => http.delete<null>('/admin/feedback'),
};

export const adminEditSuggestionsApi = {
  list: (params?: { status?: string; targetType?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.targetType) q.set('targetType', params.targetType);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return http.get<Page<Tables<'public_edit_suggestions'>>>(`/admin/suggestions${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => http.get<Tables<'public_edit_suggestions'>>(`/admin/suggestions/${id}`),
  approve: (id: string, editedData?: Record<string, unknown>) =>
    http.post<{ target_table: string; name: string }>(
      `/admin/suggestions/${id}/approve`,
      editedData ? { editedData } : {},
    ),
  reject: (id: string, adminNote?: string) =>
    http.post<null>(`/admin/suggestions/${id}/reject`, { adminNote }),
  update: (id: string, status: string) =>
    http.patch<null>(`/admin/suggestions/${id}`, { status }),
  updateData: (id: string, submittedData: Record<string, unknown>) =>
    http.patch<null>(`/admin/suggestions/${id}`, { submittedData }),
  remove: (id: string) => http.delete<null>(`/admin/suggestions/${id}`),
  clear: (status?: string) =>
    http.delete<null>(`/admin/suggestions${status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''}`),
};

// ── Admin: settings ─────────────────────────────────────────────────

export interface SettingRow {
  key: string;
  value: any;
  category: string | null;
  description: string | null;
  is_sensitive: boolean;
  updated_by: string | null;
  updated_at: string;
}

export const adminSettingsApi = {
  list: () => http.get<SettingRow[]>('/admin/settings'),
  upsert: (key: string, body: { value: any; category?: string; description?: string; is_sensitive?: boolean }) =>
    http.put<null>(`/admin/settings/${encodeURIComponent(key)}`, body),
  remove: (key: string) => http.delete<null>(`/admin/settings/${encodeURIComponent(key)}`),
  donationSettings: () => http.get<Tables<'donation_settings'>[]>('/admin/donation-settings'),
  upsertDonationSetting: (key: string, value: any) =>
    http.put<null>(`/admin/donation-settings/${encodeURIComponent(key)}`, { value }),
  telegramTest: () => http.post<null>('/admin/settings/telegram-test'),
};

// ── Admin: donations ────────────────────────────────────────────────

export const adminDonationsApi = {
  list: async () => {
    const rows: Tables<'donations'>[] = [];
    while (true) {
      const page = await http.get<Tables<'donations'>[]>(`/admin/donations?limit=200&offset=${rows.length}`);
      rows.push(...page);
      if (page.length < 200) return rows;
    }
  },
  create: (body: Record<string, unknown>) => http.post<{ id: string }>('/admin/donations', body),
  update: (id: string, body: Record<string, unknown>) => http.put<null>(`/admin/donations/${id}`, body),
  setPublic: (id: string, isPublic: boolean) =>
    http.patch<null>(`/admin/donations/${id}/public`, { isPublic }),
  remove: (id: string) => http.delete<null>(`/admin/donations/${id}`),
};

// ── Admin: contributors ─────────────────────────────────────────────

export const adminContributorsApi = {
  list: () => http.get<ContributorRow[]>('/admin/contributors'),
  create: (body: Record<string, unknown>) => http.post<{ id: string }>('/admin/contributors', body),
  update: (id: string, body: Record<string, unknown>) =>
    http.put<null>(`/admin/contributors/${encodeURIComponent(id)}`, body),
  remove: (id: string) => http.delete<null>(`/admin/contributors/${id}`),
};

// ── Admin: compatibility groups ─────────────────────────────────────

export const adminGroupsApi = {
  list: () => http.get<Array<Tables<'compatibility_groups'> & { app_ids: string[]; extension_ids: string[] }>>('/admin/groups'),
  create: (body: Record<string, unknown>) => http.post<{ id: string }>('/admin/groups', body),
  update: (id: string, body: Record<string, unknown>) => http.put<null>(`/admin/groups/${id}`, body),
  remove: (id: string) => http.delete<null>(`/admin/groups/${id}`),
};

// ── Admin: users ────────────────────────────────────────────────────

export interface AdminAccountRow {
  id: string;
  email: string;
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles?: string[];
  permissions?: Array<{ resource: string; can_read: boolean; can_write: boolean; can_delete: boolean }>;
  session_count?: number;
}

export const adminUsersApi = {
  list: () => http.get<AdminAccountRow[]>('/admin/users'),
  create: (body: { email: string; displayName?: string; password: string; role?: 'super_admin' | 'admin' | 'moderator' }) =>
    http.post<{ id: string }>('/admin/users', body),
  remove: (id: string) => http.delete<null>(`/admin/users/${id}`),
  updateProfile: (id: string, displayName: string | null) =>
    http.patch<null>(`/admin/users/${id}`, { displayName }),
  setActive: (id: string, isActive: boolean) =>
    http.patch<null>(`/admin/users/${id}/active`, { isActive }),
  setRole: (id: string, role: 'super_admin' | 'admin' | 'moderator') =>
    http.put<null>(`/admin/users/${id}/role`, { role }),
  setPermissions: (id: string, permissions: ModeratorPermissionInput[]) =>
    http.put<null>(`/admin/users/${id}/permissions`, { permissions }),
  resetPassword: (id: string, password: string) =>
    http.post<null>(`/admin/users/${id}/reset-password`, { password }),
};

export type ModeratorPermissionInput = {
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
};

// ── Admin: extra (faqs / themes / notices / logs / sessions / likes) ─

export const adminFaqsApi = {
  list: () => http.get<Tables<'faqs'>[]>('/admin/faqs'),
  create: (body: Record<string, unknown>) => http.post<{ id: string }>('/admin/faqs', body),
  update: (id: string, body: Record<string, unknown>) => http.put<null>(`/admin/faqs/${id}`, body),
  remove: (id: string) => http.delete<null>(`/admin/faqs/${id}`),
};

export const adminThemesApi = {
  list: () => http.get<Tables<'themes'>[]>('/admin/themes'),
  create: (body: Record<string, unknown>) => http.post<{ id: string }>('/admin/themes', body),
  update: (id: string, body: Record<string, unknown>) => http.put<null>(`/admin/themes/${id}`, body),
  activate: (id: string) => http.post<null>(`/admin/themes/${id}/activate`),
  remove: (id: string) => http.delete<null>(`/admin/themes/${id}`),
};

export const adminNoticesApi = {
  list: () => http.get<Tables<'notices'>[]>('/admin/notices'),
  create: (body: Record<string, unknown>) => http.post<{ id: string }>('/admin/notices', body),
  update: (id: string, body: Record<string, unknown>) => http.put<null>(`/admin/notices/${id}`, body),
  remove: (id: string) => http.delete<null>(`/admin/notices/${id}`),
};

export const adminLogsApi = {
  list: (params?: { action?: string; resourceType?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.action) q.set('action', params.action);
    if (params?.resourceType) q.set('resourceType', params.resourceType);
    q.set('limit', String(params?.limit ?? 100));
    q.set('offset', String(params?.offset ?? 0));
    return http.get<Tables<'admin_logs'>[]>(`/admin/logs?${q.toString()}`);
  },
  create: (body: { action: string; resourceType: string; resourceId?: string; resourceName?: string; details?: Record<string, any> }) =>
    http.post<{ id: string }>('/admin/logs', body),
  remove: (id: string) => http.delete<null>(`/admin/logs/${id}`),
  clear: () => http.delete<null>('/admin/logs'),
};

export const adminSessionsApi = {
  list: (params?: { sessionType?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.sessionType) q.set('sessionType', params.sessionType);
    q.set('limit', String(params?.limit ?? 100));
    q.set('offset', String(params?.offset ?? 0));
    return http.get<Tables<'admin_sessions'>[]>(`/admin/sessions?${q.toString()}`);
  },
  clear: () => http.delete<null>('/admin/sessions'),
};

export const adminBotLogsApi = {
  list: (limit?: number, offset?: number) =>
    http.get<Tables<'bot_attack_logs'>[]>(`/admin/bot-logs?limit=${limit ?? 100}&offset=${offset ?? 0}`),
  clear: () => http.delete<null>('/admin/bot-logs'),
};

export const adminLikesApi = {
  list: (params?: { itemId?: string; itemType?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params?.itemId) q.set('itemId', params.itemId);
    if (params?.itemType) q.set('itemType', params.itemType);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return http.get<Page<Tables<'likes'>>>(`/admin/likes${qs ? `?${qs}` : ''}`);
  },
  // Aggregate DTO, not a database row: keep byType/byBrowser/byOS keys intact.
  stats: () => http.get<LikesStats>('/admin/likes/stats', { preserveKeys: true }),
};
