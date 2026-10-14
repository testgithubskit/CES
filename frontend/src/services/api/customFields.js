import apiClient from './client'

export const customFieldsService = {
  list: async (entityType) => {
    const response = await apiClient.get(`/api/v1/custom-fields/${entityType}`)
    return response.data
  },
  create: async (entityType, payload) => {
    const response = await apiClient.post(`/api/v1/custom-fields/${entityType}`, payload)
    return response.data
  },
  update: async (entityType, id, payload) => {
    const response = await apiClient.put(`/api/v1/custom-fields/${entityType}/${id}`, payload)
    return response.data
  },
  remove: async (entityType, id) => {
    await apiClient.delete(`/api/v1/custom-fields/${entityType}/${id}`)
  },
}
