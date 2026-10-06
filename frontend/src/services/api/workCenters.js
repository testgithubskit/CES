import apiClient from './client'

export const workCentersService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/api/v1/work-centers', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await apiClient.get(`/api/v1/work-centers/${id}`)
    return response.data
  },

  create: async (workCenterData) => {
    const response = await apiClient.post('/api/v1/work-centers', workCenterData)
    return response.data
  },

  update: async (id, workCenterData) => {
    const response = await apiClient.put(`/api/v1/work-centers/${id}`, workCenterData)
    return response.data
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/api/v1/work-centers/${id}`)
    return response.data
  },
}
