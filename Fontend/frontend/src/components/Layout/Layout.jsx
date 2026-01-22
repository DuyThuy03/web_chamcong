import React, { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Home,
  Clock,
  History,
  User,
  LogOut,
  Menu,
  X,
  Users,
  Building,
  BarChart3,
  FileText,
  CheckSquare,
  TrendingUp,
  Settings,
  IdCard ,
} from "lucide-react";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Redirect to login when user becomes null
  React.useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

 const handleLogout = async () => {
  await logout();
  navigate("/login", { replace: true });
};
  // Dynamic menu based on user role
  const menuItems = useMemo(() => {
    const baseItems = [
      {
        path: "/attendance",
        icon: Clock,
        label: "CheckIN - CheckOUT",
        roles: ["Nhân viên", "Trưởng phòng", "Quản lý", "Giám đốc"],
      },
      {
        path: "/history",
        icon: History,
        label: "Lịch sử chấm công",
        roles: ["Nhân viên", "Trưởng phòng", "Quản lý", "Giám đốc"],
      },
    ];

    // Role-specific menu items
    const roleMenus = {
      "Nhân viên": [
        { path: "/employee/dashboard", icon: Home, label: "Dashboard" },
        ...baseItems,
        { path: "/leave-request", icon: FileText, label: "Xin nghỉ phép" },
      ],
      "Trưởng phòng": [
        {
          path: "/department-head/dashboard",
          icon: Home,
          label: "Dashboard Trưởng phòng",
        },
    
        {
          path: "/department-head/employees",
          icon: Users,
          label: "Quản lý thành viên",
        },
        {
          path: "/department-head/leaves",
          icon: CheckSquare,
          label: "Duyệt nghỉ phép",
        },
        {
          path: "/department-head/history",
          icon: History ,
          label: "Lịch sử chấm công ",
        },
      ],
      "Quản lý": [
      
        { path: "/manager/member", icon: Users, label: "Quản lý nhân viên" },
        {
          path: "/manager/history",
          icon: History,
          label: "Lịch sử chấm công",
        },
        {
          path: "/manager/leave",
          icon: CheckSquare,
          label: "Duyệt đơn nghỉ phép",
        },
      
        { path: "/manager/sumary", icon: FileText, label: "Thống kê báo cáo" },
      ],
      "Giám đốc": [
        {
          path: "/director/dashboard",
          icon: Home,
          label: "Dashboard Giám đốc",
        },
        {
          path: "/director/reports",
          icon: FileText,
          label: "Báo cáo tổng hợp",
        },
        {
          path: "/director/analytics",
          icon: TrendingUp,
          label: "Phân tích dữ liệu",
        },
        { path: "/director/departments", icon: Building, label: "Phòng ban" },
        { path: "/director/strategy", icon: Settings, label: "Chiến lược" },
      ],
    };

    return roleMenus[user?.role] || roleMenus["Nhân viên"];
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 md:hidden"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-xl font-bold text-gray-800">
                Hệ thống chấm công
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-700">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0
            fixed md:static inset-y-0 left-0 z-30
            w-64 bg-white shadow-lg
            transition-transform duration-300 ease-in-out
            mt-16 md:mt-0
          `}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
