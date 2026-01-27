import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { attendanceService } from "../../service/attendance.service";
import { 
  Clock, 
  Calendar, 
  CheckCircle, 
  LogOut, 
  User, 
  Briefcase, 
  MapPin, 
  Loader2 
} from "lucide-react";
import { formatDateTime } from "../../until/helper";

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

  const currentDate = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 opacity-10">
          <Clock size={200} />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Xin chào, {user?.name}!
          </h1>
          <p className="text-blue-100 text-lg flex items-center gap-2">
            <Calendar size={18} />
            {currentDate}
          </p>
        </div>
      </div>

      {/* 2. Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Trạng thái</p>
              <p className={`text-2xl font-bold mt-2 ${todayAttendance?.checkin_time ? 'text-green-600' : 'text-gray-700'}`}>
                {todayAttendance?.checkin_time ? "Đã Check-in" : "Chưa Check-in"}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${todayAttendance?.checkin_time ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
              <Briefcase size={24} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
             Cập nhật lần cuối: {new Date().toLocaleTimeString('vi-VN')}
          </div>
        </div>

        {/* Check-in Time Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Giờ vào</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">
                {todayAttendance?.checkin_time
                  ? new Date(todayAttendance.checkin_time).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <CheckCircle size={24} />
            </div>
          </div>
          {todayAttendance?.checkin_time && (
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-1 text-xs text-green-600 font-medium">
               <CheckCircle size={12} /> Ghi nhận thành công
            </div>
          )}
        </div>

        {/* Check-out Time Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Giờ ra</p>
              <p className="text-2xl font-bold mt-2 text-gray-900">
                {todayAttendance?.checkout_time
                  ? new Date(todayAttendance.checkout_time).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
              <LogOut size={24} />
            </div>
          </div>
          {todayAttendance?.checkout_time && (
             <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-1 text-xs text-orange-600 font-medium">
               <CheckCircle size={12} /> Đã kết thúc ca
            </div>
          )}
        </div>
      </div>

      {/* 3. Today's Details Section */}
      {todayAttendance && (todayAttendance.checkin_time || todayAttendance.checkout_time) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <User className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Chi tiết hình ảnh chấm công</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Check-in Detail */}
            <div className={`space-y-4 ${!todayAttendance.checkin_time ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">IN</div>
                <div>
                   <h3 className="font-bold text-gray-700">Check-in</h3>
                   <p className="text-xs text-gray-500">
                     {todayAttendance.checkin_time ? formatDateTime(todayAttendance.checkin_time) : 'Chưa ghi nhận'}
                   </p>
                </div>
              </div>
              
              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative group">
                {todayAttendance.checkin_image ? (
                  <img
                    src={`/uploads/${todayAttendance.checkin_image}`}
                    alt="Check-in Evidence"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No image available
                  </div>
                )}
                {todayAttendance.checkin_time && (
                   <div className="absolute bottom-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                     VERIFIED
                   </div>
                )}
              </div>
            </div>

            {/* Check-out Detail */}
            <div className={`space-y-4 ${!todayAttendance.checkout_time ? 'opacity-50 grayscale' : ''}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">OUT</div>
                <div>
                   <h3 className="font-bold text-gray-700">Check-out</h3>
                   <p className="text-xs text-gray-500">
                     {todayAttendance.checkout_time ? formatDateTime(todayAttendance.checkout_time) : 'Chưa ghi nhận'}
                   </p>
                </div>
              </div>

              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative group">
                {todayAttendance.checkout_image ? (
                  <img
                    src={`/uploads/${todayAttendance.checkout_image}`}
                    alt="Check-out Evidence"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No image available
                  </div>
                )}
                 {todayAttendance.checkout_time && (
                   <div className="absolute bottom-3 right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                     VERIFIED
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
