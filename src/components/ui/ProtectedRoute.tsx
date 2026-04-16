import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If specified, only users with these roles can access the route */
  requiredRole?: UserRole | UserRole[];
}

/**
 * Route guard component that checks authentication and optionally role.
 * Redirects to /login if not authenticated.
 * Redirects to role-appropriate home if authenticated but wrong role.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-purple-600">
          <Loader2 size={40} className="animate-spin" />
          <p className="font-medium text-lg">טוען...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  // Wrong role — redirect to the correct home page
  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!rolesArray.includes(profile.role)) {
      const redirectPath = profile.role === 'admin' ? '/admin' : profile.role === 'trainer' ? '/trainer' : '/diet';
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
}
