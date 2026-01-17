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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Lịch sử chấm công</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Bộ lọc</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Từ ngày
            </label>
            <input
              type="date"
              name="from_date"
              value={filters.from_date}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Đến ngày
            </label>
            <input
              type="date"
              name="to_date"
              value={filters.to_date}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Records table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Đang tải...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Không có dữ liệu chấm công
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ca làm việc
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-in
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar size={16} className="mr-2 text-gray-400" />
                          {formatDate(record.day)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.shift_name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.checkin_time
                          ? formatTime(record.checkin_time)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.checkout_time
                          ? formatTime(record.checkout_time)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.work_status &&
                          getWorkStatusBadge(record.work_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRecord(record)}
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

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Hiển thị {(pagination.page - 1) * pagination.limit + 1} -{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                trong tổng số {pagination.total} bản ghi
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Trước
                </button>
                <div className="flex items-center gap-2">
                  {Array.from(
                    { length: pagination.total_pages },
                    (_, i) => i + 1,
                  )
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === pagination.total_pages ||
                        Math.abs(page - pagination.page) <= 1
                      );
                    })
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-4 py-2 border rounded-md ${
                            pagination.page === page
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-gray-300 hover:bg-gray-100"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}
                </div>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.total_pages}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Sau
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
