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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Tổng hợp chấm công theo tháng
          </h1>
          <p className="text-sm text-gray-500">
            Xem thống kê chấm công nhân viên
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>

          <div className="relative">
            <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "ALL" ? "Tất cả phòng ban" : d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto bg-white rounded-xl shadow">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Nhân viên</th>
                  <th className="px-4 py-3">Phòng</th>
                  <th className="px-4 py-3">Ngày làm</th>
                  <th className="px-4 py-3">Nghỉ phép</th>
                  <th className="px-4 py-3">Nghỉ KP</th>
                  <th className="px-4 py-3">Đi trễ</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr
                    key={item.user_id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {item.user_name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.department_name}
                    </td>
                    <td className="px-4 py-3 text-center text-green-600">
                      {item.working_days}
                    </td>
                    <td className="px-4 py-3 text-center text-blue-600">
                      {item.leave_days}
                    </td>
                    <td className="px-4 py-3 text-center text-red-600">
                      {item.absent_days}
                    </td>
                    <td className="px-4 py-3 text-center text-yellow-600">
                      {item.late_days}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredData.map((item) => (
              <div
                key={item.user_id}
                className="bg-white rounded-xl shadow p-4 space-y-2"
              >
                <div className="font-semibold text-gray-800">
                  {item.user_name}
                </div>
                <div className="text-sm text-gray-500">
                  {item.department_name}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Ngày làm: <b>{item.working_days}</b></div>
                  <div>Nghỉ phép: <b>{item.leave_days}</b></div>
                  <div>Nghỉ KP: <b className="text-red-600">{item.absent_days}</b></div>
                  <div>Đi trễ: <b className="text-yellow-600">{item.late_days}</b></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
