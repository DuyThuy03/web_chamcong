import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../service/api";
import { wsService } from "../../service/ws";

const LeaveRequestPage = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    from_date: "",
    to_date: "",
    reason: "",
    leave_type: "NGHI_PHEP",
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, []);
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
      console.log("Leave requests response:", response.data);
      if (response.data.success) {
        const data = response.data.data;
        // Backend returns { requests: [...] }
        const leaveList = data.requests || [];
        console.log("Leave requests:", leaveList);
        setLeaveRequests(leaveList);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      console.error("Error details:", error.response?.data);
      setLeaveRequests([]);
      alert("Không thể tải danh sách nghỉ phép");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Form data before submit:", formData);

    const { from_date, to_date, leave_type, reason } = formData;

    // ===== 1. Validate required fields =====
    if (!from_date || !to_date) {
      alert("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc");
      return;
    }

    // ===== 2. Lấy ngày hôm nay (YYYY-MM-DD) =====
    const today = new Date().toISOString().slice(0, 10);

    // ===== 3. Validate nghiệp vụ ngày =====
    if (from_date < today) {
      alert("Ngày bắt đầu phải từ hôm nay trở đi");
      return;
    }

    if (to_date < today) {
      alert("Ngày kết thúc phải từ hôm nay trở đi");
      return;
    }

    if (from_date > to_date) {
      alert("Ngày bắt đầu không được lớn hơn ngày kết thúc");
      return;
    }

    // ===== 4. Build request data =====
    const requestData = {
      type: leave_type,
      from_date: new Date(from_date).toISOString(),
      to_date: new Date(to_date).toISOString(),
      reason: reason?.trim() || null,
    };

    console.log("Submitting leave request:", requestData);

    try {
      // ===== 5. Call API =====
      const response = await api.post("/leaves", requestData);

      if (response.data?.success) {
        alert("Gửi đơn nghỉ phép thành công!");

        // Reset form
        setShowForm(false);
        setFormData({
          from_date: "",
          to_date: "",
          reason: "",
          leave_type: "NGHI_PHEP",
        });

        fetchLeaveRequests();
      }
    } catch (error) {
      console.error("Error creating leave request:", error);
      alert(error.response?.data?.error || "Không thể tạo đơn nghỉ phép");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn này?")) return;

    try {
      await api.put(`/leaves/${id}`);
      alert("Đã hủy đơn nghỉ phép");
      fetchLeaveRequests();
    } catch (error) {
      console.error("Error cancelling leave request:", error);
      alert("Không thể hủy đơn");
    }
  };
  //hàm xóa đơn nghỉ phép
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Nghỉ phép
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Quản lý đơn xin nghỉ phép của bạn
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition w-full sm:w-auto"
        >
          {showForm ? "Hủy" : "+ Tạo đơn mới"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
            Tạo đơn nghỉ phép
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Leave type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại nghỉ
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) =>
                    setFormData({ ...formData, leave_type: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="NGHI_PHEP">Nghỉ phép</option>
                  <option value="DI_MUON">Đi muộn</option>
                </select>
              </div>

              {/* From date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={formData.from_date}
                  onChange={(e) =>
                    setFormData({ ...formData, from_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* To date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={formData.to_date}
                  onChange={(e) =>
                    setFormData({ ...formData, to_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lý do
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                rows={4}
                placeholder="Nhập lý do nghỉ phép..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold"
            >
              Gửi đơn
            </button>
          </form>
        </div>
      )}

      {/* Leave Requests */}
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
                          <button
                            onClick={() => handleCancel(r.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Hủy
                          </button>
                        )}
                        {(r.status === "DA_HUY" || r.status==="DA_DUYET") && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
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

            {/* ===== MOBILE CARD ===== */}
            <div className="lg:hidden space-y-4">
              {leaveRequests.map((r) => (
                <div key={r.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {r.type || "Nghỉ phép"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(r.from_date)} → {formatDate(r.to_date)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        r.status,
                      )}`}
                    >
                      {getStatusText(r.status)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Lý do:</span> {r.reason}
                  </p>

                  {r.status === "CHO_DUYET" && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="w-full mt-2 text-red-600 border border-red-600 rounded-lg py-2 text-sm font-medium hover:bg-red-50"
                    >
                      Hủy đơn
                    </button>
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

export default LeaveRequestPage;
