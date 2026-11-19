import { api } from './api';

export const feedbackService = {
  async submitFeedback(reportId, data) {
    return api.post(`/reports/${reportId}/feedback`, data);
  },

  async getFeedback(reportId) {
    return api.get(`/reports/${reportId}/feedback`);
  },

  async getIncidentFeedback(incidentId) {
    return api.get(`/incidents/${incidentId}/feedback`);
  },

  async getFeedbackStats() {
    return api.get('/feedback/stats');
  }
};
