import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_EMAIL = 'mich.vanhaute01@gmail.com';

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/404" replace />;
  }

  const isAdminEmail = user.email === ADMIN_EMAIL;
  const isAdminRole = (user.app_metadata as { role?: string } | undefined)?.role === 'admin';

  if (!isAdminEmail || !isAdminRole) {
    return <Navigate to="/404" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
