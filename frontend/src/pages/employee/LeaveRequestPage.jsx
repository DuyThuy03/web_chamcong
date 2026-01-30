import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../service/api";
import { wsService } from "../../service/ws";
import { useToast } from "../../contexts/ToastContext";
import { 
  Plus, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Trash2, 
  X,
  Send,
  Loader2,
  CalendarDays,
  List,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

/**
 * LeaveRequestPage.jsx
 * Modernized UI for handling leave requests.
 */
const LeaveRequestPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Form State
  const [formData, setFormData] = useState({
    from_date: "",
    to_date: "",
    reason: "",
    leave_type: "NGHI_PHEP",
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, [currentPage, filterStatus]);

  useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      }
  }, [totalPages]);

  // Real-time Updates via WebSocket
  useEffect(() => {
    if (!user) return;

    const handlerUpdateLeave = (data) => {
      // With server-side pagination, simpler to just refetch
      fetchLeaveRequests();
      fetchCounts();
    };

    wsService.on("LEAVE_APPROVED", handlerUpdateLeave);
    wsService.on("LEAVE_REJECTED", handlerUpdateLeave);

    return () => {
      wsService.off("LEAVE_APPROVED", handlerUpdateLeave);
      wsService.off("LEAVE_REJECTED", handlerUpdateLeave);
    };
  }, [user, filterStatus, currentPage]);

  useEffect(() => {
    if (user) {
        fetchCounts();
    }
  }, [user]);

  // Counts state
  const [statusCounts, setStatusCounts] = useState({
    ALL: 0,
    CHO_DUYET: 0,
    DA_DUYET: 0,
    TU_CHOI: 0,
    DA_HUY: 0
  });

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
        // Update counts if provided by API (we will implement this next)
        if (response.data.data.counts) {
            setStatusCounts(response.data.data.counts);
        }
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const statuses = ["ALL", "CHO_DUYET", "DA_DUYET", "TU_CHOI", "DA_HUY"];
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
      const newCounts = { ...statusCounts };

      statuses.forEach((status, index) => {
        const response = results[index];
        if (response.data.success && response.data.data.pagination) {
          newCounts[status] = response.data.data.pagination.total;
        }
      });

      setStatusCounts(newCounts);
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { from_date, to_date, leave_type, reason } = formData;
    const newErrors = [];

    // Validation
    if (!from_date) newErrors.push("Vui lòng chọn ngày bắt đầu.");
    if (!to_date) newErrors.push("Vui lòng chọn ngày kết thúc.");
    if (!reason?.trim()) newErrors.push("Vui lòng nhập lý do cụ thể.");

    const today = new Date().toISOString().slice(0, 10);
    if (from_date && from_date < today) newErrors.push("Ngày bắt đầu phải từ hôm nay trở đi.");
    if (to_date && to_date < today) newErrors.push("Ngày kết thúc phải từ hôm nay trở đi.");
    if (from_date && to_date && from_date > to_date) newErrors.push("Ngày bắt đầu không được lớn hơn ngày kết thúc.");

    if (newErrors.length > 0) {
      setError(newErrors);
      return;
    }

    const requestData = {
      type: leave_type,
      from_date: new Date(from_date).toISOString(),
      to_date: new Date(to_date).toISOString(),
      reason: reason?.trim() || null,
    };

    try {
      const response = await api.post("/leaves", requestData);
      if (response.data?.success) {
        toast.success("Gửi đơn nghỉ phép thành công!");
        setShowForm(false);
        setFormData({ from_date: "", to_date: "", reason: "", leave_type: "NGHI_PHEP" });
        fetchLeaveRequests();
        fetchCounts();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Không thể tạo đơn nghỉ phép");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn này?")) return;
    try {
      await api.put(`/leaves/${id}`);
      fetchLeaveRequests();
      fetchCounts();
      toast.success("Đã hủy đơn thành công");
    } catch (error) {
      toast.error("Không thể hủy đơn");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn này?")) return;
    try {
      await api.delete(`/leaves/${id}`);
      fetchLeaveRequests();
      fetchCounts();
      toast.success("Đã xóa đơn thành công");
    } catch (error) {
      toast.error("Không thể xóa đơn");
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("vi-VN");

  const getStatusBadge = (status) => {
    const styles = {
      CHO_DUYET: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
      DA_DUYET: "bg-green-50 text-green-700 border-green-200 ring-green-600/20",
      TU_CHOI: "bg-red-50 text-red-700 border-red-200 ring-red-600/20",
      DA_HUY: "bg-gray-50 text-gray-700 border-gray-200 ring-gray-500/20"
    };

    const labels = {
      CHO_DUYET: "Chờ duyệt",
      DA_DUYET: "Đã duyệt",
      TU_CHOI: "Từ chối",
      DA_HUY: "Đã hủy"
    };

    const icons = {
      CHO_DUYET: Clock,
      DA_DUYET: CheckCircle2,
      TU_CHOI: XCircle,
      DA_HUY: XCircle
    };

    const style = styles[status] || styles.DA_HUY;
    const label = labels[status] || status;
    const Icon = icons[status] || AlertCircle;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold border ${style}`}>
        <Icon size={14} />
        {label}
      </span>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-4 font-sans max-w-7xl mx-auto transition-colors duration-200">
      
      {/* 1. Header & Actions */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-300">
        <div>
           <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
              <div className="p-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                <FileText className="text-[var(--accent-color)] w-5 h-5" />
              </div>
              Quản lý nghỉ phép
           </h1>
           <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 ml-10">Tạo và theo dõi các đơn đăng ký nghỉ của bạn</p>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className={`
            px-4 py-2 rounded-md font-medium transition-all shadow-sm flex items-center justify-center gap-2 text-sm border hover:shadow-lg hover:scale-112 hover:-translate-y-1 active:scale-[0.85]
            ${showForm 
               ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-secondary)]" 
               : "bg-[var(--accent-color)] text-white border-transparent hover:brightness-110"
            }
          `}
          style={!showForm ? { color: "#000" } : {}}
        >
          {showForm ?  <><X size={16}/> Đóng lại</> : <><Plus size={16}/> Tạo đơn mới</>}
        </button>
      </div>

      {/* 2. Create Form Section (Collapsible) */}
      {showForm && (
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 transition-colors duration-300">
           <div className="bg-[var(--bg-primary)] px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2 text-[var(--text-primary)] font-bold text-sm uppercase">
              <FileText size={16} /> Form đăng ký nghỉ phép
           </div>
           
           <div className="p-4">
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
              
              {error && (error.length > 0 || typeof error === 'string') && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-3 rounded-r flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300 mb-4">
                  {Array.isArray(error) ? (
                    <ul className="list-disc list-inside text-sm font-medium space-y-1">
                      {error.map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm font-medium">{error}</span>
                  )}
                </div>
              )}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Types */}
                    <div className="space-y-1.5">
                       <label className="text-sm font-bold text-[var(--text-secondary)]">Loại hình nghỉ</label>
                       <div className="relative">
                          <select
                            value={formData.leave_type}
                            onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                            className="w-full pl-3 pr-8 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] outline-none appearance-none font-medium text-[var(--text-primary)] text-base sm:text-sm cursor-pointer"
                          >
                            <option value="NGHI_PHEP">Nghỉ phép </option>
                            <option value="DI_MUON">Đi muộn / Về sớm</option>
                            
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">
                             <Calendar size={14} />
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1.5">
                          <label className="text-sm font-bold text-[var(--text-secondary)]">Từ ngày <span className="text-rose-500">*</span></label>
                          <input
                            type="date"
                            value={formData.from_date}
                            onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                            className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-[var(--text-primary)] text-base sm:text-sm appearance-none"
                          />
                       </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-[var(--text-secondary)]">Đến ngày <span className="text-rose-500">*</span></label>
                          <input
                            type="date"
                            value={formData.to_date}
                            onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                            className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-[var(--text-primary)] text-base sm:text-sm appearance-none"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-sm font-bold text-[var(--text-secondary)]">Lý do cụ thể</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      rows={2}
                      placeholder="Ví dụ:Em xin nghỉ vì có việc lên trường"
                      required = {true}
                      className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-[var(--text-primary)] resize-none text-base sm:text-sm appearance-none"
                    />
                 </div>

                 <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[var(--accent-color)] text-white font-bold rounded-md hover:brightness-110 shadow-sm transition-all flex items-center gap-2 text-sm hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 active:scale-[0.85]"
                      style={{ color: "#000" }}
                    >
                       <Send size={16} /> Gửi yêu cầu
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* 3. Requests List */}
      <div className="space-y-4">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider pl-1 flex items-center gap-2">
               <List size={16} /> Danh sách đơn đã tạo
            </h2>
            
             {/* Filter Tabs */}
             <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm p-2 rounded-lg transition-colors duration-300 mt-2 sm:mt-0 w-full  sm:w-auto">
               <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 mr-2 mb-1 w-full sm:w-auto sm:hidden">
                    <Filter size={16} className="text-[var(--text-secondary)] shrink-0" />
                    <span className="text-sm font-medium text-[var(--text-secondary)]">
                      Lọc theo trạng thái:
                    </span>
                  </div>
                 {[
                   { key: "ALL", label: "Tất cả" },
                   { key: "CHO_DUYET", label: "Chờ duyệt" },
                   { key: "DA_DUYET", label: "Đã duyệt" },
                   { key: "TU_CHOI", label: "Từ chối" },
                   { key: "DA_HUY", label: "Đã hủy" },
                 ].map((tab) => (
                   <button
                     key={tab.key}
                     onClick={() => handleFilterChange(tab.key)}
                     className={`flex-1 sm:flex-none px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all flex items-center justify-center gap-2 rounded-md border active:scale-90 ${
                       filterStatus === tab.key
                         ? `bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-md hover:shadow-lg transform scale-105 hover:-translate-y-0.5`
                         : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] border-transparent hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] hover:shadow-md hover:-translate-y-0.5"
                     }`}
                   >
                     {tab.label}
                    <span
                      className={`ml-2 px-1.5 py-0.5 text-xs rounded-full transition-colors ${
                        filterStatus === tab.key
                          ? "bg-white/20 text-white"
                          : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"
                      }`}
                    >
                      {statusCounts[tab.key] || 0}
                    </span>
                   </button>
                 ))}
               </div>
             </div>
         </div>

         {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg">
               <Loader2 className="animate-spin mb-2 text-[var(--accent-color)]" size={24} />
               <p className="text-sm font-medium">Đang tải dữ liệu...</p>
            </div>
         ) : leaveRequests.length === 0 ? (
            <div className="py-12 text-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
               <div className="w-12 h-12 bg-[var(--bg-primary)] rounded-md flex items-center justify-center mx-auto mb-3 text-[var(--text-secondary)] border border-[var(--border-color)]">
                  <FileText size={24} />
               </div>
               <p className="text-[var(--text-secondary)] font-medium text-sm">
                  {filterStatus !== "ALL" ? "Không tìm thấy đơn nào theo bộ lọc." : "Bạn chưa tạo đơn nghỉ phép nào."}
               </p>
            </div>
         ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden lg:block overflow-x-auto rounded-lg border border-[var(--border-color)]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[var(--bg-primary)] border-b-2 border-slate-600 [.light_&]:border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">Loại nghỉ</th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">Thời gian</th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">Lý do</th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">Trạng thái</th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {leaveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-[var(--accent-color)]/10 even:bg-black/50 [.light_&]:even:bg-gray-50 border-b-2 border-slate-600 [.light_&]:border-slate-200 transition-colors">
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                           <div className="flex items-center gap-3">
                              <div className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center border font-bold ${req.type === 'DI_MUON' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                                 {req.type === 'DI_MUON' ? <Clock size={16} /> : <CalendarDays size={16} />}
                              </div>
                              <span className="font-bold text-sm text-[var(--text-primary)]">
                                {req.type === 'NGHI_PHEP' ? 'Nghỉ phép' : req.type === 'DI_MUON' ? 'Đi muộn / Về sớm' : 'Đi muộn'}
                              </span>
                           </div>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                           <div className="flex flex-col text-sm">
                              <span className="font-medium text-[var(--text-primary)]">{formatDate(req.from_date)}</span>
                              <span className="text-[10px] text-[var(--text-secondary)]">đến {formatDate(req.to_date)}</span>
                           </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px] border-r border-slate-600 [.light_&]:border-slate-200">
                           <p className="text-sm text-[var(--text-primary)] truncate" title={req.reason}>
                              {req.reason}
                           </p>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                           {getStatusBadge(req.status)}
                        </td>
                        <td className="px-4 py-3 text-center">
                           <div className="flex justify-center items-center gap-2">
                              {req.status === 'CHO_DUYET' && (
                                 <button 
                                    onClick={() => handleCancel(req.id)}
                                    className="px-5 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-rose-500 hover:text-white hover:border-rose-500 text-sm font-bold transition-all flex items-center justify-center gap-2 rounded-lg hover:shadow-lg hover:scale-110 hover:-translate-y-1 active:translate-y-0 active:scale-90"
                                    title="Hủy đơn"
                                 >
                                    <XCircle size={15} />
                                    Hủy
                                 </button>
                              )}
                              {(req.status === 'DA_HUY' || req.status === 'DA_DUYET' || req.status === 'TU_CHOI') && (
                                 <button 
                                    onClick={() => handleDelete(req.id)}
                                    className="px-5 py-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-sm font-bold transition-all shadow-sm rounded-lg hover:shadow-lg hover:scale-110 hover:-translate-y-1 active:translate-y-0 active:scale-90 flex items-center justify-center gap-2"
                                    title="Xóa"
                                 >
                                    <Trash2 size={15} />
                                    Xóa
                                 </button>
                              )}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD LIST */}
              <div className="lg:hidden grid gap-3">
                {leaveRequests.map((req) => (
                  <div 
                     key={req.id} 
                     className="bg-[var(--bg-secondary)] p-3 rounded-lg shadow-sm border border-[var(--border-color)] active:scale-[0.99] transition-all"
                  >
                     <div className="flex items-start gap-3">
                        <div className={`shrink-0 w-10 h-10 rounded-md flex items-center justify-center border font-bold ${req.type === 'DI_MUON' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                           {req.type === 'DI_MUON' ? <Clock size={20} /> : <CalendarDays size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start">
                              <h4 className="font-bold text-[var(--text-primary)] text-sm uppercase">
                                 {req.type === 'NGHI_PHEP' ? 'Nghỉ phép' : req.type === 'DI_MUON' ? 'Đi muộn / Về sớm' : 'Đi muộn'}
                              </h4>
                              {getStatusBadge(req.status)}
                           </div>
                           
                           <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--border-color)] font-mono text-[var(--text-primary)]">
                                {formatDate(req.from_date)}
                              </span>
                              <span className="text-[var(--text-secondary)] text-[10px]">TO</span>
                              <span className="text-xs bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--border-color)] font-mono text-[var(--text-primary)]">
                                {formatDate(req.to_date)}
                              </span>
                           </div>
                           
                           <div className="mt-2 bg-[var(--bg-primary)] p-2 rounded-md border border-[var(--border-color)]">
                              <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-0.5">Lý do</p>
                              <p className="text-sm text-[var(--text-primary)] italic line-clamp-2">"{req.reason}"</p>
                           </div>

                           <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-[var(--border-color)]">
                              {req.status === 'CHO_DUYET' && (
                                 <button 
                                    onClick={() => handleCancel(req.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                                 >
                                    <XCircle size={14} /> Hủy đơn
                                 </button>
                              )}
                              {(req.status === 'DA_HUY' || req.status === 'DA_DUYET' || req.status === 'TU_CHOI') && (
                                 <button 
                                    onClick={() => handleDelete(req.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                 >
                                    <Trash2 size={14} /> Xóa lịch sử
                                 </button>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
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
            </>
         )}
      </div>

    </div>
  );
};

export default LeaveRequestPage;
