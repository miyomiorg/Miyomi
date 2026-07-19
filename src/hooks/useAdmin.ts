import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | null;

export type ModeratorPermission = {
  resource: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
};

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<ModeratorPermission[]>([]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setRole(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    // Track if component is still mounted to prevent state updates after unmount
    let isMounted = true;

    // Only run check when user ID changes, not when user object reference changes
    async function checkRole() {
      if (!isMounted) return;
      setLoading(true);

      try {
        // Check user_roles table via RPC
        const { data: isSuperAdmin, error: superAdminError } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'super_admin',
        });

        // Ignore aborted requests
        if (superAdminError?.message?.includes('aborted')) return;

        if (!isMounted) return; // Check again after async operation

        if (isSuperAdmin) {
          setRole('super_admin');
          setPermissions([]);
          setLoading(false);
          return;
        }

        const { data: isAdmin, error: adminError } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });

        // Ignore aborted requests
        if (adminError?.message?.includes('aborted')) return;

        if (!isMounted) return; // Check again after async operation

        if (isAdmin) {
          setRole('admin');
          setPermissions([]);
          setLoading(false);
          return;
        }

        // Check moderator role
        const { data: isModerator, error: modError } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'moderator' as any,
        });

        if (modError?.message?.includes('aborted')) return;
        if (!isMounted) return;

        if (isModerator) {
          setRole('moderator');
          // Load moderator permissions
          const { data: perms } = await (supabase as any)
            .from('moderator_permissions')
            .select('resource, can_read, can_write, can_delete')
            .eq('user_id', user.id);

          if (isMounted) {
            setPermissions(perms || []);
          }
          setLoading(false);
          return;
        }

        setRole(null);
        setPermissions([]);
      } catch (error: any) {
        // Silently ignore abort errors to prevent console spam
        if (error?.message?.includes('aborted') || error?.name === 'AbortError') {
          return;
        }
        console.error('Error checking admin role:', error);
        if (isMounted) {
          setRole(null);
          setPermissions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkRole();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user?.id, authLoading]); // CRITICAL FIX: Only depend on user.id, not entire user object

  /**
   * Check if the current user has permission for a specific action on a resource.
   * - super_admin and admin: always have full access
   * - moderator: checks moderator_permissions table
   * - For delete: ALWAYS false for moderators unless explicitly granted
   */
  function hasPermission(resource: string, action: 'read' | 'write' | 'delete'): boolean {
    if (role === 'super_admin' || role === 'admin') return true;
    if (role !== 'moderator') return false;

    const perm = permissions.find(p => p.resource === resource);
    if (!perm) return false;

    if (action === 'read') return perm.can_read;
    if (action === 'write') return perm.can_write;
    if (action === 'delete') return perm.can_delete; // Never true by default
    return false;
  }

  return {
    role,
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
    isModerator: role === 'moderator',
    isAuthorized: role !== null,
    permissions,
    hasPermission,
    loading: authLoading || loading,
  };
}
