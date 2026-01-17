import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../service/api";

const DepartmentHeadDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
    lateToday: 0,
  });
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [departmentAttendance, setDepartmentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch department users
      const usersRes = await api.get("/users");
      if (usersRes.data.success) {
        const deptUsers = usersRes.data.data.filter(
          (u) => u.department_id === user?.department_id
        );
        setStats((prev) => ({ ...prev, totalEmployees: deptUsers.length }));
      }

      // Fetch leave requests
      const leaveRes = await api.get("/leave-requests");
      if (leaveRes.data.success) {
        const pending = leaveRes.data.data.filter(
          (l) =>
            l.status === "Chờ duyệt" && l.department_id === user?.department_id
        );
        setPendingLeaveRequests(pending.slice(0, 5));
        setStats((prev) => ({ ...prev, pendingLeaves: pending.length }));
      }

      // Fetch today's attendance
      const today = new Date().toISOString().split("T")[0];
      const attendanceRes = await api.get("/attendance/today");
      if (attendanceRes.data.success) {
        const todayRecords = attendanceRes.data.data || [];
        setDepartmentAttendance(todayRecords.slice(0, 10));
        setStats((prev) => ({
          ...prev,
          presentToday: todayRecords.length,
          lateToday: todayRecords.filter((r) => r.is_late).length,
        }));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      await api.put(`/leave-requests/${leaveId}/approve`);
      alert("Đã duyệt đơn nghỉ phép");
      fetchDashboardData();
    } catch (error) {
      console.error("Error approving leave:", error);
      alert("Có lỗi xảy ra khi duyệt đơn");
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      await api.put(`/leave-requests/${leaveId}/reject`);
      alert("Đã từ chối đơn nghỉ phép");
      fetchDashboardData();
    } catch (error) {
      console.error("Error rejecting leave:", error);
      alert("Có lỗi xảy ra khi từ chối đơn");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Dashboard Trưởng Phòng
        </h1>
        <p className="text-gray-600 mt-2">
          Xin chào, {user?.name || "Trưởng phòng"}!
        </p>
        <p className="text-sm text-gray-500">
          Phòng ban: {user?.department_name || "N/A"}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Tổng nhân viên</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats.totalEmployees}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Có mặt hôm nay</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats.presentToday}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Đi muộn hôm nay</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {stats.lateToday}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Đơn chờ duyệt</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {stats.pendingLeaves}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <button
          onClick={() => navigate("/department/employees")}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md p-6 text-center transition-all duration-200"
        >
          <svg
            className="w-12 h-12 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold">Quản lý nhân viên</h3>
        </button>

        <button
          onClick={() => navigate("/department/attendance")}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-md p-6 text-center transition-all duration-200"
        >
          <svg
            className="w-12 h-12 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="text-xl font-semibold">Chấm công phòng ban</h3>
        </button>

        <button
          onClick={() => navigate("/department/leave-requests")}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-md p-6 text-center transition-all duration-200"
        >
          <svg
            className="w-12 h-12 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-xl font-semibold">Duyệt nghỉ phép</h3>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Leave Requests */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Đơn nghỉ chờ duyệt
          </h2>
          {pendingLeaveRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Không có đơn nào chờ duyệt
            </p>
          ) : (
            <div className="space-y-4">
              {pendingLeaveRequests.map((leave) => (
                <div
                  key={leave.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">
                        {leave.user_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(leave.start_date)} -{" "}
                        {formatDate(leave.end_date)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {leave.reason}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {leave.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApproveLeave(leave.id)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => handleRejectLeave(leave.id)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Attendance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Chấm công hôm nay
          </h2>
          {departmentAttendance.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-3">
              {departmentAttendance.map((record, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {record.user_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Vào: {formatTime(record.checkin_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    {record.is_late ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Muộn
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Đúng giờ
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentHeadDashboard;
