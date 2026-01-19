import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  UserPlus,
  Eye,
  Edit,
  Trash2,
  Mail,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
} from "lucide-react";
import api from "../service/api";
import { formatDate } from "../until/helper";

const MemberListPage = () => {
  // --- States ---
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [selectedMember, setSelectedMember] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // State for form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department_name: "",
    role: "",
    status: "Hoạt động",
  });

  const [isEditing, setIsEditing] = useState(false);

  // --- Effects ---
  useEffect(() => {
    fetchMembers();
  }, [pagination.page, searchTerm]); // Reload khi trang hoặc search thay đổi

  // --- Functions ---
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const responseALL = await api.get("/manager/members");

      if (responseALL.data.success) {
        let filteredMembers = responseALL.data.data;

        // Filter by search term
        if (searchTerm.trim()) {
          filteredMembers = filteredMembers.filter(
            (member) =>
              member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              member.email.toLowerCase().includes(searchTerm.toLowerCase()),
          );
        }

        setMembers(filteredMembers);
        setPagination({
          ...responseALL.data.pagination,
          total: filteredMembers.length,
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách:", error);
      alert("Không thể tải danh sách thành viên");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
    }
  };

  const handleViewDetail = (member) => {
    setSelectedMember(member);
    setIsDetailOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa thành viên này không?")) {
      try {
        await api.delete(`/manager/members/${id}`);
        alert("Xóa thành viên thành công");
        fetchMembers();
      } catch (error) {
        console.error("Xóa thất bại", error);
        alert("Xóa thất bại. Vui lòng thử lại.");
      }
    }
  };

  // Open form for adding/editing member
  const openForm = (member = null) => {
    if (member) {
      setFormData({
        id: member.id,
        name: member.name,
        email: member.email,
        department_name: member.department_name,
        role: member.role,
        status: member.status || "Hoạt động",
      });
      setIsEditing(true);
    } else {
      setFormData({
        name: "",
        email: "",
        department_name: "",
        role: "",
        status: "Hoạt động",
      });
      setIsEditing(false);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setFormData({
      name: "",
      email: "",
      department_name: "",
      role: "",
      status: "Hoạt động",
    });
  };

  const closeDetailModal = () => {
    setIsDetailOpen(false);
    setSelectedMember(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        await api.put(`/manager/members/${formData.id}`, formData);
        alert("Cập nhật thành viên thành công!");
      } else {
        await api.post("/manager/members", formData);
        alert("Thêm thành viên thành công!");
      }
      fetchMembers();
      closeForm();
    } catch (error) {
      console.error("Lỗi khi thêm/cập nhật thành viên:", error);
      alert(error.response?.data?.error || "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers render ---
  const getRoleBadge = (role) => {
    const isManager = role === "Trưởng phòng";
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          isManager
            ? "bg-purple-100 text-purple-700 border-purple-200"
            : "bg-blue-100 text-blue-700 border-blue-200"
        }`}
      >
        {role}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const isActive = status === "Hoạt động";
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? "bg-green-500" : "bg-gray-400"}`}
        ></span>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Quản lý thành viên
          </h1>
          <p className="text-gray-500 mt-1">
            Danh sách nhân sự thuộc quyền quản lý
          </p>
        </div>
        <button
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition-colors shadow-sm font-medium"
          onClick={() => openForm()}
        >
          <UserPlus size={18} />
          Thêm thành viên
        </button>
      </div>

      {/* 2. Filters & Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative max-w-md w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 3. Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            Đang tải dữ liệu...
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Không tìm thấy thành viên nào.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Thành viên
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Phòng ban
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {/* Avatar Circle */}
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm border border-blue-200">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail size={12} /> {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Building2
                            size={14}
                            className="mr-1.5 text-gray-400"
                          />
                          {member.department_name || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(member.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(member.status || "Hoạt động")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewDetail(member)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="Chỉnh sửa"
                            onClick={() => openForm(member)}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Xóa"
                            onClick={() => handleDelete(member.id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Hiển thị{" "}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{" "}
                đến{" "}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}
                </span>{" "}
                của <span className="font-medium">{pagination.total}</span> kết
                quả
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                >
                  <ChevronLeft size={16} /> Trước
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.total_pages}
                  className="px-3 py-1 border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                >
                  Sau <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailOpen && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                Chi tiết thành viên
              </h2>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl border-2 border-blue-200">
                    {selectedMember.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedMember.name}
                    </h3>
                    <p className="text-gray-500">{selectedMember.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phòng ban
                    </label>
                    <p className="mt-1 text-gray-900">
                      {selectedMember.department_name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Vai trò
                    </label>
                    <p className="mt-1">{getRoleBadge(selectedMember.role)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Trạng thái
                    </label>
                    <p className="mt-1">
                      {getStatusBadge(selectedMember.status || "Hoạt động")}
                    </p>
                  </div>
                  {selectedMember.phone_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Số điện thoại
                      </label>
                      <p className="mt-1 text-gray-900">
                        {selectedMember.phone_number}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={closeDetailModal}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {isEditing ? "Chỉnh sửa thành viên" : "Thêm thành viên mới"}
              </h2>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={isEditing}
                  />
                  {isEditing && (
                    <p className="text-xs text-gray-500 mt-1">
                      Email không thể thay đổi
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phòng ban <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="department_name"
                    value={formData.department_name}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Chọn vai trò</option>
                    <option value="Nhân viên">Nhân viên</option>
                    <option value="Trưởng phòng">Trưởng phòng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Không hoạt động">Không hoạt động</option>
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading
                    ? "Đang xử lý..."
                    : isEditing
                      ? "Cập nhật"
                      : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberListPage;
