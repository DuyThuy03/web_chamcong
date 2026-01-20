import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../service/api";
import { formatDate, formatTime } from "../../until/helper";

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
  <div className="p-4 sm:p-6 space-y-6 bg-gray-50 min-h-screen">
    {/* Header */}
    <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Dashboard Trưởng Phòng
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Xin chào, <span className="font-semibold">{user?.name || "Trưởng phòng"}</span>
        </p>
        <p className="text-xs text-gray-500">
          Phòng ban: {user?.department_name || "N/A"}
        </p>
      </div>
    </div>

    {/* Statistics */}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {[
        {
          label: "Tổng nhân viên",
          value: stats.totalEmployees,
          color: "blue",
        },
        {
          label: "Có mặt",
          value: stats.presentToday,
          color: "green",
        },
        {
          label: "Chưa có mặt",
          value: stats.totalEmployees - stats.presentToday,
          color: "gray",
        },
        {
          label: "Đi muộn",
          value: stats.lateToday,
          color: "yellow",
        },
        {
          label: "Đơn chờ duyệt",
          value: stats.pendingLeaves,
          color: "purple",
        },
      ].map((item, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-4"
        >
          <p className="text-xs text-gray-500">{item.label}</p>
          <p className={`text-2xl font-bold text-${item.color}-600 mt-1`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>

    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Leave Requests */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Đơn nghỉ chờ duyệt
        </h2>

        {pendingLeaveRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            Không có đơn nào
          </p>
        ) : (
          <div className="space-y-4">
            {pendingLeaveRequests.map((leave) => (
              <div
                key={leave.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {leave.user_name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatDate(leave.from_date)} → {formatDate(leave.to_date)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {leave.reason}
                    </p>
                  </div>

                  <span className="px-3 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 whitespace-nowrap">
                    Chờ duyệt
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleApproveLeave(leave.id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-md text-sm"
                  >
                    Duyệt
                  </button>
                  <button
                    onClick={() => handleRejectLeave(leave.id)}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-md text-sm"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          Chấm công hôm nay
        </h2>

        {departmentAttendance.length === 0 ? (
          <p className="text-gray-500 text-center py-6">
            Chưa có dữ liệu
          </p>
        ) : (
          <div className="divide-y">
            {departmentAttendance.map((r, i) => (
              <div
                key={i}
                className="py-3 flex justify-between items-start"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {r.user_name}
                  </p>
                  <p className="text-xs text-gray-600">
                    Vào: {r.checkin_time ? formatTime(r.checkin_time) : "Chưa"} | Ra:{" "}
                    {r.checkout_time ? formatTime(r.checkout_time) : "Chưa"}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 text-xs rounded-full ${
                    r.is_late
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
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
