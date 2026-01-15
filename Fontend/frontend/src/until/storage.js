export const storage = {
  getAccessToken() {
    return localStorage.getItem('access_token');
  },

  setAccessToken(token) {
    localStorage.setItem('access_token', token);
  },

  removeAccessToken() {
    localStorage.removeItem('access_token');
  },

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  removeUser() {
    localStorage.removeItem('user');
  },

  clear() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};