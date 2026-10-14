import apiClient, { shareGet } from './client'

const pendingHierarchy = new Map()
const pendingCost = new Map()

export const productsService = {
  getAll: (params = {}) => shareGet('/api/v1/products', { params }),

  getById: async (id) => {
    const response = await apiClient.get(`/api/v1/products/${id}`)
    return response.data
  },

  getHierarchy: async (id) => {
    const key = String(id)
    if (!pendingHierarchy.has(key)) {
      const request = apiClient.get(`/api/v1/products/${id}/hierarchy`).then((response) => response.data)
      pendingHierarchy.set(key, request)
      request.finally(() => pendingHierarchy.delete(key))
    }
    return pendingHierarchy.get(key)
  },

  getCost: async (id) => {
    const key = String(id)
    if (!pendingCost.has(key)) {
      const request = apiClient.get(`/api/v1/products/${id}/cost`).then((response) => response.data)
      pendingCost.set(key, request)
      request.finally(() => pendingCost.delete(key))
    }
    return pendingCost.get(key)
  },

  addAdditionalCost: async (id, payload) => {
    const response = await apiClient.post(`/api/v1/products/${id}/additional-costs`, payload)
    return response.data
  },

  deleteAdditionalCost: async (id, costId) => {
    const response = await apiClient.delete(`/api/v1/products/${id}/additional-costs/${costId}`)
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

  getFields: async () => {
    const response = await apiClient.get('/api/v1/product-fields')
    return response.data
  },

  createField: async (payload) => {
    const response = await apiClient.post('/api/v1/product-fields', payload)
    return response.data
  },

  updateField: async (id, payload) => {
    const response = await apiClient.put(`/api/v1/product-fields/${id}`, payload)
    return response.data
  },

  deleteField: async (id) => {
    const response = await apiClient.delete(`/api/v1/product-fields/${id}`)
    return response.data
  },
}
