import React, { useState, useEffect } from "react";
import { useAuth } from "../../../frontend/src/contexts/AuthContext";
import CheckInForm from "../components/Attendance/CheckInForm";
import { attendanceService } from "../service/attendance.service";
import CheckOutForm from "../components/Attendance/CheckOutForm";
import { CheckCircle, Clock } from "lucide-react";
import { formatDateTime } from "../until/helper";

const AttendancePage = () => {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodayAttendance();
  }, []);

  const loadTodayAttendance = async () => {
    try {
      const response = await attendanceService.getTodayAttendance();
      if (response.success) {
        setTodayAttendance(response.data);
      }
    } catch (error) {
      console.error("Failed to load today attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSuccess = (data) => {
    setTodayAttendance(data);
    alert("Check-in thành công!");
  };

  const handleCheckOutSuccess = (data) => {
    setTodayAttendance(data);
    alert("Check-out thành công!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Chấm công</h1>

        {/* Today's status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Trạng thái hôm nay</h2>
          {todayAttendance ? (
            <div className="space-y-2">
              {todayAttendance.checkin_time && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle size={20} />
                  <span>
                    Đã check-in lúc{" "}
                    {formatDateTime(todayAttendance.checkin_time)}
                  </span>
                </div>
              )}
              {todayAttendance.checkout_time && (
                <div className="flex items-center gap-2 text-blue-600">
                  <CheckCircle size={20} />
                  <span>
                    Đã check-out lúc{" "}
                    {formatDateTime(todayAttendance.checkout_time)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <Clock size={20} />
              <span>Chưa check-in hôm nay</span>
            </div>
          )}
        </div>

        {/* Check-in/out form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!todayAttendance?.checkin_time && (
            <CheckInForm onSuccess={handleCheckInSuccess} />
          )}
          {todayAttendance?.checkin_time && !todayAttendance?.checkout_time && (
            <CheckOutForm onSuccess={handleCheckOutSuccess} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;
