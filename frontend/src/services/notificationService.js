import { api } from './api';

export const notificationService = {
  async getNotifications(limit = 30) {
    return api.get('/notifications/', { limit });
  },

  async getUnreadCount() {
    return api.get('/notifications/unread-count');
  },

  async markAsRead(notificationId) {
    return api.patch(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead() {
    return api.post('/notifications/read-all');
  }
};

