import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useSessionTracker } from '@/hooks/useSessionTracker';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ children, requireSuperAdmin = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, isAuthorized, loading: adminLoading } = useAdmin();
  const { trackUnauthorizedAttempt } = useSessionTracker();
  const navigate = useNavigate();
  const [rejecting, setRejecting] = useState(false);
  // Prevent double-firing of the rejection logic
  const rejectionHandled = useRef(false);

  useEffect(() => {
    if (authLoading || adminLoading || !user || isAuthorized || rejecting || rejectionHandled.current) return;

    rejectionHandled.current = true;
    setRejecting(true);

    const email = user.email || 'unknown';
    const provider = user.app_metadata?.provider || 'email';

    (async () => {
      try {
        await trackUnauthorizedAttempt(email, provider);
      } catch (err) {
        console.error('Failed to track unauthorized attempt:', err);
      }

      await supabase.auth.signOut();

      navigate('/unauthorized', { replace: true, state: { email } });
    })();
  }, [authLoading, adminLoading, user, isAuthorized, rejecting, trackUnauthorizedAttempt, navigate]);

  if (authLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)]" />
      </div>
    );
  }

  if (rejecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
        <p className="text-sm text-red-400/70 font-mono">Verifying access...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (!isAuthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
