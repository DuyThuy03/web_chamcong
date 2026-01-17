import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import api from "../service/api";

const LeaveRequestPage = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    reason: "",
    leave_type: "NGHI_PHEP",
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

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

    // Validate dates
    if (!formData.start_date || !formData.end_date) {
      alert("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc");
      return;
    }

    try {
      // Convert dates to RFC3339 format (e.g., "2026-01-18T00:00:00+07:00")
      const fromDate = new Date(
        formData.start_date + "T00:00:00+07:00",
      ).toISOString();
      const toDate = new Date(
        formData.end_date + "T23:59:59+07:00",
      ).toISOString();

      // Map frontend field names to backend field names
      const requestData = {
        type: formData.leave_type,
        from_date: fromDate,
        to_date: toDate,
        reason: formData.reason,
      };

      console.log("Submitting leave request:", requestData);

      const response = await api.post("/leaves", requestData);
      console.log("Leave request response:", response.data);

      if (response.data.success) {
        alert("Gửi đơn nghỉ phép thành công!");
        setShowForm(false);
        setFormData({
          start_date: "",
          end_date: "",
          reason: "",
          leave_type: "NGHI_PHEP",
        });
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error("Error creating leave request:", error);
      console.error("Error response:", error.response);
      alert(error.response?.data?.error || "Không thể tạo đơn nghỉ phép");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Bạn có chắc muốn hủy đơn này?")) return;

    try {
      await api.delete(`/leaves/${id}`);
      alert("Đã hủy đơn nghỉ phép");
      fetchLeaveRequests();
    } catch (error) {
      console.error("Error cancelling leave request:", error);
      alert("Không thể hủy đơn");
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
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Nghỉ phép</h1>
          <p className="text-gray-600 mt-2">
            Quản lý đơn xin nghỉ phép của bạn
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
        >
          {showForm ? "Hủy" : "+ Tạo đơn mới"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Tạo đơn nghỉ phép
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Loại nghỉ
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) =>
                    setFormData({ ...formData, leave_type: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="NGHI_PHEP">Nghỉ phép</option>

                  <option value="DI_MUON">Đi muộn</option>
                  <option value="VE_SOM">Về sớm</option>

                  <option value="KHAC">Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                Lý do
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                placeholder="Nhập lý do nghỉ phép..."
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
            >
              Gửi đơn
            </button>
          </form>
        </div>
      )}

      {/* Leave Requests List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Danh sách đơn nghỉ phép
        </h2>
        {leaveRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Chưa có đơn nghỉ phép nào
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Loại nghỉ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Từ ngày
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Đến ngày
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Lý do
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(leaveRequests) &&
                  leaveRequests.map((requests) => (
                    <tr key={requests.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {requests.type || "Nghỉ phép"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(requests.from_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(requests.to_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {requests.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            requests.status,
                          )}`}
                        >
                          {getStatusText(requests.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {requests.status === "CHO_DUYET" && (
                          <button
                            onClick={() => handleCancel(requests.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Hủy
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveRequestPage;
