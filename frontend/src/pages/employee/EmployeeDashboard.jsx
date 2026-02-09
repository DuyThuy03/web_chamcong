import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import api from "../../service/api";
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
  Camera,
  Shield,
  Clock,
  FileText,
  LogOut,
  ChevronRight,
  Lock
} from "lucide-react";
import { wsService } from "../../service/ws";

/**
 * EmployeeDashboard.jsx
 * Displays user profile and quick navigation links.
 * Recently refactored to modern UI.
 */

// Reusable Input Component
const InputField = ({ label, icon: Icon, name, type = "text", value, disabled = false, options = null, editing, onChange, required = false }) => (
  <div className="space-y-1.5 form-group">
    <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
      <Icon size={16} className="text-blue-500" />
      {label} {required && editing && <span className="text-rose-500">*</span>}
    </label>
    {editing && !disabled ? (
      options ? (
        <div className="relative">
           <select
               name={name}
               value={value}
               onChange={onChange}
               className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 appearance-none shadow-sm cursor-pointer hover:border-blue-300 text-base sm:text-sm"
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <ChevronRight size={16} className="rotate-90" />
            </div>
        </div>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 shadow-sm placeholder:text-gray-400 hover:border-blue-300 text-base sm:text-sm appearance-none"
          placeholder={`Nhập ${label.toLowerCase()}...`}
          autoComplete={type === 'password' ? 'new-password' : 'off'}
        />
      )
    ) : (
      <div className={`w-full px-4 py-3 rounded-xl border border-transparent transition-colors ${disabled && editing ? 'bg-gray-100 text-gray-400' : 'bg-gray-50 text-gray-800 font-medium'}`}>
         {type === 'date' && value ? new Date(value).toLocaleDateString('vi-VN') : (value || <span className="text-gray-400 italic font-normal">Chưa cập nhật</span>)}
      </div>
    )}
    {disabled && editing && <p className="text-[10px] text-gray-400 italic pl-1 flex items-center gap-1"><Shield size={10} /> Không thể thay đổi thông tin này</p>}
  </div>
);

