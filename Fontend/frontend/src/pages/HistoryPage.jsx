import React, { useState, useEffect } from "react";
import { useAuth } from "../../../frontend/src/contexts/AuthContext";
import { attendanceService } from "../service/attendance.service";
import { Calendar, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { formatDate, formatTime } from "../until/helper";

const HistoryPage = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
  });
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [pagination.page, filters]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      };

      const response = await attendanceService.getHistory(params);
      console.log("History response:", response);

      if (response.success) {
        setRecords(response.data);
        setPagination(response.pagination);
      } else {
        console.log("Response not successful:", response);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
      console.error("Error details:", error.response);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getWorkStatusBadge = (status) => {
    const styles = {
      ON_TIME: "bg-green-100 text-green-800",
      LATE: "bg-yellow-100 text-yellow-800",
      ABSENT: "bg-red-100 text-red-800",
    };

    const statusLabels = {
      ON_TIME: "Đúng giờ",
      LATE: "Đi muộn",
      ABSENT: "Vắng mặt",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {statusLabels[status] || status}
      </span>
    );
  };

  return (
   <div className="space-y-6 p-4 sm:p-6">
    {/* Header */}
    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
      Lịch sử chấm công
    </h1>

    {/* Filters */}
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-4">Bộ lọc</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Từ ngày
          </label>
          <input
            type="date"
            name="from_date"
            value={filters.from_date}
            onChange={handleFilterChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Đến ngày
          </label>
          <input
            type="date"
            name="to_date"
            value={filters.to_date}
            onChange={handleFilterChange}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>

    {/* Records */}
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {loading ? (
        <div className="p-8 text-center">Đang tải...</div>
      ) : records.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          Không có dữ liệu chấm công
        </div>
      ) : (
        <>
          {/* ===== DESKTOP TABLE ===== */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Ngày
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Ca
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Check-in
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Check-out
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      {formatDate(r.day)}
                    </td>
                    <td className="px-6 py-4">{r.shift_name || "-"}</td>
                    <td className="px-6 py-4">
                      {r.checkin_time ? formatTime(r.checkin_time) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {r.checkout_time ? formatTime(r.checkout_time) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {r.work_status && getWorkStatusBadge(r.work_status)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== MOBILE CARD ===== */}
          <div className="lg:hidden divide-y">
            {records.map((r) => (
              <div key={r.id} className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {formatDate(r.day)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.shift_name || "Không ca"}
                    </p>
                  </div>
                  {r.work_status && getWorkStatusBadge(r.work_status)}
                </div>

                <div className="text-sm text-gray-600">
                  <p>Check-in: {r.checkin_time ? formatTime(r.checkin_time) : "-"}</p>
                  <p>Check-out: {r.checkout_time ? formatTime(r.checkout_time) : "-"}</p>
                </div>

                <button
                  onClick={() => setSelectedRecord(r)}
                  className="w-full mt-2 text-blue-600 border border-blue-600 rounded-lg py-2 text-sm hover:bg-blue-50"
                >
                  Xem chi tiết
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between border-t">
            <div className="text-sm text-gray-700">
              Hiển thị {(pagination.page - 1) * pagination.limit + 1} –{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} /{" "}
              {pagination.total}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 border rounded disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === pagination.total_pages ||
                    Math.abs(p - pagination.page) <= 1,
                )
                .map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i - 1] !== p - 1 && <span>…</span>}
                    <button
                      onClick={() => handlePageChange(p)}
                      className={`px-3 py-2 border rounded ${
                        pagination.page === p
                          ? "bg-blue-600 text-white"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.total_pages}
                className="px-3 py-2 border rounded disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Chi tiết chấm công</h2>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Ngày</p>
                    <p className="font-medium">
                      {formatDate(selectedRecord.day)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ca làm việc</p>
                    <p className="font-medium">
                      {selectedRecord.shift_name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Trạng thái</p>
                    {selectedRecord.work_status &&
                      getWorkStatusBadge(selectedRecord.work_status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Check-in */}
                  {selectedRecord.checkin_time && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Check-in</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {formatTime(selectedRecord.checkin_time)}
                      </p>
                      {selectedRecord.checkin_image && (
                        <img
                          src={selectedRecord.checkin_image}
                          alt="Check-in"
                          className="w-full h-64 object-cover rounded cursor-pointer hover:opacity-80 transition"
                          onClick={() => setViewingImage(selectedRecord.checkin_image)}
                        />
                      )}
                      {selectedRecord.checkin_address && (
                        <p className="text-sm text-gray-600 mt-2">
                          📍 {selectedRecord.checkin_address}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Check-out */}
                  {selectedRecord.checkout_time && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2">Check-out</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {formatTime(selectedRecord.checkout_time)}
                      </p>
                      {selectedRecord.checkout_image && (
                        <img
                          src={selectedRecord.checkout_image}
                          alt="Check-out"
                          className="w-full h-64 object-cover rounded cursor-pointer hover:opacity-80 transition"
                          onClick={() => setViewingImage(selectedRecord.checkout_image)}
                        />
                      )}
                      {selectedRecord.checkout_address && (
                        <p className="text-sm text-gray-600 mt-2">
                          📍 {selectedRecord.checkout_address}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
          >
            ✕
          </button>
          <img
            src={viewingImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
