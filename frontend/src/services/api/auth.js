import apiClient from './client'

export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post('/api/v1/auth/login', credentials)
    return response.data
  },

  register: async (userData) => {
    const response = await apiClient.post('/api/v1/auth/register', userData)
    return response.data
  },

  logout: async () => {
    const response = await apiClient.post('/api/v1/auth/logout')
    return response.data
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/api/v1/auth/me')
    return response.data
  },
}
