import apiClient from './client'

export const machinesService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/api/v1/machines', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await apiClient.get(`/api/v1/machines/${id}`)
    return response.data
  },

  create: async (machineData) => {
    const response = await apiClient.post('/api/v1/machines', machineData)
    return response.data
  },

  update: async (id, machineData) => {
    const response = await apiClient.put(`/api/v1/machines/${id}`, machineData)
    return response.data
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/api/v1/machines/${id}`)
    return response.data
  },
}
