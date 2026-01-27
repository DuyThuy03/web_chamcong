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
  MapPin, 
  X,
  Search,
  CalendarDays,
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
    const configs = {
      ON_TIME: { label: "Đúng giờ", classes: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      LATE: { label: "Đi muộn", classes: "bg-amber-100 text-amber-700 border-amber-200" },
      ABSENT: { label: "Vắng mặt", classes: "bg-rose-100 text-rose-700 border-rose-200" },
      DEFAULT: { label: status, classes: "bg-slate-100 text-slate-700 border-slate-200" }
    };

    const config = configs[status] || configs.DEFAULT;

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.classes} inline-flex items-center gap-1`}>
         <span className={`w-1.5 h-1.5 rounded-full ${status === 'ON_TIME' ? 'bg-emerald-500' : status === 'LATE' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
         {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 font-sans max-w-7xl mx-auto pb-10 bg-[var(--bg-primary)] transition-colors duration-200">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 pt-4">
        <div>
           <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
              <div className="p-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md">
                <CalendarDays size={20} className="text-[var(--accent-color)]" />
              </div>
              Lịch sử chấm công
           </h1>
           <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 ml-10">Theo dõi chi tiết thời gian làm việc của bạn</p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Filters Card */}
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] p-4 transition-colors duration-300">
          <div className="flex items-center gap-2 mb-3 text-[var(--text-primary)] font-bold text-sm uppercase">
              <Filter size={16} className="text-[var(--accent-color)]" />
              <h3>Bộ lọc tìm kiếm</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Từ ngày</label>
              <div className="relative">
                 <input
                  type="date"
                  name="from_date"
                  value={filters.from_date}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] focus:outline-none transition-all text-[var(--text-primary)] text-base sm:text-sm appearance-none"
                />
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Đến ngày</label>
              <div className="relative">
                <input
                  type="date"
                  name="to_date"
                  value={filters.to_date}
                  onChange={handleFilterChange}
                   className="w-full pl-9 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] focus:outline-none transition-all text-[var(--text-primary)] text-base sm:text-sm appearance-none"
                />
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors duration-300">
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
                    <tr className="bg-[var(--bg-primary)] border-b border-[var(--border-color)] text-xs uppercase tracking-wider text-[var(--text-secondary)] font-bold">
                      <th className="px-4 py-3 border-r border-[var(--border-color)]">Ngày làm việc</th>
                      <th className="px-4 py-3 border-r border-[var(--border-color)]">Ca làm việc</th>
                      <th className="px-4 py-3 border-r border-[var(--border-color)]">Giờ vào (Check-in)</th>
                      <th className="px-4 py-3 border-r border-[var(--border-color)]">Giờ ra (Check-out)</th>
                      <th className="px-4 py-3 border-r border-[var(--border-color)] text-center">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Chi tiết</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border-color)]">
                    {records.map((r, index) => (
                      <tr 
                          key={r.id || index} 
                          className="hover:bg-[var(--bg-primary)] transition-colors group cursor-default"
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
                            <span className="font-medium text-[var(--text-primary)] bg-[var(--bg-primary)] border border-[var(--border-color)] px-2 py-1 rounded-md text-xs">
                                {r.shift_name || "Mặc định"}
                            </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-[var(--text-secondary)] border-r border-[var(--border-color)]">
                          {r.checkin_time ? formatTime(r.checkin_time) : <span className="text-[var(--text-secondary)] opacity-50">--:--</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-[var(--text-secondary)] border-r border-[var(--border-color)]">
                          {r.checkout_time ? formatTime(r.checkout_time) : <span className="text-[var(--text-secondary)] opacity-50">--:--</span>}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[var(--border-color)]">
                          {r.work_status && getWorkStatusBadge(r.work_status)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedRecord(r)}
                            className="w-8 h-8 rounded-md hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border-color)] text-[var(--accent-color)] flex items-center justify-center transition-all ml-auto"
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
              <div className="lg:hidden divide-y divide-[var(--border-color)]">
                {records.map((r, index) => (
                  <div key={r.id || index} className="p-4 flex flex-col gap-3 hover:bg-[var(--bg-primary)] transition-colors">
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                           <div className="bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] w-10 h-10 rounded-md flex flex-col items-center justify-center text-[10px] font-bold leading-tight shadow-sm">
                              <span className="uppercase">{new Date(r.day).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                              <span className="text-sm">{new Date(r.day).getDate()}</span>
                           </div>
                           <div>
                              <p className="font-bold text-[var(--text-primary)] text-sm">{formatDate(r.day)}</p>
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{r.shift_name || "Ca chưa xác định"}</p>
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

                     <button
                      onClick={() => setSelectedRecord(r)}
                      className="w-full py-2 rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] font-medium text-xs hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
             className="absolute inset-0 bg-black/60 backdrop-blur-[1px] transition-opacity" 
             onClick={() => setSelectedRecord(null)}
          ></div>
          
          <div className="relative bg-[var(--bg-secondary)] rounded-lg shadow-xl border border-[var(--border-color)] max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[var(--bg-secondary)] z-10 px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-tight">Chi tiết chấm công</h2>
                <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">{formatDate(selectedRecord.day)}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
               {/* Summary Info */}
               <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 bg-[var(--bg-primary)] rounded-md border border-[var(--border-color)]">
                     <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Ca làm việc</p>
                     <p className="font-bold text-[var(--text-primary)] text-sm">{selectedRecord.shift_name || "N/A"}</p>
                  </div>
                  <div className="px-4 py-2 bg-[var(--bg-primary)] rounded-md border border-[var(--border-color)]">
                     <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Trạng thái</p>
                     <div className="mt-1">{selectedRecord.work_status && getWorkStatusBadge(selectedRecord.work_status)}</div>
                  </div>
               </div>

               {/* Timeline Content */}
               <div className="relative border-l-2 border-[var(--border-color)] pl-8 space-y-6 ml-3">
                  
                  {/* Check-in Node */}
                  <div className="relative">
                     <span className={`absolute -left-[39px] w-5 h-5 rounded-full border-4 border-[var(--bg-secondary)] shadow-sm ${selectedRecord.checkin_time ? 'bg-blue-500' : 'bg-[var(--border-color)]'}`}></span>
                     
                     <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                              <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-sm uppercase">
                                 Check-in 
                                 {selectedRecord.checkin_time && <span className="text-green-600 text-[10px] bg-green-50 px-2 py-0.5 rounded-full border border-green-200 uppercase font-bold">Thành công</span>}
                              </h4>
                              <p className="text-[var(--text-secondary)] text-xs flex items-center gap-1 mt-1 font-mono">
                                 <Clock size={12} /> 
                                 {selectedRecord.checkin_time ? formatTime(selectedRecord.checkin_time) : "Chưa ghi nhận"}
                              </p>
                           </div>
                        </div>

                        {selectedRecord.checkin_time && (
                           <div className="space-y-3">
                              {selectedRecord.checkin_address && (
                                 <div className="text-xs bg-[var(--bg-secondary)] p-2 rounded-md flex gap-2 text-[var(--text-secondary)] border border-[var(--border-color)]">
                                    <MapPin size={14} className="shrink-0 mt-0.5 text-blue-500" />
                                    <span>{selectedRecord.checkin_address}</span>
                                 </div>
                              )}
                              
                              {selectedRecord.checkin_image && (
                                 <div className="aspect-video w-full rounded-md overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] relative group cursor-pointer" onClick={() => setViewingImage(selectedRecord.checkin_image)}>
                                    <img src={selectedRecord.checkin_image} alt="Check-in Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                       <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={24} />
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Check-out Node */}
                  <div className="relative">
                     <span className={`absolute -left-[39px] w-5 h-5 rounded-full border-4 border-[var(--bg-secondary)] shadow-sm ${selectedRecord.checkout_time ? 'bg-purple-500' : 'bg-[var(--border-color)]'}`}></span>
                     
                     <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                           <div>
                              <h4 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-sm uppercase">
                                 Check-out
                                 {selectedRecord.checkout_time && <span className="text-green-600 text-[10px] bg-green-50 px-2 py-0.5 rounded-full border border-green-200 uppercase font-bold">Thành công</span>}
                              </h4>
                              <p className="text-[var(--text-secondary)] text-xs flex items-center gap-1 mt-1 font-mono">
                                 <Clock size={12} /> 
                                 {selectedRecord.checkout_time ? formatTime(selectedRecord.checkout_time) : "Chưa ghi nhận"}
                              </p>
                           </div>
                        </div>

                         {selectedRecord.checkout_time && (
                           <div className="space-y-3">
                              {selectedRecord.checkout_address && (
                                 <div className="text-xs bg-[var(--bg-secondary)] p-2 rounded-md flex gap-2 text-[var(--text-secondary)] border border-[var(--border-color)]">
                                    <MapPin size={14} className="shrink-0 mt-0.5 text-purple-500" />
                                    <span>{selectedRecord.checkout_address}</span>
                                 </div>
                              )}
                              
                              {selectedRecord.checkout_image && (
                                 <div className="aspect-video w-full rounded-md overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] relative group cursor-pointer" onClick={() => setViewingImage(selectedRecord.checkout_image)}>
                                    <img src={selectedRecord.checkout_image} alt="Check-out Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                       <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={24} />
                                    </div>
                                 </div>
                              )}
                           </div>
                        )}
                     </div>
                  </div>

               </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[var(--bg-primary)] border-t border-[var(--border-color)] text-center rounded-b-lg">
               <button onClick={() => setSelectedRecord(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-xs uppercase transition-colors">Đóng</button>
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
