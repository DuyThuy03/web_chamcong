import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../service/api";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Edit2,
  Save,
  X,
} from "lucide-react";

const EmployeeDashboard = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    address: "",
    gender: "",
    date_of_birth: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  console.log("USER DATA IN DASHBOARD:", user);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone_number: user.phone_number || "",
        address: user.address || "",
        gender: user.gender || "",
        date_of_birth: user.date_of_birth
          ? user.date_of_birth.split("T")[0]
          : "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const submitData = {
      ...formData,
      email: user.email, // Backend requires email
    };

    console.log("Submitting profile update with data:", submitData);

    try {
      const response = await api.put("/profile", submitData);
      console.log("UPDATE PROFILE RESPONSE:", response);
      console.log("Response data:", response.data);

      if (response.data.success) {
        updateUser(response.data.data);
        setSuccess("Cập nhật thông tin thành công!");
        setEditing(false);
      } else {
        setError("Cập nhật không thành công");
      }
    } catch (err) {
      console.error("UPDATE PROFILE ERROR:", err);
      console.error("Error response:", err.response);
      setError(err.response?.data?.error || "Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name || "",
      phone_number: user.phone_number || "",
      address: user.address || "",
      gender: user.gender || "",
      date_of_birth: user.date_of_birth ? user.date_of_birth.split("T")[0] : "",
    });
    setEditing(false);
    setError("");
    setSuccess("");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Thông Tin Cá Nhân</h1>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Edit2 size={18} />
            Chỉnh sửa
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
            >
              <X size={18} />
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
            >
              <Save size={18} />
              {loading ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Họ tên */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User size={18} />
                Họ và tên
              </label>
              {editing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">
                  {user?.name || "-"}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Mail size={18} />
                Email
              </label>
              <p className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600">
                {user?.email || "-"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Email không thể thay đổi
              </p>
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Phone size={18} />
                Số điện thoại
              </label>
              {editing ? (
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">
                  {user?.phone_number || "-"}
                </p>
              )}
            </div>

            {/* Phòng ban */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Briefcase size={18} />
                Phòng ban
              </label>
              <p className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600">
                {user?.department_name || "-"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Phòng ban không thể thay đổi
              </p>
            </div>

            {/* Giới tính */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User size={18} />
                Giới tính
              </label>
              {editing ? (
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">
                  {user?.gender || "-"}
                </p>
              )}
            </div>

            {/* Ngày sinh */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar size={18} />
                Ngày sinh
              </label>
              {editing ? (
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">
                  {user?.date_of_birth
                    ? new Date(user.date_of_birth).toLocaleDateString("vi-VN")
                    : "-"}
                </p>
              )}
            </div>

            {/* Vai trò */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User size={18} />
                Vai trò
              </label>
              <p className="px-4 py-2 bg-gray-100 rounded-lg text-gray-600">
                {user?.role || "-"}
              </p>
            </div>

            {/* Địa chỉ */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin size={18} />
                Địa chỉ
              </label>
              {editing ? (
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg">
                  {user?.address || "-"}
                </p>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <button
          onClick={() => navigate("/attendance")}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-md p-6 text-center transition-all duration-200"
        >
          <svg
            className="w-12 h-12 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <h3 className="text-xl font-semibold">Chấm công</h3>
        </button>

        <button
          onClick={() => navigate("/history")}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-md p-6 text-center transition-all duration-200"
        >
          <svg
            className="w-12 h-12 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold">Lịch sử chấm công</h3>
        </button>

        <button
          onClick={() => navigate("/leave-request")}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-md p-6 text-center transition-all duration-200"
        >
          <svg
            className="w-12 h-12 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-xl font-semibold">Xin nghỉ phép</h3>
        </button>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
