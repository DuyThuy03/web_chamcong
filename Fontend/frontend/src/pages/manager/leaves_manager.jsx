import React, { useEffect, useState } from "react";
import api from "../../service/api";

const LeavesPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

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
        return "bg-yellow-100 text-yellow-800";
      case "DA_DUYET":
        return "bg-green-100 text-green-800";
      case "TU_CHOI":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Quản lý đơn nghỉ phép
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Duyệt và quản lý đơn nghỉ phép của nhân viên
        </p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
          Danh sách đơn nghỉ phép
        </h2>

        {leaveRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Chưa có đơn nghỉ phép nào
          </p>
        ) : (
          <>
            {/* ===== DESKTOP TABLE ===== */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Nhân viên
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Loại nghỉ
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Từ ngày
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Đến ngày
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Lý do
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">
                      Hành động
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {leaveRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {r.user_name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {r.type === "NGHI_PHEP"
                          ? "Nghỉ phép"
                          : r.type === "DI_MUON"
                            ? "Đi muộn"
                            : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(r.from_date)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(r.to_date)}
                      </td>
                      <td className="px-6 py-4 text-sm max-w-xs truncate">
                        {r.reason}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            r.status,
                          )}`}
                        >
                          {getStatusText(r.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {r.status === "CHO_DUYET" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveLeave(r.id)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => handleRejectLeave(r.id)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                        {(r.status === "DA_HUY" ||
                          r.status === "DA_DUYET" ||
                          r.status === "TU_CHOI") && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                          >
                            Xóa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ===== MOBILE CARD LIST ===== */}
            <div className="lg:hidden space-y-4">
              {leaveRequests.map((r) => (
                <div key={r.id} className="border rounded-lg p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-gray-900">{r.user_name}</p>
                    <p className="text-xs text-gray-500">
                      {r.type || "Nghỉ phép"}
                    </p>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Từ:</span>{" "}
                      {formatDate(r.from_date)}
                    </p>
                    <p>
                      <span className="font-medium">Đến:</span>{" "}
                      {formatDate(r.to_date)}
                    </p>
                  </div>

                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Lý do:</span> {r.reason}
                  </p>

                  <div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        r.status,
                      )}`}
                    >
                      {getStatusText(r.status)}
                    </span>
                  </div>

                  {r.status === "CHO_DUYET" && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        onClick={() => handleApproveLeave(r.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => handleRejectLeave(r.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm"
                      >
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
    </div>
  );
};

export default LeavesPage;
