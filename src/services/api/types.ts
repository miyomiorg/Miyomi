/**
 * Supplementary types for the Miyomi API that aren't covered by the
 * generated `Tables<'...'>` (snake_case) types in
 * `@/types/db`.
 *
 * Auth endpoints return the admin account with camelCase keys (a nested
 * object, not a DB row); the rest of the API surface returns snake_case rows
 * matching `Tables<'...'>`.
 */

/** Admin account as returned by /admin/auth/me and /admin/auth/login. */
export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  totpEnabled: boolean;
  telegramChatId: string | null;
}

export type AdminRole = 'super_admin' | 'admin' | 'moderator';

export interface ModeratorPermission {
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

export interface SessionInfo {
  admin: AdminUser;
  role: AdminRole;
  permissions: ModeratorPermission[];
}

/** QR + secret shown during 2FA enrolment. */
export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
}

/**
 * Password login can hand back a staged continuation instead of a session:
 *  - '2fa_required' → submit the authenticator code via completeLogin.
 * Accounts without 2FA get a session immediately (totpEnabled:false) and are
 * redirected to Settings to enrol — every other admin endpoint stays gated.
 * 2FA cannot be disabled once enabled; it can only be reset (re-enrolled).
 */
export type LoginStage = { loginStage: '2fa_required'; pendingToken: string };

export type LoginResult = (SessionInfo & { token: string }) | LoginStage;

/** Dashboard aggregate (GET /admin/dashboard). */
export interface DashboardData {
  counts: {
    approvedApps: number;
    approvedExtensions: number;
    publishedGuides: number;
    pendingSubmissions: number;
    activeNotices: number;
    totalLikes: number;
  };
  recentApps: Array<{ name: string; updatedAt: string }>;
  recentExtensions: Array<{ name: string; updatedAt: string }>;
  stats: {
    totalActions: number;
    actionBreakdown: Array<{ action: string; count: number }>;
    recentLogs: Array<{
      id: string;
      action: string;
      resourceType: string;
      resourceName: string | null;
      createdAt: string;
      adminEmail: string;
    }>;
    topContributors: Array<{ adminEmail: string; totalActions: number }>;
  };
}

/** GET /admin/likes/stats — port of the Postgres get_likes_stats() RPC. */
export interface LikesStats {
  total: number;
  byType: Record<string, number>;
  byBrowser: Record<string, number>;
  byOS: Record<string, number>;
  byDeviceType: Record<string, number>;
}

/** GET /admin/analytics — Cloudflare zone analytics aggregate. */
export interface AnalyticsData {
  days: number;
  totals: {
    uniques: number;
    requests: number;
    pageViews: number;
    bytes: number;
    cachedRequests: number;
    cachedBytes: number;
    encryptedRequests: number;
    encryptedBytes: number;
    threats: number;
  };
  series: Array<{
    date: string;
    uniques: number;
    requests: number;
    pageViews: number;
    bytes: number;
    cachedRequests: number;
    cachedBytes: number;
    encryptedRequests: number;
    encryptedBytes: number;
    threats: number;
  }>;
  countries: Array<{ code: string; requests: number; bytes: number; threats: number }>;
  browsers: Array<{ family: string; pageViews: number }>;
  threatPathing: Array<{ name: string; requests: number }>;
  adaptive: {
    pages: Array<{ path: string; visits: number; bytes: number }>;
    devices: Array<{ type: string; visits: number }>;
    oss: Array<{ name: string; visits: number }>;
  };
}

/** Paginated admin list envelope. */
export interface Page<T> {
  items: T[];
  total: number;
}

/** contributors table (missing from the generated types). */
export interface ContributorRow {
  id: string;
  name: string;
  email: string | null;
  contact: string | null;
  contributions: Array<{ type: 'app' | 'extension'; id: string; name: string }> | null;
  created_at: string | null;
}

/** moderator_permissions table (missing from the generated types). */
export interface ModeratorPermissionRow {
  id: string;
  user_id: string;
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  granted_by: string | null;
  created_at: string | null;
}