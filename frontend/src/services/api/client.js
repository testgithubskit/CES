import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002'

const pendingGets = new Map()

export function shareGet(url, config) {
  const key = `${url}?${JSON.stringify(config?.params || {})}`
  if (!pendingGets.has(key)) {
    const request = apiClient.get(url, config).then((response) => response.data).finally(() => pendingGets.delete(key))
    pendingGets.set(key, request)
  }
  return pendingGets.get(key)
}

export function readList(data) {
  if (Array.isArray(data)) return { items: data, custom_columns: [] }
  return { items: data?.items || [], custom_columns: data?.custom_columns || [] }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const collectionPaths = new Set([
  '/api/v1/products',
  '/api/v1/product-fields',
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
  '/api/v1/report-templates',
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
    const isAuthAttempt = requestUrl.includes('/auth/login')
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
