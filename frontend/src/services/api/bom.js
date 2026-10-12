import apiClient from './client'

export const bomService = {
  createAssembly: async (assemblyData) => {
    const response = await apiClient.post('/api/v1/assemblies', assemblyData)
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

  createPart: async (partData) => {
    const response = await apiClient.post('/api/v1/parts', partData)
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

export const operationsService = {
  getByPart: async (partId) => {
    const response = await apiClient.get('/api/v1/operations', { params: { part_id: partId } })
    return response.data
  },

  create: async (operationData) => {
    const response = await apiClient.post('/api/v1/operations', operationData)
    return response.data
  },

  update: async (operationId, operationData) => {
    const response = await apiClient.put(`/api/v1/operations/${operationId}`, operationData)
    return response.data
  },

  delete: async (operationId) => {
    const response = await apiClient.delete(`/api/v1/operations/${operationId}`)
    return response.data
  },
}

export const lookupService = {
  partTypes: async () => {
    const response = await apiClient.get('/api/v1/part-types')
    return response.data
  },
  workCenters: async () => {
    const response = await apiClient.get('/api/v1/work-centers')
    return response.data
  },
  machines: async () => {
    const response = await apiClient.get('/api/v1/machines')
    return response.data
  },
}
