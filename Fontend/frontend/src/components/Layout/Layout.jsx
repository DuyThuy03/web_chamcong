import React, { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { wsService } from "../../service/ws";
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
import ThemeToggle from "../ThemeToggle";

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
    
    // Clear notification counts from storage on logout
    localStorage.removeItem("notification_history_count");
    localStorage.removeItem("notification_leave_count");
    localStorage.removeItem("notification_employee_result_count");
    
    navigate("/login", { replace: true });
  };
    // State for Unread Count (History & Leaves) - Persisted in LocalStorage
    const [historyUnreadCount, setHistoryUnreadCount] = useState(() => {
        return parseInt(localStorage.getItem("notification_history_count") || "0");
    });
    const [leaveUnreadCount, setLeaveUnreadCount] = useState(() => {
        return parseInt(localStorage.getItem("notification_leave_count") || "0");
    });
    const [employeeLeaveResultCount, setEmployeeLeaveResultCount] = useState(() => {
        return parseInt(localStorage.getItem("notification_employee_result_count") || "0");
    });

    // Persist counts to LocalStorage
    React.useEffect(() => {
        localStorage.setItem("notification_history_count", historyUnreadCount);
    }, [historyUnreadCount]);

    React.useEffect(() => {
        localStorage.setItem("notification_leave_count", leaveUnreadCount);
    }, [leaveUnreadCount]);

    React.useEffect(() => {
        localStorage.setItem("notification_employee_result_count", employeeLeaveResultCount);
    }, [employeeLeaveResultCount]);

    // Ref to track current path for WS handlers without re-binding listeners
    const pathnameRef = React.useRef(location.pathname);

    // Update ref when location changes
    React.useEffect(() => {
        pathnameRef.current = location.pathname;
    }, [location.pathname]);

    // Effect: Listen to WS for counts
    React.useEffect(() => {
        if (!user) return;

        console.log("Setting up WS listeners for notifications");

        const handleNewAttendance = () => {
             // Check if user is on history page (Manager or Head)
            const currentPath = pathnameRef.current;
            const isHistoryPage = currentPath.includes('/history');
            if (!isHistoryPage) {
                console.log("New attendance notification received");
                setHistoryUnreadCount(prev => prev + 1);
            }
        };

        const handleNewLeave = () => {
            const currentPath = pathnameRef.current;
            const isLeavePage = currentPath.includes('/leave') && !currentPath.includes('/leave-request');
            if (!isLeavePage) {
                console.log("New leave request notification received");
                setLeaveUnreadCount(prev => prev + 1);
            }
        };

        const handleLeaveResult = () => {
            const currentPath = pathnameRef.current;
            // Use startsWith to check if user is on leave request page or sub-page
            const isLeaveRequestPage = currentPath.startsWith('/leave-request');
            if (!isLeaveRequestPage) {
                console.log("Leave result notification received");
                setEmployeeLeaveResultCount(prev => prev + 1);
            }
        };

        wsService.on("ATTENDANCE_CHECKIN", handleNewAttendance);
        wsService.on("ATTENDANCE_CHECKOUT", handleNewAttendance);
        wsService.on("CREATE_LEAVE_REQUEST", handleNewLeave);
        wsService.on("LEAVE_APPROVED", handleLeaveResult);
        wsService.on("LEAVE_REJECTED", handleLeaveResult);

        return () => {
            wsService.off("ATTENDANCE_CHECKIN", handleNewAttendance);
            wsService.off("ATTENDANCE_CHECKOUT", handleNewAttendance);
            wsService.off("CREATE_LEAVE_REQUEST", handleNewLeave);
            wsService.off("LEAVE_APPROVED", handleLeaveResult);
            wsService.off("LEAVE_REJECTED", handleLeaveResult);
        };
    }, [user]); // Only depend on user, removes race conditions with navigation

   
    React.useEffect(() => {
        if (location.pathname.includes('/history')) {
            setHistoryUnreadCount(0);
        }
    }, [location.pathname]);

    
    React.useEffect(() => {
        if (location.pathname.includes('/leave') || location.pathname.includes('/leaves')) {
            // Reset appropriate counters based on specific path
            // Use startsWith to match /leave-request and any sub-routes
            if (location.pathname.startsWith('/leave-request')) {
                setEmployeeLeaveResultCount(0);
            } else {
                 setLeaveUnreadCount(0);
            }
        }
    }, [location.pathname]);


    // Dynamic menu based on user role
    const menuItems = useMemo(() => {
      const baseItems = [
        {
          path: "/attendance",
          icon: Clock,
          label: "Chấm công",
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
          { 
            path: "/leave-request", 
            icon: FileText, 
            label: "Xin nghỉ phép",
            badge: employeeLeaveResultCount > 0 ? employeeLeaveResultCount : null
          },
        ],
        "Trưởng phòng": [
          {
            path: "/department-head/dashboard",
            icon: Home,
            label: "Dashboard Trưởng phòng",
            badge: (leaveUnreadCount || 0) + (historyUnreadCount || 0) > 0 ? (leaveUnreadCount || 0) + (historyUnreadCount || 0) : null,
            
          },
      
          {
            path: "/department-head/employees",
            icon: Users,
            label: "Quản lý thành viên",
          },
          {
            path: "/department-head/leaves",
            icon: CheckSquare,
            label: "Duyệt đơn nghỉ phép", 
            badge: leaveUnreadCount > 0 ? leaveUnreadCount : null
          },
          {
            path: "/department-head/history",
            icon: History ,
            label: "Lịch sử chấm công ",
            badge: historyUnreadCount > 0 ? historyUnreadCount : null
          },
        ],
        "Quản lý": [
        
          { path: "/manager/member", icon: Users, label: "Quản lý nhân viên" },
          {
            path: "/manager/history",
            icon: History,
            label: "Lịch sử chấm công",
            badge: historyUnreadCount > 0 ? historyUnreadCount : null
          },
          {
            path: "/manager/leave",
            icon: CheckSquare,
            label: "Duyệt đơn nghỉ phép",
            badge: leaveUnreadCount > 0 ? leaveUnreadCount : null
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
    }, [user?.role, historyUnreadCount, leaveUnreadCount, employeeLeaveResultCount]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
      {/* Header */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-[var(--text-primary)]">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="mr-4 md:hidden text-[var(--text-primary)] relative"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                {/* Mobile Notification Dot */}
                {!sidebarOpen && (() => {
                  const role = user?.role;
                  if (role === "Nhân viên") return (employeeLeaveResultCount || 0) > 0;
                  if (["Trưởng phòng", "Quản lý"].includes(role)) return ((leaveUnreadCount || 0) + (historyUnreadCount || 0)) > 0;
                  return false;
                })() && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
              </button>
              <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                HỆ THỐNG CHẤM CÔNG
              </h1>
            </div>

            <div className="flex items-center gap-6">
              <ThemeToggle />
              
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {user?.name}
                </p>
                <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors"
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
            w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border-color)]
            transition-all duration-300 ease-in-out
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
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border-l-4 
                    ${
                      isActive
                        ? "bg-[var(--bg-primary)] text-[var(--accent-color)] border-[var(--accent-color)] shadow-[0_0_10px_rgba(0,243,255,0.1)]"
                        : "text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="font-medium flex-1">{item.label}</span>
                  {item.badge && (
                      <span className="flex items-center justify-center min-w-[1.25rem] h-5 bg-rose-500 text-white text-[10px] font-bold px-1.5 rounded-full shadow-sm">
                          {item.badge > 99 ? '99+' : item.badge}
                      </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
