import React, { useEffect, useState } from "react";
import api from "../../service/api";
import { useAuth } from "../../contexts/AuthContext";
import { wsService } from "../../service/ws";
import { useToast } from "../../contexts/ToastContext";
import { Calendar, CheckCircle, XCircle, Clock, FileText, User, Filter, AlertCircle, Check, X, ChevronLeft, ChevronRight } from "lucide-react";

const LeavesHeadPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
    const [filterStatus, setFilterStatus] = useState("ALL");

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [counts, setCounts] = useState({
      ALL: 0,
      CHO_DUYET: 0,
      DA_DUYET: 0,
      TU_CHOI: 0,
    });
    const limit = 20;

 
  // WebSocket - nhận sự kiện nhân viên gửi đơn nghỉ phép
  useEffect(() => {
    if (!user) return;

    const handlerCreateLeave = (data) => {
      setLeaveRequests((prev) => {
        const exists = prev.some((item) => item.id === data.id);
        if (exists) return prev;
        // Refetch to ensure pagination and filters are respected
        fetchLeaveRequests(); 
        fetchCounts();
        return prev;
      });
    };

    wsService.on("CREATE_LEAVE_REQUEST", handlerCreateLeave);

    return () => {
      wsService.off("CREATE_LEAVE_REQUEST", handlerCreateLeave);
    };
  }, [user, filterStatus, currentPage]);

  useEffect(() => {
    if (!user) return;

    const handlerUpdateLeave = (data) => {
      console.log("WS RECEIVED LEAVE_CANCELED:", data);
      fetchCounts();

      setLeaveRequests((prev) => {
        const index = prev.findIndex((item) => item.id === data.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = data; 
          return updated;
        }
       
        return prev;
      });
    };

    wsService.on("LEAVE_CANCELED", handlerUpdateLeave);

    return () => {
      wsService.off("LEAVE_CANCELED", handlerUpdateLeave);
    };
  }, [user, filterStatus, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [currentPage, filterStatus]);

  useEffect(() => {
    fetchCounts();
  }, []);

  console.log("Yêu cầu đơn nghỉ phép", leaveRequests);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit,
      });
      if (filterStatus && filterStatus !== "ALL") {
        queryParams.append("status", filterStatus);
      }

      const response = await api.get(`/leaves?${queryParams.toString()}`);
      if (response.data.success) {
        setLeaveRequests(response.data.data.requests || []);
        if (response.data.data.pagination) {
             setTotalPages(Math.ceil(response.data.data.pagination.total / limit) || 1);
        }
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      setLeaveRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const statuses = ["ALL", "CHO_DUYET", "DA_DUYET", "TU_CHOI"];
      const promises = statuses.map((status) => {
        const queryParams = new URLSearchParams({
          page: 1,
          limit: 1,
        });
        if (status !== "ALL") {
          queryParams.append("status", status);
        }
        return api.get(`/leaves?${queryParams.toString()}`);
      });

      const results = await Promise.all(promises);
      const newCounts = { ...counts };

      statuses.forEach((status, index) => {
        const response = results[index];
        if (response.data.success && response.data.data.pagination) {
          newCounts[status] = response.data.data.pagination.total;
        }
      });

      setCounts(newCounts);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };


  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn này?")) return;
    try {
      await api.delete(`/leaves/${id}`);
      toast.success("Đã xóa đơn nghỉ phép");
      fetchLeaveRequests();
      fetchCounts();
    } catch (error) {
      console.error("Error deleting leave request:", error);
      toast.error("Không thể xóa đơn");
    }
  };

  const [paidDecisions, setPaidDecisions] = useState({});

  const togglePaidDecision = (id) => {
    setPaidDecisions(prev => ({
        ...prev,
        [id]: !prev[id] 
    }));
  };

  const handleApproveLeave = async (leaveId) => {
    if (!window.confirm("Bạn có chắc muốn duyệt đơn này?")) return;
    
    const isPaid = paidDecisions[leaveId] !== undefined ? paidDecisions[leaveId] : true;

    try {
      await api.put(`/leaves/${leaveId}/approve`, {
          paid: isPaid
      });
      toast.success(`Đã duyệt đơn (${isPaid ? 'Có lương' : 'Không lương'})`);
      fetchLeaveRequests();
      fetchCounts();
    } catch (error) {
      console.error("Error approving leave:", error);
      toast.error("Có lỗi xảy ra khi duyệt đơn");
    }
  };

  const handleRejectLeave = async (leaveId) => {
    if (!window.confirm("Bạn có chắc muốn từ chối đơn này?")) return;

    try {
      await api.put(`/leaves/${leaveId}/reject`);
      toast.success("Đã từ chối đơn nghỉ phép");
      fetchLeaveRequests();
      fetchCounts();
    } catch (error) {
      console.error("Error rejecting leave:", error);
      toast.error("Có lỗi xảy ra khi từ chối đơn");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "CHO_DUYET":
        return "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20";
      case "DA_DUYET":
        return "bg-green-50 text-green-700 border-green-200 ring-green-600/20";
      case "TU_CHOI":
        return "bg-red-50 text-red-700 border-red-200 ring-red-600/20";
      case "DA_HUY":
        return "bg-gray-50 text-gray-700 border-gray-200 ring-gray-500/20";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 ring-gray-500/20";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "CHO_DUYET":
        return "Chờ duyệt";
      case "DA_DUYET":
        return "Đã duyệt";
      case "TU_CHOI":
        return "Từ chối";
      case "DA_HUY":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
      switch (status) {
        case "CHO_DUYET": return <Clock size={14} className="mr-1.5" />;
        case "DA_DUYET": return <CheckCircle size={14} className="mr-1.5" />;
        case "TU_CHOI": return <XCircle size={14} className="mr-1.5" />;
        case "DA_HUY": return <XCircle size={14} className="mr-1.5" />;
        default: return <AlertCircle size={14} className="mr-1.5" />;
      }
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-4 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-secondary)] p-4 border border-[var(--border-color)] shadow-sm rounded-lg transition-colors duration-300">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <div className="p-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                <FileText className="text-[var(--accent-color)] w-5 h-5" />
            </div>
            QUẢN LÝ ĐƠN NGHỈ PHÉP
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 ml-10">
            Duyệt và quản lý các yêu cầu nghỉ phép từ nhân viên
          </p>
        </div>
      </div>

       <div className="max-w-7xl mx-auto px-0 md:px-0 py-4 space-y-4">
        {/* Filter Tabs */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm p-2 rounded-lg transition-colors duration-300">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 mr-2 mb-1 w-full sm:w-auto">
              <Filter size={16} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-sm font-medium text-black sm:hidden">
                Lọc theo trạng thái:
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
                <span
                  className={`ml-2 px-1.5 py-0.5 text-xs rounded-full transition-colors ${
                    filterStatus === tab.key
                      ? "bg-white/20 text-black"
                      : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"
                  }`}
                >
                  {counts[tab.key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-transparent lg:bg-[var(--bg-secondary)] lg:border lg:border-[var(--border-color)] lg:shadow-sm lg:overflow-hidden rounded-lg transition-colors duration-300">
          {leaveRequests.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="mx-auto text-[var(--text-secondary)] mb-3" />
              <p className="text-[var(--text-secondary)] font-medium text-sm">
                Không có đơn nghỉ phép nào
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 opacity-70">
                {filterStatus !== "ALL"
                  ? "Thử thay đổi bộ lọc để xem các đơn khác"
                  : "Chưa có đơn nghỉ phép nào được gửi"}
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
                        Loại nghỉ
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Thời gian
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Lý do
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Trạng thái
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Chế độ lương
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider text-right">
                        Hành động
                      </th>
                    </tr>
                  </thead>

                  <tbody className="">
                    {leaveRequests.map((r) => {
                      // Init state if undefined, default to true
                      const isPaid = paidDecisions[r.id] !== undefined ? paidDecisions[r.id] : true;
                      
                      return (
                      <tr key={r.id} className="hover:bg-[var(--accent-color)]/10 even:bg-black/50 [.light_&]:even:bg-gray-50 border-b-2 border-slate-600 [.light_&]:border-slate-200 transition-colors">
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-color)] font-bold text-xs shadow-sm rounded-md">
                              {r.user_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-[var(--text-primary)] text-sm">
                              {r.user_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)] border-r border-slate-600 [.light_&]:border-slate-200">
                          {r.type === "NGHI_PHEP"
                            ? "Nghỉ phép"
                            : r.type === "DI_MUON"
                              ? "Đi muộn"
                              : r.type || "Nghỉ phép"}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-[var(--text-secondary)]" />
                            <span className="font-medium text-[var(--text-primary)]">
                              {formatDate(r.from_date)}
                            </span>
                            <span className="text-[var(--text-secondary)]">→</span>
                            <span className="font-medium text-[var(--text-primary)]">
                              {formatDate(r.to_date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs border-r border-slate-600 [.light_&]:border-slate-200">
                          <p className="text-sm text-[var(--text-secondary)] truncate" title={r.reason}>
                            {r.reason || "-"}
                          </p>
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
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200 text-center">
                            {r.status === "CHO_DUYET" ? (
                                <label className="inline-flex items-center cursor-pointer gap-2">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={isPaid}
                                        onChange={() => togglePaidDecision(r.id)}
                                    />
                                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                                    <span className={`text-xs font-medium ${isPaid ? 'text-emerald-600' : 'text-gray-500'}`}>
                                        {isPaid ? "Có lương" : "Không lương"}
                                    </span>
                                </label>
                            ) : (
                                // For processed requests, we might show saved status if backend returned it (not yet implemented in list)
                                // But normally once approved, we can't change it here easily without re-opening.
                                <span className="text-xs text-[var(--text-secondary)] italic">
                                   -
                                </span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {r.status === "CHO_DUYET" && (

                              <>
                                <button
                                  onClick={() => handleApproveLeave(r.id)}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 rounded-lg hover:shadow-lg hover:scale-110 hover:-translate-y-1 active:translate-y-0 active:scale-90"
                                >
                                  <CheckCircle size={15} />
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => handleRejectLeave(r.id)}
                                  className="px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-rose-500 hover:text-white hover:border-rose-500 text-sm font-bold transition-all flex items-center gap-1.5 rounded-lg hover:shadow-lg hover:scale-110 hover:-translate-y-1 active:translate-y-0 active:scale-90"
                                >
                                  <XCircle size={15} />
                                  Từ chối
                                </button>
                              </>
                            )}

                            {(r.status === "DA_HUY" ||
                              r.status === "TU_CHOI") && (
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
                {leaveRequests.map((r) => {
                     const isPaid = paidDecisions[r.id] !== undefined ? paidDecisions[r.id] : true;
                     return (
                  <div key={r.id} className="p-4 space-y-4 bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] active:scale-[0.99] transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-color)] font-bold shadow-sm rounded-md">
                          {r.user_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-primary)] text-sm">{r.user_name}</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {r.type === "NGHI_PHEP"
                              ? "Nghỉ phép"
                              : r.type === "DI_MUON"
                                ? "Đi muộn"
                                : r.type || "Nghỉ phép"}
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

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Calendar size={14} className="text-[var(--text-secondary)]" />
                        <span className="font-medium text-[var(--text-primary)]">{formatDate(r.from_date)}</span>
                        <span className="text-[var(--text-secondary)]">→</span>
                        <span className="font-medium text-[var(--text-primary)]">{formatDate(r.to_date)}</span>
                      </div>

                      <div className="bg-[var(--bg-primary)] p-3 border border-[var(--border-color)] rounded-md">
                        <p className="text-xs text-[var(--text-secondary)] mb-1 font-medium">Lý do:</p>
                        <p className="text-sm text-[var(--text-primary)] italic">
                          "{r.reason || "Không có lý do"}"
                        </p>
                      </div>
                      
                      {/* Mobile Paid Toggle */}
                       {r.status === "CHO_DUYET" && (
                          <div className="flex items-center justify-between py-2 border-t border-b border-[var(--border-color)]">
                            <span className="text-sm font-medium text-[var(--text-primary)]">Chế độ lương:</span>
                            <label className="inline-flex items-center cursor-pointer gap-2">
                                <span className={`text-xs font-medium mr-2 ${!isPaid ? 'text-[var(--text-secondary)]' : 'text-gray-400'}`}>Không</span>
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={isPaid}
                                    onChange={() => togglePaidDecision(r.id)}
                                />
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                                <span className={`text-xs font-medium ${isPaid ? 'text-emerald-600' : 'text-gray-400'}`}>
                                    Có lương
                                </span>
                            </label>
                          </div>
                       )}

                    </div>

                    {r.status === "CHO_DUYET" && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleApproveLeave(r.id)}
                          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 rounded-lg hover:shadow-lg hover:scale-105 active:scale-[0.85]"
                        >
                          <CheckCircle size={16} />
                          Duyệt đơn
                        </button>
                        <button
                          onClick={() => handleRejectLeave(r.id)}
                          className="flex-1 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-rose-500 hover:text-white hover:border-rose-500 text-xs font-bold transition-all flex items-center justify-center gap-2 rounded-lg hover:shadow-lg hover:scale-105 active:scale-[0.85]"
                        >
                          <XCircle size={16} />
                          Từ chối
                        </button>
                      </div>
                    )}
                    {(r.status === "DA_HUY" ||
                      r.status === "TU_CHOI") && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="w-full py-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-bold transition-all shadow-sm rounded-lg hover:shadow-md hover:scale-105 active:scale-[0.85]"
                      >
                        Xóa đơn
                      </button>
                    )}
                  </div>
                )})}
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

export default LeavesHeadPage;