const EmployeeDashboard = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Initialize form data
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    address: "",
    gender: "",
    date_of_birth: "",
    password: "",
    confirmPassword: "",
  });
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Populate form with user data when user is loaded
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
        password: "",
        confirmPassword: "",
      });
    }
  }, [user]);

  // WebSocket Handler logic has been moved to GlobalListener.jsx


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const newErrors = [];
    if (!formData.name.trim()) newErrors.push("Vui lòng nhập họ và tên.");
    if (!formData.phone_number.trim()) newErrors.push("Vui lòng nhập số điện thoại.");
    if (!formData.phone_number.match(/^[0-9]{10}$/)) newErrors.push("Vui lòng nhập đúng định dạng số điện thoại (10 số).");
    if (!formData.gender) newErrors.push("Vui lòng chọn giới tính.");
    if (!formData.date_of_birth) newErrors.push("Vui lòng chọn ngày sinh.");
    if (formData.date_of_birth > Date.now()) newErrors.push("Ngày sinh không được lớn hơn ngày hiện tại.");
    if (!formData.address.trim()) newErrors.push("Vui lòng nhập địa chỉ liên hệ.");

    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
         newErrors.push("Mật khẩu xác nhận không khớp.");
      }
     
    }

    if (newErrors.length > 0) {
      setError(newErrors);
      setLoading(false);
      return;
    }
    
    setLoading(true);

    const submitData = {
      ...formData,
      email: user.email, // Ensure email is sent as identifier if required
    };
    
   
    if (!submitData.password) {
      delete submitData.password;
    }
    delete submitData.confirmPassword;

    try {
      const response = await api.put("/profile", submitData);
      
      if (response.data.success) {
        updateUser(response.data.data);
        toast.success("Cập nhật thông tin thành công!");
        setEditing(false);
      } else {
        toast.error("Cập nhật không thành công");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error(err.response?.data?.error || "Cập nhật thất bại, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to current user data
    setFormData({
      name: user.name || "",
      phone_number: user.phone_number || "",
      address: user.address || "",
      gender: user.gender || "",
      date_of_birth: user.date_of_birth ? user.date_of_birth.split("T")[0] : "",
      password: "",
      confirmPassword: "",
    });
    setEditing(false);
    setError("");
    setSuccess("");
  };



  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] px-4 pt-[calc(1rem_+_env(safe-area-inset-top))] pb-[calc(1rem_+_env(safe-area-inset-bottom))] grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 font-sans max-w-7xl mx-auto transition-colors duration-200">
      
      {/* 1. Profile Section (Main Column - Span 8) */}
      <div className="lg:col-span-8 flex flex-col gap-4 h-full">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider pl-1 border-l-2 border-[var(--accent-color)]">
          Hồ sơ cá nhân
        </h3>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-sm overflow-hidden transition-colors duration-300">
          <div className="p-4">
            {/* Avatar & Header - Compact Layout */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
               <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-lg bg-[var(--bg-primary)] p-1 border border-[var(--border-color)] shadow-sm">
                     {user?.avatar ? (
                        <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-md" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[var(--bg-secondary)] text-[var(--accent-color)] rounded-md">
                          <User size={40} />
                        </div>
                     )}
                     
                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg">
                        <Camera size={20} className="text-white" />
                     </div>
                  </div>
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-green-500 rounded-md border-2 border-[var(--bg-secondary)] flex items-center justify-center shadow-sm" title="Online">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
              </div>

              <div className="flex-1 text-center md:text-left min-w-0 w-full">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                   <div>
                      <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] uppercase tracking-tight">{user?.name || "Người dùng"}</h1>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1.5">
                        <span className="px-2.5 py-0.5 bg-[var(--bg-primary)] text-[var(--text-secondary)] rounded-md text-xs font-bold uppercase border border-[var(--border-color)]">
                          {user?.role || "N/A"}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                          <Briefcase size={14} />
                          {user?.department_name || "Phòng ban chưa xác định"}
                        </span>
                      </div>
                   </div>

                   <div className="shrink-0 w-full md:w-auto">
                       {!editing ? (
                          <button
                            onClick={() => setEditing(true)}
                            className="w-full md:w-auto px-4 py-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] font-medium rounded-md border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-all flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-md hover:scale-115 active:scale-[0.85]"
                          >
                            <Edit2 size={14} /> Chỉnh sửa hồ sơ
                          </button>
                        ) : (
                          <div className="flex gap-2 w-full md:w-auto">
                            <button
                              onClick={handleCancel}
                              className="flex-1 md:flex-none px-4 py-2 bg-[var(--bg-primary)] text-[var(--text-secondary)] font-medium rounded-md border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-all flex items-center justify-center gap-2 text-sm hover:scale-115 active:scale-[0.85]"
                            >
                              <X size={14} /> Hủy
                            </button>
                            <button
                              onClick={handleSubmit}
                              disabled={loading}
                              className="flex-1 md:flex-none px-4 py-2 bg-[var(--accent-color)] text-white font-medium rounded-md hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow-lg hover:scale-115 active:scale-[0.85]"
                              style={{ color: "#000" }}
                            >
                              {loading ? (
                                 <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Save size={14} /> Lưu
                                </>
                              )}
                            </button>
                          </div>
                        )}
                   </div>
                </div>

                 {/* Divider */}
                 <div className="h-px bg-[var(--border-color)] my-4"></div>

                 {/* Error Banner */}
                 {error && (error.length > 0 || typeof error === 'string') && (
                    <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-3 rounded-r flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
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
                 )}

                 {/* Form Fields - Grid Layout */}
                <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <InputField 
                      label="Họ và tên" 
                      icon={User} 
                      name="name" 
                      value={formData.name} 
                      editing={editing}
                      onChange={handleChange}
                      required={true}
                   />
                   <InputField 
                      label="Địa chỉ email" 
                      icon={Mail} 
                      value={user?.email} 
                      disabled={true} 
                      editing={editing}
                      onChange={handleChange}
                   />

                   
                   
                   {editing && (
                     <>
                        <InputField 
                          label="Mật khẩu mới" 
                          icon={Lock} 
                          name="password" 
                          value={formData.password} 
                          type="password" 
                          editing={editing}
                          onChange={handleChange}
                        />
                        <InputField 
                          label="Xác nhận mật khẩu" 
                          icon={Lock} 
                          name="confirmPassword" 
                          value={formData.confirmPassword} 
                          type="password" 
                          editing={editing}
                          onChange={handleChange}
                        />
                     </>
                   )}
                   <InputField 
                      label="Lương cơ bản" 
                      icon={FileText} 
                      value={user?.base_salary ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(user.base_salary) : "0 ₫"}
                      disabled={true} 
                      editing={editing}
                      onChange={() => {}} 
                   />

                   <InputField 
                      label="Số điện thoại" 
                      icon={Phone} 
                      name="phone_number" 
                      value={formData.phone_number} 
                      type="tel" 
                      editing={editing}
                      onChange={handleChange}
                      required={true}
                   />
                   <InputField 
                      label="Giới tính" 
                      icon={User} 
                      name="gender" 
                      value={formData.gender} 
                      options={[
                        {value: "", label: "Chọn giới tính"}, 
                        {value: "Nam", label: "Nam"}, 
                        {value: "Nữ", label: "Nữ"}, 
                        {value: "Khác", label: "Khác"}
                      ]} 
                      editing={editing}
                      onChange={handleChange}
                      required={true}
                   />
                   <InputField 
                      label="Ngày sinh" 
                      icon={Calendar} 
                      name="date_of_birth" 
                      value={formData.date_of_birth} 
                      type="date" 
                      editing={editing}
                      onChange={handleChange}
                      required={true}
                   />
                   <div className="md:col-span-2 lg:col-span-1">
                      <InputField 
                          label="Địa chỉ liên hệ" 
                          icon={MapPin} 
                          name="address" 
                          value={formData.address} 
                          editing={editing}
                          onChange={handleChange}
                          required={true}
                      />
                   </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Access Sidebar (Side Column - Span 4) */}
      <div className="lg:col-span-4 flex flex-col gap-4 h-full">
        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider pl-1 border-l-2 border-[var(--accent-color)]">
          Tiện ích nhanh
        </h3>
        
        {/* Attendance Card */}
        <div 
           onClick={() => navigate("/attendance")}
           className="group bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-all cursor-pointer shadow-sm hover:shadow-lg hover:scale-105 hover:-translate-y-1 active:scale-[0.85]"
        >
           <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-[var(--bg-primary)] text-blue-600 border border-[var(--border-color)] rounded-md flex items-center justify-center transition-colors">
                <Clock size={20} />
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors" />
           </div>
           <h4 className="text-base font-bold text-[var(--text-primary)] mb-1">Chấm công</h4>
           <div className="h-px w-8 bg-[var(--accent-color)] mb-2"></div>
           <p className="text-xs text-[var(--text-secondary)]">Ghi nhận thời gian làm việc hàng ngày, check-in và check-out.</p>
        </div>

        {/* History Card */}
        <div 
           onClick={() => navigate("/history")}
           className="group bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-all cursor-pointer shadow-sm hover:shadow-lg hover:scale-105 hover:-translate-y-1 active:scale-[0.85]"
        >
           <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-[var(--bg-primary)] text-emerald-600 border border-[var(--border-color)] rounded-md flex items-center justify-center transition-colors">
                <FileText size={20} />
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors" />
           </div>
           <h4 className="text-base font-bold text-[var(--text-primary)] mb-1">Lịch sử</h4>
           <div className="h-px w-8 bg-[var(--accent-color)] mb-2"></div>
           <p className="text-xs text-[var(--text-secondary)]">Xem lại bảng công chi tiết theo tháng và trạng thái làm việc.</p>
        </div>

        {/* Leave Request Card */}
        <div 
           onClick={() => navigate("/leave-request")}
           className="group bg-[var(--bg-secondary)] p-4 rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-all cursor-pointer shadow-sm hover:shadow-lg hover:scale-105 hover:-translate-y-1 active:scale-[0.85]"
        >
           <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-[var(--bg-primary)] text-purple-600 border border-[var(--border-color)] rounded-md flex items-center justify-center transition-colors">
                 <LogOut size={20} />
              </div>
              <ChevronRight size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] transition-colors" />
           </div>
           <h4 className="text-base font-bold text-[var(--text-primary)] mb-1">Xin nghỉ phép</h4>
           <div className="h-px w-8 bg-[var(--accent-color)] mb-2"></div>
           <p className="text-xs text-[var(--text-secondary)]">Tạo đơn xin nghỉ phép, nghỉ ốm hoặc đăng ký đi muộn.</p>
        </div>

      </div>
    </div>
  );
};

export default EmployeeDashboard;
