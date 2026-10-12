import apiClient from './client'

export const documentsService = {
  uploadDocument: async ({ partId, file, documentType, version }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('part_id', String(partId))
    formData.append('document_type', documentType)
    formData.append('version', version)

    const response = await apiClient.post('/api/v1/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getDocuments: async (partId) => {
    const response = await apiClient.get('/api/v1/documents', { params: { part_id: partId } })
    return response.data
  },

  downloadDocument: async (documentId) => {
    const response = await apiClient.get(`/api/v1/documents/${documentId}/file`, {
      responseType: 'blob',
    })
    return response.data
  },

  updateDocument: async (documentId, payload) => {
    const response = await apiClient.put(`/api/v1/documents/${documentId}`, payload)
    return response.data
  },

  deleteDocument: async (documentId) => {
    const response = await apiClient.delete(`/api/v1/documents/${documentId}`)
    return response.data
  },
}
