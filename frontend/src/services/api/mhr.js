import apiClient from './client'

export const mhrService = {
  getMachineMHR: async (machineId) => {
    const response = await apiClient.get(`/api/v1/machines/${machineId}/mhr`)
    return response.data
  },

  calculateMHR: async (machineId, parameters) => {
    const response = await apiClient.post(`/api/v1/machines/${machineId}/mhr/calculate`, parameters)
    return response.data
  },

  getMHRConfig: async (machineId) => {
    const response = await apiClient.get(`/api/v1/machines/${machineId}/mhr/config`)
    return response.data
  },

  updateMHRConfig: async (machineId, configData) => {
    const response = await apiClient.put(`/api/v1/machines/${machineId}/mhr/config`, configData)
    return response.data
  },
}
