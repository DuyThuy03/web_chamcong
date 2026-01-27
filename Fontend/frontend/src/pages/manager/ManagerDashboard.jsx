import { useEffect, useState } from "react";
import { Calendar, Building2, Loader2 } from "lucide-react";
import api from "../../service/api";

export default function ManagerDashboard() {
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [department, setDepartment] = useState("ALL");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = { month };
      const res = await api.get(
        "/manager/attendance/monthly-summary",
        { params }
      );
      setData(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [month]);

  const filteredData =
    department === "ALL"
      ? data
      : data.filter((d) => d.department_name === department);

  const departments = [
    "ALL",
    ...new Set(data.map((d) => d.department_name)),
  ];

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-4 transition-colors duration-200">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 border border-[var(--border-color)] shadow-sm rounded-lg transition-colors">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] uppercase tracking-tight">
            Tổng hợp chấm công
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Thống kê chi tiết chấm công nhân viên theo tháng
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-blue-500 transition-colors" />
            </div>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-base sm:text-sm rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all dark:[color-scheme:dark] appearance-none"
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building2 className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-blue-500 transition-colors" />
            </div>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="block w-full pl-9 pr-9 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-base sm:text-sm rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none transition-all cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "ALL" ? "Tất cả phòng ban" : d}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2" />
          <p className="text-sm font-medium">Đang tải dữ liệu...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-center px-4">
          <div className="w-12 h-12 bg-[var(--bg-primary)] flex items-center justify-center mb-3 rounded-md">
            <Calendar className="w-6 h-6 text-[var(--text-secondary)]" />
          </div>
          <h3 className="text-base font-medium text-[var(--text-primary)]">Không có dữ liệu</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-sm">
            Không tìm thấy dữ liệu chấm công cho tháng và phòng ban đã chọn.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--bg-primary)] text-[var(--text-primary)] font-semibold border-b border-[var(--border-color)] uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3 border-r border-[var(--border-color)]">Nhân viên</th>
                    <th className="px-4 py-3 border-r border-[var(--border-color)]">Phòng ban</th>
                    <th className="px-4 py-3 text-center border-r border-[var(--border-color)]">Ngày làm</th>
                    <th className="px-4 py-3 text-center border-r border-[var(--border-color)]">Nghỉ phép</th>
                    <th className="px-4 py-3 text-center border-r border-[var(--border-color)]">Nghỉ KP</th>
                    <th className="px-4 py-3 text-center">Đi trễ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredData.map((item) => (
                    <tr
                      key={item.user_id}
                      className="hover:bg-[var(--bg-primary)] transition-colors duration-150"
                    >
                      <td className="px-4 py-3 border-r border-[var(--border-color)]">
                        <div className="font-semibold text-[var(--text-primary)]">{item.user_name}</div>
                      </td>
                      <td className="px-4 py-3 border-r border-[var(--border-color)]">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md">
                          {item.department_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-[var(--border-color)]">
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {item.working_days}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-[var(--border-color)]">
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {item.leave_days}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-r border-[var(--border-color)]">
                        {item.absent_days > 0 ? (
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {item.absent_days}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)] opacity-50">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                         {item.late_days > 0 ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                             {item.late_days}
                          </span>
                        ) : (
                           <span className="text-[var(--text-secondary)] opacity-50">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredData.map((item) => (
              <div
                key={item.user_id}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 space-y-3 hover:shadow-md transition-all rounded-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-base uppercase">{item.user_name}</h3>
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md">
                      {item.department_name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {item.working_days}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase">Công</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-color)]">
                  <div className="flex flex-col items-center p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium mb-1 uppercase">Phép</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{item.leave_days}</span>
                  </div>
                  <div className="flex flex-col items-center p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium mb-1 uppercase">KP</span>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">{item.absent_days}</span>
                  </div>
                  <div className="flex flex-col items-center p-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium mb-1 uppercase">Trễ</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{item.late_days}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
