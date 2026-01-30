import api from "./api";



export const authService = {
  async login(email, password) {
    const response = await api.post("/auth/login", { email, password });

    if (response.data.success && response.data.data) {
      const { user } = response.data.data;
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    }

    throw new Error("Login failed");
  },

  async logout() {
    await api.post("/auth/logout"); // backend clear cookie
    localStorage.removeItem("user");
  },

  async getProfile() {
    const response = await api.get("/profile");
    if (response.data.success) {
      const user = response.data.data;
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    }
    throw new Error("Failed to get profile");
  },

  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem("user");
  },
};

