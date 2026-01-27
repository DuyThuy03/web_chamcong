import React, { useEffect, useState } from "react";
import api from "../../service/api";
import { useAuth } from "../../contexts/AuthContext";
import { wsService } from "../../service/ws";
import {
  FileText,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

const LeavesHeadPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  // WebSocket - nhận sự kiện nhân viên gửi đơn nghỉ phép
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
      alert("Không thể tải danh sách nghỉ phép");
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
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DA_DUYET":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "TU_CHOI":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "DA_HUY":
        return "bg-slate-50 text-slate-700 border-slate-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
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
      case "CHO_DUYET":
        return <Clock size={14} />;
      case "DA_DUYET":
        return <CheckCircle2 size={14} />;
      case "TU_CHOI":
        return <XCircle size={14} />;
      case "DA_HUY":
        return <AlertCircle size={14} />;
      default:
        return null;
    }
  };

  // Filter logic
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-10 transition-colors duration-200">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 md:px-8 py-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                <FileText className="text-blue-600" size={32} />
                Quản lý đơn nghỉ phép
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
                Duyệt và quản lý đơn nghỉ phép của nhân viên trong phòng ban
              </p>
            </div>

            <button
              onClick={fetchLeaveRequests}
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--accent-color)] hover:brightness-110 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md"
            >
              <RefreshCw size={18} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Filter Tabs */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] p-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 mr-2 mb-1 w-full sm:w-auto">
              <Filter size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-sm font-medium text-[var(--text-secondary)] sm:hidden">
                Lọc theo trạng thái:
              </span>
            </div>
            {[
              { key: "ALL", label: "Tất cả", color: "slate" },
              { key: "CHO_DUYET", label: "Chờ duyệt", color: "amber" },
              { key: "DA_DUYET", label: "Đã duyệt", color: "emerald" },
              { key: "TU_CHOI", label: "Từ chối", color: "rose" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`flex-1 sm:flex-none px-3 py-2 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all flex items-center justify-center gap-2 ${
                  filterStatus === tab.key
                    ? `bg-${tab.color}-100 text-${tab.color}-700 shadow-sm ring-1 ring-${tab.color}-200`
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] border border-transparent hover:border-[var(--border-color)]"
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-bold ${
                    filterStatus === tab.key
                      ? `bg-${tab.color}-200/50`
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {statusCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={48} className="mx-auto text-[var(--text-secondary)] mb-3 opacity-50" />
              <p className="text-[var(--text-secondary)] font-medium">
                Không có đơn nghỉ phép nào
              </p>
              <p className="text-sm text-[var(--text-secondary)] mt-1 opacity-70">
                {filterStatus !== "ALL"
                  ? "Thử thay đổi bộ lọc để xem các đơn khác"
                  : "Chưa có đơn nghỉ phép nào được gửi"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Nhân viên
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Loại nghỉ
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Thời gian
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Lý do
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-right">
                        Hành động
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--border-color)]">
                    {filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-bold text-sm shadow-sm">
                              {r.user_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">
                              {r.user_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {r.type === "NGHI_PHEP"
                            ? "Nghỉ phép"
                            : r.type === "DI_MUON"
                              ? "Đi muộn"
                              : r.type || "Nghỉ phép"}
                        </td>
                        <td className="px-6 py-4">
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
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm text-[var(--text-secondary)] truncate" title={r.reason}>
                            {r.reason || "-"}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border ${getStatusColor(
                              r.status,
                            )}`}
                          >
                            {getStatusIcon(r.status)}
                            {getStatusText(r.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            {r.status === "CHO_DUYET" && (
                              <>
                                <button
                                  onClick={() => handleApproveLeave(r.id)}
                                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-1"
                                >
                                  <CheckCircle2 size={14} />
                                  Duyệt
                                </button>
                                <button
                                  onClick={() => handleRejectLeave(r.id)}
                                  className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
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
                                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
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
                  <div key={r.id} className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-bold shadow-sm">
                          {r.user_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-primary)]">{r.user_name}</p>
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
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border shrink-0 ${getStatusColor(
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
                        <span className="font-medium">{formatDate(r.from_date)}</span>
                        <span className="text-[var(--text-secondary)]">→</span>
                        <span className="font-medium">{formatDate(r.to_date)}</span>
                      </div>

                      <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border-color)]">
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
                          className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={16} />
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleRejectLeave(r.id)}
                          className="flex-1 py-2.5 bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle size={16} />
                          Từ chối
                        </button>
                      </div>
                    )}
                    {(r.status === "DA_HUY" ||
                      r.status === "DA_DUYET" ||
                      r.status === "TU_CHOI") && (
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-bold transition-all shadow-sm"
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
