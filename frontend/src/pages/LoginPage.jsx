import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../frontend/src/contexts/AuthContext";
import { LogIn, AlertCircle, Factory, Building2 } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
        const msg = "Vui lòng nhập đầy đủ Email và Mật khẩu để tiếp tục.";
        // window.alert(msg);
        setError(msg);
        return;
    }

    if (!email.includes("@")) {
        setError("Vui lòng nhập đúng định dạng Email (thiếu ký tự @).");
        return;
    }

    setLoading(true);

    try {
      const user = await login(email, password);
      // Navigate based on user role
      switch (user.role) {
        case "Giám đốc":
          navigate("/director/dashboard");
          break;
        case "Quản lý":
          navigate("/manager/dashboard");
          break;
        case "Trưởng phòng":
          navigate("/department-head/dashboard");
          break;
        case "Nhân viên":
        default:
          navigate("/employee/dashboard");
          break;
      }
    } catch (err) {
      console.error("Login error:", err);
      const msg = err.response?.data?.error;
      let errorMsg = "";
      
      if (msg === "Invalid credentials" || msg === "Incorrect password") {
        errorMsg = "Mật khẩu hoặc Email không chính xác. Vui lòng kiểm tra lại.";
      } else if (msg === "User not found") {
        errorMsg = "Tài khoản không tồn tại trong hệ thống.";
      } else if (msg && msg.includes("Field validation for 'Email' failed")) {
        errorMsg = "Vui lòng nhập đúng định dạng Email.";
      } else {
        errorMsg = msg || "Không thể kết nối đến máy chủ. Vui lòng thử lại sau.";
      }
      
      // window.alert(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Industrial Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transform scale-105"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px]"></div>
      </div>

      <div className="bg-white/95 dark:bg-slate-900/90 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] p-8 w-full max-w-md border border-slate-200 dark:border-slate-700 relative z-10 backdrop-blur-md transition-all">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 mb-6 shadow-lg transform rotate-3 hover:rotate-6 transition-transform">
             <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
            Hệ thống chấm công
          </h1>
        
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-r mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* <AlertCircle size={20} className="mt-0.5 shrink-0" /> */}
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 ml-1">Email nhân viên</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
              placeholder="nhanvien@congty.com"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2 ml-1">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Mật khẩu</label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <LogIn size={20} />
                Đăng nhập hệ thống
              </>
            )}
          </button>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
                &copy; 2025 Hệ thống chấm công. Secure Access.
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
