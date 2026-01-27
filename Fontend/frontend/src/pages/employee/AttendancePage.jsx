import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { attendanceService } from "../../service/attendance.service";
import CheckInForm from "../../components/Attendance/CheckInForm";
import CheckOutForm from "../../components/Attendance/CheckOutForm";
import { Loader2, ArrowLeft, Clock, CalendarCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { formatDate, formatTime } from "../../until/helper";

const AttendancePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceStatus, setAttendanceStatus] = useState({
    checkedIn: false,
    checkedOut: false,
    data: null,
  });

  useEffect(() => {
    checkTodayStatus();
  }, []);

  const checkTodayStatus = async () => {
    try {
      setLoading(true);
      const response = await attendanceService.getTodayAttendance();
      if (response.success && response.data) {
        const { checkin_time, checkout_time } = response.data;
        setAttendanceStatus({
          checkedIn: !!checkin_time,
          checkedOut: !!checkout_time,
          data: response.data,
        });
      }
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    checkTodayStatus();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
           <Loader2 className="animate-spin text-blue-600" size={40} />
           <p className="text-slate-500 font-medium">Đang tải dữ liệu chấm công...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] font-sans pb-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* State 1: Chưa Check-in */}
        {!attendanceStatus.checkedIn && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <CheckInForm onSuccess={handleSuccess} />
          </div>
        )}

        {/* State 2: Đã Check-in, Chưa Check-out */}
        {attendanceStatus.checkedIn && !attendanceStatus.checkedOut && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CheckOutForm onSuccess={handleSuccess} checkInData={attendanceStatus.data} />
          </div>
        )}

        {/* State 3: Đã hoàn thành (Check-in & Check-out) */}
        {attendanceStatus.checkedIn && attendanceStatus.checkedOut && (
          <div className="max-w-lg mx-auto py-10 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm text-[var(--accent-color)]">
              <CalendarCheck size={40} />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 uppercase tracking-tight">Hoàn thành chấm công!</h2>
            <p className="text-[var(--text-secondary)] mb-8 max-w-xs mx-auto leading-relaxed text-sm">
              Bạn đã hoàn thành ca làm việc hôm nay. Chúc bạn có một thời gian nghỉ ngơi vui vẻ.
            </p>
            
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] overflow-hidden text-left transition-colors duration-300">
               <div className="p-3 bg-[var(--bg-primary)] border-b border-[var(--border-color)] font-bold text-[var(--text-primary)] text-center text-sm uppercase">
                  Tổng kết trong ngày
               </div>
               <div className="p-5 space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-[var(--border-color)]">
                     <span className="text-[var(--text-secondary)] text-sm font-medium">Giờ vào</span>
                     <span className="font-bold text-[var(--text-primary)] font-mono text-base">
                        {formatTime(attendanceStatus.data.checkin_time)}
                     </span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-[var(--text-secondary)] text-sm font-medium">Giờ ra</span>
                     <span className="font-bold text-[var(--text-primary)] font-mono text-base">
                        {formatTime(attendanceStatus.data.checkout_time)}
                     </span>
                  </div>
               </div>
               <div className="p-3 bg-[var(--bg-primary)] border-t border-[var(--border-color)]">
                   <Link 
                     to="/employee/dashboard"
                     className="block w-full py-2.5 bg-[var(--accent-color)] text-white font-bold rounded-md text-center transition-all hover:brightness-110 text-sm shadow-sm"
                     style={{ color: "#000" }}
                   >
                     Về trang chủ
                   </Link>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
