import { api } from './api';

export const analyticsService = {
  async getDashboardKPIs() {
    return api.get('/analytics/dashboard');
  },

  async getWorkerAnalytics() {
    return api.get('/analytics/workers');
  },

  async getAuditLogs(params = {}) {
    return api.get('/audit/logs', params);
  },

  async getStatusHistory(entityType, entityId) {
    return api.get(`/audit/history/${entityType}/${entityId}`);
  }
};

