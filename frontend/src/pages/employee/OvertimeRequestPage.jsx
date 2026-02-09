import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../service/api";
import { wsService } from "../../service/ws";
import { useToast } from "../../contexts/ToastContext";
import { formatTimeOnly } from "../../until/helper";
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
  List,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

/**
 * OvertimeRequestPage.jsx
 * UI for handling overtime requests.
 */
const OvertimeRequestPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Form State
  const [formData, setFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    content: "" // Add Work Content
  });

  useEffect(() => {
    fetchRequests();
  }, [currentPage, filterStatus]);

  useEffect(() => {
    if (user) {
      const handlerUpdate = () => {
        fetchRequests();
      };

      wsService.on("OVERTIME_APPROVED", handlerUpdate);
      wsService.on("OVERTIME_REJECTED", handlerUpdate);

      return () => {
        wsService.off("OVERTIME_APPROVED", handlerUpdate);
        wsService.off("OVERTIME_REJECTED", handlerUpdate);
      };
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit,
      });
      if (filterStatus && filterStatus !== "ALL") {
        queryParams.append("status", filterStatus);
      }
      
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

  const handleFilterChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { date, start_time, end_time, content } = formData;
    const newErrors = [];

    if (!date) newErrors.push("Vui lòng chọn ngày tăng ca.");
    if (!start_time) newErrors.push("Vui lòng chọn giờ bắt đầu.");
    if (!end_time) newErrors.push("Vui lòng chọn giờ kết thúc.");
    if (!content) newErrors.push("Vui lòng nhập nội dung công việc.");
    if (start_time && end_time && start_time >= end_time) {
        newErrors.push("Giờ kết thúc phải sau giờ bắt đầu.");
    }

    if (newErrors.length > 0) {
      setError(newErrors);
      return;
    }

    try {
      const response = await api.post("/overtime", formData);
      if (response.data?.success) {
        toast.success("Gửi đơn OT thành công!");
        setShowForm(false);
        setFormData({ date: "", start_time: "", end_time: "", content: "" });
        fetchRequests();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Không thể tạo đơn OT");
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

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("vi-VN");

  const getStatusBadge = (status) => {
    const styles = {
      CHO_DUYET: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20",
      DA_DUYET: "bg-green-50 text-green-700 border-green-200 ring-green-600/20",
      TU_CHOI: "bg-red-50 text-red-700 border-red-200 ring-red-600/20",
    };

    const labels = {
      CHO_DUYET: "Chờ duyệt",
      DA_DUYET: "Đã duyệt",
      TU_CHOI: "Từ chối",
    };

    const icons = {
      CHO_DUYET: Clock,
      DA_DUYET: CheckCircle2,
      TU_CHOI: XCircle,
    };

    const style = styles[status] || styles.CHO_DUYET;
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
                <Clock className="text-[var(--accent-color)] w-5 h-5" />
              </div>
              Đăng ký làm thêm giờ (OT)
           </h1>
           <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 ml-10">Tạo và theo dõi các yêu cầu OT của bạn</p>
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
          {showForm ?  <><X size={16}/> Đóng lại</> : <><Plus size={16}/> Tạo đơn OT</>}
        </button>
      </div>

      {/* 2. Create Form Section */}
      {showForm && (
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-color)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 transition-colors duration-300">
           <div className="bg-[var(--bg-primary)] px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2 text-[var(--text-primary)] font-bold text-sm uppercase">
              <FileText size={16} /> Form đăng ký OT
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
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-sm font-bold text-[var(--text-secondary)]">Ngày làm thêm <span className="text-rose-500">*</span></label>
                       <div className="relative">
                          <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-[var(--text-primary)] text-base sm:text-sm appearance-none"
                          />
                       </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-[var(--text-secondary)]">Bắt đầu <span className="text-rose-500">*</span></label>
                        <input
                            type="time"
                            value={formData.start_time}
                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                            className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-[var(--text-primary)] text-base sm:text-sm appearance-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-[var(--text-secondary)]">Kết thúc <span className="text-rose-500">*</span></label>
                        <input
                            type="time"
                            value={formData.end_time}
                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                            className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-[var(--text-primary)] text-base sm:text-sm appearance-none"
                        />
                    </div>
                    <div className="space-y-1.5 md:col-span-3">
                         <label className="text-sm font-bold text-[var(--text-secondary)]">Nội dung công việc</label>
                         <textarea
                             value={formData.content}
                             onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                             placeholder="Mô tả công việc cần làm thêm giờ..."
                             rows={3}
                             className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-[var(--text-primary)] text-base sm:text-sm appearance-none resize-none"
                         />
                    </div>
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
               <List size={16} /> Danh sách đơn OT
            </h2>
            
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
         ) : requests.length === 0 ? (
            <div className="py-12 text-center bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
               <div className="w-12 h-12 bg-[var(--bg-primary)] rounded-md flex items-center justify-center mx-auto mb-3 text-[var(--text-secondary)] border border-[var(--border-color)]">
                  <Clock size={24} />
               </div>
               <p className="text-[var(--text-secondary)] font-medium text-sm">
                  {filterStatus !== "ALL" ? "Không tìm thấy đơn nào theo bộ lọc." : "Bạn chưa tạo đơn OT nào."}
               </p>
            </div>
         ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden lg:block overflow-x-auto rounded-lg border border-[var(--border-color)]">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[var(--bg-primary)] border-b-2 border-slate-600 [.light_&]:border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">Ngày</th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">Thời gian</th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">Tổng giờ</th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">Giờ quy đổi</th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">Nội dung</th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">Trạng thái</th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-[var(--accent-color)]/10 even:bg-black/50 [.light_&]:even:bg-gray-50 border-b-2 border-slate-600 [.light_&]:border-slate-200 transition-colors">
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                           <div className="flex items-center gap-3">
                              <Calendar size={16} className="text-[var(--text-secondary)]" />
                              <span className="font-bold text-sm text-[var(--text-primary)]">
                                {formatDate(req.day)}
                              </span>
                           </div>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                           <div className="text-sm text-[var(--text-primary)]">
                              {formatTimeOnly(req.start_time)} - {formatTimeOnly(req.end_time)} 
                           </div>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                           <span className="font-bold text-[var(--text-primary)]">{req.total_hours}h</span>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                           {req.status === 'CHO_DUYET' ? (
                               <span className="text-[var(--text-secondary)] text-sm italic">-</span>
                           ) : (
                               <span className="font-bold text-blue-600">{(req.total_hours * (req.adjusted_rate || 1)).toFixed(2)}h</span>
                           )}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                           <span className="text-sm text-[var(--text-secondary)] line-clamp-2" title={req.content}>
                             {req.content || "-"}
                           </span>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
                           {getStatusBadge(req.status)}
                        </td>
                        <td className="px-4 py-3 text-center">
                           {req.status === 'CHO_DUYET' && (
                              <button 
                                 onClick={() => handleDelete(req.id)}
                                 className="px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white text-sm font-bold transition-all shadow-sm rounded-lg flex items-center justify-center gap-2 mx-auto"
                                 title="Xóa"
                              >
                                 <Trash2 size={14} /> Xóa
                              </button>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

               {/* MOBILE CARD */}
               <div className="lg:hidden grid gap-3">
                {requests.map((req) => (
                  <div key={req.id} className="bg-[var(--bg-secondary)] p-3 rounded-lg shadow-sm border border-[var(--border-color)]">
                     <div className="flex justify-between items-start">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <Calendar size={14} className="text-[var(--text-secondary)]" />
                              <span className="font-bold text-[var(--text-primary)]">{formatDate(req.day)}</span>
                           </div>
                           <div className="text-sm text-[var(--text-secondary)]">
                              {req.start_time} - {req.end_time} ({req.total_hours}h)
                           </div>
                           {req.status !== 'CHO_DUYET' && (
                               <div className="text-sm font-medium text-blue-600 mt-0.5">
                                   Quy đổi: {(req.total_hours * (req.adjusted_rate || 1)).toFixed(2)}h
                               </div>
                           )}
                           <div className="text-sm text-[var(--text-secondary)] mt-1 italic">
                              {req.content ? `"${req.content}"` : ""}
                           </div>
                        </div>
                        {getStatusBadge(req.status)}
                     </div>
                     {req.status === 'CHO_DUYET' && (
                        <div className="mt-3 pt-2 border-t border-[var(--border-color)] flex justify-end">
                           <button 
                              onClick={() => handleDelete(req.id)}
                              className="text-white bg-rose-500 px-3 py-1 rounded text-xs font-bold"
                           >
                              Xóa đơn
                           </button>
                        </div>
                     )}
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

export default OvertimeRequestPage;
