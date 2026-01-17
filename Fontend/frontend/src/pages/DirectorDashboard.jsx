import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../service/api";

const DirectorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDepartments: 0,
    presentToday: 0,
    absentToday: 0,
    totalLateThisMonth: 0,
    avgWorkHours: 0,
  });
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [departmentPerformance, setDepartmentPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const usersRes = await api.get("/users");
      if (usersRes.data.success) {
        const users = usersRes.data.data || [];
        setStats((prev) => ({ ...prev, totalEmployees: users.length }));
      }

      // Fetch departments
      const deptRes = await api.get("/departments");
      if (deptRes.data.success) {
        const departments = deptRes.data.data || [];
        setStats((prev) => ({ ...prev, totalDepartments: departments.length }));

        // Calculate department performance
        const deptPerf = departments.map((dept) => ({
          name: dept.name,
          employeeCount: usersRes.data.data.filter(
            (u) => u.department_id === dept.id
          ).length,
          avgAttendance: Math.floor(Math.random() * 30) + 70, // Placeholder
        }));
        setDepartmentPerformance(deptPerf);
      }

      // Fetch today's attendance
      const attendanceRes = await api.get("/attendance/today");
      if (attendanceRes.data.success) {
        const todayRecords = attendanceRes.data.data || [];
        setStats((prev) => ({
          ...prev,
          presentToday: todayRecords.length,
          absentToday: stats.totalEmployees - todayRecords.length,
          totalLateThisMonth: todayRecords.filter((r) => r.is_late).length,
        }));
      }

      // Mock data for monthly attendance trend
      setMonthlyAttendance([
        { month: "T1", attendance: 95 },
        { month: "T2", attendance: 92 },
        { month: "T3", attendance: 94 },
        { month: "T4", attendance: 96 },
        { month: "T5", attendance: 93 },
        { month: "T6", attendance: 95 },
      ]);

      // Mock top performers
      setTopPerformers([
        { name: "Nguyễn Văn A", department: "IT", score: 98 },
        { name: "Trần Thị B", department: "HR", score: 97 },
        { name: "Lê Văn C", department: "Finance", score: 96 },
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Giám Đốc</h1>
        <p className="text-gray-600 mt-2">
          Xin chào, {user?.name || "Giám đốc"}!
        </p>
        <p className="text-sm text-gray-500">Tổng quan hoạt động công ty</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Phòng ban</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {stats.totalDepartments}
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
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
              <p className="text-gray-500 text-sm">Vắng mặt</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {stats.absentToday}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Đi muộn (tháng)</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {stats.totalLateThisMonth}
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
              <p className="text-gray-500 text-sm">TB giờ làm</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">8.5h</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <button
          onClick={() => navigate("/director/reports")}
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
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold">Báo cáo tổng hợp</h3>
        </button>

        <button
          onClick={() => navigate("/director/analytics")}
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-lg font-semibold">Phân tích dữ liệu</h3>
        </button>

        <button
          onClick={() => navigate("/director/departments")}
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="text-lg font-semibold">Quản lý phòng ban</h3>
        </button>

        <button
          onClick={() => navigate("/director/strategy")}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg shadow-md p-6 text-center transition-all duration-200"
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
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="text-lg font-semibold">Chiến lược</h3>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Performance */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Hiệu suất phòng ban
          </h2>
          {departmentPerformance.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-4">
              {departmentPerformance.map((dept, index) => (
                <div key={index} className="border-b pb-3">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{dept.name}</p>
                      <p className="text-sm text-gray-600">
                        {dept.employeeCount} nhân viên
                      </p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {dept.avgAttendance}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${dept.avgAttendance}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Nhân viên xuất sắc
          </h2>
          {topPerformers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 border-b pb-3"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {performer.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {performer.department}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg
                      className="w-5 h-5 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-bold text-gray-800">
                      {performer.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Attendance Trend */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Xu hướng chấm công 6 tháng
          </h2>
          <div className="flex items-end justify-around h-64 space-x-2">
            {monthlyAttendance.map((data, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-400"
                  style={{ height: `${data.attendance}%` }}
                ></div>
                <p className="text-sm font-semibold text-gray-700 mt-2">
                  {data.month}
                </p>
                <p className="text-xs text-gray-500">{data.attendance}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectorDashboard;
