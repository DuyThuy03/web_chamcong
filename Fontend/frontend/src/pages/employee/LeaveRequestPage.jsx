import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../service/api";
import { wsService } from "../../service/ws";
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
  List
} from "lucide-react";

/**
 * LeaveRequestPage.jsx
 * Modernized UI for handling leave requests.
 */
const LeaveRequestPage = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    from_date: "",
    to_date: "",
    reason: "",
    leave_type: "NGHI_PHEP",
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  // Real-time Updates via WebSocket
  useEffect(() => {
    if (!user) return;

    const handlerUpdateLeave = (data) => {
      setLeaveRequests((prev) => {
        const index = prev.findIndex((item) => item.id === data.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [data, ...prev];
      });
    };

    wsService.on("LEAVE_APPROVED", handlerUpdateLeave);
    wsService.on("LEAVE_REJECTED", handlerUpdateLeave);

    return () => {
      wsService.off("LEAVE_APPROVED", handlerUpdateLeave);
      wsService.off("LEAVE_REJECTED", handlerUpdateLeave);
    };
  }, [user]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get("/leaves");
      if (response.data.success) {
        setLeaveRequests(response.data.data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { from_date, to_date, leave_type, reason } = formData;

    // Basic Validation
    if (!from_date || !to_date) return alert("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc");
    
    const today = new Date().toISOString().slice(0, 10);
    if (from_date < today) return alert("Ngày bắt đầu phải từ hôm nay trở đi");
    if (to_date < today) return alert("Ngày kết thúc phải từ hôm nay trở đi");
    if (from_date > to_date) return alert("Ngày bắt đầu không được lớn hơn ngày kết thúc");

    const requestData = {
      type: leave_type,
      from_date: new Date(from_date).toISOString(),
      to_date: new Date(to_date).toISOString(),
      reason: reason?.trim() || null,
    };

    try {
      const response = await api.post("/leaves", requestData);
      if (response.data?.success) {
        alert("Gửi đơn nghỉ phép thành công!");
        setShowForm(false);
        setFormData({ from_date: "", to_date: "", reason: "", leave_type: "NGHI_PHEP" });
        fetchLeaveRequests();
      }
    } catch (error) {
      alert(error.response?.data?.error || "Không thể tạo đơn nghỉ phép");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn này?")) return;
    try {
      await api.put(`/leaves/${id}`);
      fetchLeaveRequests();
    } catch (error) {
      alert("Không thể hủy đơn");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn này?")) return;
    try {
      await api.delete(`/leaves/${id}`);
      fetchLeaveRequests();
    } catch (error) {
      alert("Không thể xóa đơn");
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("vi-VN");

  const getStatusBadge = (status) => {
    const styles = {
      CHO_DUYET: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: Clock, label: "Chờ duyệt" },
      DA_DUYET: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: CheckCircle2, label: "Đã duyệt" },
      TU_CHOI: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", icon: XCircle, label: "Từ chối" },
      DA_HUY: { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", icon: XCircle, label: "Đã hủy" }
    };

    const config = styles[status] || styles.DA_HUY;
    const Icon = config.icon;

    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${config.bg} ${config.text} ${config.border} flex items-center gap-1.5 w-fit`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 font-sans pb-10 bg-[var(--bg-primary)] p-4 md:p-6 transition-colors duration-200">
      
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
            px-4 py-2 rounded-md font-medium transition-all shadow-sm flex items-center justify-center gap-2 text-sm border
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
              <form onSubmit={handleSubmit} className="space-y-4">
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
                          <label className="text-sm font-bold text-[var(--text-secondary)]">Từ ngày</label>
                          <input
                            type="date"
                            value={formData.from_date}
                            onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                            className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-[var(--text-primary)] text-base sm:text-sm appearance-none"
                          />
                       </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-bold text-[var(--text-secondary)]">Đến ngày</label>
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
                      placeholder="Ví dụ: Tôi bị sốt cần đi khám bác sĩ..."
                      className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md focus:ring-1 focus:ring-[var(--accent-color)] outline-none text-[var(--text-primary)] resize-none text-base sm:text-sm appearance-none"
                    />
                 </div>

                 <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[var(--accent-color)] text-white font-bold rounded-md hover:brightness-110 shadow-sm transition-all flex items-center gap-2 text-sm"
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
         <h2 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider pl-1 flex items-center gap-2">
            <List size={16} /> Danh sách đơn đã tạo
            <span className="bg-[var(--accent-color)] text-black text-[10px] px-1.5 py-0.5 rounded-sm font-bold ml-1">
               {leaveRequests.length}
            </span>
         </h2>

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
               <p className="text-[var(--text-secondary)] font-medium text-sm">Bạn chưa tạo đơn nghỉ phép nào.</p>
            </div>
         ) : (
            <div className="grid gap-3">
               {leaveRequests.map((req) => (
                  <div 
                     key={req.id} 
                     className="bg-[var(--bg-secondary)] p-3 rounded-lg shadow-sm border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-all group flex flex-col md:flex-row gap-4 items-start md:items-center"
                  >
                     {/* Icon Type */}
                     <div className={`
                        shrink-0 w-10 h-10 rounded-md flex items-center justify-center border font-bold text-[var(--text-primary)]
                        ${req.type === 'DI_MUON' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-blue-50 border-blue-200 text-blue-600'}
                     `}>
                        {req.type === 'DI_MUON' ? <Clock size={20} /> : <CalendarDays size={20} />}
                     </div>

                     {/* Content */}
                     <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                        <div className="md:col-span-1">
                           <h4 className="font-bold text-[var(--text-primary)] text-sm truncate uppercase">
                              {req.type === 'NGHI_PHEP' ? 'Nghỉ phép ' : req.type === 'DI_MUON' ? 'Đi muộn / Về sớm' : 'Đi muộn'}
                           </h4>
                           <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--border-color)] font-mono text-[var(--text-primary)]">
                                {formatDate(req.from_date)}
                              </span>
                              <span className="text-[var(--text-secondary)] text-[10px]">TO</span>
                              <span className="text-xs bg-[var(--bg-primary)] px-2 py-0.5 rounded border border-[var(--border-color)] font-mono text-[var(--text-primary)]">
                                {formatDate(req.to_date)}
                              </span>
                           </div>
                        </div>
                        
                        <div className="md:col-span-1">
                           <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mb-1">Lý do</p>
                           <p className="text-[var(--text-primary)] text-sm line-clamp-1 italic group-hover:line-clamp-none transition-all">
                              "{req.reason}"
                           </p>
                        </div>

                        <div className="md:col-span-1 flex items-center md:justify-end gap-3">
                           {getStatusBadge(req.status)}
                           
                           {/* Actions */}
                           <div className="flex items-center gap-1">
                              {req.status === 'CHO_DUYET' && (
                                 <button 
                                    onClick={() => handleCancel(req.id)}
                                    className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent transition-all"
                                    title="Hủy đơn"
                                 >
                                    <XCircle size={18} />
                                 </button>
                              )}
                              {(req.status === 'DA_HUY' || req.status === 'DA_DUYET' || req.status === 'TU_CHOI') && (
                                 <button 
                                    onClick={() => handleDelete(req.id)}
                                    className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 hover:border-red-200 border border-transparent transition-all"
                                    title="Xóa lịch sử"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>

    </div>
  );
};

export default LeaveRequestPage;
