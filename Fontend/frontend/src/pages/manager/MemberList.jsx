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
 const [departments, setDepartments] = useState([]);
  // State for form data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department_id: "",
    role: "",
    status: "Hoạt động",
    phone_number: "",
    address: "",
    password: "",
    gender: "",
    date_of_birth: "",
  });

  // --- Effects ---
  // --- Effects ---
  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, searchTerm]);

  useEffect(() => {
    getDepartment();
  }, []);

  // --- Functions ---
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const responseALL = await api.get("/users");

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
  const getDepartment = async () => {
    try {
      const response = await api.get("/departments");
      console.log(response.data);
      if (response.data.success) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách phòng ban:", error);
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
      // Find department ID based on name if not explicit (assuming unique names)
      const dept = departments.find((d) => d.name === member.department_name);
      setFormData({
        id: member.id,
        name: member.name,
        email: member.email,
        department_id: member.department_id || dept?.id || "",
        role: member.role,
        status: member.status || "Hoạt động",
        phone_number: member.phone_number || "",
        address: member.address || "",
        gender: member.gender || "",
        date_of_birth: member.date_of_birth
          ? new Date(member.date_of_birth).toISOString().split("T")[0]
          : "",
        password: "",
      });
      setIsEditing(true);
    } else {
      const userDept = departments.find((d) => d.name === user?.department_name);
      setFormData({
        name: "",
        email: "",
        department_id: userDept?.id || "",
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
      const payload = {
        ...formData,
        department_id: parseInt(formData.department_id),
      };

      if (!isEditing && !payload.password) {
        alert("Vui lòng nhập mật khẩu cho thành viên mới");
        setLoading(false);
        return;
      }
      
      // Handle ID for Create vs Update
      if (!isEditing) {
        // Remove ID for new creation to allow DB auto-increment
        delete payload.id;
      } else {
        // For update, remove password if empty
        if (!payload.password) {
          delete payload.password;
        }
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
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] space-y-4 transition-colors duration-200">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm p-4 rounded-lg transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
              <div className="p-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md">
                <Users className="w-5 h-5 text-[var(--accent-color)]" />
              </div>
              QUẢN LÝ THÀNH VIÊN
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 ml-10">
              Danh sách nhân sự thuộc quyền quản lý
            </p>
          </div>

          <div className="flex flex-wrap gap-2 ml-10 md:ml-0">
            <button
              onClick={fetchMembers}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] font-medium transition-all shadow-sm text-sm rounded-md"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              onClick={() => openForm()}
              className="flex items-center gap-2 bg-[var(--accent-color)] hover:brightness-110 text-white px-3 py-2 shadow-sm font-medium transition-all text-sm rounded-md"
            >
              <UserPlus size={16} />
              Thêm thành viên
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {/* Search & Utility Bar */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm p-3 rounded-lg transition-colors duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Search size={16} className="text-[var(--text-secondary)]" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] focus:ring-1 focus:ring-[var(--accent-color)] focus:border-[var(--accent-color)] outline-none transition-all text-[var(--text-primary)] placeholder-[var(--text-secondary)] text-sm rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Table / Mobile List */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm overflow-hidden rounded-lg transition-colors duration-300">
          {loading && members.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-secondary)]">
              <div className="w-8 h-8 border-4 border-[var(--accent-color)]/30 border-t-[var(--accent-color)] rounded-full animate-spin mx-auto mb-3"></div>
              <p className="font-medium text-sm">Đang tải dữ liệu...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={32} className="mx-auto text-[var(--text-secondary)] mb-3 opacity-50" />
              <p className="text-[var(--text-secondary)] font-medium text-sm">
                Không tìm thấy thành viên nào phù hợp
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                        Thành viên
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                        Phòng ban
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)]">
                        Vai trò
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
                    {members.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-[var(--bg-primary)] transition-colors"
                      >
                        <td className="px-4 py-3 border-r border-[var(--border-color)]">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[var(--accent-color)] text-sm shadow-sm rounded-md">
                              {m.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--text-primary)] text-sm">{m.name}</p>
                              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                                <Mail size={10} /> {m.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)] border-r border-[var(--border-color)]">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-[var(--text-secondary)]" />
                            {m.department_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-[var(--border-color)]">{getRoleBadge(m.role)}</td>
                        <td className="px-4 py-3 border-r border-[var(--border-color)]">{getStatusBadge(m.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleViewDetail(m)}
                              className="p-1.5 border border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors rounded-md"
                              title="Xem chi tiết"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => openForm(m)}
                              className="p-1.5 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white transition-colors rounded-md"
                              title="Chỉnh sửa"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-1.5 border border-rose-500/30 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-md"
                              title="Xóa"
                              disabled={m.role === "Trưởng phòng"}
                            >
                              <Trash2 size={16} />
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
                  <div key={m.id} className="p-4 space-y-3 bg-[var(--bg-secondary)]">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[var(--accent-color)] shadow-sm shrink-0 rounded-md">
                        {m.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[var(--text-primary)] truncate text-sm">{m.name}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{m.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-[var(--bg-primary)] p-2 border border-[var(--border-color)] rounded-md">
                        <span className="text-xs text-[var(--text-secondary)]">Phòng ban</span>
                        <p className="font-medium text-[var(--text-primary)] text-xs mt-0.5 truncate">
                          {m.department_name}
                        </p>
                      </div>
                      <div className="bg-[var(--bg-primary)] p-2 border border-[var(--border-color)] rounded-md">
                        <span className="text-xs text-[var(--text-secondary)]">Vai trò</span>
                        <div className="mt-1">{getRoleBadge(m.role)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {getStatusBadge(m.status)}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetail(m)}
                          className="p-2 border border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white transition-all rounded-md"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => openForm(m)}
                          className="p-2 border border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-all rounded-md"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-2 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 rounded-md"
                          disabled={m.role === "Trưởng phòng"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="bg-[var(--bg-secondary)] px-4 py-3 border-t border-[var(--border-color)] flex flex-col sm:flex-row gap-3 justify-between items-center transition-colors duration-300">
                <p className="text-xs text-[var(--text-secondary)]">
                  Trang <span className="font-bold text-[var(--text-primary)]">{pagination.page}</span> /{" "}
                  <span className="font-bold text-[var(--text-primary)]">{pagination.total_pages}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className={`flex items-center px-3 py-1.5 border text-xs font-medium transition-all rounded-md ${
                      pagination.page === 1
                        ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] hover:text-[var(--accent-color)] border-[var(--border-color)] hover:border-[var(--accent-color)]"
                    }`}
                  >
                    <ChevronLeft size={14} className="mr-1" /> Trước
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.total_pages}
                    className={`flex items-center px-3 py-1.5 border text-xs font-medium transition-all rounded-md ${
                      pagination.page === pagination.total_pages
                        ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] hover:text-[var(--accent-color)] border-[var(--border-color)] hover:border-[var(--accent-color)]"
                    }`}
                  >
                    Sau <ChevronRight size={14} className="ml-1" />
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
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-[var(--border-color)]">
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
                <div className="h-20 w-20 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-3xl font-bold text-[var(--accent-color)] shadow-lg">
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
                <div className="flex items-start gap-3 p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                  <Phone className="text-emerald-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">Điện thoại</p>
                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                      {selectedMember.phone_number || "---"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                  <Building2 className="text-purple-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">Phòng ban</p>
                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
                      {selectedMember.department_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                  <Calendar className="text-orange-500 mt-0.5" size={20} />
                  <div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">Ngày sinh</p>
                    <p className="text-sm font-medium text-[var(--text-primary)] mt-1">
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
          <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto border border-[var(--border-color)]">
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
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-gray-500 text-base sm:text-sm appearance-none"
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
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-gray-500 text-base sm:text-sm appearance-none"
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
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-gray-500 text-base sm:text-sm appearance-none"
                  />
                </div>

                {/* Department */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Phòng ban <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                      size={18}
                    />
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleFormChange}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all appearance-none cursor-pointer text-base sm:text-sm"
                    >
                      <option value="">-- Chọn phòng ban --</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none mr-2">
                      <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
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
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-gray-500 text-base sm:text-sm appearance-none"
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
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all text-base sm:text-sm appearance-none"
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
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all text-base sm:text-sm appearance-none"
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
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all text-base sm:text-sm appearance-none"
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
                    className="w-full px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl focus:ring-2 focus:ring-[var(--accent-color)] outline-none resize-none transition-all placeholder-gray-500"
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
                  className="px-6 py-2.5 bg-[var(--accent-color)] text-white/90 rounded-xl hover:brightness-110 font-medium shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  style={{ color: '#000' }}
                >
                  {loading && (
                    <span className="animate-spin h-4 w-4 border-2 border-slate-800 border-t-transparent rounded-full"></span>
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
