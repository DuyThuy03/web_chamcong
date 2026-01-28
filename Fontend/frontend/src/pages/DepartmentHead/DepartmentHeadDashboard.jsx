import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../service/api";
import { formatDate, formatTime } from "../../until/helper";
import { wsService } from "../../service/ws";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  LogOut,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  RefreshCw,
  CloudCog
} from "lucide-react";

/**
 * DepartmentHeadDashboard.jsx
 * Modern dashboard for Department Heads to manage their team.
 */
const DepartmentHeadDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    lateToday: 0,
  });
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [departmentAttendance, setDepartmentAttendance] = useState([]);

  // Data Fetching
  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  // WebSocket Handlers
  useEffect(() => {
    if (!user) return;

    // 1. Live Attendance Updates
    const handleCheckin = (data) => {
      setDepartmentAttendance((prev) => [data, ...prev]);
      setStats((prev) => ({
        ...prev,
        presentToday: prev.presentToday + 1,
        lateToday:
          data.work_status === "LATE" ? prev.lateToday + 1 : prev.lateToday,
      }));
    };

    const handleCheckout = (data) => {
      setDepartmentAttendance((prev) =>
        prev.map((item) =>
          item.attendance_id === data.attendance_id
            ? { ...item, checkout_time: data.checkout_time }
            : item,
        ),
      );
    };

    // 2. Live Leave Request Updates
    const handlerCreateLeave = (data) => {
      if (data.status !== "CHO_DUYET") return;
      setPendingLeaveRequests((prev) => {
        if (prev.some((item) => item.id === data.id)) return prev;
        setStats((s) => ({ ...s, pendingLeaves: s.pendingLeaves + 1 }));
        return [data, ...prev];
      });
    };

    const handlerCancelLeave = (data) => {
      setPendingLeaveRequests((prev) =>
        prev.filter((item) => item.id !== data.id),
      );
      setStats((s) => ({
        ...s,
        pendingLeaves: Math.max(0, s.pendingLeaves - 1),
      }));
    };

    wsService.on("ATTENDANCE_CHECKIN", handleCheckin);
    wsService.on("ATTENDANCE_CHECKOUT", handleCheckout);
    wsService.on("CREATE_LEAVE_REQUEST", handlerCreateLeave);
    wsService.on("LEAVE_CANCELED", handlerCancelLeave);

    return () => {
      wsService.off("ATTENDANCE_CHECKIN", handleCheckin);
      wsService.off("ATTENDANCE_CHECKOUT", handleCheckout);
      wsService.off("CREATE_LEAVE_REQUEST", handlerCreateLeave);
      wsService.off("LEAVE_CANCELED", handlerCancelLeave);
    };
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Parallel data fetching for performance
      const [usersRes, attendanceRes, leaveRes] = await Promise.all([
        api.get("/users"),
        api.get("/manager/attendance/today"),
        api.get("/leaves"),
      ]);
console.log("attendanceRes.data",attendanceRes.data);
      // Process Stats
      let totalEmployees = 0;
      if (usersRes.data.success) {
        const deptUsers = usersRes.data.data.filter(
          (u) => u.department_id === user?.department_id,
        );
        totalEmployees = deptUsers.length;
      }

      // Process Attendance
      let presentToday = 0;
      let lateToday = 0;
      let deptAttendanceList = [];

      if (attendanceRes.data.success) {
        const data = attendanceRes.data.data;
        deptAttendanceList = data
          .filter((r) => r.checkin_image && r.checkin_time)
          .map((r) => ({
            user_name: r.user_name,
            checkin_time: r.checkin_time,
            checkout_time: r.checkout_time,
            checkin_image: r.checkin_image,
            work_status: r.work_status,
            attendance_id: r.attendance_id,
          }));

        presentToday = deptAttendanceList.length;
        lateToday = deptAttendanceList.filter(
          (r) => r.work_status === "LATE",
        ).length;
      }

      // Process Pending Leaves
      let pendingLeavesList = [];
      if (leaveRes.data.success) {
        pendingLeavesList = leaveRes.data.data.requests
          ? leaveRes.data.data.requests.filter(
              (l) => l.status === "CHO_DUYET",
            )
          : [];
      }

      setStats({
        totalEmployees,
        presentToday,
        lateToday,
        pendingLeaves: pendingLeavesList.length,
      });
      setDepartmentAttendance(deptAttendanceList);
      setPendingLeaveRequests(pendingLeavesList.slice(0, 5)); // Show only recent 5
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      await api.put(`/leaves/${leaveId}/approve`);
      // Update local state without refetching
      setPendingLeaveRequests((prev) => prev.filter((l) => l.id !== leaveId));
      setStats((prev) => ({
        ...prev,
        pendingLeaves: Math.max(0, prev.pendingLeaves - 1),
      }));
      alert("Đã duyệt đơn nghỉ phép");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi duyệt đơn");
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      await api.put(`/leaves/${leaveId}/reject`);
      // Update local state without refetching
      setPendingLeaveRequests((prev) => prev.filter((l) => l.id !== leaveId));
      setStats((prev) => ({
        ...prev,
        pendingLeaves: Math.max(0, prev.pendingLeaves - 1),
      }));
      alert("Đã từ chối đơn nghỉ phép");
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi từ chối đơn");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-[var(--text-secondary)] font-medium">
            Đang tải dữ liệu quản lý...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-4 font-sans text-[var(--text-primary)] transition-colors duration-200">
      {/* 1. Dashboard Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4 mb-4 shadow-sm transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-tight flex items-center gap-2">
               <div className="p-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                 <TrendingUp size={20} className="text-[var(--accent-color)]" />
               </div>
               TRANG CHỦ
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs font-medium text-[var(--text-secondary)] ml-10">
              <span className="flex items-center gap-1">
                <Users size={12} />
                {user?.department_name || "Phòng ban"}
              </span>
              <span className="text-[var(--border-color)]">|</span>
              <span>
                {new Date().toLocaleDateString("vi-VN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              className="hidden md:block md:p-2 md:bg-[var(--bg-primary)] md:hover:bg-[var(--bg-secondary)] md:text-[var(--text-primary)] md:border md:border-[var(--border-color)] md:rounded-md md:transition-all md:shadow-sm"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* 2. Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm hover:border-[var(--accent-color)] transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--bg-primary)] text-indigo-600 border border-[var(--border-color)] rounded-md flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[var(--text-secondary)] text-xs font-medium uppercase truncate">Tổng nhân sự</p>
                <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5 truncate">
                  {stats.totalEmployees}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm hover:border-[var(--accent-color)] transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--bg-primary)] text-emerald-600 border border-[var(--border-color)] rounded-md flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCheck size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[var(--text-secondary)] text-xs font-medium uppercase truncate">
                 Có mặt
                </p>
                <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5 truncate">
                  {stats.presentToday}{" "}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">
                    / {stats.totalEmployees}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm hover:border-[var(--accent-color)] transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--bg-primary)] text-orange-600 border border-[var(--border-color)] rounded-md flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[var(--text-secondary)] text-xs font-medium uppercase truncate">
                  Đi muộn
                </p>
                <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5 truncate">
                  {stats.lateToday}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm hover:border-[var(--accent-color)] transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--bg-primary)] text-purple-600 border border-[var(--border-color)] rounded-md flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[var(--text-secondary)] text-xs font-medium uppercase truncate">
                  Đơn chờ duyệt
                </p>
                <p className="text-xl font-bold text-[var(--text-primary)] mt-0.5 truncate">
                  {pendingLeaveRequests.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Live Attendance */}
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] shadow-sm flex flex-col h-[500px]">
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)] rounded-t-lg">
              <h2 className="font-bold text-[var(--text-primary)] text-sm uppercase flex items-center gap-2">
                <Clock size={16} className="text-blue-600" /> Hoạt động chấm công
              </h2>
              <span className="text-[10px] font-bold bg-green-900/10 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                LIVE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {departmentAttendance.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
                  <UserX size={32} className="mb-2 opacity-30" />
                  <p className="text-xs">Chưa có dữ liệu chấm công hôm nay</p>
                </div>
              ) : (
                departmentAttendance.map((record, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md hover:border-[var(--accent-color)] transition-colors group"
                  >
                    {/* Avatar/Image */}
                    <div className="w-10 h-10 rounded-md bg-[var(--bg-secondary)] overflow-hidden shrink-0 border border-[var(--border-color)]">
                      {record.checkin_image ? (
                        <img
                          src={record.checkin_image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
                          <Users size={16} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                         <h4 className="font-bold text-[var(--text-primary)] text-sm truncate">
                            {record.user_name}
                         </h4>
                         {record.work_status === "LATE" ? (
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              ĐI MUỘN
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              ĐÚNG GIỜ
                            </span>
                          )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-secondary)] font-mono">
                        <span className="flex items-center gap-1">
                          IN: <span className="text-[var(--text-primary)] font-bold">{formatTime(record.checkin_time)}</span>
                        </span>
                        <span>|</span>
                        <span className="flex items-center gap-1">
                           OUT: 
                           {record.checkout_time ? (
                              <span className="text-[var(--text-primary)] font-bold">{formatTime(record.checkout_time)}</span>
                           ) : (
                              <span className="text-[var(--text-secondary)] italic">--:--</span>
                           )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Pending Leaves */}
          <div className="bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] shadow-sm flex flex-col h-[500px]">
            <div className="px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)] rounded-t-lg">
              <h2 className="font-bold text-[var(--text-primary)] text-sm uppercase flex items-center gap-2">
                <FileText size={16} className="text-purple-600" /> Phê duyệt nghỉ phép
              </h2>
              {pendingLeaveRequests.length > 0 && (
                <span className="text-[10px] font-bold bg-[var(--accent-color)] text-white px-2 py-0.5 rounded-md">
                  {pendingLeaveRequests.length}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {pendingLeaveRequests.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)]">
                  <CheckCircle2
                    size={32}
                    className="mb-2 opacity-30 text-emerald-400"
                  />
                  <p className="text-xs">Không có yêu cầu nào đang chờ duyệt</p>
                </div>
              ) : (
                pendingLeaveRequests.map((leave) => (
                  <div
                    key={leave.id}
                    className="p-3 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] hover:border-[var(--accent-color)] transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] flex items-center justify-center font-bold text-xs uppercase">
                          {leave.user_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <h4 className="font-bold text-[var(--text-primary)] text-sm leading-none">
                            {leave.user_name}
                          </h4>
                          <p className="text-[10px] text-[var(--text-secondary)] font-medium mt-1">
                            {leave.leave_type || "Nghỉ phép"}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 font-bold uppercase">
                        Chờ duyệt
                      </span>
                    </div>

                    <div className="mb-3 pl-[42px]">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--text-primary)] mb-1 bg-[var(--bg-secondary)] w-fit px-2 py-0.5 rounded border border-[var(--border-color)]">
                        <Calendar size={12} className="text-[var(--text-secondary)]" />
                        {formatDate(leave.from_date)}{" "}
                        <span className="text-[var(--text-secondary)] font-normal mx-1">→</span>{" "}
                        {formatDate(leave.to_date)}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] italic mt-1 line-clamp-2">
                        "{leave.reason}"
                      </p>
                    </div>

                    <div className="flex gap-2 pl-[42px]">
                      <button
                        onClick={() => handleApproveLeave(leave.id)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md shadow-sm transition-all flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={12} /> Duyệt
                      </button>
                      <button
                        onClick={() => handleRejectLeave(leave.id)}
                        className="flex-1 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1"
                      >
                        <XCircle size={12} /> Từ chối
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentHeadDashboard;
