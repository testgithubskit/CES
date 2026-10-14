import apiClient, { shareGet } from './client'

export const authService = {
  login: async (credentials) => {
    const response = await apiClient.post('/api/v1/auth/login', credentials)
    return response.data
  },

  logout: async () => {
    const response = await apiClient.post('/api/v1/auth/logout')
    return response.data
  },

  getCurrentUser: () => shareGet('/api/v1/auth/me'),
}
