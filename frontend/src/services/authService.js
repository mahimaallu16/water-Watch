import { api } from './api';

export const authService = {
  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    if (data?.access_token) {
      localStorage.setItem('waterwatch_token', data.access_token);
      localStorage.setItem('waterwatch_user', JSON.stringify({
        id: data.user_id,
        role: data.role,
        full_name: data.full_name,
        email: data.email
      }));
    }
    return data;
  },

  async register(userData) {
    return api.post('/auth/register', userData);
  },

  logout() {
    localStorage.removeItem('waterwatch_token');
    localStorage.removeItem('waterwatch_user');
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('waterwatch_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async fetchProfile() {
    return api.get('/auth/me');
  },

  async updateProfile(profileData) {
    return api.put('/users/profile', profileData);
  }
};

