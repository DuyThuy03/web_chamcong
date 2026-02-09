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
import { wsService } from "../../service/ws";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
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
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Modal State
  const [selectedMember, setSelectedMember] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");

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
    base_salary: "",
  });

  // --- Effects ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, debouncedSearchTerm]);

  // WebSocket Handlers
  useEffect(() => {
    if (!user) return;

    const handleUserCreated = (newUser) => {
      // Logic to check if user belongs to this department (for Department Head)
      if (user.role === "Trưởng phòng" && newUser.department_id !== user.department_id) {
          return;
      }
      // Add to list, prepend
      setMembers((prev) => [newUser, ...prev]);
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
    };

    const handleUserUpdated = (updatedUser) => {
      setMembers((prev) =>
        prev.map((m) => (m.id === updatedUser.id ? updatedUser : m))
      );
      // Update selected member if it is the one being updated
      setSelectedMember(prev => prev?.id === updatedUser.id ? updatedUser : prev);
    };

    const handleUserDeleted = (data) => {
      // data is { id: ... }
      const deletedId = data.id;
      setMembers((prev) => prev.filter((m) => m.id !== deletedId));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      
      // Close modal if deleting selected member
      setSelectedMember(prev => {
          if (prev?.id === deletedId) {
              setIsDetailOpen(false);
              return null;
          }
          return prev;
      });
    };

    wsService.on("USER_CREATED", handleUserCreated);
    wsService.on("USER_UPDATED", handleUserUpdated);
    wsService.on("USER_DELETED", handleUserDeleted);

    return () => {
      wsService.off("USER_CREATED", handleUserCreated);
      wsService.off("USER_UPDATED", handleUserUpdated);
      wsService.off("USER_DELETED", handleUserDeleted);
    };
  }, [user]);

  // --- Functions ---
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const responseALL = await api.get("/manager/members");

      if (responseALL.data.success) {
        let filteredMembers = responseALL.data.data;
        // Filter client-side nếu API không hỗ trợ search param
        if (debouncedSearchTerm.trim()) {
          filteredMembers = filteredMembers.filter(
            (member) =>
              member.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
              member.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
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
        toast.success("Xóa thành viên thành công");
        fetchMembers();
      } catch (error) {
        console.error("Xóa thất bại", error);
        toast.error("Xóa thất bại. Vui lòng thử lại.");
      }
    }
  };

  const openForm = (member = null) => {
    setError("");
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
        base_salary: member.base_salary || "",
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
        base_salary: "",
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
    setError("");

    // --- Validation ---
    const newErrors = [];
    if (!formData.name.trim()) newErrors.push("Vui lòng nhập họ và tên.");
    if (!formData.email.trim()) newErrors.push("Vui lòng nhập Email.");
    else if (!formData.email.includes("@")) newErrors.push("Vui lòng nhập đúng định dạng Email (thiếu ký tự @).");
    
    if (!formData.phone_number.trim()) newErrors.push("Vui lòng nhập số điện thoại.");
    if (!formData.phone_number.match(/^[0-9]{10}$/)) newErrors.push("Vui lòng nhập đúng định dạng số điện thoại (10 số).");
    if (!formData.date_of_birth) newErrors.push("Vui lòng chọn ngày sinh.");
    if (formData.date_of_birth > Date.now()) newErrors.push("Ngày sinh không được lớn hơn ngày hiện tại.");
    if (!formData.gender) newErrors.push("Vui lòng chọn giới tính.");
    if (!formData.address.trim()) newErrors.push("Vui lòng nhập địa chỉ.");
    
    // Salary validation (optional)
    if (formData.base_salary && isNaN(parseFloat(formData.base_salary))) {
      newErrors.push("Lương cơ bản phải là số.");
    }

    const payload = { 
        ...formData,
        base_salary: formData.base_salary ? parseFloat(formData.base_salary) : 0,
    };

    if (!isEditing && !payload.password) newErrors.push("Vui lòng nhập mật khẩu cho thành viên mới.");
    if (isEditing && !payload.password) {
      delete payload.password;
    }

    if (newErrors.length > 0) {
      setError(newErrors);
      setLoading(false);
      return;
    }

    try {
      if (isEditing) {
        await api.put(`/manager/members/${formData.id}`, payload);
        toast.success("Cập nhật thành viên thành công!");
      } else {
        await api.post("/manager/members", payload);
        toast.success("Thêm thành viên thành công!");
      }

      fetchMembers();
      closeForm();
    } catch (error) {
      console.error("Lỗi:", error);
      toast.error(error.response?.data?.error || "Có lỗi xảy ra.");
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
              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] text-[var(--text-primary)] border border-[var(--border-color)] font-medium transition-all shadow-sm text-sm rounded-md hover:shadow-lg hover:scale-105 hover:-translate-y-1 active:scale-90 active:translate-y-0 active:shadow-inner"
            >
              <RefreshCw size={16} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              onClick={() => openForm()}
              className="flex items-center gap-2 bg-[var(--accent-color)] hover:brightness-110 text-black px-3 py-2 shadow-sm font-medium transition-all text-sm rounded-md hover:shadow-lg hover:scale-105 hover:-translate-y-1 active:scale-90 active:translate-y-0 active:shadow-inner"
            >
              <UserPlus size={16} />
              Thêm thành viên
            </button>
          </div>
        </div>
      </div>

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
        <div className="bg-transparent lg:bg-[var(--bg-secondary)] lg:border lg:border-[var(--border-color)] lg:shadow-sm overflow-hidden lg:rounded-lg transition-colors duration-300">
          {loading && members.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-[var(--text-secondary)] font-medium">Đang tải dữ liệu...</p>
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
                <table className="w-full text-left">
                  <thead className="bg-[var(--bg-primary)] border-b-2 border-slate-600 [.light_&]:border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Thành viên
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Phòng ban
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Vai trò
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider border-r border-slate-600 [.light_&]:border-slate-200">
                        Trạng thái
                      </th>
                      <th className="px-4 py-4 text-xs font-bold text-white [.light_&]:text-gray-700 uppercase tracking-wider text-right">
                        Hành động
                      </th>
                    </tr>
                  </thead>

                  <tbody className="">
                    {members.map((m) => (
                      <tr
                        key={m.id}
                        className="hover:bg-[var(--accent-color)]/10 even:bg-black/50 [.light_&]:even:bg-gray-50 border-b-2 border-slate-600 [.light_&]:border-slate-200 transition-colors"
                      >
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">
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
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)] border-r border-slate-600 [.light_&]:border-slate-200">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-[var(--text-secondary)]" />
                            {m.department_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">{getRoleBadge(m.role)}</td>
                        <td className="px-4 py-3 border-r border-slate-600 [.light_&]:border-slate-200">{getStatusBadge(m.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetail(m)}
                              className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all rounded-lg shadow-sm hover:shadow-lg hover:scale-110 hover:-translate-y-1 active:scale-90 active:translate-y-0 active:shadow-none"
                              title="Xem chi tiết"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => openForm(m)}
                              className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all rounded-lg shadow-sm hover:shadow-lg hover:scale-110 hover:-translate-y-1 active:scale-90 active:translate-y-0 active:shadow-none"
                              title="Chỉnh sửa"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-lg shadow-sm hover:shadow-lg hover:scale-110 hover:-translate-y-1 active:scale-90 active:translate-y-0 active:shadow-none"
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
              <div className="lg:hidden space-y-3">
                {members.map((m) => (
                  <div 
                    key={m.id} 
                    className="p-4 bg-[var(--bg-secondary)] shadow-md rounded-2xl border border-[var(--border-color)] active:scale-[0.99] transition-transform duration-100"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[var(--accent-color)] shadow-sm shrink-0 rounded-xl">
                        {m.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[var(--text-primary)] truncate text-sm">{m.name}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{m.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div className="p-2.5 border border-[var(--border-color)] rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">Phòng ban</span>
                        <p className="font-medium text-[var(--text-primary)] text-xs mt-0.5 truncate">
                          {m.department_name}
                        </p>
                      </div>
                      <div className="p-2.5 border border-[var(--border-color)] rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">Vai trò</span>
                        <div className="mt-1 transform scale-95 origin-top-left">{getRoleBadge(m.role)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="transform scale-90 origin-left">
                        {getStatusBadge(m.status)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDetail(m)}
                          className="p-3 text-blue-500 bg-blue-100/50 hover:bg-blue-500 hover:text-white transition-all rounded-xl active:scale-75 active:shadow-inner"
                        >
                          <Eye size={24} />
                        </button>
                        <button
                          onClick={() => openForm(m)}
                          className="p-3 text-amber-500 bg-amber-100/50 hover:bg-amber-500 hover:text-white transition-all rounded-xl active:scale-75 active:shadow-inner"
                        >
                          <Edit size={24} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-3 text-rose-500 bg-rose-100/50 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 rounded-xl active:scale-75 active:shadow-inner"
                          disabled={m.role === "Trưởng phòng"}
                        >
                          <Trash2 size={24} />
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
                    className={`flex items-center px-3 py-1.5 border text-xs font-medium transition-all rounded-md active:scale-95 ${
                      pagination.page === 1
                        ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] hover:text-[var(--accent-color)] border-[var(--border-color)] hover:border-[var(--accent-color)] hover:shadow-md"
                    }`}
                  >
                    <ChevronLeft size={14} className="mr-1" /> Trước
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.total_pages}
                    className={`flex items-center px-3 py-1.5 border text-xs font-medium transition-all rounded-md active:scale-95 ${
                      pagination.page === pagination.total_pages
                        ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] hover:text-[var(--accent-color)] border-[var(--border-color)] hover:border-[var(--accent-color)] hover:shadow-md"
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
                className="px-6 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-primary)] font-medium transition-all hover:scale-105 hover:-translate-y-1 hover:shadow-lg active:scale-95 active:translate-y-0 active:shadow-none"
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
            <form onSubmit={handleFormSubmit} noValidate>
              {/* Header */}
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)] sticky top-0 z-10">
                <h3 className="text-lg font-bold text-[var(--text-secondary)]">
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

              {error && (error.length > 0 || typeof error === 'string') && (
                <div className="px-6 pt-4">
                  <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-3 rounded-r flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    {Array.isArray(error) ? (
                      <ul className="list-disc list-inside text-sm font-medium space-y-1">
                        {error.map((err, index) => (
                          <li key={index}>{err}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm font-medium">{error}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                      size={16}
                    />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-gray-500 text-sm"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                      size={16}
                    />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="example@company.com"
                      className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-gray-500 text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
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
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-gray-500 text-sm"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleFormChange}
                    placeholder="0912345678"
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-gray-500 text-sm"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Ngày sinh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all text-sm"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Giới tính <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all text-sm"
                  >
                    <option value="">-- Chọn giới tính --</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                {/* Base Salary */}
                <div className="sm:col-span-1">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Lương cơ bản
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-semibold text-sm">
                      ₫
                    </span>
                    <input
                      type="number"
                      name="base_salary"
                      value={formData.base_salary}
                      onChange={handleFormChange}
                      placeholder="Nhập mức lương..."
                      className="w-full pl-9 pr-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all placeholder-gray-500 text-sm"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Trạng thái
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none transition-all text-sm"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Không hoạt động">Không hoạt động</option>
                  </select>
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Địa chỉ <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    value={formData.address}
                    onChange={handleFormChange}
                    placeholder="Nhập địa chỉ..."
                    className="w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg focus:ring-2 focus:ring-[var(--accent-color)] outline-none resize-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-[var(--bg-primary)] px-6 py-4 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 z-10 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-6 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-primary)] font-medium transition-all active:scale-95 hover:scale-105 active:shadow-inner"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-sm disabled:bg-blue-300 flex items-center justify-center gap-2 transition-all hover:scale-110 active:scale-95 active:shadow-inner"
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
