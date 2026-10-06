import apiClient from './client'

export const bomService = {
  getAssemblies: async (productId) => {
    const response = await apiClient.get(`/api/v1/products/${productId}/assemblies`)
    return response.data
  },

  createAssembly: async (productId, assemblyData) => {
    const response = await apiClient.post(`/api/v1/products/${productId}/assemblies`, assemblyData)
    return response.data
  },

  updateAssembly: async (assemblyId, assemblyData) => {
    const response = await apiClient.put(`/api/v1/assemblies/${assemblyId}`, assemblyData)
    return response.data
  },

  deleteAssembly: async (assemblyId) => {
    const response = await apiClient.delete(`/api/v1/assemblies/${assemblyId}`)
    return response.data
  },

  getSubAssemblies: async (assemblyId) => {
    const response = await apiClient.get(`/api/v1/assemblies/${assemblyId}/subassemblies`)
    return response.data
  },

  createSubAssembly: async (assemblyId, subAssemblyData) => {
    const response = await apiClient.post(`/api/v1/assemblies/${assemblyId}/subassemblies`, subAssemblyData)
    return response.data
  },

  updateSubAssembly: async (subAssemblyId, subAssemblyData) => {
    const response = await apiClient.put(`/api/v1/subassemblies/${subAssemblyId}`, subAssemblyData)
    return response.data
  },

  deleteSubAssembly: async (subAssemblyId) => {
    const response = await apiClient.delete(`/api/v1/subassemblies/${subAssemblyId}`)
    return response.data
  },

  getParts: async (subAssemblyId) => {
    const response = await apiClient.get(`/api/v1/subassemblies/${subAssemblyId}/parts`)
    return response.data
  },

  createPart: async (subAssemblyId, partData) => {
    const response = await apiClient.post(`/api/v1/subassemblies/${subAssemblyId}/parts`, partData)
    return response.data
  },

  updatePart: async (partId, partData) => {
    const response = await apiClient.put(`/api/v1/parts/${partId}`, partData)
    return response.data
  },

  deletePart: async (partId) => {
    const response = await apiClient.delete(`/api/v1/parts/${partId}`)
    return response.data
  },
}
