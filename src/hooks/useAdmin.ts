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
