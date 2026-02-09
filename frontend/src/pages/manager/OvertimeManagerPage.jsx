import React, { useEffect, useState } from "react";
import api from "../../service/api";
import { useAuth } from "../../contexts/AuthContext";
import { wsService } from "../../service/ws";
import { useToast } from "../../contexts/ToastContext";
import { formatDate, formatTimeOnly } from "../../until/helper";
import {
  Clock, // Icon for OT
  Calendar,
  CheckCircle, 
  XCircle,
  Filter,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User
} from "lucide-react";


const OvertimeManagerPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const toast = useToast();
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchRequests();
  }, [currentPage, filterStatus]);

  // WebSocket
  useEffect(() => {
    if (!user) return;

    const handlerNewRequest = () => {
      fetchRequests(); 
    };
    
    const handlerUpdate = () => {
        fetchRequests();
    };

    wsService.on("NEW_OVERTIME_REQUEST", handlerNewRequest);
    wsService.on("OVERTIME_APPROVED", handlerUpdate);
    wsService.on("OVERTIME_REJECTED", handlerUpdate);

    return () => {
      wsService.off("NEW_OVERTIME_REQUEST", handlerNewRequest);
      wsService.off("OVERTIME_APPROVED", handlerUpdate);
      wsService.off("OVERTIME_REJECTED", handlerUpdate);
    };
  }, [user, filterStatus, currentPage]);


  const getStatusIcon = (status) => {
      switch (status) {
        case "CHO_DUYET": return <Clock size={14} className="mr-1.5" />;
        case "DA_DUYET": return <CheckCircle size={14} className="mr-1.5" />;
        case "TU_CHOI": return <XCircle size={14} className="mr-1.5" />;
        default: return <AlertCircle size={14} className="mr-1.5" />;
      }
  };
  const getStatusText = (status) => {
    switch (status) {
      case "CHO_DUYET": return "Chờ duyệt";
      case "DA_DUYET": return "Đã duyệt";
      case "TU_CHOI": return "Từ chối";
      default: return status;
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "CHO_DUYET": return "bg-amber-50 text-amber-700 border-amber-200";
      case "DA_DUYET": return "bg-green-50 text-green-700 border-green-200";
      case "TU_CHOI": return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit,
      });
       if (filterStatus && filterStatus !== "ALL") {
        queryParams.append("status", filterStatus);
      } // Assuming DeptHead/Manager can see list via same endpoint /overtime list logic handles role
      const response = await api.get(`/overtime?${queryParams.toString()}`);
      if (response.data.success) {
        setRequests(response.data.data.requests || []);
         if (response.data.data.pagination) {
             setTotalPages(Math.ceil(response.data.data.pagination.total / limit) || 1);
        }
      }
    } catch (error) {
      console.error("Error fetching overtime requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // State to track rate for each pending request
  const [rateDecisions, setRateDecisions] = useState({});

  const handleRateChange = (id, newRate) => {
      setRateDecisions(prev => ({
          ...prev,
          [id]: newRate
      }));
  };

  const handleApprove = async (id) => {
    
    const rate = rateDecisions[id] !== undefined ? parseFloat(rateDecisions[id]) : 1.0;

    try {
      await api.put(`/overtime/${id}/approve`, {
          rate: rate
      });
      toast.success(`Đã duyệt đơn OT thành công (Hệ số: ${rate})`);
      fetchRequests();
    } catch (error) {
      toast.error("Có lỗi xảy ra khi duyệt đơn");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Bạn có chắc muốn từ chối đơn này?")) return;

    try {
      await api.put(`/overtime/${id}/reject`);
      toast.success("Đã từ chối đơn OT");
      fetchRequests();
    } catch (error) {
      toast.error("Có lỗi xảy ra khi từ chối đơn");
    }
  };

   const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn này?")) return;
    try {
      await api.delete(`/overtime/${id}`);
      fetchRequests();
      toast.success("Đã xóa đơn thành công");
    } catch (error) {
      toast.error("Không thể xóa đơn");
    }
  };


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };


  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-4 transition-colors duration-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 border border-[var(--border-color)] shadow-sm rounded-lg transition-colors duration-300">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <div className="p-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                <Clock className="text-[var(--accent-color)] w-5 h-5" />
            </div>
            QUẢN LÝ TĂNG CA (OT)
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 ml-10">
            Duyệt và quản lý các yêu cầu OT nhân viên
          </p>
        </div>
      </div>

       <div className="max-w-7xl mx-auto px-0 md:px-0 py-4 space-y-4">
        {/* Filter Tabs */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm p-2 rounded-lg transition-colors duration-300">
          <div className="flex flex-wrap gap-2">
             <div className="flex items-center gap-2 mr-2 mb-1 w-full sm:w-auto sm:hidden">
              <Filter size={16} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Lọc:
              </span>
            </div>
            {[
              { key: "ALL", label: "Tất cả" },
              { key: "CHO_DUYET", label: "Chờ duyệt" },
              { key: "DA_DUYET", label: "Đã duyệt" },
              { key: "TU_CHOI", label: "Từ chối" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`flex-1 sm:flex-none px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all flex items-center justify-center gap-2 rounded-md border active:scale-95 ${
                  filterStatus === tab.key
                    ? `bg-[var(--accent-color)] text-black border-[var(--accent-color)] shadow-md hover:shadow-lg transform scale-105 hover:-translate-y-0.5`
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] border-transparent hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-transparent lg:bg-[var(--bg-secondary)] lg:border lg:border-[var(--border-color)] lg:shadow-sm overflow-hidden lg:rounded-lg transition-colors duration-300">
          {loading ? (
             <div className="py-12 flex flex-col items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg">
               <div className="w-10 h-10 border-4 border-[var(--border-color)] border-t-[var(--accent-color)] rounded-full animate-spin mb-4"></div>
               <p className="text-sm font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <Clock size={48} className="mx-auto text-[var(--text-secondary)] mb-3" />
              <p className="text-[var(--text-secondary)] font-medium text-sm">
                Không có yêu cầu OT nào
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full text-left border-collapse">
                  <thead className="bg-[var(--bg-primary)] border-b-2 border-slate-600 [.light_&]:border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Nhân viên
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Thời gian
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Chi tiết
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Nội dung
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Hệ số
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Giờ quy đổi
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Trạng thái
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider text-right">
                        Hành động
                      </th>
                    </tr>
                  </thead>

                  <tbody className="">
                    {requests.map((r) => {
                    
                      
                      const currentRate = rateDecisions[r.id] !== undefined 
                          ? rateDecisions[r.id] 
                          : (r.adjusted_rate || 1.0);

                      return (
                      <tr key={r.id} className="hover:bg-[var(--accent-color)]/10 even:bg-black/50 [.light_&]:even:bg-gray-50 border-b-2 border-slate-600 [.light_&]:border-slate-200 transition-colors">
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-color)] font-bold text-xs shadow-sm rounded-full">
                              <User size={16} />
                            </div>
                            <span className="font-bold text-[var(--text-primary)] text-sm">
                              {r.user_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-[var(--text-secondary)]" />
                            <span className="font-medium text-[var(--text-primary)]">
                              {formatDate(r.day)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                          <span className="text-sm text-[var(--text-primary)]">
                            {formatTimeOnly(r.start_time)} - {formatTimeOnly(r.end_time)} ({r.total_hours}h)
                          </span>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                          <span className="text-sm text-[var(--text-secondary)] line-clamp-2" title={r.content}>
                             {r.content || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                           {/* Rate Column */}
                           {r.status === "CHO_DUYET" ? (
                              <input 
                                type="number" 
                                step="0.1"
                                min="0.5"
                                max="3.0"
                                value={currentRate}
                                onChange={(e) => handleRateChange(r.id, e.target.value)}
                                className="w-16 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-sm font-bold text-center"
                              />
                           ) : (
                              <span className="text-sm font-bold text-[var(--text-primary)]">
                                {r.adjusted_rate || r.base_rate || "-"}
                              </span>
                           )}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            {(r.total_hours * (parseFloat(currentRate) || 1)).toFixed(2)}h
                          </span>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold border rounded-md ${getStatusColor(
                              r.status,
                            )}`}
                          >
                            {getStatusIcon(r.status)}
                            {getStatusText(r.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {r.status === "CHO_DUYET" && (
                              <>
                                <button
                                  onClick={() => handleApprove(r.id)}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 rounded-lg hover:shadow-lg hover:scale-110 hover:-translate-y-1 active:translate-y-0 active:scale-90"
                                >
                                  <CheckCircle size={15} />
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => handleReject(r.id)}
                                  className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-rose-500 hover:text-white hover:border-rose-500 text-sm font-bold transition-all flex items-center gap-1.5 rounded-lg hover:shadow-lg hover:scale-110 hover:-translate-y-1 active:translate-y-0 active:scale-90"
                                >
                                  <XCircle size={15} />
                                  Từ chối
                                </button>
                              </>
                            )}

                             {(r.status === "DA_HUY"  || r.status === "TU_CHOI") && (
                                  <button 
                                     onClick={() => handleDelete(r.id)}
                                     className="px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-sm font-bold transition-all shadow-sm rounded-lg hover:shadow-lg hover:scale-110 hover:-translate-y-1 active:translate-y-0 active:scale-90"
                                  >
                                     Xóa
                                  </button>
                               )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="lg:hidden space-y-3">
                {requests.map((r) => (
                  <div 
                    key={r.id} 
                    className="p-4 bg-[var(--bg-secondary)] shadow-md rounded-2xl border border-[var(--border-color)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-color)] font-bold shadow-sm rounded-full">
                           <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-primary)] text-sm">{r.user_name}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                           OT: {r.total_hours}h 
                           <span className="mx-1">→</span>
                           <span className="text-blue-500 font-bold">
                             {(r.total_hours * (parseFloat(rateDecisions[r.id] !== undefined ? rateDecisions[r.id] : (r.adjusted_rate || 1.0)) || 1)).toFixed(2)}h
                           </span>
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold border shrink-0 rounded-md ${getStatusColor(
                          r.status,
                        )}`}
                      >
                        {getStatusIcon(r.status)}
                        {getStatusText(r.status)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mt-3">
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Calendar size={14} className="text-[var(--text-secondary)]" />
                        <span className="font-medium text-[var(--text-primary)]">{formatDate(r.day)}</span>
                      </div>
                       <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Clock size={14} className="text-[var(--text-secondary)]" />
                        <span className="font-medium text-[var(--text-primary)]">{r.start_time} - {r.end_time}</span>
                      </div>
                      <div className="text-sm text-[var(--text-secondary)] mt-1 italic">
                           {r.content ? `"${r.content}"` : ""}
                       </div>
                       
                       {/* Mobile Rate Input */}
                       {r.status === "CHO_DUYET" && (
                         <div className="flex items-center justify-between py-2 mt-2 border-t border-[var(--border-color)]">
                            <span className="text-sm font-medium text-[var(--text-primary)]">Hệ số lương:</span>
                            <div className="flex items-center gap-2">
                               <input 
                                  type="number" 
                                  step="0.1"
                                  min="0.5"
                                  max="3.0"
                                  value={rateDecisions[r.id] !== undefined ? rateDecisions[r.id] : (r.adjusted_rate || 1.0)}
                                  onChange={(e) => handleRateChange(r.id, e.target.value)}
                                  className="w-16 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-sm font-bold text-center"
                               />
                            </div>
                         </div>
                       )}
                       {r.status !== "CHO_DUYET" && (r.adjusted_rate || r.base_rate) && (
                           <div className="flex items-center gap-1 mt-1 text-xs text-[var(--text-secondary)]">
                              <span>Hệ số: </span>
                              <span className="font-bold text-[var(--text-primary)]">{r.adjusted_rate || r.base_rate}</span>
                           </div>
                       )}
                    </div>

                    {r.status === "CHO_DUYET" && (
                      <div className="flex gap-2 pt-3 mt-3 border-t border-[var(--border-color)]">
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 rounded-xl"
                        >
                          <CheckCircle size={16} />
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          className="flex-1 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-rose-500 hover:text-white hover:border-rose-500 text-xs font-bold transition-all flex items-center justify-center gap-2 rounded-xl"
                        >
                          <XCircle size={16} />
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
         {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-sm mt-4">
              <div className="text-sm text-[var(--text-secondary)]">
                Trang <span className="font-bold text-[var(--text-primary)]">{currentPage}</span> / {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-primary)] transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
      </div>
      
    </div>
  );
};

export default OvertimeManagerPage;
