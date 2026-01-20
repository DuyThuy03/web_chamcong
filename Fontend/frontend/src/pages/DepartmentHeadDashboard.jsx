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
      
      const responseData = leaveRes.data;
 
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
  <div className="p-4 sm:p-6">
    {/* Header */}
    <div className="mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
        Dashboard Trưởng Phòng
      </h1>
      <p className="text-sm sm:text-base text-gray-600 mt-1">
        Xin chào, {user?.name || "Trưởng phòng"}!
      </p>
      <p className="text-xs sm:text-sm text-gray-500">
        Phòng ban: {user?.department_name || "N/A"}
      </p>
    </div>

    {/* Statistics Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
      {/* Tổng nhân viên */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-gray-500">Tổng nhân viên</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">
              {stats.totalEmployees}
            </p>
          </div>
          <div className="bg-blue-100 p-2 sm:p-3 rounded-full">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Có mặt */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-gray-500">Có mặt</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">
              {stats.presentToday}
            </p>
          </div>
          <div className="bg-green-100 p-2 sm:p-3 rounded-full">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Chưa có mặt */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-gray-500">Chưa có mặt</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-600 mt-1">
              {stats.totalEmployees - stats.presentToday}
            </p>
          </div>
          <div className="bg-gray-100 p-2 sm:p-3 rounded-full">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 18.364L5.636 5.636" />
            </svg>
          </div>
        </div>
      </div>

      {/* Đi muộn */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-gray-500">Đi muộn</p>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600 mt-1">
              {stats.lateToday}
            </p>
          </div>
          <div className="bg-yellow-100 p-2 sm:p-3 rounded-full">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Đơn chờ duyệt */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm text-gray-500">Đơn chờ duyệt</p>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600 mt-1">
              {stats.pendingLeaves}
            </p>
          </div>
          <div className="bg-purple-100 p-2 sm:p-3 rounded-full">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    {/* Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Đơn nghỉ */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
          Đơn nghỉ chờ duyệt
        </h2>

        {pendingLeaveRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Không có đơn nào</p>
        ) : (
          <div className="space-y-4">
            {pendingLeaveRequests.map((leave) => (
              <div key={leave.id} className="border rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold">{leave.user_name}</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {formatDate(leave.from_date)} - {formatDate(leave.to_date)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {leave.reason}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                    Chờ duyệt
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <button
                    onClick={() => handleApproveLeave(leave.id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded text-sm"
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => handleRejectLeave(leave.id)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded text-sm"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chấm công */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
          Chấm công hôm nay
        </h2>

        {departmentAttendance.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Chưa có dữ liệu</p>
        ) : (
          <div className="space-y-3">
            {departmentAttendance.map((r, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{r.user_name}</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Vào: {r.checkin_time ? formatTime(r.checkin_time) : "Chưa"} <br />
                    Ra: {r.checkout_time ? formatTime(r.checkout_time) : "Chưa"}
                  </p>
                </div>
                <span className={`self-start sm:self-center px-2 py-1 text-xs rounded-full ${
                  r.is_late
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}>
                  {r.is_late ? "Muộn" : "Đúng giờ"}
                </span>
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
