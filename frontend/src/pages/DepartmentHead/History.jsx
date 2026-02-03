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
  Briefcase
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
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-4 transition-colors duration-200">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 md:px-6 py-4 rounded-lg shadow-sm transition-colors duration-200">
        <div className="">
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
             <div className="p-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                <Clock className="text-[var(--accent-color)]" size={24} />
             </div>
            LỊCH SỬ CHẤM CÔNG
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 ml-12">
            Xem lịch sử chấm công của nhân viên trong phòng ban
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-0 py-0 space-y-4">
        {/* Filter Section */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] p-6 transition-colors duration-200">
          <div className="flex items-center gap-2 mb-4 border-b border-[var(--border-color)] pb-2 text-[var(--text-primary)] font-semibold">
            <Filter size={18} className="text-[var(--accent-color)]" />
            <h2 className="uppercase tracking-wider text-sm">Bộ lọc tìm kiếm</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide ml-1 mb-1 block">
                Từ ngày
              </label>
              <input
                type="date"
                name="from_date"
                value={filters.from_date}
                onChange={handleFilterChange}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-base sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition-all appearance-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide ml-1 mb-1 block">
                Đến ngày
              </label>
              <input
                type="date"
                name="to_date"
                value={filters.to_date}
                onChange={handleFilterChange}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-base sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition-all appearance-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide ml-1 mb-1 block">
                Tên nhân viên
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-[var(--text-secondary)]" />
                </div>
                <input
                  type="text"
                  name="user_name"
                  placeholder="Nhập tên nhân viên..."
                  value={filters.user_name}
                  onChange={handleFilterChange}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-base sm:text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition-all appearance-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="bg-transparent lg:bg-[var(--bg-secondary)] lg:rounded-2xl lg:shadow-sm lg:border lg:border-[var(--border-color)] overflow-hidden transition-colors duration-200">
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
                  <thead className="bg-[var(--bg-primary)] border-b-2 border-slate-600 [.light_&]:border-slate-200 sticky top-0 z-10">
                    <tr>
                      {[
                        "Ngày",
                        "Nhân viên",
                        "Trạng thái",
                        "Địa điểm",
                        "Ghi chú",
                        "Hành động"
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-6 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider whitespace-nowrap border-r border-slate-600 [.light_&]:border-slate-200"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border-color)]">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--accent-color)]/10 even:bg-black/50 [.light_&]:even:bg-gray-50 border-b-2 border-slate-600 [.light_&]:border-slate-200 transition-colors">
                        <td className="px-6 py-4 text-sm whitespace-nowrap border-r border-slate-600 [.light_&]:border-slate-200">
                          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                            <Calendar size={14} className="text-[var(--text-secondary)]" />
                            <span className="font-medium text-[var(--text-primary)]">{formatDate(r.day)}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap border-r border-slate-600 [.light_&]:border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs shadow-sm">
                              {r.user_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">
                              {r.user_name}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap border-r border-slate-600 [.light_&]:border-slate-200">
                          {getWorkStatusBadge(r.work_status)}
                        </td>

                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap border-r border-slate-600 [.light_&]:border-slate-200">
                            {r.checkin_type === 'FACTORY' ? (
                                <div className="flex flex-col">
                                    <span className="text-indigo-600 uppercase text-xs font-bold">Nhà máy</span>
                                    <span className="text-[var(--text-primary)] text-xs">{r.factory_name}</span>
                                </div>
                            ) : (
                                <span className="text-blue-600 uppercase text-xs font-bold">Văn phòng</span>
                            )}
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap border-r border-slate-600 [.light_&]:border-slate-200 max-w-[200px] truncate" title={r.note}>
                            {r.note ? (
                                <span className="text-[var(--text-primary)] italic">{r.note}</span>
                            ) : (
                                <span className="text-[var(--text-secondary)]">-</span>
                            )}
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap border-r border-slate-600 [.light_&]:border-slate-200">
                             <button
                                onClick={() => setSelectedRecord(r)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent-color)] text-black hover:brightness-110 transition-all font-bold text-xs shadow-md active:scale-95 hover:bg-[var(--accent-color)]/80 hover:scale-110"
                             >
                                <Eye size={14} />
                                Xem chi tiết
                             </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {records.map((r) => (
                  <div 
                    key={r.id} 
                    className="p-4 bg-[var(--bg-secondary)] shadow-md rounded-2xl border border-[var(--border-color)] active:scale-[0.99] transition-transform duration-100"
                  >
                    <div className="flex items-center justify-between mb-3">
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
                       <button
                            onClick={() => setSelectedRecord(r)}
                            className="px-3 py-1.5 bg-[var(--accent-color)] text-white rounded-lg text-xs font-bold shadow-sm"
                        >
                            Chi tiết
                        </button>
                    </div>

                    <div className="p-3 border border-[var(--border-color)] rounded-xl space-y-2 text-sm mb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-secondary)]">Ca làm việc:</span>
                        <span className="font-medium text-[var(--text-primary)]">
                          {r.shift_name || "-"}
                        </span>
                      </div>
                      {r.note && (
                         <div className="flex flex-col gap-1 pt-1 border-t border-[var(--border-color)]">
                             <span className="text-[var(--text-secondary)]">Ghi chú:</span>
                             <span className="text-xs text-[var(--text-primary)] italic">{r.note}</span>
                         </div>
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
                                ? "bg-[var(--accent-color)] text-white shadow-sm"
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

       {/* ===== DETAIL MODAL ===== */}
        {selectedRecord && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col max-h-[90vh]">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                        <div>
                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center text-sm">
                                        {selectedRecord.user_name?.charAt(0).toUpperCase()}
                                </span>
                                {selectedRecord.user_name}
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 ml-10">
                                {formatDate(selectedRecord.day)}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedRecord(null)}
                            className="p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Modal Body - Scrollable if needed */}
                    <div className="p-4 overflow-y-auto custom-scrollbar">
                        {/* Status & Info Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="space-y-1">
                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Trạng thái</p>
                                <div>{getWorkStatusBadge(selectedRecord.work_status)}</div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Địa điểm</p>
                                {selectedRecord.checkin_type === 'FACTORY' ? (
                                        <div className="font-bold text-indigo-500 text-sm">Nhà máy - {selectedRecord.factory_name}</div>
                                ) : (
                                        <div className="font-bold text-blue-500 text-sm">Văn phòng</div>
                                )}
                            </div>
                            <div className="space-y-1 col-span-2">
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Ca làm việc</p>
                                    <p className="font-medium text-[var(--text-primary)] text-sm">{selectedRecord.shift_name || "Chưa phân ca"}</p>
                            </div>
                            {selectedRecord.note && (
                                <div className="col-span-2 bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border-color)]">
                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Ghi chú</p>
                                    <p className="text-sm italic text-[var(--text-primary)]">"{selectedRecord.note}"</p>
                                </div>
                            )}
                        </div>

                        {/* Time & Images Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Check-in Column */}
                            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                                <div className="p-3 border-b border-[var(--border-color)] bg-emerald-500/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-emerald-600 uppercase">Input (Check-in)</span>
                                        <span className="font-mono text-lg font-bold text-[var(--text-primary)]">
                                            {selectedRecord.checkin_time ? formatTime(selectedRecord.checkin_time) : "--:--"}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3">
                                    {selectedRecord.checkin_image ? (
                                        <div 
                                            className="aspect-video bg-black/50 rounded-lg overflow-hidden cursor-pointer group relative"
                                            onClick={() => setViewingImage(selectedRecord.checkin_image)}
                                        >
                                            <img 
                                                src={selectedRecord.checkin_image} 
                                                alt="Checkin" 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <Eye className="text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-video bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center text-[var(--text-secondary)] text-xs border border-dashed border-[var(--border-color)]">
                                            Không có ảnh
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Check-out Column */}
                            <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] overflow-hidden">
                                <div className="p-3 border-b border-[var(--border-color)] bg-orange-500/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-orange-600 uppercase">Output (Check-out)</span>
                                        <span className="font-mono text-lg font-bold text-[var(--text-primary)]">
                                            {selectedRecord.checkout_time ? formatTime(selectedRecord.checkout_time) : "--:--"}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3">
                                    {selectedRecord.checkout_image ? (
                                        <div 
                                            className="aspect-video bg-black/50 rounded-lg overflow-hidden cursor-pointer group relative"
                                            onClick={() => setViewingImage(selectedRecord.checkout_image)}
                                        >
                                            <img 
                                                src={selectedRecord.checkout_image} 
                                                alt="Checkout" 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                    <Eye className="text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-video bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center text-[var(--text-secondary)] text-xs border border-dashed border-[var(--border-color)]">
                                            Không có ảnh
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      {/* Image Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative bg-[var(--bg-secondary)] rounded-2xl w-full max-w-4xl p-4 shadow-2xl h-full max-h-[90vh] flex flex-col items-center justify-center"
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
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
