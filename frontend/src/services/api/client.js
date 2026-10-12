import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const collectionPaths = new Set([
  '/api/v1/products',
  '/api/v1/customers',
  '/api/v1/work-centers',
  '/api/v1/machines',
  '/api/v1/part-types',
  '/api/v1/assemblies',
  '/api/v1/parts',
  '/api/v1/operations',
  '/api/v1/documents',
  '/api/v1/users',
  '/api/v1/mhr-particulars',
])

apiClient.interceptors.request.use(
  (config) => {
    const [path, query] = String(config.url || '').split('?')
    if (collectionPaths.has(path)) {
      config.url = query ? `${path}/?${query}` : `${path}/`
    }
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || ''
    const isAuthAttempt = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')
    if (error.response?.status === 401 && !isAuthAttempt) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/signin') {
        window.location.href = '/signin'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
