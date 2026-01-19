import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../service/api";
import { formatDate, formatTime } from "../until/helper";

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
  if (!user) return;
  fetchDashboardData();
}, [user]);
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch department users
      const usersRes = await api.get("/users");
      let totalEmployees = 0;
      if (usersRes.data.success) {
        const deptUsers = usersRes.data.data.filter(
          (u) => u.department_id === user?.department_id,
        );
        totalEmployees = deptUsers.length;
        setStats((prev) => ({ ...prev, totalEmployees }));
      }

      // Fetch today's attendance data
      const dashboardRes = await api.get("/manager/attendance/today");
      if (dashboardRes.data.success) {
        const data = dashboardRes.data.data;
        const presentToday = data.filter(
          (record) => record.checkin_image && record.checkin_time,
        ).length;
        const lateToday = data.filter(
          (record) => record.work_status === "LATE",
        ).length;
        const departmentAttendance = data
          .filter((record) => record.checkin_image && record.checkin_time) // Filter only checked-in employees
          .map((record) => ({
            user_name: record.user_name,
            checkin_time: record.checkin_time,
            checkout_time: record.checkout_time,
            checkin_image: record.checkin_image,
            is_late: record.work_status === "LATE",
          }));

        setStats((prev) => ({
          ...prev,
          totalEmployees: totalEmployees,
          presentToday: presentToday,
          lateToday: lateToday,
        }));
        setDepartmentAttendance(departmentAttendance);
      }

      // Fetch leave requests
      const leaveRes = await api.get("/leaves");
      
      const responseData = leaveRes.data ;
 
console.log("tầng 2", responseData)
      if (responseData.success ) {
       
        const pending = responseData.data.requests.filter((l) => {
          
          return l.status === "CHO_DUYET";
        });
        
        setPendingLeaveRequests(pending.slice(0, 5));
        setStats((prev) => ({ ...prev, pendingLeaves: pending.length }));
      } else {
        console.log("Success is false or undefined or requests is missing");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      await api.put(`/leaves/${leaveId}/approve`);
      alert("Đã duyệt đơn nghỉ phép");
      fetchDashboardData();
    } catch (error) {
      console.error("Error approving leave:", error);
      alert("Có lỗi xảy ra khi duyệt đơn");
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      await api.put(`/leaves/${leaveId}/reject`);
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

  // const formatTime = (dateString) => {
  //   return new Date(dateString).toLocaleTimeString("vi-VN", {
  //     hour: "2-digit",
  //     minute: "2-digit",
  //   });
  // };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Tổng nhân viên */}
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

        {/* Có mặt hôm nay */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Có mặt</p>
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

        {/* Chưa có mặt hôm nay */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Chưa có mặt</p>
              <p className="text-3xl font-bold text-gray-600 mt-2">
                {stats.totalEmployees && stats.presentToday !== undefined
                  ? stats.totalEmployees - stats.presentToday
                  : "0"}
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-full">
              <svg
                className="w-8 h-8 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Đi muộn hôm nay */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Đi muộn</p>
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

        {/* Đơn chờ duyệt */}
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

      {/* Content Grid */}
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
                        {formatDate(leave.from_date)} -{" "}
                        {formatDate(leave.to_date)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {leave.reason }
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      {leave.status == "CHO_DUYET" ? "Chờ duyệt" : leave.status
                      }
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
                      Vào:{" "}
                      {record.checkin_time
                        ? formatTime(record.checkin_time)
                        : "Chưa check-in"}
                      <br />
                      Ra:{" "}
                      {record.checkout_time
                        ? formatTime(record.checkout_time)
                        : "Chưa check-out"}
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
