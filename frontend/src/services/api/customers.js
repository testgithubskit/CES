import apiClient, { shareGet } from './client'

export const customersService = {
  getAll: (params = {}) => shareGet('/api/v1/customers', { params }),

  getById: async (id) => {
    const response = await apiClient.get(`/api/v1/customers/${id}`)
    return response.data
  },

  create: async (customerData) => {
    const response = await apiClient.post('/api/v1/customers', customerData)
    return response.data
  },

  update: async (id, customerData) => {
    const response = await apiClient.put(`/api/v1/customers/${id}`, customerData)
    return response.data
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/api/v1/customers/${id}`)
    return response.data
  },
}
