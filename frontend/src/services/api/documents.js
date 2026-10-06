import apiClient from './client'

export const documentsService = {
  uploadDocument: async (partId, file, metadata = {}) => {
    const formData = new FormData()
    formData.append('file', file)
    Object.keys(metadata).forEach((key) => {
      formData.append(key, metadata[key])
    })

    const response = await apiClient.post(`/api/v1/parts/${partId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getDocuments: async (partId) => {
    const response = await apiClient.get(`/api/v1/parts/${partId}/documents`)
    return response.data
  },

  getDocumentById: async (documentId) => {
    const response = await apiClient.get(`/api/v1/documents/${documentId}`)
    return response.data
  },

  downloadDocument: async (documentId) => {
    const response = await apiClient.get(`/api/v1/documents/${documentId}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  deleteDocument: async (documentId) => {
    const response = await apiClient.delete(`/api/v1/documents/${documentId}`)
    return response.data
  },

  getDocumentPreviewUrl: async (documentId) => {
    const response = await apiClient.get(`/api/v1/documents/${documentId}/preview`)
    return response.data
  },
}
