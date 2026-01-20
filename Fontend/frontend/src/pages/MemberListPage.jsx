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
import { useAuth } from "../contexts/AuthContext";

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

  //hàm tìm theo tên hoặc email
  const filterMembers = (members, term) => {
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(term.toLowerCase()) ||
        member.email.toLowerCase().includes(term.toLowerCase()),
    );
  };

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
        department_name: user.department_name || "",
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
    setFormData({
      name: "",
      email: "",
      department_name: user.department_name || "",
      role: "",
      status: "Hoạt động",
      phone_number: "",
      address: "",
      password: "",
      gender: "",
      date_of_birth: "",
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
      if (!isEditing && (!formData.password || !formData.password.trim())) {
        alert("Vui lòng nhập mật khẩu");
        return;
      }

      const payload = {
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone_number,
        address: formData.address,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
      };

      if (isEditing) {
        if (formData.password && formData.password.trim()) {
          payload.new_password = formData.password;
        }

        await api.put(`/manager/members/${formData.id}`, payload);
        alert("Cập nhật thành viên thành công!");
      } else {
        payload.password = formData.password;

        await api.post("/manager/members", payload);
        setSearchTerm("");
        fetchMembers();
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
  <div className="space-y-6 p-4 sm:p-6">
    {/* 1. Page Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          Quản lý thành viên
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">
          Danh sách nhân sự thuộc quyền quản lý
        </p>
      </div>

      <button
        onClick={() => openForm()}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg shadow-sm font-medium"
      >
        <UserPlus size={18} />
        Thêm thành viên
      </button>
    </div>

    {/* 2. Search */}
    <div className="bg-white rounded-lg shadow p-4">
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
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    {/* 3. Table / Mobile List */}
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {loading ? (
        <div className="p-10 text-center text-gray-500">Đang tải dữ liệu...</div>
      ) : members.length === 0 ? (
        <div className="p-10 text-center text-gray-500">
          Không tìm thấy thành viên nào
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Thành viên
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Phòng ban
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Vai trò
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">
                    Hành động
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{m.name}</p>
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
                    <td className="px-6 py-4">
                      {getStatusBadge(m.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleViewDetail(m)} className="icon-btn text-blue-600">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => openForm(m)} className="icon-btn text-amber-600">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="icon-btn text-red-600">
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
          <div className="lg:hidden divide-y">
            {members.map((m) => (
              <div key={m.id} className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Phòng ban: {m.department_name}
                </div>

                <div className="flex flex-wrap gap-2">
                  {getRoleBadge(m.role)}
                  {getStatusBadge(m.status)}
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleViewDetail(m)} className="btn-sm bg-blue-50 text-blue-600">
                    <Eye size={16} />
                  </button>
                  <button onClick={() => openForm(m)} className="btn-sm bg-amber-50 text-amber-600">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="btn-sm bg-red-50 text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row gap-3 justify-between items-center">
            <p className="text-sm text-gray-600">
              Trang {pagination.page} / {pagination.total_pages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="btn-pagination"
              >
                <ChevronLeft size={16} /> Trước
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.total_pages}
                className="btn-pagination"
              >
                Sau <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  </div>
);

};

export default MemberListPage;
