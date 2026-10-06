import apiClient from './client'

export const costEstimationService = {
  calculateProductCost: async (productId, calculationData) => {
    const response = await apiClient.post(`/api/v1/products/${productId}/cost-calculation`, calculationData)
    return response.data
  },

  getCostBreakdown: async (productId, calculationId) => {
    const response = await apiClient.get(`/api/v1/products/${productId}/cost-calculation/${calculationId}`)
    return response.data
  },

  exportToPDF: async (productId, calculationId) => {
    const response = await apiClient.get(`/api/v1/products/${productId}/cost-calculation/${calculationId}/export/pdf`, {
      responseType: 'blob',
    })
    return response.data
  },

  exportToExcel: async (productId, calculationId) => {
    const response = await apiClient.get(`/api/v1/products/${productId}/cost-calculation/${calculationId}/export/excel`, {
      responseType: 'blob',
    })
    return response.data
  },
}
