import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { attendanceService } from "../../service/attendance.service";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Filter, 
  Clock, 
  User, 
  Briefcase, 
  Search, 
  X,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { formatDate, formatTime } from "../../until/helper"; // Ensure path is correct

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

      // Adaptation based on previous viewing: response might be response.data or response directly
      // Looking at previous valid code: if (response.success) { setRecords(response.data); ... }
      if (response.success) {
        setRecords(response.data);
        setPagination(response.pagination);
      } else {
        console.warn("Response not successful:", response);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.total_pages) {
       setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getWorkStatusBadge = (status) => {
    const map = {
        ON_TIME: ["Đúng giờ", "bg-green-50 text-green-700 border-green-200 ring-green-600/20"],
        LATE: ["Đi muộn", "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20"],
        ABSENT: ["Vắng mặt", "bg-red-50 text-red-700 border-red-200 ring-red-600/20"],
    };

    if (!map[status]) return null;

    return (
        <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ring-1 ring-inset ${map[status][1]}`}
        >
            {map[status][0]}
        </span>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-4 font-sans max-w-7xl mx-auto transition-colors duration-200">
      
      {/* Header Section */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 md:px-6 py-4 rounded-lg shadow-sm transition-colors duration-200">
        <div className="">
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
             <div className="p-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                <Clock className="text-[var(--accent-color)]" size={24} />
             </div>
            LỊCH SỬ CHẤM CÔNG
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 ml-12">
            Theo dõi chi tiết thời gian làm việc của bạn
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide ml-1 mb-1 block">Từ ngày</label>
              <div className="relative">
                 <input
                  type="date"
                  name="from_date"
                  value={filters.from_date}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition-all text-[var(--text-primary)] text-base sm:text-sm appearance-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide ml-1 mb-1 block">Đến ngày</label>
              <div className="relative">
                <input
                  type="date"
                  name="to_date"
                  value={filters.to_date}
                  onChange={handleFilterChange}
                   className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition-all text-[var(--text-primary)] text-base sm:text-sm appearance-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="bg-transparent lg:bg-[var(--bg-secondary)] lg:rounded-lg lg:shadow-sm lg:border lg:border-[var(--border-color)] lg:overflow-hidden transition-colors duration-300">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
               <Loader2 className="animate-spin text-[var(--accent-color)]" size={32} />
               <p className="text-[var(--text-secondary)] font-medium text-sm">Đang tải dữ liệu...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center text-[var(--text-secondary)] flex flex-col items-center">
               <div className="w-12 h-12 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md flex items-center justify-center mb-3">
                  <Search size={24} />
               </div>
               <p className="text-sm font-bold text-[var(--text-primary)]">Không tìm thấy dữ liệu chấm công</p>
               <p className="text-xs mt-1">Vui lòng thử thay đổi bộ lọc thời gian</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-primary)] border-b-2 border-slate-600 [.light_&]:border-slate-200 sticky top-0 z-10 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider">
                      <th className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">Ngày</th>
                      <th className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">Trạng thái</th>
                      <th className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">Địa điểm</th>
                      <th className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">Giờ làm</th>
                      <th className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">Công</th>
                      <th className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">Ghi chú</th>
                      <th className="px-4 py-3 text-right">Hành động</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border-color)]">
                    {records.map((r, index) => (
                      <tr 
                          key={r.id || index} 
                          className="hover:bg-[var(--accent-color)]/10 even:bg-black/50 [.light_&]:even:bg-gray-50 border-b-2 border-slate-600 [.light_&]:border-slate-200 transition-colors group cursor-default"
                      >
                        <td className="px-4 py-3 border-r border-[var(--border-color)]">
                          <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] flex items-center justify-center font-bold text-[10px] uppercase shadow-sm">
                                  {new Date(r.day).toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                              <div>
                                  <p className="font-bold text-[var(--text-primary)] text-sm">{formatDate(r.day)}</p>
                              </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 border-r border-[var(--border-color)]">
                          {r.work_status && getWorkStatusBadge(r.work_status)}
                        </td>

                        <td className="px-4 py-3 border-r border-[var(--border-color)]">
                            {r.checkin_type === 'FACTORY' ? (
                                <div className="flex flex-col">
                                    <span className="text-indigo-600 uppercase text-[10px] font-bold">Nhà máy</span>
                                    <span className="text-[var(--text-primary)] text-xs font-bold">{r.factory_name}</span>
                                </div>
                            ) : (
                                <span className="text-blue-600 uppercase text-[10px] font-bold">Văn phòng</span>
                            )}
                        </td>

                        <td className="px-4 py-3 border-r border-[var(--border-color)]">
                            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">
                                {r.work_hours ? `${r.work_hours}h` : '-'}
                            </span>
                        </td>
                        <td className="px-4 py-3 border-r border-[var(--border-color)]">
                            <span className="font-bold text-emerald-600 text-sm">
                                {r.work_unit !== undefined && r.work_unit !== null ? r.work_unit : '-'}
                            </span>
                        </td>

                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)] border-r border-[var(--border-color)] max-w-[200px] truncate" title={r.note}>
                            {r.note ? (
                                <span className="text-[var(--text-primary)] italic">{r.note}</span>
                            ) : (
                                <span className="text-[var(--text-secondary)] opacity-50">-</span>
                            )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedRecord(r)}
                            className="w-8 h-8 rounded-md bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-transparent hover:bg-[var(--accent-color)] hover:text-white flex items-center justify-center transition-all ml-auto hover:shadow-lg hover:scale-110 active:scale-[0.85]"
                            title="Xem chi tiết"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {records.map((r, index) => (
                  <div key={r.id || index} className="p-4 flex flex-col gap-3 bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] transition-all active:scale-[0.99] duration-100">
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] w-10 h-10 rounded-md flex flex-col items-center justify-center text-[10px] font-bold leading-tight shadow-sm">
                              <span className="uppercase">{new Date(r.day).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                              <span className="text-sm">{new Date(r.day).getDate()}</span>
                           </div>
                           <div>
                              <p className="font-bold text-[var(--text-primary)] text-sm">{formatDate(r.day)}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {r.checkin_type === 'FACTORY' ? (
                                    <span className="text-indigo-600 text-[10px] font-bold uppercase border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 rounded">Nhà máy</span>
                                ) : (
                                    <span className="text-blue-600 text-[10px] font-bold uppercase border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded">Văn phòng</span>
                                )}
                              </div>
                           </div>
                        </div>
                        {r.work_status && getWorkStatusBadge(r.work_status)}
                     </div>
                     
                     <div className="grid grid-cols-2 gap-3 bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border-color)]">
                        <div>
                           <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Check-in</p>
                           <p className="font-mono font-bold text-[var(--text-primary)] text-sm">
                              {r.checkin_time ? formatTime(r.checkin_time) : "--:--"}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Check-out</p>
                            <p className="font-mono font-bold text-[var(--text-primary)] text-sm">
                              {r.checkout_time ? formatTime(r.checkout_time) : "--:--"}
                           </p>
                        </div>
                     </div>
                     
                     <div className="flex items-center justify-between text-sm px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[var(--text-secondary)]">Giờ làm:</span>
                            <span className="font-bold text-[var(--text-primary)]">{r.work_hours ? `${r.work_hours}h` : '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-[var(--text-secondary)]">Công:</span>
                             <span className="font-bold text-emerald-600">{r.work_unit !== undefined && r.work_unit !== null ? r.work_unit : '-'}</span>
                        </div>
                     </div>
                     
                     {r.note && (
                        <div className="px-3 py-2 bg-[var(--bg-primary)] rounded-md border border-[var(--border-color)] text-xs italic text-[var(--text-secondary)]">
                            "{r.note}"
                        </div>
                     )}

                     <button
                      onClick={() => setSelectedRecord(r)}
                      className="w-full py-2 rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] font-medium text-xs hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center gap-2 active:scale-[0.85]"
                    >
                      Xem chi tiết <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 bg-[var(--bg-primary)] border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-4">
                 <span className="text-xs text-[var(--text-secondary)] order-2 sm:order-1 font-medium">
                    Hiển thị <span className="font-bold text-[var(--text-primary)]">{(pagination.page - 1) * pagination.limit + 1}</span> đến <span className="font-bold text-[var(--text-primary)]">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> trong tổng số <span className="font-bold text-[var(--text-primary)]">{pagination.total}</span> bản ghi
                 </span>
                 
                 <div className="flex items-center gap-1 order-1 sm:order-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>

                     <div className="flex gap-1 hidden sm:flex">
                      {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                           let p = i + 1;
                           if (pagination.total_pages > 5) {
                              if (pagination.page > 3) p = pagination.page - 2 + i;
                              if (p > pagination.total_pages) p = pagination.total_pages - (4 - i);
                           }
                           
                           return (
                              <button
                                key={p}
                                onClick={() => handlePageChange(p)}
                                className={`w-8 h-8 flex items-center justify-center rounded-md border text-xs font-bold transition-all ${
                                  pagination.page === p
                                    ? "bg-[var(--accent-color)] border-[var(--accent-color)] text-white shadow-sm"
                                    : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
                                }`}
                                style={pagination.page === p ? { color: "#000" } : {}}
                              >
                                {p}
                              </button>
                           )
                      })}
                     </div>
                     {/* Mobile current page indicator */}
                     <span className="sm:hidden text-xs font-bold bg-[var(--bg-secondary)] px-3 py-1.5 rounded-md border border-[var(--border-color)] text-[var(--text-primary)]">
                       Trang {pagination.page} / {pagination.total_pages}
                     </span>

                     <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.total_pages}
                       className="w-8 h-8 flex items-center justify-center rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                 </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="relative w-full max-w-2xl bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] shadow-2xl flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                      <div>
                          <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                              <span className="w-8 h-8 rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center text-sm">
                                    {selectedRecord.user_name ? selectedRecord.user_name.charAt(0).toUpperCase() : <User size={14} />}
                              </span>
                              Chi tiết chấm công
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

      {/* Full Screen Image Viewer */}
      {viewingImage && (
         <div 
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setViewingImage(null)}
         >
            <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
               <X size={32} />
            </button>
            <img 
               src={viewingImage} 
               alt="Zoomed Evidence" 
               className="max-w-full max-h-full rounded-lg shadow-2xl border border-white/10" 
               onClick={(e) => e.stopPropagation()} 
            />
         </div>
      )}

    </div>
  );
};

export default HistoryPage;
