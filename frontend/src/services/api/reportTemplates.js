import apiClient from './client'

const STORAGE_KEY = 'ces-report-templates'

function errorMessage(error, fallback) {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ')
  return error.message || fallback
}

export const reportTemplatesService = {
  list: async () => {
    const response = await apiClient.get('/api/v1/report-templates')
    return Array.isArray(response.data) ? response.data : response.data?.items || []
  },

  getById: async (id) => {
    const response = await apiClient.get(`/api/v1/report-templates/${id}`)
    return response.data
  },

  getStarred: async () => {
    const response = await apiClient.get('/api/v1/report-templates/starred')
    return response.data
  },

  create: async (payload) => {
    const response = await apiClient.post('/api/v1/report-templates', payload)
    return response.data
  },

  update: async (id, payload) => {
    const response = await apiClient.put(`/api/v1/report-templates/${id}`, payload)
    return response.data
  },

  star: async (id) => {
    const response = await apiClient.post(`/api/v1/report-templates/${id}/star`)
    return response.data
  },

  remove: async (id) => {
    await apiClient.delete(`/api/v1/report-templates/${id}`)
  },
}

let migrated = false

export async function migrateLocalTemplates() {
  if (migrated) return
  let local = []
  try {
    local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    migrated = true
    return
  }
  if (!Array.isArray(local) || !local.length) {
    migrated = true
    return
  }
  const remote = await reportTemplatesService.list()
  const names = new Set(remote.map((item) => String(item.name || '').trim().toLowerCase()))
  let starredId = null
  for (const item of local) {
    const name = String(item.name || '').trim()
    if (!name || names.has(name.toLowerCase())) continue
    const saved = await reportTemplatesService.create({
      name,
      is_default: Boolean(item.is_default),
      template_data: item.template_data || {},
    })
    names.add(name.toLowerCase())
    if (item.is_default) starredId = saved.id
  }
  if (starredId) await reportTemplatesService.star(starredId)
  localStorage.removeItem(STORAGE_KEY)
  migrated = true
}

export async function listReportTemplates() {
  await migrateLocalTemplates()
  return reportTemplatesService.list()
}

export async function getReportTemplate(id) {
  if (!id) return null
  await migrateLocalTemplates()
  return reportTemplatesService.getById(id)
}

export async function getStarredTemplate() {
  await migrateLocalTemplates()
  return reportTemplatesService.getStarred()
}

export async function saveReportTemplate(template) {
  const payload = {
    name: template.name,
    is_default: Boolean(template.is_default),
    template_data: template.template_data || {},
  }
  if (template.id) return reportTemplatesService.update(template.id, payload)
  return reportTemplatesService.create(payload)
}

export async function starReportTemplate(id) {
  return reportTemplatesService.star(id)
}

export async function deleteReportTemplate(id) {
  await reportTemplatesService.remove(id)
}

export { errorMessage as templateError }
