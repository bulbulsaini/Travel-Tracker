import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import RoleRoute from "../RoleRoute";

import Layout from "../components/ui/Layout";
import EmployeeDashboard from "../components/dashboards/EmployeeDashboard";
import HODDashboard from "../components/dashboards/HODDashboard";
import DirectorDashboard from "../components/dashboards/DirectorDashboard";
import TravelManagerDashboard from "../components/dashboards/TravelManagerDashboard";
import AdminPanel from "../components/dashboards/AdminPanel";
import MyRequests from "../components/dashboards/MyRequests";
import RequestDetail from "../components/dashboards/RequestDetail";
import Profile from "../components/dashboards/Profile";
import TravelHistory from "../components/dashboards/TravelHistory";
import TravelOverview from "../components/dashboards/TravelOverview";
import TravelRequestForm from "../components/forms/TravelRequestForm";

/**
 * Dashboard routes are selected by the signed-in user's role.
 * Keep role checks here aligned with the navigation in Layout.tsx.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;

  const HomeComponent =
    role === "ADMIN"
      ? AdminPanel
      : role === "HOD"
        ? HODDashboard
        : role === "DIRECTOR"
          ? DirectorDashboard
          : role === "TRAVEL_MANAGER"
            ? TravelManagerDashboard
            : EmployeeDashboard;

  const AllRequestsComponent =
    role === "ADMIN" ? (
      <AdminPanel defaultTab="requests" />
    ) : (
      <HomeComponent />
    );

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomeComponent />} />

        <Route
          path="/new-request"
          element={
            <RoleRoute allowedRoles={["EMPLOYEE", "HOD"]}>
              <TravelRequestForm />
            </RoleRoute>
          }
        />

        <Route
          path="/my-requests"
          element={
            <RoleRoute allowedRoles={["EMPLOYEE", "HOD"]}>
              <MyRequests />
            </RoleRoute>
          }
        />

        <Route
          path="/users"
          element={
            <RoleRoute allowedRoles={["ADMIN"]}>
              <AdminPanel defaultTab="users" />
            </RoleRoute>
          }
        />

        <Route
          path="/all-requests"
          element={
            <RoleRoute allowedRoles={["ADMIN", "HOD", "DIRECTOR"]}>
              {AllRequestsComponent}
            </RoleRoute>
          }
        />

        <Route
          path="/pending"
          element={
            <RoleRoute
              allowedRoles={["HOD", "DIRECTOR", "TRAVEL_MANAGER"]}
            >
              {role === "TRAVEL_MANAGER" ? (
                <TravelManagerDashboard key="process-requests" />
              ) : (
                <HomeComponent />
              )}
            </RoleRoute>
          }
        />

        <Route
          path="/history"
          element={
            role === "DIRECTOR" ? <TravelOverview /> : <TravelHistory />
          }
        />

        <Route path="/request/:id" element={<RequestDetail />} />
        <Route path="/profile" element={<Profile />} />

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </Layout>
  );
}