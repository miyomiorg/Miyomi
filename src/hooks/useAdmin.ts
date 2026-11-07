import { useAuth } from './useAuth';
import type { AdminRole } from './useAuth';

export type { AdminRole };

export type ModeratorPermission = {
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
};

/**
 * Role + permission resolution, now sourced from the session returned by
 * /auth/me (no more has_role RPC round-trips).
 */
export function useAdmin() {
  const { user, role, permissions, loading: authLoading } = useAuth();

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';
  const isModerator = role === 'moderator';
  const isAuthorized = role !== null;

  /**
   * Check if the current user has permission for a specific action on a resource.
   * - super_admin and admin: always have full access
   * - moderator: checks moderator_permissions
   */
  function hasPermission(resource: string, action: 'read' | 'write' | 'delete'): boolean {
    if (role === 'super_admin' || role === 'admin') return true;
    if (role !== 'moderator') return false;

    const perm = permissions.find((p) => p.resource === resource);
    if (!perm) return false;

    if (action === 'read') return perm.can_read;
    if (action === 'write') return perm.can_write;
    if (action === 'delete') return perm.can_delete;
    return false;
  }

  return {
    role,
    isAdmin,
    isSuperAdmin,
    isModerator,
    isAuthorized,
    permissions,
    hasPermission,
    loading: authLoading,
    user,
  };
}

export const NO_WRITE_TITLE = 'Read-only access: you do not have write permission';
export const NO_DELETE_TITLE = 'You do not have delete permission';

/**
 * Write/delete flags for an admin page's resource(s). Action buttons stay
 * visible but are disabled (with an explanatory tooltip) when not granted;
 * the server enforces the same rules.
 */
export function useResourceAccess(resource: string | string[]) {
  const { hasPermission } = useAdmin();
  const resources = Array.isArray(resource) ? resource : [resource];
  const canWrite = resources.some((r) => hasPermission(r, 'write'));
  const canDelete = resources.some((r) => hasPermission(r, 'delete'));
  return {
    canWrite,
    canDelete,
    /** Tooltip for a disabled write action (undefined when allowed). */
    writeTitle: canWrite ? undefined : NO_WRITE_TITLE,
    /** Tooltip for a disabled delete action (undefined when allowed). */
    deleteTitle: canDelete ? undefined : NO_DELETE_TITLE,
    hasPermission,
  };
}
