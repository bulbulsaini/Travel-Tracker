
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./hooks/useAuth";

type RoleRouteProps = {
  children: ReactNode;
  allowedRoles: string[];
};

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-3" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Loading...
        </p>
      </div>
    </div>
  );
}

export default function RoleRoute({
  children,
  allowedRoles,
}: RoleRouteProps) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
