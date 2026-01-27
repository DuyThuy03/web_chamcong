import React, { useState, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  User,
  Filter,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { formatDate, formatTime } from "../../until/helper";
import api from "../../service/api";
import { wsService } from "../../service/ws";
import { useAuth } from "../../contexts/AuthContext";
import { isInDateRange } from "../../until/helper";

const HistoryPage = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // WebSocket - Check-in
  useEffect(() => {
    if (!user) return;

    const handleCheckin = (data) => {
      if (!isInDateRange(data, filters)) return;

      setRecords((prev) => {
        const exists = prev.some((r) => r.id === data.id);
        if (exists) return prev;

        if (pagination.page === 1) {
          return [data, ...prev.slice(0, pagination.limit - 1)];
        }

        return prev;
      });

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

  // WebSocket - Check-out
  useEffect(() => {
    if (!user) return;

    const handleCheckout = (data) => {
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
        }),
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
      ON_TIME: {
        label: "Đúng giờ",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      },
      LATE: {
        label: "Đi muộn",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        icon: AlertCircle,
      },
      ABSENT: {
        label: "Vắng mặt",
        color: "bg-rose-50 text-rose-700 border-rose-200",
        icon: XCircle,
      },
    };

    if (!map[status]) return null;

    const { label, color, icon: Icon } = map[status];

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${color}`}
      >
        <Icon size={14} />
        {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-10 transition-colors duration-200">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 md:px-8 py-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            <Clock className="text-blue-600" size={32} />
            Lịch sử chấm công
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
            Xem lịch sử chấm công của nhân viên trong phòng ban
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Filter Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] p-6 transition-colors duration-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Bộ lọc</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                <Calendar size={14} className="inline mr-1" />
                Từ ngày
              </label>
              <input
                type="date"
                name="from_date"
                value={filters.from_date}
                onChange={handleFilterChange}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-base sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar size={14} className="inline mr-1" />
                Đến ngày
              </label>
              <input
                type="date"
                name="to_date"
                value={filters.to_date}
                onChange={handleFilterChange}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-base sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                <User size={14} className="inline mr-1" />
                Tên nhân viên
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                />
                <input
                  type="text"
                  name="user_name"
                  placeholder="Nhập tên..."
                  value={filters.user_name}
                  onChange={handleFilterChange}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors duration-200">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-[var(--text-secondary)] font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <Clock size={48} className="mx-auto text-[var(--text-secondary)] mb-3 opacity-50" />
              <p className="text-[var(--text-secondary)] font-medium">Không có dữ liệu</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1 opacity-70">
                Thử điều chỉnh bộ lọc để xem kết quả khác
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                    <tr>
                      {[
                        "Ngày",
                        "Nhân viên",
                        "Ca làm việc",
                        "Check-in",
                        "Check-out",
                        "Trạng thái",
                        "Ảnh CI",
                        "Ảnh CO",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border-color)]">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <Calendar size={14} className="text-[var(--text-secondary)]" />
                            <span className="font-medium text-[var(--text-primary)]">{formatDate(r.day)}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs shadow-sm">
                              {r.user_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">
                              {r.user_name}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                          {r.shift_name || "-"}
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {r.checkin_time ? (
                            <span className="font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                              {formatTime(r.checkin_time)}
                            </span>
                          ) : (
                            <span className="text-[var(--text-secondary)] opacity-50">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {r.checkout_time ? (
                            <span className="font-mono font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                              {formatTime(r.checkout_time)}
                            </span>
                          ) : (
                            <span className="text-[var(--text-secondary)] opacity-50">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {getWorkStatusBadge(r.work_status)}
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {r.checkin_image ? (
                            <button
                              onClick={() => handleViewImage(r.checkin_image)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              <Eye size={14} />
                              Xem
                            </button>
                          ) : (
                            <span className="text-[var(--text-secondary)] opacity-50">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {r.checkout_image ? (
                            <button
                              onClick={() => handleViewImage(r.checkout_image)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              <Eye size={14} />
                              Xem
                            </button>
                          ) : (
                            <span className="text-[var(--text-secondary)] opacity-50">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-[var(--border-color)]">
                {records.map((r) => (
                  <div key={r.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-bold shadow-sm">
                          {r.user_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-primary)]">{r.user_name}</p>
                          <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                            <Calendar size={12} />
                            {formatDate(r.day)}
                          </p>
                        </div>
                      </div>
                      {getWorkStatusBadge(r.work_status)}
                    </div>

                    <div className="bg-[var(--bg-primary)] rounded-xl p-3 space-y-2 text-sm border border-[var(--border-color)]">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Ca làm việc:</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {r.shift_name || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Check-in:</span>
                        {r.checkin_time ? (
                          <span className="font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-100">
                            {formatTime(r.checkin_time)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)] opacity-50">-</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Check-out:</span>
                        {r.checkout_time ? (
                          <span className="font-mono font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded text-xs border border-orange-100">
                            {formatTime(r.checkout_time)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)] opacity-50">-</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {r.checkin_image && (
                        <button
                          onClick={() => handleViewImage(r.checkin_image)}
                          className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye size={14} />
                          Ảnh Check-in
                        </button>
                      )}

                      {r.checkout_image && (
                        <button
                          onClick={() => handleViewImage(r.checkout_image)}
                          className="flex-1 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye size={14} />
                          Ảnh Check-out
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="bg-[var(--bg-primary)] px-6 py-4 border-t border-[var(--border-color)] flex flex-col sm:flex-row gap-3 justify-between items-center text-[var(--text-secondary)]">
                <p className="text-sm">
                  Hiển thị{" "}
                  <span className="font-bold text-[var(--text-primary)]">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-bold text-[var(--text-primary)]">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{" "}
                  trong tổng số{" "}
                  <span className="font-bold text-[var(--text-primary)]">{pagination.total}</span>{" "}
                  bản ghi
                </p>

                <div className="flex gap-2">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                    className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[var(--text-secondary)]"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === pagination.total_pages ||
                          Math.abs(p - pagination.page) <= 1,
                      )
                      .map((p, i, arr) => (
                        <React.Fragment key={p}>
                          {i > 0 && arr[i - 1] !== p - 1 && (
                            <span className="px-2 text-[var(--text-secondary)]">...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(p)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              p === pagination.page
                                ? "bg-blue-600 text-white shadow-sm"
                                : "border border-[var(--border-color)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)]"
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>

                  <button
                    disabled={pagination.page === pagination.total_pages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                    className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-[var(--text-secondary)]"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative bg-[var(--bg-secondary)] rounded-2xl w-full max-w-4xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-200 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-all"
            >
              <X size={24} />
            </button>

            <img
              src={viewingImage}
              alt="Check image"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
