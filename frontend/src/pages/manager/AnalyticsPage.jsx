import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { Calendar, Users, Briefcase, Clock, FileText, Ban, CheckCircle2 } from "lucide-react";
import api from "../../service/api";
import { useAuth } from "../../contexts/AuthContext";

const ManagerAnalyticsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summaryData, setSummaryData] = useState([]);
  const [leaveStats, setLeaveStats] = useState([]);

  // Chart Data States
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [workHoursDistribution, setWorkHoursDistribution] = useState([]);
  const [leaveDistribution, setLeaveDistribution] = useState([]);
  const [lateTrend, setLateTrend] = useState([]);

  useEffect(() => {
    if (user) {
        fetchAnalyticsData();
    }
  }, [user, month]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
     
        const summaryRes = await api.get("/manager/attendance/monthly-summary", {
            params: { month }
        });
        console.log("Dữ liệu chấm công (Manager)",summaryRes);    
        const leavesRes = await api.get("/leaves?limit=1000"); // Increase limit for manager
          
        if (summaryRes.data.success) {
            let data = summaryRes.data.data;
            setSummaryData(data);
            processAttendanceCharts(data);
        }
        console.log("leavesRes.data",leavesRes);    
        if (leavesRes.data.success) {
            let leaves = leavesRes.data.data.requests || [];
            const monthLeaves = leaves.filter(l => l.from_date.startsWith(month));
            processLeaveCharts(monthLeaves);
        }

    } catch (error) {
        console.error("Failed to fetch analytics:", error);
    } finally {
        setLoading(false);
    }
  };



  const processAttendanceCharts = (data) => {
    
    // Sort by work days, maybe add department usage if available
    const performance = data.map(u => ({
        name: u.user_name,
        department: u.department_name, // Include department if needed for tooltip or display
        work_days: u.total_work_days,
        ot_hours: u.total_ot_hours,
        late_days: u.late_days
    })).sort((a,b) => b.work_days - a.work_days);
    setWorkHoursDistribution(performance);

   
    const dailyStats = {};
    
    const [y, m] = month.split('-');
    const daysInMonth = new Date(y, m, 0).getDate();
    for(let i=1; i<=daysInMonth; i++) {
        const dayStr = `${month}-${String(i).padStart(2,'0')}`;
        dailyStats[dayStr] = { date: String(i), present: 0, late: 0, leave: 0, ot: 0 };
    }

    data.forEach(user => {
        if (user.daily_details) {
            Object.entries(user.daily_details).forEach(([date, detail]) => {
                if (dailyStats[date]) {
                    if (detail.work_unit > 0) dailyStats[date].present++;
                    if (detail.is_late === true) dailyStats[date].late++;
                    if (detail.is_paid_leave || detail.leave_type) dailyStats[date].leave++;
                   
                    dailyStats[date].ot += (detail.ot_hours_weighted || 0);
                }
            });
        }
    });
    setAttendanceTrend(Object.values(dailyStats));
  };

  const processLeaveCharts = (leaves) => {
    
      const statusCounts = { 'DA_DUYET': 0, 'TU_CHOI': 0, 'CHO_DUYET': 0, 'DA_HUY': 0 };
      leaves.forEach(l => {
          if (statusCounts[l.status] !== undefined) statusCounts[l.status]++;
      });
      
      const pieData = [
          { name: 'Đã duyệt', value: statusCounts['DA_DUYET'], color: '#10b981' },
          { name: 'Chờ duyệt', value: statusCounts['CHO_DUYET'], color: '#f59e0b' },
          { name: 'Từ chối', value: statusCounts['TU_CHOI'], color: '#ef4444' },
           { name: 'Đã hủy', value: statusCounts['DA_HUY'], color: '#9ca3af' },
      ].filter(d => d.value > 0);
      setLeaveDistribution(pieData);
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-4 pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)] shadow-sm">
        <div>
           <h1 className="text-2xl font-bold text-[var(--text-primary)] uppercase flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-md text-blue-500">
                    <Briefcase size={24} />
                </div>
                Báo cáo Thống kê Toàn Công ty
           </h1>
           <p className="text-sm text-[var(--text-secondary)] mt-1">
                Phân tích dữ liệu chấm công tháng {month}
           </p>
        </div>
        <div className="relative">
            <input 
                type="month" 
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="pl-4 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
        </div>
      </div>

      {loading ? (
          <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      ) : (
        <>
            {/* Top Row: Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Attendance Trend */}
                <div className="bg-[var(--bg-secondary)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">
                     <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                        <Users size={18} className="text-blue-500" />
                        Xu hướng nhân sự đi làm
                     </h3>
                     <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={attendanceTrend}>
                                <defs>
                                    <linearGradient id="colorPresentManager" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorLateManager" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                     <linearGradient id="colorLeaveManager" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" tick={{fontSize: 12}} />
                                <YAxis />
                                <Tooltip contentStyle={{backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)'}} />
                                <Legend />
                                <Area type="monotone" dataKey="present" name="Đi làm" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPresentManager)" />
                                <Area type="monotone" dataKey="late" name="Đi muộn" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLateManager)" />
                                <Area type="monotone" dataKey="leave" name="Nghỉ phép" stroke="#10b981" fillOpacity={1} fill="url(#colorLeaveManager)" />
                            </AreaChart>
                        </ResponsiveContainer>
                     </div>
                </div>

                {/* 2. OT Trend (Line) */}
                <div className="bg-[var(--bg-secondary)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">
                     <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                        <Clock size={18} className="text-orange-500" />
                        Tổng giờ tăng ca theo ngày
                     </h3>
                     <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={attendanceTrend}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" tick={{fontSize: 12}} />
                                <YAxis />
                                <Tooltip contentStyle={{backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)'}} />
                                <Legend />
                                <Line type="monotone" dataKey="ot" name="Giờ OT" stroke="#f97316" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                            </LineChart>
                        </ResponsiveContainer>
                     </div>
                </div>
            </div>

            {/* Middle Row: Employee Stats & Leaves */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 3. Employee Performance (Bar - Span 2 cols) */}
                <div className="lg:col-span-2 bg-[var(--bg-secondary)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                        <Briefcase size={18} className="text-emerald-500" />
                        Thống kê chi tiết nhân viên
                     </h3>
                     <div className="h-80 w-full overflow-x-auto">
                        <div className="min-w-[600px] h-full"> 
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={workHoursDistribution} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="name" tick={{fontSize: 11}} interval={0} angle={-15} textAnchor="end" height={60}/>
                                    <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#f97316" />
                                    <Tooltip contentStyle={{backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)'}} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="work_days" name="Ngày công" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar yAxisId="right" dataKey="ot_hours" name="Giờ OT" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                     </div>
                </div>

                {/* 4. Leave Status (Pie) */}
                <div className="bg-[var(--bg-secondary)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm flex flex-col items-center">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2 w-full">
                        <FileText size={18} className="text-purple-500" />
                        Tình trạng đơn nghỉ phép
                     </h3>
                     <div className="flex-1 w-full min-h-[250px] flex items-center justify-center relative">
                        {leaveDistribution.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={leaveDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {leaveDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)'}} />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center text-[var(--text-secondary)] opacity-50">
                                <Ban size={40} className="mb-2" />
                                <span>Không có dữ liệu</span>
                            </div>
                        )}
                        {/* Center Text */}
                         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-6 text-center pointer-events-none">
                             <div className="text-2xl font-bold text-[var(--text-primary)]">
                                {leaveDistribution.reduce((acc, curr) => acc + curr.value, 0)}
                             </div>
                             <div className="text-xs text-[var(--text-secondary)]">Tổng đơn</div>
                         </div>
                     </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default ManagerAnalyticsPage;
