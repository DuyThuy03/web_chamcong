import React, { useEffect, useState } from "react";
import api from "../../service/api";
import { useAuth } from "../../contexts/AuthContext";
import { wsService } from "../../service/ws";
import { Calendar, CheckCircle, XCircle, Clock, FileText, User, Filter, AlertCircle, Check, X } from "lucide-react";

const LeavesHeadPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
    const [filterStatus, setFilterStatus] = useState("ALL");

    const filteredRequests = leaveRequests.filter((r) => {
    if (filterStatus === "ALL") return true;
    return r.status === filterStatus;
  });
   const statusCounts = {
    ALL: leaveRequests.length,
    CHO_DUYET: leaveRequests.filter((r) => r.status === "CHO_DUYET").length,
    DA_DUYET: leaveRequests.filter((r) => r.status === "DA_DUYET").length,
    TU_CHOI: leaveRequests.filter((r) => r.status === "TU_CHOI").length,
  };
  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  //ws nhận sự kiện nhân viên gửi đơn nghỉ phép
  useEffect(() => {
    if (!user) return;

    const handlerCreateLeave = (data) => {
      setLeaveRequests((prev) => {
        const exists = prev.some((item) => item.id === data.id);
        if (exists) return prev;
        return [data, ...prev];
      });
    };

    wsService.on("CREATE_LEAVE_REQUEST", handlerCreateLeave);

    return () => {
      wsService.off("CREATE_LEAVE_REQUEST", handlerCreateLeave);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const handlerUpdateLeave = (data) => {
      console.log("WS RECEIVED LEAVE_CANCELED:", data);
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

    wsService.on("LEAVE_CANCELED", handlerUpdateLeave);

    return () => {
      wsService.off("LEAVE_CANCELED", handlerUpdateLeave);
    };
  }, [user]);

  console.log("Yêu cầu đơn nghỉ phép", leaveRequests);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get("/leaves");
      if (response.data.success) {
        setLeaveRequests(response.data.data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      setLeaveRequests([]);
      // alert("Không thể tải danh sách nghỉ phép");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn này?")) return;
    try {
      await api.delete(`/leaves/${id}`);
      alert("Đã xóa đơn nghỉ phép");
      fetchLeaveRequests();
    } catch (error) {
      console.error("Error deleting leave request:", error);
      alert("Không thể xóa đơn");
    }
  };

  const handleApproveLeave = async (leaveId) => {
    if (!window.confirm("Bạn có chắc muốn duyệt đơn này?")) return;

    try {
      await api.put(`/leaves/${leaveId}/approve`);
      alert("Đã duyệt đơn nghỉ phép");
      fetchLeaveRequests();
    } catch (error) {
      console.error("Error approving leave:", error);
      alert("Có lỗi xảy ra khi duyệt đơn");
    }
  };

  const handleRejectLeave = async (leaveId) => {
    if (!window.confirm("Bạn có chắc muốn từ chối đơn này?")) return;

    try {
      await api.put(`/leaves/${leaveId}/reject`);
      alert("Đã từ chối đơn nghỉ phép");
      fetchLeaveRequests();
    } catch (error) {
      console.error("Error rejecting leave:", error);
      alert("Có lỗi xảy ra khi từ chối đơn");
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
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
      switch (status) {
        case "CHO_DUYET": return <Clock size={14} className="mr-1.5" />;
        case "DA_DUYET": return <CheckCircle size={14} className="mr-1.5" />;
        case "TU_CHOI": return <XCircle size={14} className="mr-1.5" />;
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
              <span className="text-sm font-medium text-[var(--text-secondary)] sm:hidden">
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
                onClick={() => setFilterStatus(tab.key)}
                className={`flex-1 sm:flex-none px-4 py-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all flex items-center justify-center gap-2 rounded-md border ${
                  filterStatus === tab.key
                    ? `bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-sm font-bold`
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] border-transparent hover:border-[var(--border-color)]"
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 text-[10px] sm:text-xs font-bold rounded-sm ${
                    filterStatus === tab.key
                      ? `bg-black/20 text-black`
                      : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)]"
                  }`}
                >
                  {statusCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm overflow-hidden rounded-lg transition-colors duration-300">
          {filteredRequests.length === 0 ? (
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
                  <thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                        Nhân viên
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                        Loại nghỉ
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                        Thời gian
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                        Lý do
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-right">
                        Hành động
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                        <td className="px-4 py-3 border-r border-[var(--border-color)]">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-color)] font-bold text-xs shadow-sm rounded-md">
                              {r.user_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-[var(--text-primary)] text-sm">
                              {r.user_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)] border-r border-[var(--border-color)]">
                          {r.type === "NGHI_PHEP"
                            ? "Nghỉ phép"
                            : r.type === "DI_MUON"
                              ? "Đi muộn"
                              : r.type || "Nghỉ phép"}
                        </td>
                        <td className="px-4 py-3 border-r border-[var(--border-color)]">
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
                        <td className="px-4 py-3 max-w-xs border-r border-[var(--border-color)]">
                          <p className="text-sm text-[var(--text-secondary)] truncate" title={r.reason}>
                            {r.reason || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 border-r border-[var(--border-color)]">
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
                                  onClick={() => handleApproveLeave(r.id)}
                                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-all shadow-sm flex items-center gap-1 rounded-md"
                                >
                                  <CheckCircle size={14} />
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => handleRejectLeave(r.id)}
                                  className="px-3 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-sm font-medium transition-all flex items-center gap-1 rounded-md"
                                >
                                  <XCircle size={14} />
                                  Từ chối
                                </button>
                              </>
                            )}
                            {(r.status === "DA_HUY" ||
                              r.status === "DA_DUYET" ||
                              r.status === "TU_CHOI") && (
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-all shadow-sm rounded-md"
                              >
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

              {/* Mobile Card List */}
              <div className="lg:hidden divide-y divide-[var(--border-color)]">
                {filteredRequests.map((r) => (
                  <div key={r.id} className="p-4 space-y-4 bg-[var(--bg-secondary)]">
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
                    </div>

                    {r.status === "CHO_DUYET" && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleApproveLeave(r.id)}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 rounded-md"
                        >
                          <CheckCircle size={14} />
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleRejectLeave(r.id)}
                          className="flex-1 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-2 rounded-md"
                        >
                          <XCircle size={14} />
                          Từ chối
                        </button>
                      </div>
                    )}
                    {(r.status === "DA_HUY" ||
                      r.status === "DA_DUYET" ||
                      r.status === "TU_CHOI") && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-sm rounded-md"
                      >
                        Xóa đơn
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeavesHeadPage;
