import React, { useEffect, useState } from "react";
import { useAuth } from "../../../frontend/src/contexts/AuthContext";
import { attendanceService } from "../service/attendance.service";
import { Clock, Calendar, TrendingUp, CheckCircle } from "lucide-react";
import { formatDateTime } from "../until/helper";

const DashboardPage = () => {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await attendanceService.getTodayAttendance();
      if (response.success) {
        setTodayAttendance(response.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Xin chào, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          {new Date().toLocaleDateString("vi-VN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Trạng thái hôm nay</p>
              <p className="text-2xl font-bold mt-1">
                {todayAttendance?.checkin_time
                  ? "Đã check-in"
                  : "Chưa check-in"}
              </p>
            </div>
            <Clock className="text-blue-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Check-in</p>
              <p className="text-2xl font-bold mt-1">
                {todayAttendance?.checkin_time
                  ? new Date(todayAttendance.checkin_time).toLocaleTimeString(
                      "vi-VN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : "--:--"}
              </p>
            </div>
            <CheckCircle className="text-green-500" size={40} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Check-out</p>
              <p className="text-2xl font-bold mt-1">
                {todayAttendance?.checkout_time
                  ? new Date(todayAttendance.checkout_time).toLocaleTimeString(
                      "vi-VN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : "--:--"}
              </p>
            </div>
            <Calendar className="text-purple-500" size={40} />
          </div>
        </div>
      </div>

      {/* Today's attendance detail */}
      {todayAttendance && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Chi tiết chấm công hôm nay</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {todayAttendance.checkin_time && (
              <div>
                <h3 className="font-semibold mb-2">Check-in</h3>
                <p className="text-sm text-gray-600">
                  Thời gian: {formatDateTime(todayAttendance.checkin_time)}
                </p>
                {todayAttendance.checkin_image && (
                  <img
                    src={`/uploads/${todayAttendance.checkin_image}`}
                    alt="Check-in"
                    className="mt-2 w-full h-48 object-cover rounded"
                  />
                )}
              </div>
            )}
            {todayAttendance.checkout_time && (
              <div>
                <h3 className="font-semibold mb-2">Check-out</h3>
                <p className="text-sm text-gray-600">
                  Thời gian: {formatDateTime(todayAttendance.checkout_time)}
                </p>
                {todayAttendance.checkout_image && (
                  <img
                    src={`/uploads/${todayAttendance.checkout_image}`}
                    alt="Check-out"
                    className="mt-2 w-full h-48 object-cover rounded"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
