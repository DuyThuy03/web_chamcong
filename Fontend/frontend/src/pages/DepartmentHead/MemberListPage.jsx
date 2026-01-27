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
  Shield,
  RefreshCw,
} from "lucide-react";
import api from "../../service/api";
import { useAuth } from "../../contexts/AuthContext";
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
      const responseALL = await api.get("/manager/members");

      if (responseALL.data.success) {
        let filteredMembers = responseALL.data.data;
        // Filter client-side nếu API không hỗ trợ search param
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
          total_pages: Math.ceil(filteredMembers.length / 20) || 1,
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách:", error);
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
        password: "",
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

      if (!isEditing && !payload.password) {
        alert("Vui lòng nhập mật khẩu cho thành viên mới");
        setLoading(false);
        return;
      }
      if (isEditing && !payload.password) {
        delete payload.password;
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
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
          isManager
            ? "bg-purple-50 text-purple-700 border-purple-200"
            : "bg-blue-50 text-blue-700 border-blue-200"
        }`}
      >
        {isManager && <Shield size={12} />}
        {role || "Nhân viên"}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const isActive = status === "Hoạt động";
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
          isActive
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isActive ? "bg-emerald-500" : "bg-slate-400"
          }`}
        ></span>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-10 transition-colors duration-200">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 md:px-8 py-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                <Users className="text-blue-600" size={32} />
                Quản lý thành viên
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
                Danh sách nhân sự thuộc quyền quản lý
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={fetchMembers}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-primary)] hover:brightness-95 text-[var(--text-primary)] rounded-xl font-medium transition-all"
              >
                <RefreshCw size={18} />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
              <button
                onClick={() => openForm()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-sm font-medium transition-all hover:shadow-md"
              >
                <UserPlus size={18} />
                Thêm thành viên
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Search */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] p-4 transition-colors duration-200">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-primary)] pl-10 pr-4 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Table / Mobile List */}
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden transition-colors duration-200">
          {loading && members.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-[var(--text-secondary)] font-medium">Đang tải dữ liệu...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={48} className="mx-auto text-[var(--text-secondary)] mb-3 opacity-50" />
              <p className="text-[var(--text-secondary)] font-medium">
                Không tìm thấy thành viên nào phù hợp
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Thành viên
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Phòng ban
                      </th>
                      <th className="px-6 py-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Vai trò
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
                    {members.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-[var(--bg-primary)] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
                              {m.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--text-primary)]">{m.name}</p>
                              {m.gender && (
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                  {m.gender}
                                </p>
                              )}
                              <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                                <Mail size={12} /> {m.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-[var(--text-secondary)]" />
                            {m.department_name}
                          </div>
                        </td>
                        <td className="px-6 py-4">{getRoleBadge(m.role)}</td>
                        <td className="px-6 py-4">{getStatusBadge(m.status)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetail(m)}
                              className="p-2 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => openForm(m)}
                              className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
              <div className="lg:hidden divide-y divide-[var(--border-color)]">
                {members.map((m) => (
                  <div key={m.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
                        {m.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[var(--text-primary)] truncate">{m.name}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{m.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-[var(--bg-primary)] p-2 rounded-lg">
                        <span className="text-xs text-[var(--text-secondary)]">Phòng ban</span>
                        <p className="font-medium text-[var(--text-primary)] text-xs mt-0.5 truncate">
                          {m.department_name}
                        </p>
                      </div>
                      <div className="bg-[var(--bg-primary)] p-2 rounded-lg">
                        <span className="text-xs text-[var(--text-secondary)]">Vai trò</span>
                        <div className="mt-1">{getRoleBadge(m.role)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {getStatusBadge(m.status)}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetail(m)}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openForm(m)}
                          className="p-2 bg-amber-50 text-amber-600 rounded-lg"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-2 bg-rose-50 text-rose-600 rounded-lg disabled:opacity-30"
                          disabled={m.role === "Trưởng phòng"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="bg-[var(--bg-primary)] px-6 py-4 border-t border-[var(--border-color)] flex flex-col sm:flex-row gap-3 justify-between items-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  Trang <span className="font-bold text-[var(--text-primary)]">{pagination.page}</span> /{" "}
                  <span className="font-bold text-[var(--text-primary)]">{pagination.total_pages}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      pagination.page === 1
                        ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] border-[var(--border-color)]"
                    }`}
                  >
                    <ChevronLeft size={16} className="mr-1" /> Trước
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.total_pages}
                    className={`flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      pagination.page === pagination.total_pages
                        ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] border-[var(--border-color)]"
                    }`}
                  >
                    Sau <ChevronRight size={16} className="ml-1" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- MODAL 1: DETAIL VIEW --- */}
      {isDetailOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Thông tin thành viên
              </h3>
              <button
                onClick={closeDetailModal}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                  {selectedMember.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                    {selectedMember.name}
                  </h2>
                  <p className="text-[var(--text-secondary)] mt-1">
                    {selectedMember.role || "Nhân viên"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                  <Mail className="text-blue-500 mt-0.5" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-secondary)] font-medium">Email</p>
                    <p
                      className="text-sm font-medium text-[var(--text-primary)] truncate mt-1"
                      title={selectedMember.email}
                    >
                      {selectedMember.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <Phone className="text-emerald-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Điện thoại</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">
                      {selectedMember.phone_number || "---"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <Building2 className="text-purple-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Phòng ban</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">
                      {selectedMember.department_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <Calendar className="text-orange-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Ngày sinh</p>
                    <p className="text-sm font-medium text-slate-800 mt-1">
                      {selectedMember.date_of_birth
                        ? formatDate(selectedMember.date_of_birth)
                        : "---"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                <MapPin className="text-rose-500 mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Địa chỉ</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                    {selectedMember.address || "Chưa cập nhật"}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[var(--bg-primary)] px-6 py-4 flex justify-end border-t border-[var(--border-color)]">
              <button
                onClick={closeDetailModal}
                className="px-6 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-primary)] font-medium transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD/EDIT FORM --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <form onSubmit={handleFormSubmit}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)] sticky top-0 z-10">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  {isEditing ? "Chỉnh sửa thành viên" : "Thêm thành viên mới"}
                </h3>
                <button
                  type="button"
                  onClick={closeForm}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                      size={18}
                    />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)] outline-none transition-all text-base sm:text-sm appearance-none"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                      size={18}
                    />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="example@company.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)] outline-none transition-all text-base sm:text-sm appearance-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    {isEditing
                      ? "Mật khẩu mới (Để trống nếu không đổi)"
                      : "Mật khẩu"}
                    {!isEditing && <span className="text-rose-500"> *</span>}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    placeholder="••••••"
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)] outline-none transition-all text-base sm:text-sm appearance-none"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleFormChange}
                    placeholder="0912345678"
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)] outline-none transition-all text-base sm:text-sm appearance-none"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Ngày sinh
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)] outline-none transition-all text-base sm:text-sm appearance-none"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Giới tính
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)] outline-none transition-all text-base sm:text-sm appearance-none"
                  >
                    <option value="">-- Chọn giới tính --</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Trạng thái
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)] outline-none transition-all text-base sm:text-sm appearance-none"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Không hoạt động">Không hoạt động</option>
                  </select>
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Địa chỉ
                  </label>
                  <textarea
                    name="address"
                    rows={3}
                    value={formData.address}
                    onChange={handleFormChange}
                    placeholder="Nhập địa chỉ..."
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)] outline-none resize-none transition-all text-base sm:text-sm appearance-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[var(--bg-primary)] px-6 py-4 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 z-10 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-6 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-primary)] font-medium transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-sm disabled:bg-blue-300 flex items-center justify-center gap-2 transition-all"
                >
                  {loading && (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  )}
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
