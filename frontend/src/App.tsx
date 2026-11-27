
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import type { ReactNode } from "react";

import { AuthProvider, useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DashboardPage from "./pages/Dashboard";

type RouteGuardProps = {
  children: ReactNode;
};

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-900">
      <div
        className="flex flex-col items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Loading...
        </p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/dashboard" replace />}
      />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/signup"
        element={
          <PublicRoute>
            <Signup />
          </PublicRoute>
        }
      />

      <Route
        path="/dashboard/*"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#fff",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              fontSize: 14,
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
