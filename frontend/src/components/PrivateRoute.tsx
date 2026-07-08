import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

interface PrivateRouteProps {
  children: ReactNode;
  requiredRole?: string[];
}

export const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  // super_admin is a platform-wide role — implicitly allowed everywhere,
  // same as the backend's roleMiddleware.
  if (requiredRole && user.role !== 'super_admin' && !requiredRole.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};
