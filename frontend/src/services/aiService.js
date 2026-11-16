import { api } from './api';

export const aiService = {
  async getSuggestions(reportId = null, incidentId = null) {
    const params = {};
    if (reportId) params.report_id = reportId;
    if (incidentId) params.incident_id = incidentId;
    return api.get('/ai/suggestions', params);
  },

  async reviewSuggestion(suggestionId, reviewStatus, reviewNotes = '') {
    return api.post(`/ai/suggestions/${suggestionId}/review`, {
      review_status: reviewStatus,
      review_notes: reviewNotes
    });
  },

  async getDuplicateCandidates(reportId = null, status = 'detected') {
    const params = { status };
    if (reportId) params.report_id = reportId;
    return api.get('/ai/duplicates', params);
  },

  async reviewDuplicate(candidateId, status, linkToIncident = false, incidentId = null, notes = '') {
    return api.post(`/ai/duplicates/${candidateId}/review`, {
      status,
      link_to_incident: linkToIncident,
      incident_id: incidentId,
      notes
    });
  },

  async getRecommendedWorkers(incidentId) {
    return api.get(`/ai/incidents/${incidentId}/recommended-workers`);
  }
};

