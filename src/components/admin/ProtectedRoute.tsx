import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';

interface ProtectedRouteProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ children, requireSuperAdmin = false }: ProtectedRouteProps) {
  const { user, isSuperAdmin, isAuthorized, loading } = useAdmin();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin" replace />;
  if (!isAuthorized) return <Navigate to="/unauthorized" replace />;
  // 2FA is one-way and mandatory: until enrolled, the only reachable section
  // is Settings (the 2FA setup card). Everything else redirects there.
  if (!user.totpEnabled && location.pathname !== '/admin/settings') {
    return <Navigate to="/admin/settings" replace />;
  }
  if (requireSuperAdmin && !isSuperAdmin) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
}