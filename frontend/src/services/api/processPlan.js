import apiClient from './client'

export const processPlanService = {
  getByPart: async (partId) => {
    const response = await apiClient.get(`/api/v1/parts/${partId}/process-plan`)
    return response.data
  },

  create: async (partId, processPlanData) => {
    const response = await apiClient.post(`/api/v1/parts/${partId}/process-plan`, processPlanData)
    return response.data
  },

  update: async (processPlanId, processPlanData) => {
    const response = await apiClient.put(`/api/v1/process-plans/${processPlanId}`, processPlanData)
    return response.data
  },

  delete: async (processPlanId) => {
    const response = await apiClient.delete(`/api/v1/process-plans/${processPlanId}`)
    return response.data
  },

  getOperations: async (processPlanId) => {
    const response = await apiClient.get(`/api/v1/process-plans/${processPlanId}/operations`)
    return response.data
  },

  createOperation: async (processPlanId, operationData) => {
    const response = await apiClient.post(`/api/v1/process-plans/${processPlanId}/operations`, operationData)
    return response.data
  },

  updateOperation: async (operationId, operationData) => {
    const response = await apiClient.put(`/api/v1/operations/${operationId}`, operationData)
    return response.data
  },

  deleteOperation: async (operationId) => {
    const response = await apiClient.delete(`/api/v1/operations/${operationId}`)
    return response.data
  },

  reorderOperations: async (processPlanId, operationIds) => {
    const response = await apiClient.put(`/api/v1/process-plans/${processPlanId}/operations/reorder`, { operationIds })
    return response.data
  },
}
