import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Đường dẫn này phải trỏ đến đúng file AuthContext.jsx bạn vừa gửi
import { useAuth } from "./contexts/AuthContext";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/employee/DashboardPage";
import AttendancePage from "./pages/employee/AttendancePage";
import HistoryPage from "./pages/employee/HistoryPage";
import LeaveRequestPage from "./pages/employee/LeaveRequestPage";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import DepartmentHeadDashboard from "./pages/DepartmentHead/DepartmentHeadDashboard";

import MemberListPage from "./pages/DepartmentHead/MemberListPage";
import LeavesHeadPage from "./pages/DepartmentHead/Leaves-headPage";
import History from "./pages/DepartmentHead/History";

import MemberList from "./pages/manager/MemberList";
import HistoryManager from "./pages/manager/History";
import SummaryPage from "./pages/manager/ManagerDashboard";
import LeavesPage from "./pages/manager/leaves_manager";

import Layout from "./components/Layout/Layout";
import PrivateRoute from "./PrivateRouter/PrivateRouter";
import { wsService } from "./service/ws";


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
  const { user } = useAuth();

  // Quản lý WebSocket dựa trên user
  useEffect(() => {
    if (!user) {
      // user chưa login hoặc đã logout → đảm bảo đóng WS
      wsService.disconnect();
      return;
    }

    // user đã có → mở kết nối nếu chưa có
    wsService.connect();

    // cleanup không cần disconnect ở đây,
    // vì khi user đổi từ có -> null, effect sẽ chạy lại và disconnect ở trên
  }, [user]);

  return (
    <BrowserRouter>
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
            <PrivateRoute>
              <ProtectedRoute
                allowedRoles={["Trưởng phòng", "Quản lý", "Giám đốc"]}
              >
                <DepartmentHeadDashboard />
              </ProtectedRoute>
            </PrivateRoute>
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
        <Route
          path="/department-head/leaves"
          element={
            <ProtectedRoute
              allowedRoles={["Trưởng phòng", "Quản lý", "Giám đốc"]}
            >
              <LeavesHeadPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/department-head/history"
          element={
            <ProtectedRoute
              allowedRoles={["Trưởng phòng", "Quản lý", "Giám đốc"]}
            >
              <History />
            </ProtectedRoute>
          }
        />

        {/* Manager Routes */}
        <Route
          path="/manager/member"
          element={
            <ProtectedRoute allowedRoles={["Quản lý"]}>
              <MemberList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/history"
          element={
            <ProtectedRoute allowedRoles={["Quản lý"]}>
              <HistoryManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute allowedRoles={["Quản lý"]}>
              <SummaryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/leave"
          element={
            <ProtectedRoute allowedRoles={["Quản lý"]}>
              <LeavesPage />
            </ProtectedRoute>
          }
        />

        {/* Legacy dashboard route - redirect to role-based dashboard */}
        <Route path="/dashboard" element={<RootRedirect />} />

        {/* Root and catch-all */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;