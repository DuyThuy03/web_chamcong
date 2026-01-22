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
  MapPin,
  User,
} from "lucide-react";
import api from "../../service/api"; // Đảm bảo đường dẫn đúng
import { useAuth } from "../../contexts/AuthContext"; // Đảm bảo đường dẫn đúng
import { formatDate } from "../../until/helper";

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
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [selectedMember, setSelectedMember] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // State for form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department_name: "",
    role: "",
    status: "Hoạt động",
    phone_number: "",
    address: "",
    password: "",
    gender: "",
    date_of_birth: "",
  });

  // --- Effects ---
  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, searchTerm]);

  // --- Functions ---
  const fetchMembers = async () => {
    setLoading(true);
    try {
      // Giả lập API call nếu chưa có backend thực tế, thay thế bằng api.get của bạn
      const responseALL = await api.get("/users");
console.log("tất cả thành viên", responseALL)
      if (responseALL.data.success) {
        let filteredMembers = responseALL.data.data;
        // Filter client-side nếu API không hỗ trợ search param
        if (searchTerm.trim()) {
          filteredMembers = filteredMembers.filter(
            (member) =>
              member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              member.email.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setMembers(filteredMembers);
        setPagination({
          ...responseALL.data.pagination,
          total: filteredMembers.length,
          total_pages: Math.ceil(filteredMembers.length / 20) || 1, // Fallback nếu API không trả về total_pages
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách:", error);
      // alert("Không thể tải danh sách thành viên");
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

  const openForm = (member = null) => {
    if (member) {
      setFormData({
        id: member.id,
        name: member.name,
        email: member.email,
        department_name: member.department_name,
        role: member.role,
        status: member.status || "Hoạt động",
        phone_number: member.phone_number || "",
        address: member.address || "",
        gender: member.gender || "",
        date_of_birth: member.date_of_birth || "",
        password: "", // Không điền password khi edit
      });
      setIsEditing(true);
    } else {
      setFormData({
        name: "",
        email: "",
        department_name: user?.department_name || "",
        role: "",
        status: "Hoạt động",
        phone_number: "",
        address: "",
        gender: "",
        date_of_birth: "",
        password: "",
      });
      setIsEditing(false);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    // Reset form logic handled in openForm usually, but good to clean up
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
      const payload = { ...formData };
      
      // Xử lý logic password
      if (!isEditing && !payload.password) {
          alert("Vui lòng nhập mật khẩu cho thành viên mới");
          setLoading(false);
          return;
      }
      if (isEditing && !payload.password) {
          delete payload.password; // Không gửi field password nếu rỗng khi edit
      }

      if (isEditing) {
        await api.put(`/manager/members/${formData.id}`, payload);
        alert("Cập nhật thành viên thành công!");
      } else {
        await api.post("/manager/members", payload);
        alert("Thêm thành viên thành công!");
      }

      fetchMembers();
      closeForm();
    } catch (error) {
      console.error("Lỗi:", error);
      alert(error.response?.data?.error || "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  // --- Render Helpers ---
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
        {role || "Nhân viên"}
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
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            isActive ? "bg-green-500" : "bg-gray-400"
          }`}
        ></span>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-blue-600" /> Quản lý thành viên
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Danh sách nhân sự thuộc quyền quản lý
          </p>
        </div>

        <button
          onClick={() => openForm()}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg shadow-sm font-medium transition-colors cursor-pointer"
        >
          <UserPlus size={18} />
          Thêm thành viên
        </button>
      </div>

      {/* 2. Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* 3. Table / Mobile List */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {loading && members.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Đang tải dữ liệu...
          </div>
        ) : members.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            Không tìm thấy thành viên nào phù hợp.
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
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

                <tbody className="divide-y divide-gray-200">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm">
                            {m.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{m.name}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail size={12} /> {m.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {m.department_name}
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(m.role)}</td>
                      <td className="px-6 py-4">{getStatusBadge(m.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewDetail(m)}
                            className="p-2 rounded-full text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => openForm(m)}
                            className="p-2 rounded-full text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-2 rounded-full text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Xóa"
                            disabled={m.role === "Trưởng phòng"}
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

            {/* MOBILE CARD LIST */}
            <div className="lg:hidden divide-y divide-gray-200">
              {members.map((m) => (
                <div key={m.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                      {m.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
                    <div><span className="font-medium">Phòng:</span> {m.department_name}</div>
                    <div className="flex items-center gap-2">{getRoleBadge(m.role)}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                     {getStatusBadge(m.status)}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetail(m)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-lg cursor-pointer"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openForm(m)}
                        className="p-2 bg-amber-50 text-amber-600 rounded-lg cursor-pointer"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <p className="text-sm text-gray-600">
                Trang <span className="font-medium">{pagination.page}</span> / <span className="font-medium">{pagination.total_pages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`flex items-center px-3 py-1.5 rounded border text-sm font-medium ${
                    pagination.page === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
                  }`}
                >
                  <ChevronLeft size={16} className="mr-1" /> Trước
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.total_pages}
                  className={`flex items-center px-3 py-1.5 rounded border text-sm font-medium ${
                    pagination.page === pagination.total_pages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
                  }`}
                >
                  Sau <ChevronRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* --- MODAL 1: DETAIL VIEW --- */}
      {isDetailOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">Thông tin thành viên</h3>
              <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                    {selectedMember.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedMember.name}</h2>
                    <p className="text-gray-500">{selectedMember.role || "Nhân viên"}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Mail className="text-blue-500" size={20}/>
                      <div className="overflow-hidden">
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm font-medium truncate" title={selectedMember.email}>{selectedMember.email}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Phone className="text-green-500" size={20}/>
                      <div>
                          <p className="text-xs text-gray-500">Điện thoại</p>
                          <p className="text-sm font-medium">{selectedMember.phone_number || "---"}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Building2 className="text-purple-500" size={20}/>
                      <div>
                          <p className="text-xs text-gray-500">Phòng ban</p>
                          <p className="text-sm font-medium">{selectedMember.department_name}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="text-orange-500" size={20}/>
                      <div>
                          <p className="text-xs text-gray-500">Ngày sinh</p>
                          <p className="text-sm font-medium">{selectedMember.date_of_birth ? formatDate(selectedMember.date_of_birth) : "---"}</p>
                      </div>
                  </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="text-red-500 mt-0.5" size={20}/>
                  <div>
                      <p className="text-xs text-gray-500">Địa chỉ</p>
                      <p className="text-sm font-medium">{selectedMember.address || "Chưa cập nhật"}</p>
                  </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button onClick={closeDetailModal} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium cursor-pointer">
                    Đóng
                </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD/EDIT FORM --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <form onSubmit={handleFormSubmit}>
              <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 sticky top-0 z-10">
                <h3 className="text-lg font-semibold text-gray-800">
                  {isEditing ? "Chỉnh sửa thành viên" : "Thêm thành viên mới"}
                </h3>
                <button type="button" onClick={closeForm} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Nguyễn Văn A"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleFormChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="example@company.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEditing ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu"}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="••••••"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0912345678"
                  />
                </div>

                 {/* DOB */}
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Chọn giới tính --</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Ngưng hoạt động">Ngưng hoạt động</option>
                  </select>
                </div>

                 {/* Address */}
                 <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                  <textarea
                    name="address"
                    rows="2"
                    value={formData.address}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Nhập địa chỉ..."
                  ></textarea>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 sticky bottom-0 z-10 border-t">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm cursor-pointer disabled:bg-blue-300 flex items-center gap-2"
                >
                  {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>}
                  {isEditing ? "Lưu thay đổi" : "Thêm mới"}
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