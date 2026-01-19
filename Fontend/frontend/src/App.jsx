import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../../frontend/src/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AttendancePage from "./pages/AttendancePage";
import HistoryPage from "./pages/HistoryPage";
import LeaveRequestPage from "./pages/LeaveRequestPage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import DepartmentHeadDashboard from "./pages/DepartmentHeadDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import DirectorDashboard from "./pages/DirectorDashboard";
// import ProfilePage from "./pages/ProfilePage";
import MemberListPage from './pages/MemberListPage';

// ...existing code...

<Routes>
  {/* Các route khác */}
  <Route path="/department/employees" element={<MemberListPage />} />
</Routes>
import Layout from "./components/Layout/Layout";

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user, getDefaultRoute } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is specified and user doesn't have permission, redirect to their dashboard
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getDefaultRoute()} replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public Route wrapper
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, getDefaultRoute } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultRoute()} replace />;
  }

  return children;
};

// Root redirect component
const RootRedirect = () => {
  const { getDefaultRoute } = useAuth();
  return <Navigate to={getDefaultRoute()} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Employee Routes */}
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "Nhân viên",
                  "Trưởng phòng",
                  "Quản lý",
                  "Giám đốc",
                ]}
              >
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-request"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "Nhân viên",
                  "Trưởng phòng",
                  "Quản lý",
                  "Giám đốc",
                ]}
              >
                <LeaveRequestPage />
              </ProtectedRoute>
            }
          />

          {/* Department Head Routes */}
          <Route
            path="/department-head/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={["Trưởng phòng", "Quản lý", "Giám đốc"]}
              >
                <DepartmentHeadDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/department-head/employees"
            element={
              <ProtectedRoute
                allowedRoles={["Trưởng phòng", "Quản lý", "Giám đốc"]}
              >
                <MemberListPage />
              </ProtectedRoute>
            }
          />


          {/* Manager Routes */}
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute allowedRoles={["Quản lý", "Giám đốc"]}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Director Routes */}
          <Route
            path="/director/dashboard"
            element={
              <ProtectedRoute allowedRoles={["Giám đốc"]}>
                <DirectorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Legacy dashboard route - redirect to role-based dashboard */}
          <Route path="/dashboard" element={<RootRedirect />} />

          {/* Root and catch-all */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
