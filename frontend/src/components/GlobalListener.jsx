import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { wsService } from "../service/ws";

/**
 * GlobalListener
 * Handles app-wide side effects like WebSocket connections and global event listening.
 * Must be placed inside AuthProvider and ToastProvider.
 */
const GlobalListener = () => {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();

  // 1. Manage WebSocket Connection based on Auth state
  useEffect(() => {
    if (!user) {
      wsService.disconnect();
      return;
    }
    
    // Connect to WS if user is logged in
    wsService.connect();
    
    // Cleanup handled by service or subsequent checking
  }, [user]);

  // 2. Listen for Real-time User Updates
  useEffect(() => {
    if (!user) return;

    const handleUserUpdated = (updatedUser) => {
      // Check if update is for the current user
      if (String(updatedUser.id) === String(user.id)) {
        
        // Case: User deactivated
        if (updatedUser.status === "Không hoạt động") {
          toast.error("Tài khoản của bạn đã bị vô hiệu hóa. Đang đăng xuất...");
          
          // Logout logic
          logout();
          
          // Note: Redirection to /login is handled automatically by ProtectedRoute 
          // when it detects !isAuthenticated (user === null)
          return;
        }

        // Case: Normal info update
        console.log("Received real-time update for current user:", updatedUser);
        
        // Update Context and LocalStorage
        updateUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        
        toast.info("Thông tin của bạn vừa được cập nhật bởi quản lý.");
      }
    };

    wsService.on("USER_UPDATED", handleUserUpdated);

    return () => {
      wsService.off("USER_UPDATED", handleUserUpdated);
    };
  }, [user, updateUser, logout, toast]);

  return null;
};

export default GlobalListener;
