import { api } from './api';

export const workerService = {
  async getMyAssignments(status = null) {
    return api.get('/workers/assignments', status ? { status } : {});
  },

  async acceptAssignment(assignmentId) {
    return api.post(`/assignments/${assignmentId}/accept`, {});
  },

  async addRepairUpdate(assignmentId, updateType, notes) {
    return api.post(`/assignments/${assignmentId}/updates`, {
      update_type: updateType,
      notes
    });
  },

  async uploadEvidence(assignmentId, formData) {
    return api.post(`/assignments/${assignmentId}/evidence`, formData);
  },

  async submitCompletion(assignmentId, notes = '') {
    const formData = new FormData();
    if (notes) formData.append('notes', notes);
    return api.post(`/assignments/${assignmentId}/complete`, formData);
  },

  async getMyStats() {
    return api.get('/workers/stats');
  }
};

