import React, { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { formatDate, formatTime } from "../../until/helper";
import api from "../../service/api";
import { wsService } from "../../service/ws";
import { useAuth } from "../../contexts/AuthContext";
import {isInDateRange} from "../../until/helper";

const History = () => {
    const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  //   const [viewingImage, setViewingImage] = useState(null);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  });

  const [filters, setFilters] = useState({
    from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
    user_name: "",
  });

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);


  useEffect(() => {
    loadHistory();
    
  }, [pagination.page, filters]);

  //ws checkout
  useEffect(() => {
  if (!user) return;

  const handleCheckin = (data) => {
    // ❗ chỉ xử lý khi record thuộc filter hiện tại
    if (!isInDateRange(data, filters)) return;

    setRecords((prev) => {
      // tránh trùng record
      const exists = prev.some((r) => r.id === data.id);
      if (exists) return prev;

      // chỉ prepend khi đang ở page 1
      if (pagination.page === 1) {
        return [data, ...prev.slice(0, pagination.limit - 1)];
      }

      return prev;
    });

    // cập nhật tổng số bản ghi
    setPagination((prev) => ({
      ...prev,
      total: prev.total + 1,
    }));
  };

  wsService.on("ATTENDANCE_CHECKIN", handleCheckin);

  return () => {
    wsService.off("ATTENDANCE_CHECKIN", handleCheckin);
  };
}, [user, filters, pagination.page]);
//ws checkout
useEffect(() => {
  if (!user) return;

  const handleCheckout = (data) => {
    // data = record sau khi checkout

    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== data.id) return r;

        return {
          ...r,
          checkout_time: data.checkout_time,
          checkout_image: data.checkout_image,
          work_status: data.work_status ?? r.work_status,
          updated_at: data.updated_at,
        };
      })
    );
  };

  wsService.on("ATTENDANCE_CHECKOUT", handleCheckout);

  return () => {
    wsService.off("ATTENDANCE_CHECKOUT", handleCheckout);
  };
}, [user]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      }).toString();
      console.log("QUERY:", query);
      const response = await api.get(`/attendance/history?${query}`, {
        method: "GET",
        credentials: "include",
      });

      const data = response.data;
      console.log("History response:", data);

      if (data.success) {
        setRecords(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };
  //click xem image
  const handleViewImage = (imageUrl) => {
    console.log("Viewing image:", imageUrl);
    setViewingImage(imageUrl);
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getWorkStatusBadge = (status) => {
    const map = {
      ON_TIME: ["Đúng giờ", "bg-green-100 text-green-800"],
      LATE: ["Đi muộn", "bg-yellow-100 text-yellow-800"],
      ABSENT: ["Vắng mặt", "bg-red-100 text-red-800"],
    };

    if (!map[status]) return null;

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${map[status][1]}`}
      >
        {map[status][0]}
      </span>
    );
  };

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      <h1 className="text-xl font-bold text-gray-800 sm:text-3xl">
        Lịch sử chấm công
      </h1>

      {/* ===== FILTER ===== */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-6">
        <h2 className="text-base font-semibold mb-3 sm:text-lg sm:mb-4">
          Bộ lọc
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div>
            <label className="block text-xs mb-1 sm:text-sm">Từ ngày</label>
            <input
              type="date"
              name="from_date"
              value={filters.from_date}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 sm:text-sm">Đến ngày</label>
            <input
              type="date"
              name="to_date"
              value={filters.to_date}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 sm:text-sm">
              Tên nhân viên
            </label>
            <input
              type="text"
              name="user_name"
              placeholder="Nhập tên..."
              value={filters.user_name}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* ===== DATA ===== */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Đang tải...</div>
        ) : records.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Không có dữ liệu</div>
        ) : (
          <>
            {/* ===== DESKTOP TABLE ===== */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-[900px] w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Ngày",
                      "Nhân viên",
                      "Ca",
                      "Check-in",
                      "Check-out",
                      "Trạng thái",
                      "Ảnh CI",
                      "Ảnh CO",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y bg-white">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {formatDate(r.day)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.user_name}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.shift_name || "-"}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.checkin_time ? formatTime(r.checkin_time) : "-"}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.checkout_time ? formatTime(r.checkout_time) : "-"}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {getWorkStatusBadge(r.work_status)}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.checkin_image ? (
                          <button
                            onClick={() => handleViewImage(r.checkin_image)}
                            className="text-blue-600 hover:underline"
                          >
                            Xem
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.checkout_image ? (
                          <button
                            onClick={() => handleViewImage(r.checkout_image)}
                            className="text-blue-600 hover:underline"
                          >
                            Xem
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ===== MOBILE CARD VIEW ===== */}
            <div className="space-y-3 sm:hidden p-3">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="border rounded-lg p-3 shadow-sm space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{r.user_name}</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(r.day)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      <strong>Ca:</strong> {r.shift_name || "-"}
                    </div>
                    <div>
                      <strong>Check-in:</strong>{" "}
                      {r.checkin_time ? formatTime(r.checkin_time) : "-"}
                    </div>
                    <div>
                      <strong>Check-out:</strong>{" "}
                      {r.checkout_time ? formatTime(r.checkout_time) : "-"}
                    </div>
                  </div>

                  <div>{getWorkStatusBadge(r.work_status)}</div>

                  <div className="flex gap-4 text-xs">
                    {r.checkin_image && (
                      <button
                        onClick={() => handleViewImage(r.checkin_image)}
                        className="text-blue-600 underline"
                      >
                        Ảnh Check-in
                      </button>
                    )}

                    {r.checkout_image && (
                      <button
                        onClick={() => handleViewImage(r.checkout_image)}
                        className="text-blue-600 underline"
                      >
                        Ảnh Check-out
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ===== IMAGE MODAL ===== */}
            {viewingImage && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="relative bg-white rounded-lg w-full max-w-4xl p-3">
                  <button
                    onClick={() => setViewingImage(null)}
                    className="absolute top-2 right-2 text-gray-600 hover:text-black"
                  >
                    ✕
                  </button>

                  <img
                    src={viewingImage}
                    alt="Check image"
                    className="w-full max-h-[80vh] object-contain rounded"
                  />
                </div>
              </div>
            )}

            {/* ===== PAGINATION ===== */}
            <div className="p-4 flex flex-col gap-3 border-t sm:flex-row sm:justify-between sm:items-center">
              <span className="text-sm text-gray-600">
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                / {pagination.total}
              </span>

              <div className="flex gap-2 justify-end">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="p-2 disabled:opacity-30"
                >
                  <ChevronLeft />
                </button>

                <button
                  disabled={pagination.page === pagination.total_pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="p-2 disabled:opacity-30"
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};const HistoryPage = () => {
    const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  //   const [viewingImage, setViewingImage] = useState(null);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  });

  const [filters, setFilters] = useState({
    from_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to_date: new Date().toISOString().split("T")[0],
    user_name: "",
  });

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);


  useEffect(() => {
    loadHistory();
    
  }, [pagination.page, filters]);

  //ws checkout
  useEffect(() => {
  if (!user) return;

  const handleCheckin = (data) => {
    // ❗ chỉ xử lý khi record thuộc filter hiện tại
    if (!isInDateRange(data, filters)) return;

    setRecords((prev) => {
      // tránh trùng record
      const exists = prev.some((r) => r.id === data.id);
      if (exists) return prev;

      // chỉ prepend khi đang ở page 1
      if (pagination.page === 1) {
        return [data, ...prev.slice(0, pagination.limit - 1)];
      }

      return prev;
    });

    // cập nhật tổng số bản ghi
    setPagination((prev) => ({
      ...prev,
      total: prev.total + 1,
    }));
  };

  wsService.on("ATTENDANCE_CHECKIN", handleCheckin);

  return () => {
    wsService.off("ATTENDANCE_CHECKIN", handleCheckin);
  };
}, [user, filters, pagination.page]);
//ws checkout
useEffect(() => {
  if (!user) return;

  const handleCheckout = (data) => {
    // data = record sau khi checkout

    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== data.id) return r;

        return {
          ...r,
          checkout_time: data.checkout_time,
          checkout_image: data.checkout_image,
          work_status: data.work_status ?? r.work_status,
          updated_at: data.updated_at,
        };
      })
    );
  };

  wsService.on("ATTENDANCE_CHECKOUT", handleCheckout);

  return () => {
    wsService.off("ATTENDANCE_CHECKOUT", handleCheckout);
  };
}, [user]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      }).toString();
      console.log("QUERY:", query);
      const response = await api.get(`/attendance/history?${query}`, {
        method: "GET",
        credentials: "include",
      });

      const data = response.data;
      console.log("History response:", data);

      if (data.success) {
        setRecords(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };
  //click xem image
  const handleViewImage = (imageUrl) => {
    console.log("Viewing image:", imageUrl);
    setViewingImage(imageUrl);
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getWorkStatusBadge = (status) => {
    const map = {
      ON_TIME: ["Đúng giờ", "bg-green-100 text-green-800"],
      LATE: ["Đi muộn", "bg-yellow-100 text-yellow-800"],
      ABSENT: ["Vắng mặt", "bg-red-100 text-red-800"],
    };

    if (!map[status]) return null;

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${map[status][1]}`}
      >
        {map[status][0]}
      </span>
    );
  };

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      <h1 className="text-xl font-bold text-gray-800 sm:text-3xl">
        Lịch sử chấm công
      </h1>

      {/* ===== FILTER ===== */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-6">
        <h2 className="text-base font-semibold mb-3 sm:text-lg sm:mb-4">
          Bộ lọc
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div>
            <label className="block text-xs mb-1 sm:text-sm">Từ ngày</label>
            <input
              type="date"
              name="from_date"
              value={filters.from_date}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 sm:text-sm">Đến ngày</label>
            <input
              type="date"
              name="to_date"
              value={filters.to_date}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-xs mb-1 sm:text-sm">
              Tên nhân viên
            </label>
            <input
              type="text"
              name="user_name"
              placeholder="Nhập tên..."
              value={filters.user_name}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      {/* ===== DATA ===== */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Đang tải...</div>
        ) : records.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Không có dữ liệu</div>
        ) : (
          <>
            {/* ===== DESKTOP TABLE ===== */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-[900px] w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Ngày",
                      "Nhân viên",
                      "Ca",
                      "Check-in",
                      "Check-out",
                      "Trạng thái",
                      "Ảnh CI",
                      "Ảnh CO",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y bg-white">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {formatDate(r.day)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.user_name}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.shift_name || "-"}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.checkin_time ? formatTime(r.checkin_time) : "-"}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.checkout_time ? formatTime(r.checkout_time) : "-"}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {getWorkStatusBadge(r.work_status)}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.checkin_image ? (
                          <button
                            onClick={() => handleViewImage(r.checkin_image)}
                            className="text-blue-600 hover:underline"
                          >
                            Xem
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {r.checkout_image ? (
                          <button
                            onClick={() => handleViewImage(r.checkout_image)}
                            className="text-blue-600 hover:underline"
                          >
                            Xem
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ===== MOBILE CARD VIEW ===== */}
            <div className="space-y-3 sm:hidden p-3">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="border rounded-lg p-3 shadow-sm space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{r.user_name}</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(r.day)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      <strong>Ca:</strong> {r.shift_name || "-"}
                    </div>
                    <div>
                      <strong>Check-in:</strong>{" "}
                      {r.checkin_time ? formatTime(r.checkin_time) : "-"}
                    </div>
                    <div>
                      <strong>Check-out:</strong>{" "}
                      {r.checkout_time ? formatTime(r.checkout_time) : "-"}
                    </div>
                  </div>

                  <div>{getWorkStatusBadge(r.work_status)}</div>

                  <div className="flex gap-4 text-xs">
                    {r.checkin_image && (
                      <button
                        onClick={() => handleViewImage(r.checkin_image)}
                        className="text-blue-600 underline"
                      >
                        Ảnh Check-in
                      </button>
                    )}

                    {r.checkout_image && (
                      <button
                        onClick={() => handleViewImage(r.checkout_image)}
                        className="text-blue-600 underline"
                      >
                        Ảnh Check-out
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ===== IMAGE MODAL ===== */}
            {viewingImage && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="relative bg-white rounded-lg w-full max-w-4xl p-3">
                  <button
                    onClick={() => setViewingImage(null)}
                    className="absolute top-2 right-2 text-gray-600 hover:text-black"
                  >
                    ✕
                  </button>

                  <img
                    src={viewingImage}
                    alt="Check image"
                    className="w-full max-h-[80vh] object-contain rounded"
                  />
                </div>
              </div>
            )}

            {/* ===== PAGINATION ===== */}
            <div className="p-4 flex flex-col gap-3 border-t sm:flex-row sm:justify-between sm:items-center">
              <span className="text-sm text-gray-600">
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                / {pagination.total}
              </span>

              <div className="flex gap-2 justify-end">
                <button
                  disabled={pagination.page === 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="p-2 disabled:opacity-30"
                >
                  <ChevronLeft />
                </button>

                <button
                  disabled={pagination.page === pagination.total_pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="p-2 disabled:opacity-30"
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default History;
