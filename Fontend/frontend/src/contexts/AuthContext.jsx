import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../service/auth.service";

const AuthContext = createContext(null);

// Role constants
export const ROLES = {
  EMPLOYEE: "Nhân viên",
  DEPARTMENT_HEAD: "Trưởng phòng",
  MANAGER: "Quản lý",
  DIRECTOR: "Giám đốc",
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const user = await authService.login(email, password);

    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      // ensure UI state is cleared even if API fails
      setUser(null);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  // Helper function to check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Helper function to check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.some((role) => user?.role === role);
  };

  // Get default route based on user role
  const getDefaultRoute = () => {
    if (!user) return "/login";

    switch (user.role) {
      case ROLES.DIRECTOR:
        return "/director/dashboard";
      case ROLES.MANAGER:
        return "/manager/dashboard";
      case ROLES.DEPARTMENT_HEAD:
        return "/department-head/dashboard";
      case ROLES.EMPLOYEE:
      default:
        return "/employee/dashboard";
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
    getDefaultRoute,
    ROLES,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
