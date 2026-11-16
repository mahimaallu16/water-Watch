import { api } from './api';

export const incidentService = {
  async getIncidents(params = {}) {
    return api.get('/incidents/', params);
  },

  async getIncidentById(id) {
    return api.get(`/incidents/${id}`);
  },

  async createIncident(incidentData) {
    return api.post('/incidents/', incidentData);
  },

  async updateIncident(id, updateData) {
    return api.put(`/incidents/${id}`, updateData);
  },

  async linkReport(incidentId, reportId, notes = '') {
    return api.post(`/incidents/${incidentId}/link`, {
      report_id: reportId,
      notes
    });
  },

  async assignWorker(incidentId, workerId, instructions = '', priority = 'p3') {
    return api.post('/assignments/', {
      incident_id: incidentId,
      worker_id: workerId,
      instructions,
      priority
    });
  },

  async verifyResolution(incidentId, approved, feedbackNotes = '') {
    return api.post(`/assignments/incidents/${incidentId}/verify`, {
      approved,
      feedback_notes: feedbackNotes
    });
  }
};

