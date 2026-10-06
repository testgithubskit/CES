import apiClient from './client'

export const productsService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/api/v1/products', { params })
    return response.data
  },

  getById: async (id) => {
    const response = await apiClient.get(`/api/v1/products/${id}`)
    return response.data
  },

  create: async (productData) => {
    const response = await apiClient.post('/api/v1/products', productData)
    return response.data
  },

  update: async (id, productData) => {
    const response = await apiClient.put(`/api/v1/products/${id}`, productData)
    return response.data
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/api/v1/products/${id}`)
    return response.data
  },
}
