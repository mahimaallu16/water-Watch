import { api } from './api';

export const reportService = {
  async submitReport(formData) {
    return api.post('/reports/', formData);
  },

  async getReports(params = {}) {
    return api.get('/reports/', params);
  },

  async getMyReports() {
    return api.get('/reports/', { mine: true });
  },

  async getReportById(id) {
    return api.get(`/reports/${id}`);
  },

  async getNearbyReports(latitude, longitude, radiusKm = 5.0) {
    return api.get('/reports/nearby', {
      latitude,
      longitude,
      radius_km: radiusKm
    });
  },

  async submitAdditionalEvidence(reportId, formData) {
    return api.post(`/reports/${reportId}/evidence`, formData);
  }
};

